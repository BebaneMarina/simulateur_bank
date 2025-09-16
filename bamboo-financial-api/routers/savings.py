# routers/savings.py - Version corrigée avec gestion d'erreurs
from fastapi import APIRouter, Depends, HTTPException, Query, Request
from sqlalchemy.orm import Session
from sqlalchemy.exc import SQLAlchemyError, IntegrityError
from sqlalchemy import and_, or_
from typing import List, Optional
import models
import schemas
from database import get_db
import uuid
from datetime import datetime
import logging
import json

logger = logging.getLogger(__name__)
router = APIRouter()

@router.get("/products")
async def get_savings_products(
    skip: int = Query(0, ge=0),
    limit: int = Query(100, ge=1, le=1000),
    type: Optional[str] = Query(None, description="Type d'épargne (livret, terme, plan_epargne)"),
    bank_id: Optional[str] = Query(None, description="ID de la banque"),
    min_rate: Optional[float] = Query(None, description="Taux minimum"),
    liquidity: Optional[str] = Query(None, description="Type de liquidité (immediate, notice, term)"),
    db: Session = Depends(get_db)
):
    """Récupère tous les produits d'épargne avec filtres optionnels"""
    try:
        query = db.query(models.SavingsProduct).join(models.Bank).filter(
            models.SavingsProduct.is_active == True,
            models.Bank.is_active == True
        )
        
        # Appliquer les filtres
        if type:
            query = query.filter(models.SavingsProduct.type == type)
        
        if bank_id:
            query = query.filter(models.SavingsProduct.bank_id == bank_id)
        
        if min_rate is not None:
            query = query.filter(models.SavingsProduct.interest_rate >= min_rate)
        
        if liquidity:
            query = query.filter(models.SavingsProduct.liquidity == liquidity)
        
        # Trier par taux décroissant par défaut
        query = query.order_by(models.SavingsProduct.interest_rate.desc())
        
        products = query.offset(skip).limit(limit).all()
        
        # CORRECTION: Convertir manuellement les objets SQLAlchemy en dictionnaires
        result = []
        for product in products:
            # Convertir la banque
            bank_dict = None
            if product.bank:
                bank_dict = {
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
                    "created_at": product.bank.created_at.isoformat() if product.bank.created_at else None,
                    "updated_at": product.bank.updated_at.isoformat() if product.bank.updated_at else None
                }
            
            # Convertir le produit d'épargne
            product_dict = {
                "id": product.id,
                "bank_id": product.bank_id,
                "name": product.name,
                "type": product.type,
                "description": product.description,
                "interest_rate": float(product.interest_rate),
                "minimum_deposit": float(product.minimum_deposit),
                "maximum_deposit": float(product.maximum_deposit) if product.maximum_deposit else None,
                "minimum_balance": float(product.minimum_balance) if product.minimum_balance else 0,
                "liquidity": product.liquidity,
                "notice_period_days": product.notice_period_days or 0,
                "term_months": product.term_months,
                "compounding_frequency": product.compounding_frequency or "monthly",
                "fees": product.fees or {},
                "features": product.features or [],
                "advantages": product.advantages or [],
                "tax_benefits": product.tax_benefits or [],
                "risk_level": product.risk_level or 1,
                "early_withdrawal_penalty": float(product.early_withdrawal_penalty) if product.early_withdrawal_penalty else None,
                "is_islamic_compliant": product.is_islamic_compliant or False,
                "is_featured": product.is_featured or False,
                "is_active": product.is_active,
                "created_at": product.created_at.isoformat() if product.created_at else None,
                "updated_at": product.updated_at.isoformat() if product.updated_at else None,
                "bank": bank_dict
            }
            
            result.append(product_dict)
        
        logger.info(f"Retrieved {len(result)} savings products")
        return result
        
    except Exception as e:
        logger.error(f"Error retrieving savings products: {str(e)}")
        raise HTTPException(status_code=500, detail=f"Erreur lors de la récupération des produits d'épargne: {str(e)}")

