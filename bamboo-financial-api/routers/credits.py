# routers/credits.py - Version corrigée avec gestion JSON
from fastapi import APIRouter, Depends, HTTPException, Query
from decimal import Decimal
from sqlalchemy.orm import Session, joinedload
from typing import List, Optional
import math
import uuid
import json  # Ajouté pour la sérialisation JSON
from datetime import datetime
import models
import schemas
from database import get_db

router = APIRouter()

@router.get("/products")
async def get_credit_products(
    credit_type: Optional[str] = Query(None, description="Type de crédit"),
    min_amount: Optional[float] = Query(None, description="Montant minimum"),
    max_amount: Optional[float] = Query(None, description="Montant maximum"),
    db: Session = Depends(get_db)
):
    """Récupère les produits de crédit avec filtres optionnels"""
    try:
        query = db.query(models.CreditProduct).options(
            joinedload(models.CreditProduct.bank)
        ).filter(models.CreditProduct.is_active == True)
        
        if credit_type:
            query = query.filter(models.CreditProduct.type.ilike(f"%{credit_type}%"))
        if min_amount is not None:
            query = query.filter(models.CreditProduct.max_amount >= min_amount)
        if max_amount is not None:
            query = query.filter(models.CreditProduct.min_amount <= max_amount)
        
        products = query.all()
        
        # Conversion explicite en dictionnaires
        products_data = []
        for product in products:
            product_dict = {
                "id": product.id,
                "bank_id": product.bank_id,
                "name": product.name,
                "type": product.type,
                "description": product.description,
                "min_amount": float(product.min_amount),
                "max_amount": float(product.max_amount),
                "min_duration_months": product.min_duration_months,
                "max_duration_months": product.max_duration_months,
                "average_rate": float(product.average_rate),
                "min_rate": float(product.min_rate) if product.min_rate else None,
                "max_rate": float(product.max_rate) if product.max_rate else None,
                "processing_time_hours": product.processing_time_hours,
                "required_documents": product.required_documents,
                "eligibility_criteria": product.eligibility_criteria,
                "fees": product.fees,
                "features": product.features,
                "advantages": product.advantages,
                "special_conditions": product.special_conditions,
                "is_featured": product.is_featured,
                "is_active": product.is_active,
                "created_at": product.created_at,
                "updated_at": product.updated_at,
                "bank": {
                    "id": product.bank.id,
                    "name": product.bank.name,
                    "full_name": product.bank.full_name,
                    "description": product.bank.description,
                    "logo_url": product.bank.logo_url,
                    "website": product.bank.website,
                    "contact_phone": product.bank.contact_phone,
                    "contact_email": product.bank.contact_email,
                    "address": product.bank.address,
                    "swift_code": product.bank.swift_code,
                    "license_number": product.bank.license_number,
                    "established_year": product.bank.established_year,
                    "total_assets": float(product.bank.total_assets) if product.bank.total_assets else None,
                    "rating": product.bank.rating,
                    "is_active": product.bank.is_active,
                    "created_at": product.bank.created_at,
                    "updated_at": product.bank.updated_at
                } if product.bank else None
            }
            products_data.append(product_dict)
        
        return products_data
        
    except Exception as e:
        print(f"Erreur dans get_credit_products: {str(e)}")
        raise HTTPException(status_code=500, detail=f"Erreur lors de la récupération des produits: {str(e)}")

