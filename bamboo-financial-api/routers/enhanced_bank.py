# routers/enhanced_banks.py - Extension du router banks avec conditions et assurances

from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.orm import Session, joinedload
from typing import List, Optional, Dict, Any
from database import get_db
from models import Bank, CreditProduct, SavingsProduct, InsuranceProduct, InsuranceCompany
import uuid
from datetime import datetime

router = APIRouter()

# Modèles Pydantic pour les nouvelles fonctionnalités
from pydantic import BaseModel

class BankFee(BaseModel):
    type: str
    amount: float
    frequency: str
    description: str

class BankAccountConditions(BaseModel):
    minimum_deposit: float
    required_documents: List[str]
    eligibility_criteria: List[str]
    fees: List[BankFee]
    processing_time: str

class ExtendedBankResponse(BaseModel):
    id: str
    name: str
    full_name: Optional[str]
    description: Optional[str]
    logo_url: Optional[str]
    website: Optional[str]
    contact_phone: Optional[str]
    contact_email: Optional[str]
    address: Optional[str]
    is_active: bool
    account_conditions: BankAccountConditions
    available_services: List[str]
    branch_locations: List[str]
    created_at: datetime
    updated_at: datetime

class InsuranceProductWithBankResponse(BaseModel):
    id: str
    name: str
    type: str
    description: Optional[str]
    base_premium: float
    coverage_details: Dict[str, Any]
    features: List[str]
    exclusions: List[str]
    company: Dict[str, Any]
    partner_banks: List[str]
    special_offers: List[str]

@router.get("/with-conditions", response_model=List[ExtendedBankResponse])
async def get_banks_with_conditions(db: Session = Depends(get_db)):
    """
    Récupérer toutes les banques avec leurs conditions d'ouverture de compte
    """
    try:
        banks = db.query(Bank).filter(Bank.is_active == True).all()
        
        extended_banks = []
        for bank in banks:
            # Générer les conditions d'ouverture pour chaque banque
            account_conditions = generate_account_conditions(bank.id)
            available_services = get_bank_services(bank.id)
            branch_locations = get_branch_locations(bank.id)
            
            extended_bank = ExtendedBankResponse(
                id=bank.id,
                name=bank.name,
                full_name=bank.full_name,
                description=bank.description,
                logo_url=bank.logo_url,
                website=bank.website,
                contact_phone=bank.contact_phone,
                contact_email=bank.contact_email,
                address=bank.address,
                is_active=bank.is_active,
                account_conditions=account_conditions,
                available_services=available_services,
                branch_locations=branch_locations,
                created_at=bank.created_at,
                updated_at=bank.updated_at
            )
            
            extended_banks.append(extended_bank)
        
        return extended_banks
        
    except Exception as e:
        print(f"Erreur dans get_banks_with_conditions: {str(e)}")
        raise HTTPException(status_code=500, detail=f"Erreur lors de la récupération des banques: {str(e)}")

@router.get("/{bank_id}/account-conditions", response_model=BankAccountConditions)
async def get_bank_account_conditions(bank_id: str, db: Session = Depends(get_db)):
    """
    Récupérer les conditions d'ouverture de compte pour une banque spécifique
    """
    try:
        bank = db.query(Bank).filter(Bank.id == bank_id).first()
        if not bank:
            raise HTTPException(status_code=404, detail="Banque non trouvée")
        
        conditions = generate_account_conditions(bank_id)
        return conditions
        
    except HTTPException:
        raise
    except Exception as e:
        print(f"Erreur dans get_bank_account_conditions: {str(e)}")
        raise HTTPException(status_code=500, detail=f"Erreur lors de la récupération des conditions: {str(e)}")

@router.get("/{bank_id}/all-products")
async def get_bank_all_products(bank_id: str, db: Session = Depends(get_db)):
    """
    Récupérer tous les produits (crédit + épargne + assurance) d'une banque
    """
    try:
        bank = db.query(Bank).filter(Bank.id == bank_id).first()
        if not bank:
            raise HTTPException(status_code=404, detail="Banque non trouvée")
        
        # Produits de crédit
        credit_products = db.query(CreditProduct).filter(
            CreditProduct.bank_id == bank_id,
            CreditProduct.is_active == True
        ).all()
        
        # Produits d'épargne
        savings_products = db.query(SavingsProduct).filter(
            SavingsProduct.bank_id == bank_id,
            SavingsProduct.is_active == True
        ).all()
        
        # Produits d'assurance partenaires
        insurance_products = get_bank_insurance_products(bank_id, db)
        
        return {
            "credit_products": [format_credit_product(p) for p in credit_products],
            "savings_products": [format_savings_product(p) for p in savings_products],
            "insurance_products": insurance_products
        }
        
    except HTTPException:
        raise
    except Exception as e:
        print(f"Erreur dans get_bank_all_products: {str(e)}")
        raise HTTPException(status_code=500, detail=f"Erreur lors de la récupération des produits: {str(e)}")

