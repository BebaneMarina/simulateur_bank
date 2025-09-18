# routers/insurance.py - Version optimisée pour le parcours par étapes
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
    insurance_type: Optional[str] = Query(None, description="Type d'assurance"),
    type: Optional[str] = Query(None, description="Alias pour insurance_type"),
    company_id: Optional[str] = Query(None, description="ID de la compagnie"),
    selected_insurers: Optional[str] = Query(None, description="IDs des assureurs séparés par virgules"),
    limit: int = Query(20, le=50),
    offset: int = Query(0, ge=0)
):
    """
    Récupérer les produits d'assurance pour le parcours par étapes
    """
    try:
        # Construction de la requête de base
        query = db.query(InsuranceProduct).filter(InsuranceProduct.is_active == True)
        query = query.join(InsuranceCompany, InsuranceProduct.insurance_company_id == InsuranceCompany.id)
        query = query.filter(InsuranceCompany.is_active == True)
        
        # Filtrer par type d'assurance
        filter_type = insurance_type or type
        if filter_type:
            query = query.filter(InsuranceProduct.type == filter_type)
        
        # Filtrer par compagnie spécifique
        if company_id:
            query = query.filter(InsuranceProduct.insurance_company_id == company_id)
        
        # Filtrer par assureurs sélectionnés (étape 3)
        if selected_insurers:
            insurer_ids = [id.strip() for id in selected_insurers.split(',') if id.strip()]
            if insurer_ids:
                query = query.filter(InsuranceCompany.id.in_(insurer_ids))
        
        # Chargement eagerly des compagnies
        query = query.options(joinedload(InsuranceProduct.insurance_company))
        
        # Pagination
        products = query.offset(offset).limit(limit).all()
        
        # Format de réponse adapté au frontend
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
                "company": format_company_data(product.insurance_company) if product.insurance_company else None,
                "created_at": product.created_at.isoformat() if product.created_at else None,
                "updated_at": product.updated_at.isoformat() if product.updated_at else None
            }
            response_data.append(product_data)
        
        return response_data
        
    except Exception as e:
        print(f"Erreur dans get_insurance_products: {str(e)}")
        raise HTTPException(status_code=500, detail=f"Erreur lors de la récupération des produits: {str(e)}")

@router.get("/companies")
def get_insurance_companies(
    db: Session = Depends(get_db),
    insurance_type: Optional[str] = Query(None, description="Type d'assurance pour filtrer"),
    specialties: Optional[str] = Query(None, description="Spécialités séparées par virgules"),
    is_active: Optional[bool] = Query(True, description="Compagnies actives seulement")
):
    """
    Récupérer les compagnies d'assurance pour l'étape 3 du parcours
    """
    try:
        query = db.query(InsuranceCompany)
        
        if is_active is not None:
            query = query.filter(InsuranceCompany.is_active == is_active)
        
        # Filtrer par spécialités si spécifié
        if specialties:
            specialty_list = [s.strip() for s in specialties.split(',')]
            # Supposons que specialties est un champ JSON dans la DB
            for specialty in specialty_list:
                query = query.filter(InsuranceCompany.specialties.contains([specialty]))
        
        companies = query.all()
        
        return [format_company_data(company) for company in companies]
        
    except Exception as e:
        print(f"Erreur dans get_insurance_companies: {str(e)}")
        raise HTTPException(status_code=500, detail=f"Erreur lors de la récupération des compagnies: {str(e)}")