@router.post("/simulate")
async def simulate_credit(
    request: schemas.CreditSimulationRequest,
    db: Session = Depends(get_db)
):
    """Simule un crédit"""
    try:
        # Récupérer le produit de crédit
        credit_product = db.query(models.CreditProduct).filter(
            models.CreditProduct.id == request.credit_product_id
        ).first()
        
        if not credit_product:
            raise HTTPException(status_code=404, detail="Produit de crédit non trouvé")
        
        # Validation des montants
        if request.requested_amount < credit_product.min_amount:
            raise HTTPException(
                status_code=400, 
                detail=f"Montant minimum: {credit_product.min_amount:,} FCFA"
            )
        
        if request.requested_amount > credit_product.max_amount:
            raise HTTPException(
                status_code=400, 
                detail=f"Montant maximum: {credit_product.max_amount:,} FCFA"
            )
        
        # Validation de la durée
        if request.duration_months < credit_product.min_duration_months:
            raise HTTPException(
                status_code=400, 
                detail=f"Durée minimum: {credit_product.min_duration_months} mois"
            )
        
        if request.duration_months > credit_product.max_duration_months:
            raise HTTPException(
                status_code=400, 
                detail=f"Durée maximum: {credit_product.max_duration_months} mois"
            )
        
        # Calculs de la simulation
        loan_amount = request.requested_amount - (request.down_payment or 0)
        monthly_rate = float(credit_product.average_rate) / 100 / 12
        
        # Calcul de la mensualité
        if monthly_rate == 0:
            monthly_payment = loan_amount / request.duration_months
        else:
            monthly_payment = loan_amount * (monthly_rate * (1 + monthly_rate) ** request.duration_months) / ((1 + monthly_rate) ** request.duration_months - 1)
        
        # Calcul du taux d'endettement
        total_monthly_payments = monthly_payment + (request.current_debts or 0)
        debt_ratio = (total_monthly_payments / request.monthly_income) * 100
        
        # Vérification du taux d'endettement
        max_debt_ratio = 33
        if credit_product.eligibility_criteria and "max_debt_ratio" in credit_product.eligibility_criteria:
            max_debt_ratio = credit_product.eligibility_criteria["max_debt_ratio"]
        
        eligible = debt_ratio <= max_debt_ratio
        
        # Calculs totaux
        total_cost = monthly_payment * request.duration_months
        total_interest = total_cost - loan_amount
        
        # Génération du tableau d'amortissement
        amortization_schedule = []
        remaining_balance = loan_amount
        
        for month in range(1, request.duration_months + 1):
            interest_payment = remaining_balance * monthly_rate
            principal_payment = monthly_payment - interest_payment
            remaining_balance -= principal_payment
            
            amortization_schedule.append({
                "month": month,
                "payment": round(monthly_payment, 2),
                "principal": round(principal_payment, 2),
                "interest": round(interest_payment, 2),
                "remaining_balance": round(max(0, remaining_balance), 2)
            })
        
        # Génération des recommandations
        recommendations = []
        if debt_ratio > 30:
            recommendations.append("Votre taux d'endettement est élevé. Considérez réduire vos charges actuelles.")
        if (request.down_payment or 0) / request.requested_amount < 0.1:
            recommendations.append("Un apport personnel d'au moins 10% améliorerait vos conditions.")
        if request.duration_months > 240:
            recommendations.append("Durée longue : coût total élevé mais mensualités réduites.")
        if debt_ratio < 25:
            recommendations.append("Excellent profil ! Vous pourriez négocier de meilleures conditions.")
        
        # CORRECTION: Sauvegarder la simulation avec conversion JSON explicite
        simulation = models.CreditSimulation(
            id=str(uuid.uuid4()),
            credit_product_id=request.credit_product_id,
            session_id=getattr(request, 'session_id', None),
            requested_amount=request.requested_amount,
            duration_months=request.duration_months,
            monthly_income=request.monthly_income,
            current_debts=request.current_debts or 0,
            down_payment=request.down_payment or 0,
            applied_rate=float(credit_product.average_rate),
            monthly_payment=monthly_payment,
            total_interest=total_interest,
            total_cost=total_cost,
            debt_ratio=debt_ratio,
            eligible=eligible,
            # CORRECTION: Convertir les listes en JSON
            amortization_schedule=amortization_schedule,  # SQLAlchemy gérera la conversion automatiquement
            recommendations=recommendations  # SQLAlchemy gérera la conversion automatiquement
        )
        
        try:
            db.add(simulation)
            db.commit()
            db.refresh(simulation)
        except Exception as db_error:
            print(f"Erreur base de données: {str(db_error)}")
            db.rollback()
            # En cas d'erreur DB, continuer sans sauvegarder
            pass
        
        # Retourner la réponse sous forme de dictionnaire
        response_data = {
            "simulation_id": simulation.id,
            "applied_rate": float(credit_product.average_rate),
            "monthly_payment": round(float(monthly_payment), 2),
            "total_interest": round(float(total_interest), 2),
            "total_cost": round(float(total_cost), 2),
            "debt_ratio": round(float(debt_ratio), 1),
            "eligible": eligible,
            "recommendations": recommendations,
            "amortization_schedule": amortization_schedule,
            "bank_info": {
                "name": credit_product.bank.name,
                "logo": credit_product.bank.logo_url
            } if credit_product.bank else None
        }
        
        return response_data
        
    except HTTPException:
        raise
    except Exception as e:
        print(f"Erreur dans simulate_credit: {str(e)}")
        raise HTTPException(status_code=500, detail=f"Erreur lors de la simulation: {str(e)}")