def generate_account_conditions(bank_id: str) -> BankAccountConditions:
    """
    Générer les conditions d'ouverture de compte pour une banque
    """
    conditions_data = {
        "bgfi": {
            "minimum_deposit": 25000,
            "required_documents": [
                "Pièce d'identité en cours de validité",
                "Justificatif de domicile récent (facture d'électricité, eau, téléphone)",
                "Justificatif de revenus (bulletin de salaire, attestation employeur)",
                "Photo d'identité récente"
            ],
            "eligibility_criteria": [
                "Être âgé de 18 ans minimum",
                "Résider au Gabon ou avoir un permis de séjour valide",
                "Avoir des revenus réguliers et justifiables",
                "Ne pas être inscrit au fichier des incidents bancaires"
            ],
            "fees": [
                BankFee(type="Ouverture de compte", amount=5000, frequency="unique", description="Frais d'ouverture de compte courant"),
                BankFee(type="Tenue de compte", amount=2500, frequency="mensuel", description="Frais de tenue de compte mensuel"),
                BankFee(type="Carte bancaire Visa", amount=15000, frequency="annuel", description="Frais annuels carte bancaire internationale"),
                BankFee(type="Virement", amount=1000, frequency="par opération", description="Frais de virement bancaire")
            ],
            "processing_time": "24 à 48 heures ouvrées"
        },
        "ugb": {
            "minimum_deposit": 20000,
            "required_documents": [
                "Carte d'identité nationale ou passeport",
                "Attestation de résidence ou facture domiciliée",
                "Bulletin de salaire ou attestation de revenus",
                "Certificat de non inscription au fichier BEAC (si applicable)"
            ],
            "eligibility_criteria": [
                "Majorité civile (18 ans révolus)",
                "Résidence légale au Gabon",
                "Justifier de revenus mensuels réguliers",
                "Solvabilité financière démontrée"
            ],
            "fees": [
                BankFee(type="Ouverture", amount=3000, frequency="unique", description="Frais d'ouverture de compte"),
                BankFee(type="Tenue de compte", amount=2000, frequency="mensuel", description="Gestion mensuelle du compte"),
                BankFee(type="Carte de retrait", amount=8000, frequency="annuel", description="Carte de retrait nationale"),
                BankFee(type="Chéquier", amount=5000, frequency="par carnet", description="Émission d'un carnet de chèques")
            ],
            "processing_time": "2 à 3 jours ouvrés"
        },
        "bicig": {
            "minimum_deposit": 30000,
            "required_documents": [
                "Pièce d'identité officielle",
                "Justificatif de domicile de moins de 3 mois",
                "Attestation de salaire ou de revenus",
                "Références bancaires (si applicable)",
                "Statuts d'entreprise (pour les professionnels)"
            ],
            "eligibility_criteria": [
                "Âge minimum 18 ans",
                "Résidence au Gabon",
                "Revenus nets mensuels minimums de 150 000 FCFA",
                "Bonne moralité financière"
            ],
            "fees": [
                BankFee(type="Ouverture", amount=7500, frequency="unique", description="Frais d'ouverture et d'étude du dossier"),
                BankFee(type="Tenue de compte", amount=3500, frequency="mensuel", description="Frais de gestion mensuelle"),
                BankFee(type="Carte Visa International", amount=25000, frequency="annuel", description="Carte bancaire internationale"),
                BankFee(type="Virement SWIFT", amount=15000, frequency="par opération", description="Virement international")
            ],
            "processing_time": "3 à 5 jours ouvrés"
        },
        "ecobank": {
            "minimum_deposit": 15000,
            "required_documents": [
                "Document d'identité valide",
                "Proof of address récent",
                "Justificatif de revenus",
                "Photo passeport récente",
                "Formulaire de demande d'ouverture rempli"
            ],
            "eligibility_criteria": [
                "Âge légal minimum (18 ans)",
                "Résidence confirmée au Gabon",
                "Source de revenus identifiée",
                "Capacité de maintenir le solde minimum"
            ],
            "fees": [
                BankFee(type="Ouverture", amount=2500, frequency="unique", description="Frais d'ouverture de compte"),
                BankFee(type="Gestion mensuelle", amount=1500, frequency="mensuel", description="Frais de gestion du compte"),
                BankFee(type="Carte Visa", amount=12000, frequency="annuel", description="Carte bancaire Visa"),
                BankFee(type="Mobile banking", amount=500, frequency="mensuel", description="Service bancaire mobile")
            ],
            "processing_time": "24 à 72 heures"
        },
        "cbao": {
            "minimum_deposit": 18000,
            "required_documents": [
                "CNI ou passeport en cours de validité",
                "Justificatif de domicile récent",
                "Bulletin de paie ou attestation de travail",
                "Extrait de casier judiciaire (si demandé)"
            ],
            "eligibility_criteria": [
                "Majorité légale",
                "Domiciliation au Gabon",
                "Revenus stables et déclarés",
                "Absence d'interdiction bancaire"
            ],
            "fees": [
                BankFee(type="Ouverture", amount=4000, frequency="unique", description="Frais d'ouverture de compte"),
                BankFee(type="Tenue de compte", amount=2200, frequency="mensuel", description="Frais mensuels de tenue"),
                BankFee(type="Carte bancaire", amount=10000, frequency="annuel", description="Carte de paiement annuelle"),
                BankFee(type="SMS banking", amount=300, frequency="mensuel", description="Service de notification SMS")
            ],
            "processing_time": "2 à 4 jours ouvrés"
        }
    }
    
    default_conditions = {
        "minimum_deposit": 25000,
        "required_documents": [
            "Pièce d'identité valide",
            "Justificatif de domicile",
            "Justificatif de revenus"
        ],
        "eligibility_criteria": [
            "Âge minimum 18 ans",
            "Résidence au Gabon"
        ],
        "fees": [
            BankFee(type="Ouverture", amount=5000, frequency="unique", description="Frais d'ouverture de compte"),
            BankFee(type="Tenue de compte", amount=2500, frequency="mensuel", description="Frais mensuels")
        ],
        "processing_time": "24 à 72 heures"
    }
    
    bank_conditions = conditions_data.get(bank_id, default_conditions)
    
    return BankAccountConditions(**bank_conditions)

