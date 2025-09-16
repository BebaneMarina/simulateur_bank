# routers/insurance.py - Version corrigée
from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.orm import Session, joinedload
from sqlalchemy import and_, or_
from typing import List, Optional
from database import get_db
from models import InsuranceProduct, InsuranceCompany
import uuid
from datetime import datetime, timedelta
import json

router = APIRouter()

# Import conditionnel pour InsuranceQuote
try:
    from models import InsuranceQuote
    INSURANCE_QUOTE_AVAILABLE = True
except ImportError:
    INSURANCE_QUOTE_AVAILABLE = False
    class InsuranceQuote:
        pass

@router.get("/products")
def get_insurance_products(
    db: Session = Depends(get_db),
    insurance_type: Optional[str] = Query(None, description="Type d'assurance (auto, habitation, vie, sante, voyage, etc.)"),
    type: Optional[str] = Query(None, description="Type d'assurance (auto, habitation, vie, sante, voyage, etc.)"),
    company_id: Optional[str] = Query(None, description="ID de la compagnie d'assurance"),
    min_premium: Optional[float] = Query(None, description="Prime minimum"),
    max_premium: Optional[float] = Query(None, description="Prime maximum"),
    limit: int = Query(10, le=50),
    offset: int = Query(0, ge=0)
):
    """Récupérer les produits d'assurance avec filtres"""
    try:
        # Construction de la requête de base - CORRECTION: éviter la jointure directe
        query = db.query(InsuranceProduct).filter(
            InsuranceProduct.is_active == True
        )
        
        # Jointure avec la compagnie d'assurance pour vérifier qu'elle est active
        query = query.join(InsuranceCompany, InsuranceProduct.insurance_company_id == InsuranceCompany.id)
        query = query.filter(InsuranceCompany.is_active == True)
        
        # Application des filtres - gérer les deux paramètres
        filter_type = insurance_type or type
        if filter_type:
            query = query.filter(InsuranceProduct.type == filter_type)
        
        if company_id:
            query = query.filter(InsuranceProduct.insurance_company_id == company_id)
        
        if min_premium is not None:
            query = query.filter(InsuranceProduct.base_premium >= min_premium)
        
        if max_premium is not None:
            query = query.filter(InsuranceProduct.base_premium <= max_premium)
        
        # CORRECTION: Utiliser options pour la jointure eager loading
        query = query.options(joinedload(InsuranceProduct.insurance_company))
        
        # Pagination et exécution
        products = query.offset(offset).limit(limit).all()
        
        # Format de la réponse avec sérialisation JSON correcte
        response_data = []
        for product in products:
            # Sérialiser les données JSON correctement avec gestion d'erreur
            try:
                coverage_details = product.coverage_details if isinstance(product.coverage_details, dict) else {}
            except Exception:
                coverage_details = {}
                
            try:
                deductible_options = product.deductible_options if isinstance(product.deductible_options, dict) else {}
            except Exception:
                deductible_options = {}
                
            try:
                age_limits = product.age_limits if isinstance(product.age_limits, dict) else {}
            except Exception:
                age_limits = {}
                
            try:
                exclusions = product.exclusions if isinstance(product.exclusions, list) else []
            except Exception:
                exclusions = []
                
            try:
                features = product.features if isinstance(product.features, list) else []
            except Exception:
                features = []
                
            try:
                advantages = getattr(product, 'advantages', [])
                advantages = advantages if isinstance(advantages, list) else []
            except Exception:
                advantages = []
            
            product_data = {
                "id": product.id,
                "name": product.name,
                "type": product.type,
                "description": product.description,
                "base_premium": float(product.base_premium) if product.base_premium else 0,
                "coverage_details": coverage_details,
                "deductible_options": deductible_options,
                "age_limits": age_limits,
                "exclusions": exclusions,
                "features": features,
                "advantages": advantages,
                "is_active": product.is_active,
                "company": {
                    "id": product.insurance_company.id,
                    "name": product.insurance_company.name,
                    "full_name": product.insurance_company.full_name,
                    "logo_url": product.insurance_company.logo_url,
                    "rating": product.insurance_company.rating,
                    "solvency_ratio": float(product.insurance_company.solvency_ratio) if product.insurance_company.solvency_ratio else None
                } if product.insurance_company else None,
                "created_at": product.created_at,
                "updated_at": product.updated_at
            }
            response_data.append(product_data)
        
        return response_data
        
    except Exception as e:
        print(f"Erreur dans get_insurance_products: {str(e)}")
        import traceback
        traceback.print_exc()
        raise HTTPException(status_code=500, detail=f"Erreur lors de la récupération des produits d'assurance: {str(e)}")