@router.get("/products/{product_id}")
async def get_savings_product(product_id: str, db: Session = Depends(get_db)):
    """Récupère un produit d'épargne par son ID"""
    try:
        product = db.query(models.SavingsProduct).join(models.Bank).filter(
            models.SavingsProduct.id == product_id,
            models.SavingsProduct.is_active == True
        ).first()
        
        if not product:
            raise HTTPException(status_code=404, detail="Produit d'épargne non trouvé")
        
        # CORRECTION: Convertir manuellement en dictionnaire
        bank_dict = None
        if product.bank:
            bank_dict = {
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
                "created_at": product.bank.created_at.isoformat() if product.bank.created_at else None,
                "updated_at": product.bank.updated_at.isoformat() if product.bank.updated_at else None
            }
        
        return {
            "id": product.id,
            "bank_id": product.bank_id,
            "name": product.name,
            "type": product.type,
            "description": product.description,
            "interest_rate": float(product.interest_rate),
            "minimum_deposit": float(product.minimum_deposit),
            "maximum_deposit": float(product.maximum_deposit) if product.maximum_deposit else None,
            "minimum_balance": float(product.minimum_balance) if product.minimum_balance else 0,
            "liquidity": product.liquidity,
            "notice_period_days": product.notice_period_days or 0,
            "term_months": product.term_months,
            "compounding_frequency": product.compounding_frequency or "monthly",
            "fees": product.fees or {},
            "features": product.features or [],
            "advantages": product.advantages or [],
            "tax_benefits": product.tax_benefits or [],
            "risk_level": product.risk_level or 1,
            "early_withdrawal_penalty": float(product.early_withdrawal_penalty) if product.early_withdrawal_penalty else None,
            "is_islamic_compliant": product.is_islamic_compliant or False,
            "is_featured": product.is_featured or False,
            "is_active": product.is_active,
            "created_at": product.created_at.isoformat() if product.created_at else None,
            "updated_at": product.updated_at.isoformat() if product.updated_at else None,
            "bank": bank_dict
        }
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error retrieving savings product {product_id}: {str(e)}")
        raise HTTPException(status_code=500, detail=f"Erreur lors de la récupération du produit: {str(e)}")

@router.post("/simulate")
async def simulate_savings(
    request: schemas.SavingsSimulationRequest,
    db: Session = Depends(get_db),
    http_request: Request = None
):
    """Simule l'épargne avec un produit donné"""
    try:
        # Vérifier que le produit existe et est actif
        product = db.query(models.SavingsProduct).filter(
            models.SavingsProduct.id == request.savings_product_id,
            models.SavingsProduct.is_active == True
        ).first()
        
        if not product:
            raise HTTPException(status_code=404, detail="Produit d'épargne non trouvé")
        
        # Validation des montants
        if request.initial_amount < product.minimum_deposit:
            raise HTTPException(
                status_code=400, 
                detail=f"Dépôt initial minimum: {product.minimum_deposit} FCFA"
            )
        
        if product.maximum_deposit and request.initial_amount > product.maximum_deposit:
            raise HTTPException(
                status_code=400, 
                detail=f"Dépôt initial maximum: {product.maximum_deposit} FCFA"
            )
        
        # Calcul de la simulation
        logger.info(f"Starting simulation calculation for product {product.name}")
        simulation_result = calculate_savings_simulation(
            initial_amount=float(request.initial_amount),
            monthly_contribution=float(request.monthly_contribution),
            annual_rate=float(product.interest_rate),
            duration_months=request.duration_months,
            compounding_frequency=product.compounding_frequency or "monthly"
        )
        
        # Générer les recommandations
        recommendations = generate_savings_recommendations(simulation_result, product)
        
        # Générer un ID de simulation
        simulation_id = str(uuid.uuid4())
        
        # Essayer de sauvegarder en base (optionnel)
        try:
            simulation = models.SavingsSimulation(
                id=simulation_id,
                session_id=request.session_id,
                savings_product_id=request.savings_product_id,
                initial_amount=float(request.initial_amount),
                monthly_contribution=float(request.monthly_contribution),
                duration_months=request.duration_months,
                final_amount=float(simulation_result['final_amount']),
                total_contributions=float(simulation_result['total_contributions']),
                total_interest=float(simulation_result['total_interest']),
                effective_rate=float(simulation_result.get('effective_rate', 0)),
                monthly_breakdown=simulation_result['monthly_breakdown'],
                recommendations=recommendations
            )
            
            db.add(simulation)
            db.commit()
            logger.info(f"Simulation saved with ID: {simulation_id}")
            created_at = datetime.utcnow()
            
        except Exception as db_error:
            logger.warning(f"Could not save simulation to database: {str(db_error)}")
            db.rollback()
            created_at = datetime.utcnow()
        
        # CORRECTION: Retourner un dictionnaire au lieu d'un objet Pydantic
        return {
            "id": simulation_id,
            "final_amount": float(simulation_result['final_amount']),
            "total_contributions": float(simulation_result['total_contributions']),
            "total_interest": float(simulation_result['total_interest']),
            "monthly_breakdown": [
                {
                    "month": entry['month'],
                    "contribution": entry['contribution'],
                    "interest": entry['interest'],
                    "cumulative_amount": entry['balance']  # Changé de 'balance' à 'cumulative_amount'
                } for entry in simulation_result['monthly_breakdown']
            ] if simulation_result['monthly_breakdown'] else [],
            "recommendations": recommendations,
            "created_at": created_at.isoformat()
        }
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error in savings simulation: {str(e)}")
        db.rollback()
        raise HTTPException(status_code=500, detail=f"Erreur lors de la simulation: {str(e)}")