# Méthode alternative sans sauvegarde en base
@router.post("/simulate-light")
async def simulate_credit_light(
    request: schemas.CreditSimulationRequest,
    db: Session = Depends(get_db)
):
    """Simule un crédit sans sauvegarde en base de données"""
    try:
        # Récupérer le produit de crédit
        credit_product = db.query(models.CreditProduct).filter(
            models.CreditProduct.id == request.credit_product_id
        ).first()
        
        if not credit_product:
            raise HTTPException(status_code=404, detail="Produit de crédit non trouvé")
        
        # Validation des montants et durée (même logique que simulate)
        if request.requested_amount < credit_product.min_amount:
            raise HTTPException(status_code=400, detail=f"Montant minimum: {credit_product.min_amount:,} FCFA")
        
        if request.requested_amount > credit_product.max_amount:
            raise HTTPException(status_code=400, detail=f"Montant maximum: {credit_product.max_amount:,} FCFA")
        
        if request.duration_months < credit_product.min_duration_months:
            raise HTTPException(status_code=400, detail=f"Durée minimum: {credit_product.min_duration_months} mois")
        
        if request.duration_months > credit_product.max_duration_months:
            raise HTTPException(status_code=400, detail=f"Durée maximum: {credit_product.max_duration_months} mois")
        
        # Calculs (même logique que simulate)
        loan_amount = request.requested_amount - (request.down_payment or 0)
        monthly_rate = float(credit_product.average_rate) / 100 / 12
        
        if monthly_rate == 0:
            monthly_payment = loan_amount / request.duration_months
        else:
            monthly_payment = loan_amount * (monthly_rate * (1 + monthly_rate) ** request.duration_months) / ((1 + monthly_rate) ** request.duration_months - 1)
        
        total_monthly_payments = monthly_payment + (request.current_debts or 0)
        debt_ratio = (total_monthly_payments / request.monthly_income) * 100
        
        max_debt_ratio = 33
        if credit_product.eligibility_criteria and isinstance(credit_product.eligibility_criteria, dict):
            max_debt_ratio = credit_product.eligibility_criteria.get("max_debt_ratio", 33)
        
        eligible = debt_ratio <= max_debt_ratio
        total_cost = monthly_payment * request.duration_months
        total_interest = total_cost - loan_amount
        
        # Génération du tableau d'amortissement (limité aux 12 premiers mois pour optimiser)
        amortization_schedule = []
        remaining_balance = loan_amount
        
        for month in range(1, min(13, request.duration_months + 1)):  # Limité à 12 mois
            interest_payment = remaining_balance * monthly_rate
            principal_payment = monthly_payment - interest_payment
            remaining_balance -= principal_payment
            
            amortization_schedule.append({
                "month": month,
                "payment": round(monthly_payment, 2),
                "principal": round(principal_payment, 2),
                "interest": round(interest_payment, 2),
                "remaining_balance": round(max(0, remaining_balance), 2)
            })
        
        # Recommandations
        recommendations = []
        if debt_ratio > 30:
            recommendations.append("Taux d'endettement élevé. Réduisez vos charges actuelles.")
        if (request.down_payment or 0) / request.requested_amount < 0.1:
            recommendations.append("Un apport de 10% améliorerait vos conditions.")
        if debt_ratio < 25:
            recommendations.append("Excellent profil ! Négociez de meilleures conditions.")
        
        # Retourner directement sans sauvegarde
        return {
            "simulation_id": f"temp_{str(uuid.uuid4())[:8]}",
            "applied_rate": float(credit_product.average_rate),
            "monthly_payment": round(float(monthly_payment), 2),
            "total_interest": round(float(total_interest), 2),
            "total_cost": round(float(total_cost), 2),
            "debt_ratio": round(float(debt_ratio), 1),
            "eligible": eligible,
            "recommendations": recommendations,
            "amortization_schedule": amortization_schedule,
            "bank_info": {
                "name": credit_product.bank.name,
                "logo": credit_product.bank.logo_url
            } if credit_product.bank else None
        }
        
    except HTTPException:
        raise
    except Exception as e:
        print(f"Erreur dans simulate_credit_light: {str(e)}")
        raise HTTPException(status_code=500, detail=f"Erreur simulation: {str(e)}")

