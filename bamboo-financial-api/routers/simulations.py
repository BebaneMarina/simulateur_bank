# routers/simulations.py - Router pour les simulations de crédit et épargne
from fastapi import APIRouter, Depends, HTTPException, Request
from sqlalchemy.orm import Session
from typing import Optional
import uuid
import models
import schemas
from database import get_db
from datetime import datetime
import math

router = APIRouter()

@router.post("/credit", response_model=schemas.CreditSimulationResponse)
async def simulate_credit(
    simulation_request: schemas.CreditSimulationRequest,
    request: Request,
    db: Session = Depends(get_db)
):
    """Effectue une simulation de crédit"""
    
    # Vérifier que le produit existe
    product = db.query(models.CreditProduct).filter(
        models.CreditProduct.id == simulation_request.credit_product_id,
        models.CreditProduct.is_active == True
    ).first()
    
    if not product:
        raise HTTPException(status_code=404, detail="Produit de crédit non trouvé")
    
    # Validation des montants
    if (simulation_request.requested_amount < product.min_amount or 
        simulation_request.requested_amount > product.max_amount):
        raise HTTPException(
            status_code=400, 
            detail=f"Montant demandé doit être entre {product.min_amount} et {product.max_amount} FCFA"
        )
    
    if (simulation_request.duration_months < product.min_duration_months or
        simulation_request.duration_months > product.max_duration_months):
        raise HTTPException(
            status_code=400,
            detail=f"Durée doit être entre {product.min_duration_months} et {product.max_duration_months} mois"
        )
    
    # Calcul de la simulation
    simulation_result = calculate_credit_simulation(simulation_request, product)
    
    # Sauvegarder la simulation
    try:
        db_simulation = models.CreditSimulation(
            id=str(uuid.uuid4()),
            session_id=simulation_request.session_id or str(uuid.uuid4()),
            credit_product_id=simulation_request.credit_product_id,
            requested_amount=simulation_request.requested_amount,
            duration_months=simulation_request.duration_months,
            monthly_income=simulation_request.monthly_income,
            current_debts=simulation_request.current_debts,
            down_payment=simulation_request.down_payment,
            applied_rate=simulation_result.applied_rate,
            monthly_payment=simulation_result.monthly_payment,
            total_cost=simulation_result.total_cost,
            total_interest=simulation_result.total_interest,
            debt_ratio=simulation_result.debt_ratio,
            eligible=simulation_result.eligible,
            risk_score=simulation_result.risk_score,
            recommendations=simulation_result.recommendations,
            amortization_schedule=simulation_result.amortization_schedule,
            client_ip=request.client.host,
            user_agent=request.headers.get("user-agent")
        )
        
        db.add(db_simulation)
        db.commit()
        db.refresh(db_simulation)
        
        simulation_result.id = db_simulation.id
        simulation_result.simulation_id = db_simulation.id
        
    except Exception as e:
        print(f"Erreur sauvegarde simulation: {e}")
        # Continuer même si la sauvegarde échoue
        pass
    
    return simulation_result

@router.post("/savings", response_model=schemas.SavingsSimulationResponse)
async def simulate_savings(
    simulation_request: schemas.SavingsSimulationRequest,
    request: Request,
    db: Session = Depends(get_db)
):
    """Effectue une simulation d'épargne"""
    
    # Vérifier que le produit existe
    product = db.query(models.SavingsProduct).filter(
        models.SavingsProduct.id == simulation_request.savings_product_id,
        models.SavingsProduct.is_active == True
    ).first()
    
    if not product:
        raise HTTPException(status_code=404, detail="Produit d'épargne non trouvé")
    
    # Validation des montants
    if simulation_request.initial_amount < product.minimum_deposit:
        raise HTTPException(
            status_code=400,
            detail=f"Montant initial doit être au moins {product.minimum_deposit} FCFA"
        )
    
    # Calcul de la simulation
    simulation_result = calculate_savings_simulation(simulation_request, product)
    
    # Sauvegarder la simulation
    try:
        db_simulation = models.SavingsSimulation(
            id=str(uuid.uuid4()),
            session_id=simulation_request.session_id or str(uuid.uuid4()),
            savings_product_id=simulation_request.savings_product_id,
            initial_amount=simulation_request.initial_amount,
            monthly_contribution=simulation_request.monthly_contribution,
            duration_months=simulation_request.duration_months,
            final_amount=simulation_result.final_amount,
            total_contributions=simulation_result.total_contributions,
            total_interest=simulation_result.total_interest,
            effective_rate=simulation_result.effective_rate,
            monthly_breakdown=simulation_result.monthly_breakdown,
            recommendations=simulation_result.recommendations,
            client_ip=request.client.host,
            user_agent=request.headers.get("user-agent")
        )
        
        db.add(db_simulation)
        db.commit()
        db.refresh(db_simulation)
        
        simulation_result.id = db_simulation.id
        simulation_result.simulation_id = db_simulation.id
        
    except Exception as e:
        print(f"Erreur sauvegarde simulation épargne: {e}")
        pass
    
    return simulation_result