def calculate_savings_simulation(
    initial_amount: float,
    monthly_contribution: float,
    annual_rate: float,
    duration_months: int,
    compounding_frequency: str = "monthly"
) -> dict:
    """Calcule la simulation d'épargne avec intérêts composés"""
    
    logger.info(f"Calculating simulation: initial={initial_amount}, monthly={monthly_contribution}, rate={annual_rate}%, duration={duration_months}m")
    
    # Définir la fréquence de capitalisation
    frequency_map = {
        "daily": 365,
        "monthly": 12,
        "quarterly": 4,
        "annually": 1
    }
    
    compounds_per_year = frequency_map.get(compounding_frequency, 12)
    
    # Taux périodique
    if compounding_frequency == "monthly":
        period_rate = annual_rate / 100 / 12
    else:
        period_rate = annual_rate / 100 / compounds_per_year
    
    balance = initial_amount
    total_contributions = initial_amount
    monthly_breakdown = []
    
    for month in range(1, duration_months + 1):
        # Calcul des intérêts selon la fréquence
        if compounding_frequency == "monthly":
            interest = balance * period_rate
        elif compounding_frequency == "quarterly" and month % 3 == 0:
            quarterly_rate = annual_rate / 100 / 4
            interest = balance * quarterly_rate
        elif compounding_frequency == "annually" and month % 12 == 0:
            interest = balance * (annual_rate / 100)
        else:
            # Approximation mensuelle pour les autres fréquences
            interest = balance * (annual_rate / 100 / 12)
        
        # Ajouter la contribution mensuelle et les intérêts
        balance += monthly_contribution + interest
        total_contributions += monthly_contribution
        
        monthly_breakdown.append({
            "month": month,
            "contribution": float(monthly_contribution),
            "interest": round(float(interest), 2),
            "balance": round(float(balance), 2)
        })
    
    total_interest = balance - total_contributions
    
    # Taux effectif annuel
    if duration_months > 0 and total_contributions > 0:
        years = duration_months / 12
        effective_rate = ((balance / total_contributions) ** (1 / years) - 1) * 100
    else:
        effective_rate = 0
    
    result = {
        "final_amount": round(float(balance), 2),
        "total_contributions": round(float(total_contributions), 2),
        "total_interest": round(float(total_interest), 2),
        "effective_rate": round(float(effective_rate), 2),
        "monthly_breakdown": monthly_breakdown
    }
    
    logger.info(f"Simulation calculated: final_amount={result['final_amount']}, total_interest={result['total_interest']}")
    return result

def generate_savings_recommendations(simulation_result: dict, product) -> List[str]:
    """Génère des recommandations basées sur la simulation"""
    recommendations = []
    
    final_amount = simulation_result['final_amount']
    total_interest = simulation_result['total_interest']
    effective_rate = simulation_result['effective_rate']
    
    # Recommandations basées sur le rendement
    if effective_rate > 5:
        recommendations.append("Excellent rendement ! Votre épargne génère un taux effectif très attractif.")
    elif effective_rate > 3:
        recommendations.append("Bon rendement pour une épargne sécurisée.")
    else:
        recommendations.append("Rendement modéré. Considérez des versements plus élevés ou une durée plus longue.")
    
    # Recommandations sur les intérêts générés
    contribution_ratio = (total_interest / simulation_result['total_contributions']) * 100
    if contribution_ratio > 20:
        recommendations.append("Les intérêts représentent plus de 20% de vos versements. Très bon résultat !")
    elif contribution_ratio > 10:
        recommendations.append("Bonne génération d'intérêts composés.")
    
    # Recommandations spécifiques au produit
    if hasattr(product, 'liquidity'):
        if product.liquidity == 'immediate':
            recommendations.append("Avantage : fonds disponibles immédiatement en cas de besoin.")
        elif product.liquidity == 'term':
            recommendations.append("Épargne bloquée mais rendement garanti sur toute la durée.")
    
    # Recommandation fiscale
    if final_amount > 5000000:
        recommendations.append("Montant important : consultez un conseiller pour l'optimisation fiscale.")
    
    return recommendations

@router.get("/types")
async def get_savings_types(db: Session = Depends(get_db)):
    """Récupère tous les types d'épargne disponibles"""
    try:
        types = db.query(models.SavingsProduct.type).filter(
            models.SavingsProduct.is_active == True
        ).distinct().all()
        
        return [{"type": t[0], "label": get_type_label(t[0])} for t in types]
        
    except Exception as e:
        logger.error(f"Error retrieving savings types: {str(e)}")
        raise HTTPException(status_code=500, detail="Erreur lors de la récupération des types")

def get_type_label(type: str) -> str:
    """Retourne le label français pour un type d'épargne"""
    labels = {
        "livret": "Livret d'Épargne",
        "terme": "Dépôt à Terme",
        "plan_epargne": "Plan d'Épargne",
        "professionnel": "Épargne Professionnelle"
    }
    return labels.get(type, type.title())

@router.get("/test")
async def test_savings_endpoint():
    """Test de fonctionnement du router épargne"""
    return {
        "status": "Savings router is working",
        "message": "API des produits d'épargne fonctionnelle",
        "timestamp": datetime.utcnow().isoformat(),
        "endpoints": [
            "/products",
            "/products/{product_id}",
            "/simulate",
            "/types",
            "/test"
        ]
    }