@router.post("/quote")
def create_insurance_quote(quote_request: dict, db: Session = Depends(get_db)):
    """
    Créer un devis d'assurance adapté au parcours par étapes
    """
    try:
        print(f"Quote request received: {quote_request}")
        
        # Extraction des données du nouveau format
        insurance_type = quote_request.get('insurance_type', 'auto')
        age = quote_request.get('age', 35)
        risk_factors = quote_request.get('risk_factors', {})
        selected_insurers = quote_request.get('selected_insurers', [])
        guarantees = quote_request.get('guarantees', [])
        session_id = quote_request.get('session_id')
        
        # Validation
        if not age or age < 18 or age > 80:
            raise HTTPException(status_code=400, detail=f"Âge invalide: {age}")
        
        if not guarantees:
            raise HTTPException(status_code=400, detail="Au moins une garantie doit être sélectionnée")
        
        if not selected_insurers:
            raise HTTPException(status_code=400, detail="Au moins un assureur doit être sélectionné")
        
        # Calcul de la prime avec garanties
        premium = calculate_premium_with_guarantees(insurance_type, age, risk_factors, guarantees)
        
        # Génération du devis principal
        quote_id = str(uuid.uuid4())
        
        # Sauvegarde en base
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
        except Exception as e:
            print(f"Erreur sauvegarde devis: {e}")
            db.rollback()
        
        # Génération des devis alternatifs pour les assureurs sélectionnés
        quotes_alternatives = generate_alternative_quotes(
            db, selected_insurers, premium, insurance_type, guarantees
        )
        
        # Préparation de la réponse
        response = {
            "quote_id": quote_id,
            "product_name": f"Assurance {insurance_type.title()} Personnalisée",
            "company_name": "Comparateur Bamboo",
            "insurance_type": insurance_type,
            "monthly_premium": round(premium / 12, 2),
            "annual_premium": round(premium, 2),
            "deductible": calculate_deductible(insurance_type),
            "coverage_details": get_coverage_for_guarantees(insurance_type, guarantees),
            "exclusions": get_default_exclusions(insurance_type),
            "valid_until": (datetime.now() + timedelta(days=30)).isoformat(),
            "recommendations": generate_recommendations(insurance_type, age, guarantees, risk_factors),
            "quotes": quotes_alternatives,
            # Données supplémentaires pour le frontend
            "selected_guarantees": guarantees,
            "selected_insurers_count": len(selected_insurers),
            "coverage_summary": {
                "total_guarantees": len(guarantees),
                "mandatory_included": has_mandatory_guarantees(insurance_type, guarantees),
                "optional_selected": count_optional_guarantees(insurance_type, guarantees),
                "coverage_level": determine_coverage_level(guarantees)
            }
        }
        
        return response
        
    except HTTPException:
        raise
    except Exception as e:
        print(f"Erreur générale dans create_insurance_quote: {str(e)}")
        return create_fallback_quote(quote_request)