# Alternative avec une requête plus simple si le problème persiste
@router.get("/products-simple")
def get_insurance_products_simple(
    db: Session = Depends(get_db),
    insurance_type: Optional[str] = Query(None),
    limit: int = Query(10, le=50),
    offset: int = Query(0, ge=0)
):
    """Version simplifiée pour tester"""
    try:
        # Requête simple sans jointure
        query = db.query(InsuranceProduct).filter(
            InsuranceProduct.is_active == True
        )
        
        if insurance_type:
            query = query.filter(InsuranceProduct.type == insurance_type)
        
        products = query.offset(offset).limit(limit).all()
        
        # Récupérer les compagnies séparément
        response_data = []
        for product in products:
            company = db.query(InsuranceCompany).filter(
                InsuranceCompany.id == product.insurance_company_id
            ).first()
            
            product_data = {
                "id": product.id,
                "name": product.name,
                "type": product.type,
                "description": product.description,
                "base_premium": float(product.base_premium) if product.base_premium else 0,
                "is_active": product.is_active,
                "company": {
                    "id": company.id,
                    "name": company.name,
                    "full_name": company.full_name
                } if company else None
            }
            response_data.append(product_data)
        
        return response_data
        
    except Exception as e:
        print(f"Erreur dans get_insurance_products_simple: {str(e)}")
        raise HTTPException(status_code=500, detail=f"Erreur: {str(e)}")

