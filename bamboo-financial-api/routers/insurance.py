# routers/insurance.py - Version adaptée au nouveau parcours par étapes
from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.orm import Session, joinedload
from sqlalchemy import and_, or_
from typing import List, Optional, Dict, Any
from database import get_db
from models import InsuranceProduct, InsuranceCompany, InsuranceQuote
import uuid
from datetime import datetime, timedelta
import json

router = APIRouter()

@router.get("/products")
def get_insurance_products(
    db: Session = Depends(get_db),
    insurance_type: Optional[str] = Query(None, description="Type d'assurance (auto, habitation, vie, sante, voyage, transport)"),
    type: Optional[str] = Query(None, description="Alias pour insurance_type"),
    company_id: Optional[str] = Query(None, description="ID de la compagnie d'assurance"),
    selected_insurers: Optional[str] = Query(None, description="IDs des assureurs sélectionnés (séparés par des virgules)"),
    limit: int = Query(10, le=50),
    offset: int = Query(0, ge=0)
):
    """
    Récupérer les produits d'assurance avec filtres adaptés au parcours par étapes
    Supporte la sélection d'assureurs spécifiques depuis le frontend
    """
    try:
        # Construction de la requête de base
        query = db.query(InsuranceProduct).filter(
            InsuranceProduct.is_active == True
        )
        
        # Jointure avec la compagnie d'assurance
        query = query.join(InsuranceCompany, InsuranceProduct.insurance_company_id == InsuranceCompany.id)
        query = query.filter(InsuranceCompany.is_active == True)
        
        # Filtrer par type d'assurance (gestion des deux paramètres)
        filter_type = insurance_type or type
        if filter_type:
            query = query.filter(InsuranceProduct.type == filter_type)
        
        # Filtrer par compagnie spécifique
        if company_id:
            query = query.filter(InsuranceProduct.insurance_company_id == company_id)
        
        # NOUVEAU : Filtrer par assureurs sélectionnés dans l'étape 3
        if selected_insurers:
            insurer_ids = [id.strip() for id in selected_insurers.split(',') if id.strip()]
            if insurer_ids:
                query = query.filter(InsuranceCompany.id.in_(insurer_ids))
        
        # Chargement eagerly des compagnies
        query = query.options(joinedload(InsuranceProduct.insurance_company))
        
        # Pagination et exécution
        products = query.offset(offset).limit(limit).all()
        
        # Format de la réponse adapté au frontend Angular
        response_data = []
        for product in products:
            try:
                coverage_details = product.coverage_details if isinstance(product.coverage_details, dict) else {}
                deductible_options = product.deductible_options if isinstance(product.deductible_options, dict) else {}
                age_limits = product.age_limits if isinstance(product.age_limits, dict) else {}
                exclusions = product.exclusions if isinstance(product.exclusions, list) else []
                features = product.features if isinstance(product.features, list) else []
                advantages = getattr(product, 'advantages', [])
                advantages = advantages if isinstance(advantages, list) else []
            except Exception:
                coverage_details, deductible_options, age_limits = {}, {}, {}
                exclusions, features, advantages = [], [], []
            
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
                    "solvency_ratio": float(product.insurance_company.solvency_ratio) if product.insurance_company.solvency_ratio else None,
                    "contact_phone": product.insurance_company.contact_phone,
                    "contact_email": product.insurance_company.contact_email,
                    "specialties": product.insurance_company.specialties or []
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