@router.get("/guarantees/{insurance_type}")
def get_available_guarantees(insurance_type: str):
    """
    Récupérer les garanties disponibles pour un type d'assurance
    """
    guarantees_map = {
        'auto': [
            {'id': 'responsabilite_civile', 'name': 'Responsabilité civile', 'description': 'Obligatoire - Dommages causés aux tiers', 'required': True, 'icon': '🛡️'},
            {'id': 'dommages_collision', 'name': 'Dommages collision', 'description': 'Réparation de votre véhicule en cas d\'accident', 'required': False, 'icon': '🚗'},
            {'id': 'vol', 'name': 'Vol', 'description': 'Protection contre le vol du véhicule', 'required': False, 'icon': '🔒'},
            {'id': 'incendie', 'name': 'Incendie', 'description': 'Dommages causés par le feu', 'required': False, 'icon': '🔥'},
            {'id': 'bris_glace', 'name': 'Bris de glace', 'description': 'Réparation/remplacement des vitres', 'required': False, 'icon': '🪟'},
            {'id': 'assistance', 'name': 'Assistance', 'description': 'Dépannage et remorquage 24h/24', 'required': False, 'icon': '🆘'}
        ],
        'habitation': [
            {'id': 'incendie', 'name': 'Incendie/Explosion', 'description': 'Protection contre les dégâts d\'incendie', 'required': True, 'icon': '🔥'},
            {'id': 'degats_eaux', 'name': 'Dégâts des eaux', 'description': 'Fuites, ruptures de canalisations', 'required': False, 'icon': '💧'},
            {'id': 'vol', 'name': 'Vol/Cambriolage', 'description': 'Protection des biens mobiliers', 'required': False, 'icon': '🔒'},
            {'id': 'responsabilite_civile', 'name': 'Responsabilité civile', 'description': 'Dommages causés aux tiers', 'required': False, 'icon': '⚖️'},
            {'id': 'catastrophes_naturelles', 'name': 'Catastrophes naturelles', 'description': 'Événements climatiques exceptionnels', 'required': False, 'icon': '🌪️'},
            {'id': 'bris_glace', 'name': 'Bris de glace', 'description': 'Vitres, miroirs, sanitaires', 'required': False, 'icon': '🪟'}
        ],
        'vie': [
            {'id': 'deces', 'name': 'Décès toutes causes', 'description': 'Capital versé aux bénéficiaires en cas de décès', 'required': True, 'icon': '💙'},
            {'id': 'invalidite', 'name': 'Invalidité permanente totale', 'description': 'Protection en cas d\'invalidité totale et définitive', 'required': False, 'icon': '♿'},
            {'id': 'maladie_grave', 'name': 'Maladies graves', 'description': 'Capital versé pour cancer, AVC, infarctus...', 'required': False, 'icon': '🏥'},
            {'id': 'rente_education', 'name': 'Rente éducation', 'description': 'Financement des études des enfants', 'required': False, 'icon': '🎓'},
            {'id': 'exoneration_primes', 'name': 'Exonération des primes', 'description': 'Maintien du contrat sans paiement en cas d\'incapacité', 'required': False, 'icon': '💰'},
            {'id': 'double_effet', 'name': 'Double effet accidentel', 'description': 'Capital doublé en cas de décès accidentel', 'required': False, 'icon': '⚡'}
        ],
        'sante': [
            {'id': 'hospitalisation', 'name': 'Hospitalisation', 'description': 'Frais d\'hospitalisation et chirurgie', 'required': True, 'coverage': '100%', 'icon': '🏥'},
            {'id': 'consultations', 'name': 'Consultations médicales', 'description': 'Généralistes et spécialistes', 'required': False, 'recommended': True, 'coverage': '70-80%', 'icon': '👨‍⚕️'},
            {'id': 'pharmacie', 'name': 'Médicaments', 'description': 'Médicaments prescrits', 'required': False, 'recommended': True, 'coverage': '60-80%', 'icon': '💊'},
            {'id': 'dentaire', 'name': 'Soins dentaires', 'description': 'Soins et prothèses dentaires', 'required': False, 'coverage': '50-70%', 'icon': '🦷'},
            {'id': 'optique', 'name': 'Optique', 'description': 'Lunettes et lentilles de contact', 'required': False, 'coverage': '100-300 €', 'icon': '👓'},
            {'id': 'maternite', 'name': 'Maternité', 'description': 'Suivi grossesse et accouchement', 'required': False, 'coverage': '100%', 'icon': '🤱'}
        ],
        'voyage': [
            {'id': 'assistance_medicale', 'name': 'Assistance médicale', 'description': 'Soins médicaux d\'urgence 24h/24', 'required': True, 'amount': 50000000, 'icon': '🚨'},
            {'id': 'rapatriement', 'name': 'Rapatriement sanitaire', 'description': 'Rapatriement médical vers le Gabon', 'required': True, 'amount': None, 'icon': '✈️'},
            {'id': 'bagages', 'name': 'Bagages et effets personnels', 'description': 'Vol, perte ou détérioration', 'required': False, 'essential': True, 'amount': 2000000, 'icon': '🧳'},
            {'id': 'annulation', 'name': 'Annulation voyage', 'description': 'Remboursement des frais d\'annulation', 'required': False, 'amount': 10000000, 'icon': '❌'},
            {'id': 'retard', 'name': 'Retard de transport', 'description': 'Compensation pour retards importants', 'required': False, 'amount': 500000, 'icon': '⏰'},
            {'id': 'responsabilite_civile', 'name': 'Responsabilité civile voyage', 'description': 'Dommages causés aux tiers', 'required': False, 'amount': 5000000, 'icon': '⚖️'}
        ]
    }
    
    return guarantees_map.get(insurance_type, [])

# ==================== FONCTIONS UTILITAIRES ====================

def format_company_data(company):
    """Formate les données d'une compagnie pour le frontend"""
    if not company:
        return None
    
    return {
        "id": company.id,
        "name": company.name,
        "full_name": company.full_name or company.name,
        "logo_url": company.logo_url,
        "rating": company.rating or 4.0,
        "solvency_ratio": float(company.solvency_ratio) if company.solvency_ratio else None,
        "contact_phone": company.contact_phone or "+241 01 00 00 00",
        "contact_email": company.contact_email or "contact@assurance.ga",
        "specialties": company.specialties or [],
        "coverage_areas": getattr(company, 'coverage_areas', []),
        "is_active": company.is_active,
        "created_at": company.created_at.isoformat() if company.created_at else None,
        "updated_at": company.updated_at.isoformat() if company.updated_at else None
    }