@router.get("/compare")
async def compare_credit_offers(
    credit_type: str = Query(..., description="Type de crédit (immobilier, consommation, auto)"),
    amount: float = Query(..., description="Montant souhaité", ge=0),
    duration: int = Query(..., description="Durée en mois", ge=1, le=480),
    monthly_income: float = Query(..., description="Revenus mensuels", gt=0),
    current_debts: float = Query(0, description="Dettes actuelles mensuelles", ge=0),
    db: Session = Depends(get_db)
):
    """Compare les offres de crédit de différentes banques"""
    try:
        # Récupérer les produits compatibles avec jointure sur bank
        products = db.query(models.CreditProduct).options(
            joinedload(models.CreditProduct.bank)
        ).filter(
            models.CreditProduct.type.ilike(f"%{credit_type}%"),
            models.CreditProduct.min_amount <= amount,
            models.CreditProduct.max_amount >= amount,
            models.CreditProduct.min_duration_months <= duration,
            models.CreditProduct.max_duration_months >= duration,
            models.CreditProduct.is_active == True
        ).join(models.Bank).filter(
            models.Bank.is_active == True
        ).all()
        
        if not products:
            return {
                "comparisons": [],
                "message": f"Aucun produit trouvé pour {credit_type} - {amount:,.0f} FCFA sur {duration} mois"
            }
        
        comparisons = []
        
        for product in products:
            try:
                monthly_rate = float(product.average_rate) / 100 / 12
                if monthly_rate == 0:
                    monthly_payment = amount / duration
                else:
                    monthly_payment = amount * (monthly_rate * (1 + monthly_rate) ** duration) / ((1 + monthly_rate) ** duration - 1)
                
                total_cost = monthly_payment * duration
                total_interest = total_cost - amount
                debt_ratio = ((monthly_payment + current_debts) / monthly_income) * 100
                
                # Vérifier l'éligibilité
                max_debt_ratio = 33
                if product.eligibility_criteria and isinstance(product.eligibility_criteria, dict):
                    max_debt_ratio = product.eligibility_criteria.get("max_debt_ratio", 33)
                
                eligible = debt_ratio <= max_debt_ratio
                
                comparison_data = {
                    "bank": {
                        "id": product.bank.id,
                        "name": product.bank.name,
                        "logo": product.bank.logo_url,
                        "short_name": product.bank.name[:15] + "..." if len(product.bank.name) > 15 else product.bank.name
                    },
                    "product": {
                        "id": product.id,
                        "name": product.name,
                        "rate": float(product.average_rate),
                        "processing_time": product.processing_time_hours,
                        "features": product.features or []
                    },
                    "monthly_payment": round(monthly_payment, 2),
                    "total_cost": round(total_cost, 2),
                    "total_interest": round(total_interest, 2),
                    "debt_ratio": round(debt_ratio, 1),
                    "eligible": eligible,
                    "savings_vs_best": 0  # Calculé après tri
                }
                comparisons.append(comparison_data)
                
            except Exception as calc_error:
                print(f"Erreur calcul pour produit {product.id}: {calc_error}")
                continue
        
        if not comparisons:
            return {
                "comparisons": [],
                "message": "Erreur dans les calculs de comparaison"
            }
        
        # Trier par mensualité croissante
        comparisons.sort(key=lambda x: x["monthly_payment"])
        
        # Calculer les économies par rapport à la meilleure offre
        best_monthly = comparisons[0]["monthly_payment"]
        for comp in comparisons:
            comp["savings_vs_best"] = round(comp["monthly_payment"] - best_monthly, 2)
        
        # Statistiques
        eligible_offers = [c for c in comparisons if c["eligible"]]
        
        result = {
            "comparisons": comparisons,
            "statistics": {
                "total_offers": len(comparisons),
                "eligible_offers": len(eligible_offers),
                "best_rate": min(comparisons, key=lambda x: x["product"]["rate"])["product"]["rate"] if comparisons else 0,
                "average_rate": round(sum(c["product"]["rate"] for c in comparisons) / len(comparisons), 2) if comparisons else 0,
                "lowest_monthly": comparisons[0]["monthly_payment"] if comparisons else 0,
                "highest_monthly": comparisons[-1]["monthly_payment"] if comparisons else 0,
                "max_savings": comparisons[-1]["monthly_payment"] - comparisons[0]["monthly_payment"] if len(comparisons) > 1 else 0
            },
            "search_params": {
                "credit_type": credit_type,
                "amount": amount,
                "duration": duration,
                "monthly_income": monthly_income,
                "current_debts": current_debts
            }
        }
        
        return result
        
    except Exception as e:
        print(f"Erreur dans compare_credit_offers: {str(e)}")
        raise HTTPException(status_code=500, detail=f"Erreur lors de la comparaison: {str(e)}")