def get_bank_services(bank_id: str) -> List[str]:
    """
    Retourner les services disponibles pour une banque
    """
    base_services = [
        "Comptes courants",
        "Comptes d'épargne",
        "Crédits immobiliers",
        "Crédits consommation",
        "Cartes bancaires",
        "Virements nationaux",
        "Banking en ligne",
        "Mobile banking"
    ]
    
    bank_specific_services = {
        "bgfi": base_services + ["Change de devises", "Trade finance", "Crédit-bail", "Assurance-crédit"],
        "ecobank": base_services + ["Western Union", "MoneyGram", "Rapid Transfer", "Ecobank Pay"],
        "bicig": base_services + ["Crédit-bail", "Factoring", "Garanties bancaires", "Conseil en investissement"],
        "ugb": base_services + ["Assurance-vie", "Épargne retraite", "Gestion de patrimoine", "Coffres-forts"],
        "cbao": base_services + ["Microfinance", "Crédit agricole", "Financement PME", "Conseil fiscal"]
    }
    
    return bank_specific_services.get(bank_id, base_services)

def get_branch_locations(bank_id: str) -> List[str]:
    """
    Retourner les localisations des agences pour une banque
    """
    common_locations = [
        "Libreville Centre-ville",
        "Libreville Louis",
        "Port-Gentil Centre",
        "Franceville"
    ]
    
    bank_locations = {
        "bgfi": common_locations + ["Oyem", "Lambaréné", "Mouila", "Tchibanga", "Bitam"],
        "ecobank": common_locations + ["Bitam", "Tchibanga", "Koulamoutou", "Lastoursville"],
        "ugb": common_locations + ["Koulamoutou", "Makokou", "Mitzic", "Booué"],
        "bicig": common_locations + ["Gamba", "Mayumba", "Ndendé", "Mounana"],
        "cbao": common_locations + ["Mitzic", "Lastoursville", "Moanda", "Ndjolé"]
    }
    
    return bank_locations.get(bank_id, common_locations)