@router.get("/credit/{simulation_id}", response_model=schemas.CreditSimulationResponse)
async def get_credit_simulation(simulation_id: str, db: Session = Depends(get_db)):
    """Récupère une simulation de crédit"""
    
    simulation = db.query(models.CreditSimulation).filter(
        models.CreditSimulation.id == simulation_id
    ).first()
    
    if not simulation:
        raise HTTPException(status_code=404, detail="Simulation non trouvée")
    
    return simulation

@router.get("/savings/{simulation_id}", response_model=schemas.SavingsSimulationResponse)
async def get_savings_simulation(simulation_id: str, db: Session = Depends(get_db)):
    """Récupère une simulation d'épargne"""
    
    simulation = db.query(models.SavingsSimulation).filter(
        models.SavingsSimulation.id == simulation_id
    ).first()
    
    if not simulation:
        raise HTTPException(status_code=404, detail="Simulation non trouvée")
    
    return simulation

def calculate_credit_simulation(request: schemas.CreditSimulationRequest, product: models.CreditProduct) -> schemas.CreditSimulationResponse:
    """Calcule les détails d'une simulation de crédit"""
    
    # Montant à financer après apport
    financed_amount = request.requested_amount - request.down_payment
    
    # Détermination du taux selon le profil
    applied_rate = determine_credit_rate(request, product)
    
    # Calcul de la mensualité
    monthly_payment = calculate_monthly_payment(
        financed_amount, 
        applied_rate, 
        request.duration_months
    )
    
    # Calculs totaux
    total_cost = monthly_payment * request.duration_months + request.down_payment
    total_interest = total_cost - request.requested_amount
    
    # Ratio d'endettement
    debt_ratio = ((monthly_payment + request.current_debts) / request.monthly_income) * 100
    
    # Éligibilité
    eligible = debt_ratio <= 33 and request.monthly_income >= 200000
    
    # Score de risque
    risk_score = calculate_risk_score(request, debt_ratio)
    
    # Recommandations
    recommendations = generate_credit_recommendations(request, debt_ratio, eligible)
    
    # Tableau d'amortissement
    amortization_schedule = generate_amortization_schedule(
        financed_amount, applied_rate, request.duration_months, monthly_payment
    )
    
    return schemas.CreditSimulationResponse(
        credit_product_id=request.credit_product_id,
        requested_amount=request.requested_amount,
        duration_months=request.duration_months,
        monthly_income=request.monthly_income,
        current_debts=request.current_debts,
        down_payment=request.down_payment,
        applied_rate=applied_rate,
        monthly_payment=monthly_payment,
        total_cost=total_cost,
        total_interest=total_interest,
        debt_ratio=debt_ratio,
        eligible=eligible,
        risk_score=risk_score,
        recommendations=recommendations,
        amortization_schedule=amortization_schedule,
        bank_info={
            "id": product.bank.id,
            "name": product.bank.name,
            "logo_url": product.bank.logo_url
        } if product.bank else None,
        created_at=datetime.utcnow()
    )

def calculate_savings_simulation(request: schemas.SavingsSimulationRequest, product: models.SavingsProduct) -> schemas.SavingsSimulationResponse:
    """Calcule les détails d'une simulation d'épargne"""
    
    # Calcul avec intérêts composés
    monthly_rate = float(product.interest_rate) / 100 / 12
    
    final_amount = request.initial_amount
    total_contributions = request.initial_amount
    monthly_breakdown = []
    
    # Simulation mois par mois
    for month in range(1, request.duration_months + 1):
        # Intérêts sur le capital existant
        monthly_interest = final_amount * monthly_rate
        final_amount += monthly_interest
        
        # Ajout de la contribution mensuelle
        final_amount += request.monthly_contribution
        total_contributions += request.monthly_contribution
        
        monthly_breakdown.append({
            "month": month,
            "balance": round(final_amount, 2),
            "interest": round(monthly_interest, 2),
            "contribution": float(request.monthly_contribution)
        })
    
    total_interest = final_amount - total_contributions
    effective_rate = (total_interest / total_contributions) * 100 if total_contributions > 0 else 0
    
    # Recommandations
    recommendations = generate_savings_recommendations(request, product, final_amount)
    
    return schemas.SavingsSimulationResponse(
        savings_product_id=request.savings_product_id,
        initial_amount=request.initial_amount,
        monthly_contribution=request.monthly_contribution,
        duration_months=request.duration_months,
        final_amount=final_amount,
        total_contributions=total_contributions,
        total_interest=total_interest,
        effective_rate=effective_rate,
        monthly_breakdown=monthly_breakdown,
        recommendations=recommendations,
        product_info={
            "id": product.id,
            "name": product.name,
            "bank_name": product.bank.name if product.bank else None,
            "interest_rate": float(product.interest_rate)
        },
        created_at=datetime.utcnow()
    )