@router.get("/borrowing-capacity")
async def calculate_borrowing_capacity(
    monthly_income: float = Query(..., description="Revenus mensuels nets", gt=0),
    current_debts: float = Query(0, description="Charges mensuelles actuelles", ge=0),
    duration_months: int = Query(24, description="Durée souhaitée en mois", ge=6, le=360),
    interest_rate: float = Query(6.5, description="Taux d'intérêt estimé (%)", ge=1, le=20),
    max_debt_ratio: float = Query(33, description="Taux d'endettement maximum (%)", ge=25, le=40),
    down_payment: float = Query(0, description="Apport personnel", ge=0),
    include_insurance: bool = Query(True, description="Inclure assurance emprunteur"),
    insurance_rate: float = Query(0.36, description="Taux d'assurance (% du capital)", ge=0, le=2),
    db: Session = Depends(get_db)
):
    """Calcule la capacité d'emprunt maximale"""
    try:
        # Calcul du revenu disponible pour le crédit
        max_monthly_debt = (monthly_income * max_debt_ratio / 100)
        available_for_credit = max_monthly_debt - current_debts
        
        if available_for_credit <= 0:
            return {
                "borrowing_capacity": 0,
                "max_monthly_payment": 0,
                "total_project_capacity": down_payment,
                "debt_ratio": (current_debts / monthly_income) * 100,
                "recommendations": [
                    f"Vos charges actuelles ({current_debts:,.0f} FCFA) dépassent le seuil d'endettement maximum.",
                    "Réduisez vos dettes actuelles avant d'envisager un nouveau crédit."
                ],
                "details": {
                    "monthly_income": monthly_income,
                    "current_debts": current_debts,
                    "max_debt_ratio": max_debt_ratio,
                    "available_for_credit": available_for_credit
                }
            }
        
        # Calcul de la capacité d'emprunt
        monthly_payment_budget = available_for_credit
        
        # Si assurance incluse, ajuster le budget
        if include_insurance and insurance_rate > 0:
            # Estimation itérative pour inclure l'assurance
            estimated_capital = 0
            for _ in range(5):  # Convergence rapide
                monthly_rate = interest_rate / 100 / 12
                if monthly_rate == 0:
                    temp_capital = monthly_payment_budget * duration_months
                else:
                    temp_capital = monthly_payment_budget * ((1 - (1 + monthly_rate) ** -duration_months) / monthly_rate)
                
                monthly_insurance = (temp_capital * insurance_rate / 100) / 12
                available_for_loan_payment = monthly_payment_budget - monthly_insurance
                
                if available_for_loan_payment <= 0:
                    estimated_capital = 0
                    break
                
                if monthly_rate == 0:
                    estimated_capital = available_for_loan_payment * duration_months
                else:
                    estimated_capital = available_for_loan_payment * ((1 - (1 + monthly_rate) ** -duration_months) / monthly_rate)
                
                if abs(estimated_capital - temp_capital) < 1000:
                    break
            
            borrowing_capacity = max(0, estimated_capital)
            monthly_insurance_cost = (borrowing_capacity * insurance_rate / 100) / 12
        else:
            monthly_rate = interest_rate / 100 / 12
            if monthly_rate == 0:
                borrowing_capacity = monthly_payment_budget * duration_months
            else:
                borrowing_capacity = monthly_payment_budget * ((1 - (1 + monthly_rate) ** -duration_months) / monthly_rate)
            monthly_insurance_cost = 0
        
        # Calculs des coûts
        if borrowing_capacity > 0:
            monthly_rate = interest_rate / 100 / 12
            if monthly_rate == 0:
                actual_monthly_payment = borrowing_capacity / duration_months
            else:
                actual_monthly_payment = borrowing_capacity * (monthly_rate * (1 + monthly_rate) ** duration_months) / ((1 + monthly_rate) ** duration_months - 1)
            
            total_interest = (actual_monthly_payment * duration_months) - borrowing_capacity
            total_cost = actual_monthly_payment * duration_months
            total_with_insurance = total_cost + (monthly_insurance_cost * duration_months)
            actual_debt_ratio = ((actual_monthly_payment + monthly_insurance_cost + current_debts) / monthly_income) * 100
        else:
            actual_monthly_payment = 0
            total_interest = 0
            total_cost = 0
            total_with_insurance = 0
            actual_debt_ratio = (current_debts / monthly_income) * 100
        
        # Total du projet
        total_project_capacity = borrowing_capacity + down_payment
        
        # Recommandations personnalisées
        recommendations = []
        if borrowing_capacity == 0:
            recommendations.append("Capacité d'emprunt insuffisante avec les paramètres actuels.")
            recommendations.append("Considérez augmenter vos revenus ou réduire vos charges.")
        elif actual_debt_ratio > 30:
            recommendations.append("Taux d'endettement élevé. Négociez une durée plus longue pour réduire les mensualités.")
        else:
            recommendations.append("Capacité d'emprunt satisfaisante.")
            if down_payment / total_project_capacity >= 0.2:
                recommendations.append("Excellent apport personnel (≥20%). Vous obtiendrez de meilleures conditions.")
            elif down_payment / total_project_capacity >= 0.1:
                recommendations.append("Bon apport personnel (≥10%).")
            else:
                recommendations.append("Un apport de 10-20% améliorerait vos conditions de financement.")
        
        result = {
            "borrowing_capacity": round(borrowing_capacity, 0),
            "max_monthly_payment": round(actual_monthly_payment + monthly_insurance_cost, 2),
            "total_project_capacity": round(total_project_capacity, 0),
            "debt_ratio": round(actual_debt_ratio, 1),
            "monthly_insurance": round(monthly_insurance_cost, 2),
            "total_interest": round(total_interest, 0),
            "total_cost": round(total_with_insurance, 0),
            "effective_rate": round(interest_rate + (insurance_rate if include_insurance else 0), 2),
            "recommendations": recommendations,
            "details": {
                "monthly_income": monthly_income,
                "current_debts": current_debts,
                "available_for_credit": round(available_for_credit, 2),
                "down_payment": down_payment,
                "duration_months": duration_months,
                "duration_years": round(duration_months / 12, 1),
                "interest_rate": interest_rate,
                "insurance_rate": insurance_rate if include_insurance else 0,
                "max_debt_ratio": max_debt_ratio
            }
        }
        
        return result
        
    except Exception as e:
        print(f"Erreur dans calculate_borrowing_capacity: {str(e)}")
        raise HTTPException(status_code=500, detail=f"Erreur lors du calcul de capacité: {str(e)}")

@router.get("/test")
async def test_credits_endpoint():
    """Test de fonctionnement du router credits"""
    return {
        "status": "OK", 
        "message": "Credits router fonctionne correctement",
        "timestamp": datetime.utcnow().isoformat(),
        "available_endpoints": [
            "/products - Liste des produits de crédit",
            "/simulate - Simulation d'un crédit spécifique", 
            "/simulate-light - Simulation sans sauvegarde DB",
            "/compare - Comparaison d'offres de crédit",
            "/borrowing-capacity - Calcul de capacité d'emprunt",
            "/test - Test du router"
        ]
    }