@router.post("/quote")
def create_insurance_quote(
    quote_request: dict,
    db: Session = Depends(get_db)
):
    """Créer un devis d'assurance"""
    try:
        print(f"Quote request received: {quote_request}")
        
        # Extraire les données avec validation
        product_id = (quote_request.get('insurance_product_id') or 
                     quote_request.get('product_id') or 
                     quote_request.get('productId'))
        
        age = quote_request.get('age')
        risk_factors = quote_request.get('risk_factors', {})
        coverage_amount = quote_request.get('coverage_amount')
        session_id = quote_request.get('session_id')
        insurance_type = (quote_request.get('insurance_type') or 
                         quote_request.get('type') or 
                         'auto')
        
        print(f"Extracted - product_id: {product_id}, age: {age}, insurance_type: {insurance_type}")
        
        # Validation des paramètres requis
        if not age or age < 18 or age > 80:
            raise HTTPException(status_code=400, detail=f"Âge invalide: {age}. Doit être entre 18 et 80 ans")
        
        # Si pas de product_id, créer un devis générique
        if not product_id:
            print("Pas de product_id, création d'un devis générique")
            return create_mock_quote(quote_request, db)
        
        # Vérifier que le produit existe avec requête simple
        try:
            product = db.query(InsuranceProduct).filter(
                InsuranceProduct.id == product_id,
                InsuranceProduct.is_active == True
            ).first()
            
            if product:
                # Récupérer la compagnie séparément
                company = db.query(InsuranceCompany).filter(
                    InsuranceCompany.id == product.insurance_company_id,
                    InsuranceCompany.is_active == True
                ).first()
                
                if not company:
                    print(f"Compagnie inactive pour le produit {product_id}")
                    return create_mock_quote(quote_request, db)
                    
                # Attacher la compagnie au produit pour la compatibilité
                product.insurance_company = company
                
        except Exception as e:
            print(f"Erreur lors de la récupération du produit: {e}")
            return create_mock_quote(quote_request, db)
        
        if not product:
            print(f"Produit {product_id} non trouvé, création d'un devis simulé")
            return create_mock_quote(quote_request, db)
        
        # Vérifier les limites d'âge
        age_limits = product.age_limits if isinstance(product.age_limits, dict) else {}
        min_age = age_limits.get('min_age', 18)
        max_age = age_limits.get('max_age', 75)
        
        if age < min_age or age > max_age:
            raise HTTPException(
                status_code=400, 
                detail=f"Âge non éligible pour ce produit. Âge requis: {min_age}-{max_age} ans"
            )
        
        # Calculer la prime selon le type d'assurance
        try:
            if insurance_type == 'auto':
                premium = calculate_auto_premium(product, age, risk_factors, coverage_amount)
            elif insurance_type == 'habitation':
                premium = calculate_home_premium(product, risk_factors, coverage_amount)
            elif insurance_type == 'vie':
                premium = calculate_life_premium(product, age, risk_factors, coverage_amount)
            elif insurance_type == 'sante':
                premium = calculate_health_premium(product, age, risk_factors)
            elif insurance_type == 'voyage':
                premium = calculate_travel_premium(product, age, risk_factors)
            else:
                premium = float(product.base_premium) if product.base_premium else 50000
        except Exception as e:
            print(f"Erreur calcul prime: {e}")
            premium = 50000  # Valeur par défaut
        
        # Créer le devis
        quote_id = str(uuid.uuid4())
        
        # Sauvegarder en base si le modèle InsuranceQuote est disponible
        if INSURANCE_QUOTE_AVAILABLE:
            try:
                quote = InsuranceQuote(
                    id=quote_id,
                    session_id=session_id or str(uuid.uuid4()),
                    insurance_product_id=product_id,
                    insurance_type=insurance_type,
                    age=age,
                    risk_factors=risk_factors,
                    coverage_amount=coverage_amount,
                    monthly_premium=premium / 12,
                    annual_premium=premium,
                    deductible=50000,
                    coverage_details=product.coverage_details if isinstance(product.coverage_details, dict) else {},
                    exclusions=product.exclusions if isinstance(product.exclusions, list) else [],
                    valid_until=datetime.now() + timedelta(days=30),
                    created_at=datetime.now()
                )
                
                db.add(quote)
                db.commit()
                db.refresh(quote)
                print(f"Devis sauvegardé avec ID: {quote_id}")
            except Exception as e:
                print(f"Erreur sauvegarde devis: {e}")
                db.rollback()
        
        # Préparer la réponse
        coverage_details = product.coverage_details if isinstance(product.coverage_details, dict) else {}
        exclusions = product.exclusions if isinstance(product.exclusions, list) else []
        
        return {
            "quote_id": quote_id,
            "product_name": product.name,
            "company_name": product.insurance_company.name if product.insurance_company else "Compagnie Test",
            "insurance_type": insurance_type,
            "coverage_amount": coverage_amount,
            "monthly_premium": round(premium / 12, 2),
            "annual_premium": round(premium, 2),
            "deductible": 50000,
            "coverage_details": coverage_details,
            "exclusions": exclusions,
            "valid_until": (datetime.now() + timedelta(days=30)).isoformat(),
            "recommendations": generate_insurance_recommendations(product, age, insurance_type),
            "quotes": [
                create_quote_option("Bamboo Assur", premium * 1.1, insurance_type),
                create_quote_option("OGAR Assurances", premium, insurance_type),
                create_quote_option("NSIA Assurances", premium * 0.9, insurance_type)
            ]
        }
        
    except HTTPException:
        raise
    except Exception as e:
        print(f"Erreur générale dans create_insurance_quote: {str(e)}")
        # En cas d'erreur, retourner un devis simulé
        try:
            return create_mock_quote(quote_request, db)
        except Exception as fallback_error:
            print(f"Erreur même dans le fallback: {fallback_error}")
            return create_emergency_quote()

