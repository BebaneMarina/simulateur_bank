# Migration script - init_gabon_data.py
from sqlalchemy.orm import Session
from database import SessionLocal
import models
from data.gabon_banks_data import GABON_BANKS_DATA
import uuid

def init_gabon_banks_data():
    """Initialise la base de données avec les données des banques gabonaises"""
    db = SessionLocal()
    
    try:
        # Supprimer les données existantes si nécessaire
        db.query(models.CreditSimulation).delete()
        db.query(models.SavingsSimulation).delete()
        db.query(models.CreditProduct).delete()
        db.query(models.SavingsProduct).delete()
        db.query(models.InsuranceProduct).delete()
        db.query(models.Bank).delete()
        
        # Insérer les données des banques
        for bank_data in GABON_BANKS_DATA:
            # Créer la banque
            bank = models.Bank(
                id=bank_data["id"],
                name=bank_data["name"],
                logo_url=bank_data.get("logo_url"),
                description=bank_data.get("description"),
                contact_phone=bank_data.get("contact_phone"),
                contact_email=bank_data.get("contact_email"),
                website=bank_data.get("website"),
                address=bank_data.get("address"),
                is_active=True
            )
            db.add(bank)
            
            # Ajouter les produits de crédit
            for product_data in bank_data.get("credit_products", []):
                credit_product = models.CreditProduct(
                    id=product_data["id"],
                    bank_id=bank_data["id"],
                    name=product_data["name"],
                    type=product_data["type"],
                    description=product_data.get("description"),
                    min_amount=product_data["min_amount"],
                    max_amount=product_data["max_amount"],
                    min_duration_months=product_data["min_duration_months"],
                    max_duration_months=product_data["max_duration_months"],
                    min_rate=product_data["min_rate"],
                    max_rate=product_data["max_rate"],
                    average_rate=product_data["average_rate"],
                    processing_time_hours=product_data.get("processing_time_hours", 72),
                    eligibility_criteria=product_data.get("eligibility_criteria"),
                    fees=product_data.get("fees"),
                    is_active=True
                )
                db.add(credit_product)
            
            # Ajouter les produits d'épargne
            for product_data in bank_data.get("savings_products", []):
                savings_product = models.SavingsProduct(
                    id=product_data["id"],
                    bank_id=bank_data["id"],
                    name=product_data["name"],
                    type=product_data["type"],
                    description=product_data.get("description"),
                    interest_rate=product_data["interest_rate"],
                    minimum_deposit=product_data["minimum_deposit"],
                    maximum_deposit=product_data.get("maximum_deposit"),
                    liquidity=product_data["liquidity"],
                    risk_level=product_data.get("risk_level", 1),
                    fees=product_data.get("fees"),
                    is_active=True
                )
                db.add(savings_product)
        
        # Ajouter quelques produits d'assurance exemples
        insurance_products = [
            {
                "id": "bgfi_assurance_auto",
                "bank_id": "bgfi",
                "name": "Assurance Auto BGFI",
                "type": "auto",
                "description": "Assurance automobile tous risques",
                "base_premium": 45000,
                "coverage_details": {
                    "responsabilite_civile": 500000000,
                    "dommages_collision": "Valeur du véhicule",
                    "vol": "Valeur du véhicule",
                    "incendie": "Valeur du véhicule"
                },
                "features": ["Assistance 24h/24", "Véhicule de remplacement", "Protection juridique"],
                "exclusions": ["Conduite en état d'ivresse", "Usage professionnel non déclaré"]
            },
            {
                "id": "ugb_assurance_habitation",
                "bank_id": "ugb",
                "name": "Assurance Habitation UGB",
                "type": "habitation",
                "description": "Protection complète de votre logement",
                "base_premium": 35000,
                "coverage_details": {
                    "incendie": 100000000,
                    "degats_eaux": 50000000,
                    "vol": 20000000,
                    "responsabilite_civile": 100000000
                }
            }
        ]
        
        for insurance_data in insurance_products:
            insurance_product = models.InsuranceProduct(
                id=insurance_data["id"],
                bank_id=insurance_data["bank_id"],
                name=insurance_data["name"],
                type=insurance_data["type"],
                description=insurance_data.get("description"),
                base_premium=insurance_data["base_premium"],
                coverage_details=insurance_data.get("coverage_details"),
                features=insurance_data.get("features"),
                exclusions=insurance_data.get("exclusions"),
                is_active=True
            )
            db.add(insurance_product)
        
        db.commit()
        print("✅ Données des banques gabonaises initialisées avec succès!")
        
    except Exception as e:
        db.rollback()
        print(f"❌ Erreur lors de l'initialisation: {e}")
    finally:
        db.close()

if __name__ == "__main__":
    init_gabon_banks_data()