def determine_credit_rate(request: schemas.CreditSimulationRequest, product: models.CreditProduct) -> float:
    """Détermine le taux selon le profil client"""
    base_rate = float(product.average_rate)
    
    # Ajustements selon le profil
    if request.monthly_income > 1000000:
        base_rate -= 0.5  # Réduction pour hauts revenus
    elif request.monthly_income < 300000:
        base_rate += 0.5  # Majoration pour faibles revenus
    
    if request.down_payment / request.requested_amount > 0.2:
        base_rate -= 0.3  # Réduction pour apport important
    
    debt_ratio = ((request.current_debts) / request.monthly_income) * 100
    if debt_ratio > 20:
        base_rate += 0.4  # Majoration pour endettement élevé
    
    # Limites min/max du produit
    min_rate = getattr(product, 'min_rate', base_rate - 1)
    max_rate = getattr(product, 'max_rate', base_rate + 1)
    
    return max(min_rate, min(max_rate, base_rate))

def calculate_monthly_payment(principal: float, annual_rate: float, months: int) -> float:
    """Calcule la mensualité d'un crédit"""
    if annual_rate == 0:
        return principal / months
    
    monthly_rate = annual_rate / 100 / 12
    payment = principal * (monthly_rate * (1 + monthly_rate) ** months) / ((1 + monthly_rate) ** months - 1)
    
    return round(payment, 2)

def calculate_risk_score(request: schemas.CreditSimulationRequest, debt_ratio: float) -> int:
    """Calcule un score de risque de 0 à 100"""
    score = 100
    
    # Pénalité selon le ratio d'endettement
    if debt_ratio > 33:
        score -= 30
    elif debt_ratio > 25:
        score -= 15
    
    # Bonus selon les revenus
    if request.monthly_income > 1000000:
        score += 10
    elif request.monthly_income < 300000:
        score -= 15
    
    # Bonus pour l'apport
    apport_ratio = request.down_payment / request.requested_amount
    if apport_ratio > 0.2:
        score += 15
    elif apport_ratio > 0.1:
        score += 5
    
    return max(0, min(100, score))

def generate_credit_recommendations(request: schemas.CreditSimulationRequest, debt_ratio: float, eligible: bool) -> list:
    """Génère des recommandations personnalisées"""
    recommendations = []
    
    if not eligible:
        recommendations.append("Votre dossier nécessite des ajustements pour être éligible")
        
        if debt_ratio > 33:
            recommendations.append("Réduisez vos charges existantes ou augmentez votre apport")
        
        if request.monthly_income < 200000:
            recommendations.append("Un co-emprunteur pourrait améliorer votre dossier")
    
    else:
        recommendations.append("Votre profil est excellent pour ce financement")
        
        if debt_ratio < 20:
            recommendations.append("Vous pourriez négocier un taux préférentiel")
        
        if request.down_payment / request.requested_amount > 0.2:
            recommendations.append("Votre apport important vous donne un avantage")
    
    recommendations.append("Comparez plusieurs offres avant de vous décider")
    recommendations.append("Négociez l'assurance emprunteur séparément")
    
    return recommendations

def generate_savings_recommendations(request: schemas.SavingsSimulationRequest, product: models.SavingsProduct, final_amount: float) -> list:
    """Génère des recommandations pour l'épargne"""
    recommendations = []
    
    # Recommandations selon le montant final
    if final_amount > 100000000:  # Plus de 100M
        recommendations.append("Excellent objectif d'épargne atteint!")
        recommendations.append("Envisagez de diversifier vos placements")
    
    # Recommandations selon la durée
    if request.duration_months > 60:  # Plus de 5 ans
        recommendations.append("Pensez aux placements long terme plus rémunérateurs")
    
    # Recommandations fiscales
    recommendations.append("Vérifiez les avantages fiscaux de ce produit")
    recommendations.append("Programmez vos versements pour optimiser votre épargne")
    
    return recommendations

def generate_amortization_schedule(principal: float, annual_rate: float, months: int, monthly_payment: float) -> list:
    """Génère le tableau d'amortissement"""
    schedule = []
    remaining_balance = principal
    monthly_rate = annual_rate / 100 / 12
    
    for month in range(1, min(months + 1, 25)):  # Limiter à 24 premières mensualités pour l'affichage
        interest = remaining_balance * monthly_rate
        principal_payment = monthly_payment - interest
        remaining_balance -= principal_payment
        
        schedule.append({
            "month": month,
            "principal": round(principal_payment, 2),
            "interest": round(interest, 2),
            "remaining_balance": round(max(0, remaining_balance), 2)
        })
        
        if remaining_balance <= 0:
            break
    
    return schedule