def create_mock_quote(quote_request, db):
    """Créer un devis simulé en cas d'erreur ou de produit manquant"""
    try:
        print(f"Création d'un devis mock avec: {quote_request}")
        
        age = quote_request.get('age', 35)
        insurance_type = (quote_request.get('insurance_type') or 
                         quote_request.get('type') or 
                         'auto')
        risk_factors = quote_request.get('risk_factors') or {}
        coverage_amount = quote_request.get('coverage_amount')
        
        # Validation de l'âge
        if not isinstance(age, (int, float)) or age < 18 or age > 80:
            age = 35
        
        # Calculs de base selon le type
        if insurance_type == 'auto':
            vehicle_value = 15000000
            if isinstance(risk_factors, dict):
                vehicle_value = risk_factors.get('vehicle_value', vehicle_value)
                if not isinstance(vehicle_value, (int, float)) or vehicle_value <= 0:
                    vehicle_value = 15000000
            base_premium = vehicle_value * 0.003
            
        elif insurance_type == 'habitation':
            property_value = 25000000
            if isinstance(risk_factors, dict):
                property_value = risk_factors.get('property_value', property_value)
                if not isinstance(property_value, (int, float)) or property_value <= 0:
                    property_value = 25000000
            base_premium = property_value * 0.002
            
        elif insurance_type == 'vie':
            capital = coverage_amount or 50000000
            if not isinstance(capital, (int, float)) or capital <= 0:
                capital = 50000000
            base_premium = capital * 0.0015
            
        elif insurance_type == 'sante':
            family_size = 1
            if isinstance(risk_factors, dict):
                family_size = risk_factors.get('family_size', 1)
                if not isinstance(family_size, (int, float)) or family_size < 1:
                    family_size = 1
            base_premium = 45000 * family_size
            
        elif insurance_type == 'voyage':
            base_premium = 25000
            if isinstance(risk_factors, dict):
                duration = risk_factors.get('duration', 7)
                if isinstance(duration, (int, float)) and duration > 0:
                    base_premium = base_premium * (1 + duration / 30)
        else:
            base_premium = 50000
        
        # Ajustement selon l'âge
        if age < 25:
            age_factor = 1.3
        elif age < 40:
            age_factor = 1.0
        elif age < 60:
            age_factor = 1.1
        else:
            age_factor = 1.2
            
        final_premium = base_premium * age_factor
        final_premium = max(20000, min(final_premium, 2000000))
        
        quote_id = str(uuid.uuid4())
        
        return {
            "quote_id": quote_id,
            "product_name": f"Assurance {insurance_type.title()} Standard",
            "company_name": "Simulateur Bamboo",
            "insurance_type": insurance_type,
            "coverage_amount": coverage_amount,
            "monthly_premium": round(final_premium / 12, 2),
            "annual_premium": round(final_premium, 2),
            "deductible": 50000,
            "coverage_details": get_default_coverage(insurance_type),
            "exclusions": get_default_exclusions(insurance_type),
            "valid_until": (datetime.now() + timedelta(days=30)).isoformat(),
            "recommendations": get_default_recommendations(insurance_type),
            "quotes": [
                create_quote_option("Bamboo Assur", final_premium * 1.1, insurance_type),
                create_quote_option("OGAR Assurances", final_premium, insurance_type),
                create_quote_option("NSIA Assurances", final_premium * 0.9, insurance_type)
            ]
        }
        
    except Exception as e:
        print(f"Erreur dans create_mock_quote: {e}")
        return create_emergency_quote()

def create_emergency_quote():
    """Solution de secours ultime"""
    return {
        "quote_id": str(uuid.uuid4()),
        "product_name": "Assurance Standard",
        "company_name": "Simulateur",
        "insurance_type": "auto",
        "monthly_premium": 42000,
        "annual_premium": 500000,
        "deductible": 50000,
        "coverage_details": {"responsabilite_civile": 500000000},
        "exclusions": ["Conditions non respectées"],
        "valid_until": (datetime.now() + timedelta(days=30)).isoformat(),
        "recommendations": ["Contactez un conseiller"],
        "quotes": [
            {"company_name": "Bamboo Assur", "monthly_premium": 42000, "annual_premium": 500000, "deductible": 50000}
        ]
    }

def create_quote_option(company_name, annual_premium, insurance_type):
    """Créer une option de devis pour une compagnie"""
    return {
        "company_name": company_name,
        "product_name": f"{insurance_type.title()} Protection",
        "monthly_premium": round(annual_premium / 12, 2),
        "annual_premium": round(annual_premium, 2),
        "deductible": 50000,
        "rating": 4.2 if "OGAR" in company_name else 4.0,
        "advantages": get_company_advantages(company_name)
    }    