def calculate_premium_with_guarantees(insurance_type: str, age: int, risk_factors: dict, guarantees: list) -> float:
    """Calcule la prime en tenant compte des garanties sélectionnées"""
    base_premium = get_base_premium(insurance_type, age, risk_factors)
    
    # Multiplicateur selon les garanties
    guarantee_multiplier = 1.0
    
    guarantee_costs = {
        'responsabilite_civile': 0.0,  # Garantie obligatoire incluse
        'dommages_collision': 0.3,
        'vol': 0.2,
        'incendie': 0.15,
        'bris_glace': 0.1,
        'assistance': 0.05,
        'degats_eaux': 0.2,
        'catastrophes_naturelles': 0.25,
        'invalidite': 0.25,
        'maladie_grave': 0.35,
        'consultations': 0.15,
        'pharmacie': 0.1,
        'dentaire': 0.2,
        'optique': 0.05,
        'bagages': 0.1,
        'annulation': 0.15,
        'retard': 0.05
    }
    
    for guarantee in guarantees:
        guarantee_multiplier += guarantee_costs.get(guarantee, 0)
    
    return base_premium * guarantee_multiplier

def get_base_premium(insurance_type: str, age: int, risk_factors: dict) -> float:
    """Calcul de la prime de base selon le type d'assurance"""
    base_premiums = {
        'auto': risk_factors.get('vehicle_value', 15000000) * 0.003,
        'habitation': risk_factors.get('property_value', 25000000) * 0.002,
        'vie': risk_factors.get('coverage_amount', 50000000) * 0.0015,
        'sante': 45000 * int(risk_factors.get('family_size', 1)),
        'voyage': 25000 * (1 + int(risk_factors.get('duration', 7)) / 30)
    }
    
    base_premium = base_premiums.get(insurance_type, 50000)
    
    # Facteur âge
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
        'voyage': 0
    }
    return deductibles.get(insurance_type, 50000)

def get_coverage_for_guarantees(insurance_type: str, guarantees: list) -> dict:
    """Retourne les détails de couverture selon les garanties sélectionnées"""
    all_coverages = {
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
        }
    }
    
    type_coverages = all_coverages.get(insurance_type, {})
    selected_coverage = {}
    
    for guarantee in guarantees:
        if guarantee in type_coverages:
            selected_coverage[guarantee] = type_coverages[guarantee]
    
    return selected_coverage

def get_default_exclusions(insurance_type: str) -> list:
    """Retourne les exclusions par défaut"""
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
        ]
    }
    return exclusions_map.get(insurance_type, ["Conditions générales non respectées"])

def generate_alternative_quotes(db, selected_insurers, base_premium, insurance_type, guarantees):
    """Génère les devis alternatifs pour les assureurs sélectionnés"""
    quotes = []
    
    try:
        # Récupérer les compagnies sélectionnées
        companies = db.query(InsuranceCompany).filter(
            InsuranceCompany.id.in_(selected_insurers),
            InsuranceCompany.is_active == True
        ).all()
        
        for i, company in enumerate(companies[:4]):  # Limiter à 4 devis
            variation = 0.8 + (i * 0.1)  # Variation de prix
            alt_premium = base_premium * variation
            
            quotes.append({
                "company_name": company.name,
                "product_name": f"Assurance {insurance_type.title()} {company.name}",
                "monthly_premium": round(alt_premium / 12, 2),
                "annual_premium": round(alt_premium, 2),
                "deductible": calculate_deductible(insurance_type),
                "rating": company.rating or 4.0,
                "advantages": get_company_advantages(company.name),
                "company_id": company.id,
                "contact_phone": company.contact_phone,
                "contact_email": company.contact_email
            })
    except Exception as e:
        print(f"Erreur génération devis alternatifs: {e}")
        # Fallback
        quotes = generate_fallback_quotes(selected_insurers, base_premium, insurance_type)
    
    return quotes

def generate_fallback_quotes(selected_insurers, base_premium, insurance_type):
    """Génère des devis de fallback"""
    company_names = ["OGAR Assurances", "NSIA Assurances", "AXA Gabon", "Colina Assurances"]
    quotes = []
    
    for i, company_name in enumerate(company_names[:len(selected_insurers)]):
        variation = 0.9 + (i * 0.05)
        alt_premium = base_premium * variation
        
        quotes.append({
            "company_name": company_name,
            "product_name": f"Assurance {insurance_type.title()}",
            "monthly_premium": round(alt_premium / 12, 2),
            "annual_premium": round(alt_premium, 2),
            "deductible": calculate_deductible(insurance_type),
            "rating": 4.0 + (i * 0.1),
            "advantages": get_company_advantages(company_name)
        })
    
    return quotes