@router.post("/quote")
def create_insurance_quote(
    quote_request: dict,
    db: Session = Depends(get_db)
):
    """
    Créer un devis d'assurance adapté au nouveau parcours par étapes
    Supporte les données structurées du parcours frontend
    """
    try:
        print(f"Quote request received: {quote_request}")
        
        # Extraction des données avec gestion du nouveau format
        insurance_type = (quote_request.get('insurance_type') or 
                         quote_request.get('type') or 
                         'auto')
        
        age = quote_request.get('age', 35)
        risk_factors = quote_request.get('risk_factors', {})
        selected_insurers = quote_request.get('selected_insurers', [])
        guarantees = quote_request.get('guarantees', [])
        session_id = quote_request.get('session_id')
        
        # Validation des paramètres requis
        if not age or age < 18 or age > 80:
            raise HTTPException(status_code=400, detail=f"Âge invalide: {age}. Doit être entre 18 et 80 ans")
        
        # Calcul de la prime selon le type d'assurance et les garanties sélectionnées
        premium = calculate_premium_with_guarantees(insurance_type, age, risk_factors, guarantees)
        
        # Génération du devis principal
        quote_id = str(uuid.uuid4())
        
        # Sauvegarde en base si possible
        try:
            quote = InsuranceQuote(
                id=quote_id,
                session_id=session_id or str(uuid.uuid4()),
                insurance_type=insurance_type,
                age=age,
                risk_factors=risk_factors,
                monthly_premium=premium / 12,
                annual_premium=premium,
                deductible=calculate_deductible(insurance_type),
                coverage_details=get_coverage_for_guarantees(insurance_type, guarantees),
                exclusions=get_default_exclusions(insurance_type),
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
        
        # Génération des devis alternatifs pour les assureurs sélectionnés
        quotes_alternatives = []
        if selected_insurers:
            # Récupérer les compagnies sélectionnées
            companies = db.query(InsuranceCompany).filter(
                InsuranceCompany.id.in_(selected_insurers),
                InsuranceCompany.is_active == True
            ).all()
            
            for company in companies[:3]:  # Limiter à 3 pour l'affichage
                alt_premium = premium * (0.9 + (len(quotes_alternatives) * 0.1))  # Variation de prix
                quotes_alternatives.append({
                    "company_name": company.name,
                    "product_name": f"{insurance_type.title()} {company.name}",
                    "monthly_premium": round(alt_premium / 12, 2),
                    "annual_premium": round(alt_premium, 2),
                    "deductible": calculate_deductible(insurance_type),
                    "rating": company.rating or 4.0,
                    "advantages": get_company_advantages(company.name),
                    "company_id": company.id,
                    "contact_phone": company.contact_phone,
                    "contact_email": company.contact_email
                })
        
        # Si pas d'assureurs sélectionnés, générer des devis génériques
        if not quotes_alternatives:
            quotes_alternatives = [
                create_quote_option("Bamboo Assur", premium * 1.1, insurance_type),
                create_quote_option("OGAR Assurances", premium, insurance_type),
                create_quote_option("NSIA Assurances", premium * 0.9, insurance_type)
            ]
        
        # Préparation de la réponse adaptée au frontend
        response = {
            "quote_id": quote_id,
            "product_name": f"Assurance {insurance_type.title()} Standard",
            "company_name": "Simulateur Bamboo",
            "insurance_type": insurance_type,
            "monthly_premium": round(premium / 12, 2),
            "annual_premium": round(premium, 2),
            "deductible": calculate_deductible(insurance_type),
            "coverage_details": get_coverage_for_guarantees(insurance_type, guarantees),
            "exclusions": get_default_exclusions(insurance_type),
            "valid_until": (datetime.now() + timedelta(days=30)).isoformat(),
            "recommendations": generate_insurance_recommendations(insurance_type, age, guarantees),
            "quotes": quotes_alternatives,
            # Données supplémentaires pour le frontend
            "selected_guarantees": guarantees,
            "selected_insurers_count": len(selected_insurers) if selected_insurers else 0,
            "coverage_summary": generate_coverage_summary(insurance_type, guarantees)
        }
        
        return response
        
    except HTTPException:
        raise
    except Exception as e:
        print(f"Erreur générale dans create_insurance_quote: {str(e)}")
        import traceback
        traceback.print_exc()
        # Fallback vers un devis d'urgence
        return create_emergency_quote(quote_request)

# ==================== NOUVELLES FONCTIONS POUR LE PARCOURS PAR ÉTAPES ====================

def calculate_premium_with_guarantees(insurance_type: str, age: int, risk_factors: dict, guarantees: list) -> float:
    """Calcule la prime en tenant compte des garanties sélectionnées"""
    base_premium = get_base_premium(insurance_type, age, risk_factors)
    
    # Ajustement selon les garanties sélectionnées
    guarantee_multiplier = 1.0
    
    for guarantee in guarantees:
        if guarantee == 'responsabilite_civile':
            guarantee_multiplier += 0.0  # Garantie obligatoire incluse
        elif guarantee == 'dommages_collision':
            guarantee_multiplier += 0.3
        elif guarantee == 'vol':
            guarantee_multiplier += 0.2
        elif guarantee == 'incendie':
            guarantee_multiplier += 0.15
        elif guarantee == 'bris_glace':
            guarantee_multiplier += 0.1
        elif guarantee == 'assistance':
            guarantee_multiplier += 0.05
        elif guarantee == 'degats_eaux':
            guarantee_multiplier += 0.2
        elif guarantee == 'catastrophes_naturelles':
            guarantee_multiplier += 0.25
    
    return base_premium * guarantee_multiplier

def get_base_premium(insurance_type: str, age: int, risk_factors: dict) -> float:
    """Calcul de la prime de base selon le type d'assurance"""
    if insurance_type == 'auto':
        vehicle_value = risk_factors.get('vehicle_value', 15000000)
        base_premium = vehicle_value * 0.003
    elif insurance_type == 'habitation':
        property_value = risk_factors.get('property_value', 25000000)
        base_premium = property_value * 0.002
    elif insurance_type == 'vie':
        coverage_amount = risk_factors.get('coverage_amount', 50000000)
        base_premium = coverage_amount * 0.0015
    elif insurance_type == 'sante':
        family_size = risk_factors.get('family_size', 1)
        base_premium = 45000 * family_size
    elif insurance_type == 'voyage':
        duration = risk_factors.get('duration', 7)
        base_premium = 25000 * (1 + duration / 30)
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
        
    return base_premium * age_factor

def calculate_deductible(insurance_type: str) -> float:
    """Calcule la franchise selon le type d'assurance"""
    deductibles = {
        'auto': 100000,
        'habitation': 50000,
        'vie': 0,
        'sante': 25000,
        'voyage': 0,
        'transport': 150000
    }
    return deductibles.get(insurance_type, 50000)

def get_coverage_for_guarantees(insurance_type: str, guarantees: list) -> dict:
    """Retourne les détails de couverture selon les garanties sélectionnées"""
    all_coverages = get_default_coverage(insurance_type)
    
    # Filtrer selon les garanties sélectionnées
    selected_coverage = {}
    for guarantee in guarantees:
        if guarantee in all_coverages:
            selected_coverage[guarantee] = all_coverages[guarantee]
    
    # Ajouter la responsabilité civile par défaut si c'est une assurance auto
    if insurance_type == 'auto' and 'responsabilite_civile' not in selected_coverage:
        selected_coverage['responsabilite_civile'] = all_coverages.get('responsabilite_civile', 500000000)
    
    return selected_coverage

def generate_coverage_summary(insurance_type: str, guarantees: list) -> dict:
    """Génère un résumé des couvertures pour l'affichage frontend"""
    summary = {
        'total_guarantees': len(guarantees),
        'mandatory_included': 'responsabilite_civile' in guarantees if insurance_type == 'auto' else True,
        'optional_selected': len([g for g in guarantees if g != 'responsabilite_civile']),
        'coverage_level': 'standard'
    }
    
    # Déterminer le niveau de couverture
    if len(guarantees) <= 2:
        summary['coverage_level'] = 'basique'
    elif len(guarantees) >= 5:
        summary['coverage_level'] = 'premium'
    
    return summary

def generate_insurance_recommendations(insurance_type: str, age: int, guarantees: list) -> list:
    """Génère des recommandations personnalisées"""
    recommendations = []
    
    # Recommandations générales par type
    if insurance_type == 'auto':
        if 'vol' not in guarantees:
            recommendations.append("Considérez ajouter la garantie vol pour une protection complète")
        if 'assistance' not in guarantees:
            recommendations.append("L'assistance 24h/24 est très utile au Gabon")
        if age < 25:
            recommendations.append("Suivez un stage de conduite défensive pour réduire votre prime")
    
    elif insurance_type == 'habitation':
        if 'degats_eaux' not in guarantees:
            recommendations.append("Les dégâts des eaux sont fréquents en saison des pluies")
        if 'vol' not in guarantees:
            recommendations.append("Protégez vos biens avec la garantie vol")
    
    # Recommandations générales
    recommendations.extend([
        "Comparez les franchises proposées par chaque assureur",
        "Vérifiez les délais de carence dans les conditions générales",
        "Conservez tous vos justificatifs pour faciliter les déclarations"
    ])
    
    return recommendations

def get_company_advantages(company_name: str) -> list:
    """Retourne les avantages selon la compagnie"""
    advantages = {
        "Bamboo Assur": ["Service client 24/7", "Application mobile", "Tarifs compétitifs"],
        "OGAR Assurances": ["Leader du marché", "Réseau d'agences étendu", "Expertise locale"],
        "NSIA Assurances": ["Groupe panafricain", "Innovation digitale", "Offres flexibles"],
        "AXA Gabon": ["Marque internationale", "Expertise reconnue", "Services premium"],
        "Colina Assurances": ["Spécialiste dommages", "Tarifs attractifs", "Proximité client"],
        "Saham Assurance": ["Groupe Sanlam", "Solutions innovantes", "Accompagnement personnalisé"]
    }
    return advantages.get(company_name, ["Service de qualité", "Expertise reconnue"])

def get_default_coverage(insurance_type: str) -> dict:
    """Retourne les garanties par défaut selon le type"""
    coverage_map = {
        'auto': {
            'responsabilite_civile': 500000000,
            'dommages_collision': 15000000,
            'vol': 15000000,
            'incendie': 15000000,
            'bris_glace': 500000,
            'assistance': 'Incluse'
        },
        'habitation': {
            'incendie': 25000000,
            'degats_eaux': 15000000,
            'vol': 10000000,
            'responsabilite_civile': 100000000,
            'catastrophes_naturelles': 25000000,
            'bris_glace': 2000000
        },
        'vie': {
            'deces': 50000000,
            'invalidite': 50000000,
            'maladie_grave': 25000000
        },
        'sante': {
            'hospitalisation': 20000000,
            'consultations': 2000000,
            'pharmacie': 1500000,
            'dentaire': 1000000,
            'optique': 500000
        },
        'voyage': {
            'assistance_medicale': 50000000,
            'rapatriement': 'Illimité',
            'bagages': 2000000,
            'annulation': 10000000
        },
        'transport': {
            'marchandises': 100000000,
            'responsabilite_transporteur': 50000000,
            'avarie_commune': 'Incluse'
        }
    }
    return coverage_map.get(insurance_type, {})

def get_default_exclusions(insurance_type: str) -> list:
    """Retourne les exclusions par défaut selon le type"""
    exclusions_map = {
        'auto': [
            "Conduite en état d'ivresse ou sous stupéfiants",
            "Usage commercial non déclaré",
            "Courses ou compétitions",
            "Guerre et actes de terrorisme"
        ],
        'habitation': [
            "Négligence grave du souscripteur",
            "Dommages antérieurs à la souscription",
            "Vice de construction",
            "Guerre et émeutes"
        ],
        'vie': [
            "Suicide première année",
            "Sports extrêmes non déclarés",
            "Guerre dans pays de résidence",
            "Fausse déclaration d'état de santé"
        ],
        'sante': [
            "Affections antérieures non déclarées",
            "Cures thermales",
            "Médecines non conventionnelles",
            "Chirurgie esthétique"
        ],
        'voyage': [
            "Voyage dans zones déconseillées",
            "Pratique de sports à risques",
            "État d'ébriété",
            "Négligence caractérisée"
        ],
        'transport': [
            "Vice propre de la marchandise",
            "Emballage insuffisant",
            "Freinte de route normale",
            "Guerre et piraterie"
        ]
    }
    return exclusions_map.get(insurance_type, ["Conditions générales non respectées"])

def create_quote_option(company_name: str, annual_premium: float, insurance_type: str) -> dict:
    """Crée une option de devis pour une compagnie"""
    return {
        "company_name": company_name,
        "product_name": f"{insurance_type.title()} Protection",
        "monthly_premium": round(annual_premium / 12, 2),
        "annual_premium": round(annual_premium, 2),
        "deductible": calculate_deductible(insurance_type),
        "rating": 4.2 if "OGAR" in company_name else 4.0,
        "advantages": get_company_advantages(company_name)
    }

def create_emergency_quote(quote_request: dict) -> dict:
    """Solution de secours ultime"""
    insurance_type = quote_request.get('insurance_type', 'auto')
    age = quote_request.get('age', 35)
    
    return {
        "quote_id": str(uuid.uuid4()),
        "product_name": f"Assurance {insurance_type.title()} Standard",
        "company_name": "Simulateur",
        "insurance_type": insurance_type,
        "monthly_premium": 42000,
        "annual_premium": 500000,
        "deductible": calculate_deductible(insurance_type),
        "coverage_details": get_default_coverage(insurance_type),
        "exclusions": get_default_exclusions(insurance_type),
        "valid_until": (datetime.now() + timedelta(days=30)).isoformat(),
        "recommendations": ["Contactez un conseiller pour plus d'informations"],
        "quotes": [
            {"company_name": "Bamboo Assur", "monthly_premium": 42000, "annual_premium": 500000, "deductible": 50000}
        ]
    }

@router.get("/test")
async def test_insurance_endpoint():
    """Test de fonctionnement du router assurance"""
    return {
        "status": "Insurance router is working",
        "message": "API des assurances fonctionnelle avec parcours par étapes",
        "endpoints": [
            "GET /products - Liste des produits d'assurance (support selected_insurers)",
            "POST /quote - Créer un devis d'assurance (support guarantees)",
            "GET /test - Test de fonctionnement"
        ],
        "new_features": [
            "Support des assureurs sélectionnés",
            "Calcul des primes avec garanties",
            "Recommandations personnalisées",
            "Devis alternatifs par assureur"
        ]
    }