def get_company_advantages(company_name):
    """Retourner les avantages selon la compagnie"""
    advantages = {
        "Bamboo Assur": ["Service client 24/7", "Application mobile", "Tarifs compétitifs"],
        "OGAR Assurances": ["Leader du marché", "Réseau d'agences étendu", "Expertise locale"],
        "NSIA Assurances": ["Groupe panafricain", "Innovation digitale", "Offres flexibles"]
    }
    return advantages.get(company_name, ["Service de qualité", "Expertise reconnue"])

def get_default_coverage(insurance_type):
    """Retourner les garanties par défaut selon le type"""
    coverage_map = {
        'auto': {
            'responsabilite_civile': 500000000,
            'dommages_collision': 15000000,
            'vol': 15000000,
            'incendie': 15000000
        },
        'habitation': {
            'incendie': 25000000,
            'degats_eaux': 15000000,
            'vol': 10000000,
            'responsabilite_civile': 100000000
        },
        'vie': {
            'deces': 50000000,
            'invalidite': 50000000
        },
        'sante': {
            'hospitalisation': 20000000,
            'consultations': 2000000,
            'pharmacie': 1500000
        }
    }
    return coverage_map.get(insurance_type, {})

def get_default_exclusions(insurance_type):
    """Retourner les exclusions par défaut selon le type"""
    exclusions_map = {
        'auto': ["Conduite en état d'ivresse", "Usage commercial non déclaré"],
        'habitation': ["Négligence grave", "Dommages antérieurs"],
        'vie': ["Suicide première année", "Sports extrêmes"],
        'sante': ["Affections antérieures non déclarées", "Médecines douces"]
    }
    return exclusions_map.get(insurance_type, ["Conditions générales non respectées"])

def get_default_recommendations(insurance_type):
    """Retourner les recommandations par défaut selon le type"""
    recommendations_map = {
        'auto': ["Comparez les franchises", "Vérifiez les garanties", "Négociez les tarifs"],
        'habitation': ["Évaluez correctement vos biens", "Sécurisez votre logement"],
        'vie': ["Adaptez le capital à vos besoins", "Déclarez votre état de santé"],
        'sante': ["Choisissez selon vos besoins", "Vérifiez le réseau de soins"]
    }
    return recommendations_map.get(insurance_type, ["Lisez les conditions", "Comparez les offres"])

# Fonctions de calcul des primes (identiques au code original)
def calculate_auto_premium(product, age, risk_factors, coverage_amount):
    base_premium = float(product.base_premium) if product.base_premium else 50000
    vehicle_value = risk_factors.get('vehicle_value', 10000000)
    experience = risk_factors.get('experience', 5)
    location = risk_factors.get('location', 'Libreville')
    
    age_factor = 1.5 if age < 25 else 1.2 if age < 30 else 1.0 if age < 60 else 1.1
    experience_factor = 1.4 if experience < 2 else 1.2 if experience < 5 else 1.0 if experience < 10 else 0.9
    location_factor = 1.2 if location == 'Libreville' else 1.0
    value_factor = vehicle_value / 10000000
    
    premium = base_premium * age_factor * experience_factor * location_factor * value_factor
    return max(premium, base_premium * 0.5)

def calculate_home_premium(product, risk_factors, coverage_amount):
    base_premium = float(product.base_premium) if product.base_premium else 30000
    property_value = risk_factors.get('property_value', 30000000)
    location = risk_factors.get('location', 'Libreville')
    security = risk_factors.get('security', 'standard')
    
    value_factor = property_value / 30000000
    location_factor = 1.3 if location == 'Libreville' else 1.1 if location == 'Port-Gentil' else 1.0
    security_factor = 0.9 if security == 'high' else 1.0 if security == 'standard' else 1.2
    
    premium = base_premium * value_factor * location_factor * security_factor
    return max(premium, base_premium * 0.3)