def get_company_advantages(company_name: str) -> list:
    """Retourne les avantages selon la compagnie"""
    advantages = {
        "OGAR Assurances": ["Leader du marché", "Réseau d'agences étendu", "Expertise locale"],
        "NSIA Assurances": ["Groupe panafricain", "Innovation digitale", "Offres flexibles"],
        "AXA Gabon": ["Marque internationale", "Expertise reconnue", "Services premium"],
        "Colina Assurances": ["Spécialiste dommages", "Tarifs attractifs", "Proximité client"],
        "Saham Assurance": ["Groupe Sanlam", "Solutions innovantes", "Accompagnement personnalisé"]
    }
    return advantages.get(company_name, ["Service de qualité", "Expertise reconnue", "Tarifs compétitifs"])

def generate_recommendations(insurance_type, age, guarantees, risk_factors):
    """Génère des recommandations personnalisées"""
    recommendations = []
    
    # Recommandations par type
    if insurance_type == 'auto':
        if 'vol' not in guarantees:
            recommendations.append("Considérez ajouter la garantie vol pour une protection complète")
        if 'assistance' not in guarantees:
            recommendations.append("L'assistance 24h/24 est très utile au Gabon")
        if age < 25:
            recommendations.append("Un stage de conduite défensive peut réduire votre prime")
    
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
    
    return recommendations[:5]  # Limiter à 5 recommandations

def has_mandatory_guarantees(insurance_type, guarantees):
    """Vérifie si les garanties obligatoires sont incluses"""
    mandatory_guarantees = {
        'auto': ['responsabilite_civile'],
        'habitation': ['incendie'],
        'vie': ['deces'],
        'sante': ['hospitalisation'],
        'voyage': ['assistance_medicale', 'rapatriement']
    }
    
    required = mandatory_guarantees.get(insurance_type, [])
    return all(g in guarantees for g in required)

def count_optional_guarantees(insurance_type, guarantees):
    """Compte les garanties optionnelles sélectionnées"""
    mandatory_guarantees = {
        'auto': ['responsabilite_civile'],
        'habitation': ['incendie'],
        'vie': ['deces'],
        'sante': ['hospitalisation'],
        'voyage': ['assistance_medicale', 'rapatriement']
    }
    
    required = set(mandatory_guarantees.get(insurance_type, []))
    optional = set(guarantees) - required
    return len(optional)

def determine_coverage_level(guarantees):
    """Détermine le niveau de couverture selon le nombre de garanties"""
    if len(guarantees) <= 2:
        return 'basique'
    elif len(guarantees) >= 5:
        return 'premium'
    else:
        return 'standard'

def create_fallback_quote(quote_request):
    """Solution de secours en cas d'erreur"""
    insurance_type = quote_request.get('insurance_type', 'auto')
    age = quote_request.get('age', 35)
    
    return {
        "quote_id": str(uuid.uuid4()),
        "product_name": f"Assurance {insurance_type.title()} Standard",
        "company_name": "Comparateur Bamboo",
        "insurance_type": insurance_type,
        "monthly_premium": 42000,
        "annual_premium": 500000,
        "deductible": calculate_deductible(insurance_type),
        "coverage_details": get_coverage_for_guarantees(insurance_type, ['responsabilite_civile']),
        "exclusions": get_default_exclusions(insurance_type),
        "valid_until": (datetime.now() + timedelta(days=30)).isoformat(),
        "recommendations": ["Contactez un conseiller pour plus d'informations"],
        "quotes": [],
        "selected_guarantees": [],
        "selected_insurers_count": 0,
        "coverage_summary": {
            "total_guarantees": 0,
            "mandatory_included": True,
            "optional_selected": 0,
            "coverage_level": "basique"
        }
    }

@router.get("/test")
async def test_insurance_endpoint():
    """Test de fonctionnement du router assurance"""
    return {
        "status": "Insurance router is working",
        "message": "API des assurances optimisée pour le parcours par étapes",
        "endpoints": [
            "GET /products - Liste des produits d'assurance",
            "GET /companies - Liste des compagnies d'assurance", 
            "GET /guarantees/{type} - Garanties disponibles par type",
            "POST /quote - Créer un devis d'assurance",
            "GET /test - Test de fonctionnement"
        ],
        "features": [
            "Support des assureurs sélectionnés dans l'étape 3",
            "Calcul des primes avec garanties personnalisées",
            "Recommandations intelligentes",
            "Devis alternatifs par assureur sélectionné",
            "Données formatées pour le frontend Angular"
        ]
    }