def get_bank_insurance_products(bank_id: str, db: Session) -> List[Dict[str, Any]]:
    """
    Récupérer les produits d'assurance partenaires d'une banque
    """
    # Définir les partenariats banque-assurance
    partnerships = {
        "bgfi": ["ogar_auto_tr", "ogar_habitation", "nsia_vie"],
        "ugb": ["nsia_auto", "nsia_sante", "axa_vie"],
        "bicig": ["axa_sante", "axa_retraite"],
        "ecobank": ["ogar_auto_tiers", "saham_voyage"],
        "cbao": ["colina_auto", "colina_habitation", "saham_auto"]
    }
    
    partner_product_ids = partnerships.get(bank_id, [])
    
    if not partner_product_ids:
        return []
    
    try:
        # Récupérer les produits d'assurance partenaires
        products = db.query(InsuranceProduct)\
            .join(InsuranceCompany)\
            .filter(InsuranceProduct.id.in_(partner_product_ids))\
            .filter(InsuranceProduct.is_active == True)\
            .all()
        
        formatted_products = []
        for product in products:
            formatted_product = {
                "id": product.id,
                "name": product.name,
                "type": product.type,
                "description": product.description,
                "base_premium": float(product.base_premium) if product.base_premium else 0.0,
                "coverage_details": product.coverage_details or {},
                "features": product.features or [],
                "exclusions": product.exclusions or [],
                "company": {
                    "id": product.insurance_company.id,
                    "name": product.insurance_company.name,
                    "logo_url": product.insurance_company.logo_url
                },
                "partner_banks": [bank_id],
                "special_offers": get_special_offers(product.id, bank_id)
            }
            formatted_products.append(formatted_product)
        
        return formatted_products
        
    except Exception as e:
        print(f"Erreur lors de la récupération des produits d'assurance: {e}")
        return []

def get_special_offers(product_id: str, bank_id: str) -> List[str]:
    """
    Générer des offres spéciales pour un produit d'assurance via une banque partenaire
    """
    offers = {
        ("ogar_auto_tr", "bgfi"): ["Réduction de 10% pour les clients BGFI", "Facilité de paiement mensuel"],
        ("nsia_vie", "ugb"): ["Prime réduite première année", "Couverture étendue famille"],
        ("axa_sante", "bicig"): ["Téléconsultation incluse", "Prise en charge immédiate"],
        ("saham_voyage", "ecobank"): ["Couverture mondiale", "Assistance 24h/7j"]
    }
    
    return offers.get((product_id, bank_id), [])

def format_credit_product(product) -> Dict[str, Any]:
    """
    Formater un produit de crédit
    """
    return {
        "id": product.id,
        "name": product.name,
        "type": product.type,
        "description": product.description,
        "min_amount": float(product.min_amount),
        "max_amount": float(product.max_amount),
        "min_duration_months": product.min_duration_months,
        "max_duration_months": product.max_duration_months,
        "average_rate": float(product.average_rate),
        "processing_time_hours": product.processing_time_hours,
        "is_active": product.is_active
    }

def format_savings_product(product) -> Dict[str, Any]:
    """
    Formater un produit d'épargne
    """
    return {
        "id": product.id,
        "name": product.name,
        "type": product.type,
        "description": product.description,
        "interest_rate": float(product.interest_rate),
        "minimum_deposit": float(product.minimum_deposit),
        "maximum_deposit": float(product.maximum_deposit) if product.maximum_deposit else None,
        "liquidity": product.liquidity,
        "is_active": product.is_active
    }

@router.get("/test-enhanced")
async def test_enhanced_banks_endpoint():
    """Test de fonctionnement du router banks étendu"""
    return {
        "status": "Enhanced Banks router is working",
        "message": "API des banques avec conditions d'ouverture et partenariats assurance",
        "endpoints": [
            "GET /with-conditions - Banques avec conditions d'ouverture",
            "GET /{bank_id}/account-conditions - Conditions d'une banque",
            "GET /{bank_id}/all-products - Tous les produits d'une banque",
            "GET /test-enhanced - Test de fonctionnement"
        ],
        "features": [
            "Conditions d'ouverture de compte détaillées",
            "Frais et tarifs par banque",
            "Services disponibles par institution",
            "Localisation des agences",
            "Produits d'assurance partenaires",
            "Offres spéciales banque-assurance"
        ]
    }