def calculate_life_premium(product, age, risk_factors, coverage_amount):
    base_premium = float(product.base_premium) if product.base_premium else 45000
    capital = coverage_amount or 25000000
    profession = risk_factors.get('profession', 'standard')
    health = risk_factors.get('health', 'good')
    
    age_factor = 0.8 if age < 30 else 1.0 if age < 45 else 1.5 if age < 60 else 2.0
    capital_factor = capital / 25000000
    profession_factor = 1.5 if profession in ['militaire', 'policier'] else 1.2 if profession in ['pilote', 'marin'] else 1.0
    health_factor = 0.9 if health == 'excellent' else 1.0 if health == 'good' else 1.3
    
    premium = base_premium * age_factor * capital_factor * profession_factor * health_factor
    return max(premium, base_premium * 0.2)

def calculate_health_premium(product, age, risk_factors):
    base_premium = float(product.base_premium) if product.base_premium else 85000
    family_size = risk_factors.get('family_size', 1)
    medical_history = risk_factors.get('medical_history', 'good')
    
    age_factor = 1.0 if age < 35 else 1.2 if age < 50 else 1.5 if age < 65 else 2.0
    family_factor = 1.0 + (family_size - 1) * 0.7
    medical_factor = 0.9 if medical_history == 'excellent' else 1.0 if medical_history == 'good' else 1.4
    
    premium = base_premium * age_factor * family_factor * medical_factor
    return max(premium, base_premium * 0.5)

def calculate_travel_premium(product, age, risk_factors):
    base_premium = float(product.base_premium) if product.base_premium else 25000
    destination = risk_factors.get('destination', 'Europe')
    duration = risk_factors.get('duration', 7)
    activities = risk_factors.get('activities', 'tourism')
    
    destination_factor = {
        'Europe': 1.0,
        'Amerique': 1.2,
        'Asie': 1.1,
        'Afrique': 0.8,
        'Oceanie': 1.3
    }.get(destination, 1.0)
    
    duration_factor = 1.0 + (duration / 30) * 0.5
    activity_factor = 2.0 if activities == 'sports_extremes' else 1.3 if activities == 'aventure' else 1.0
    age_factor = 1.2 if age > 65 else 1.0
    
    premium = base_premium * destination_factor * duration_factor * activity_factor * age_factor
    return max(premium, base_premium * 0.3)

def generate_insurance_recommendations(product, age, insurance_type):
    """Générer des recommandations pour le devis"""
    recommendations = []
    
    if insurance_type == 'auto':
        recommendations.extend([
            "Conduisez prudemment pour bénéficier de bonus",
            "Installez un système antivol pour réduire les risques"
        ])
        if age < 25:
            recommendations.append("Suivez un stage de conduite défensive")
    
    elif insurance_type == 'habitation':
        recommendations.extend([
            "Installez des détecteurs de fumée",
            "Vérifiez régulièrement vos installations électriques",
            "Sécurisez votre domicile contre le vol"
        ])
    
    elif insurance_type == 'vie':
        recommendations.extend([
            "Déclarez tous vos antécédents médicaux",
            "Maintenez un mode de vie sain",
            "Mettez à jour vos bénéficiaires régulièrement"
        ])
    
    elif insurance_type == 'sante':
        recommendations.extend([
            "Effectuez des bilans de santé réguliers",
            "Prévenez plutôt que guérir",
            "Utilisez le réseau de soins partenaires"
        ])
    
    elif insurance_type == 'voyage':
        recommendations.extend([
            "Vérifiez les conditions sanitaires de destination",
            "Emportez une trousse de premiers secours",
            "Conservez les coordonnées d'urgence"
        ])
    
    recommendations.extend([
        "Lisez attentivement les conditions générales",
        "Conservez tous vos justificatifs"
    ])
    
    return recommendations

@router.get("/test")
async def test_insurance_endpoint():
    """Test de fonctionnement du router assurance"""
    return {
        "status": "Insurance router is working",
        "message": "API des assurances fonctionnelle",
        "quote_model_available": INSURANCE_QUOTE_AVAILABLE,
        "endpoints": [
            "GET /products - Liste des produits d'assurance",
            "GET /products-simple - Version simplifiée pour test",
            "POST /quote - Créer un devis d'assurance",
            "GET /test - Test de fonctionnement"
        ]
    }