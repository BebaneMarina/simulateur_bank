# routers/banks.py - Version corrigée
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from typing import List
import models
import schemas
from database import get_db

router = APIRouter()

@router.get("/", response_model=List[schemas.Bank])
async def get_all_banks(db: Session = Depends(get_db)):
    """Récupère toutes les banques actives"""
    try:
        banks = db.query(models.Bank).filter(models.Bank.is_active == True).all()
        
        # Conversion explicite en dictionnaires
        banks_data = []
        for bank in banks:
            bank_dict = {
                "id": bank.id,
                "name": bank.name,
                "full_name": bank.full_name,
                "description": bank.description,
                "logo_url": bank.logo_url,
                "website": bank.website,
                "contact_phone": bank.contact_phone,
                "contact_email": bank.contact_email,
                "address": bank.address,
                "swift_code": bank.swift_code,
                "license_number": bank.license_number,
                "established_year": bank.established_year,
                "total_assets": float(bank.total_assets) if bank.total_assets else None,
                "rating": bank.rating,
                "is_active": bank.is_active,
                "created_at": bank.created_at,
                "updated_at": bank.updated_at
            }
            banks_data.append(bank_dict)
        
        return banks_data
        
    except Exception as e:
        print(f"Erreur dans get_all_banks: {str(e)}")
        raise HTTPException(status_code=500, detail=f"Erreur lors de la récupération des banques: {str(e)}")

@router.get("/{bank_id}", response_model=schemas.Bank)
async def get_bank(bank_id: str, db: Session = Depends(get_db)):
    """Récupère une banque par son ID"""
    try:
        bank = db.query(models.Bank).filter(models.Bank.id == bank_id).first()
        if not bank:
            raise HTTPException(status_code=404, detail="Banque non trouvée")
        
        # Conversion explicite
        bank_dict = {
            "id": bank.id,
            "name": bank.name,
            "full_name": bank.full_name,
            "description": bank.description,
            "logo_url": bank.logo_url,
            "website": bank.website,
            "contact_phone": bank.contact_phone,
            "contact_email": bank.contact_email,
            "address": bank.address,
            "swift_code": bank.swift_code,
            "license_number": bank.license_number,
            "established_year": bank.established_year,
            "total_assets": float(bank.total_assets) if bank.total_assets else None,
            "rating": bank.rating,
            "is_active": bank.is_active,
            "created_at": bank.created_at,
            "updated_at": bank.updated_at
        }
        
        return bank_dict
        
    except HTTPException:
        raise
    except Exception as e:
        print(f"Erreur dans get_bank: {str(e)}")
        raise HTTPException(status_code=500, detail=f"Erreur lors de la récupération de la banque: {str(e)}")

@router.get("/{bank_id}/credit-products")
async def get_bank_credit_products(bank_id: str, db: Session = Depends(get_db)):
    """Récupère les produits de crédit d'une banque"""
    try:
        products = db.query(models.CreditProduct).filter(
            models.CreditProduct.bank_id == bank_id,
            models.CreditProduct.is_active == True
        ).all()
        
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
                    "logo_url": product.bank.logo_url
                } if product.bank else None
            }
            products_data.append(product_dict)
        
        return products_data
        
    except Exception as e:
        print(f"Erreur dans get_bank_credit_products: {str(e)}")
        raise HTTPException(status_code=500, detail=f"Erreur lors de la récupération des produits: {str(e)}")

@router.get("/{bank_id}/savings-products")
async def get_bank_savings_products(bank_id: str, db: Session = Depends(get_db)):
    """Récupère les produits d'épargne d'une banque"""
    try:
        products = db.query(models.SavingsProduct).filter(
            models.SavingsProduct.bank_id == bank_id,
            models.SavingsProduct.is_active == True
        ).all()
        
        products_data = []
        for product in products:
            product_dict = {
                "id": product.id,
                "bank_id": product.bank_id,
                "name": product.name,
                "type": product.type,
                "description": product.description,
                "interest_rate": float(product.interest_rate),
                "minimum_deposit": float(product.minimum_deposit),
                "maximum_deposit": float(product.maximum_deposit) if product.maximum_deposit else None,
                "minimum_balance": float(product.minimum_balance),
                "liquidity": product.liquidity,
                "notice_period_days": product.notice_period_days,
                "term_months": product.term_months,
                "compounding_frequency": product.compounding_frequency,
                "fees": product.fees,
                "features": product.features,
                "advantages": product.advantages,
                "tax_benefits": product.tax_benefits,
                "risk_level": product.risk_level,
                "early_withdrawal_penalty": float(product.early_withdrawal_penalty) if product.early_withdrawal_penalty else None,
                "is_islamic_compliant": product.is_islamic_compliant,
                "is_featured": product.is_featured,
                "is_active": product.is_active,
                "created_at": product.created_at,
                "updated_at": product.updated_at,
                "bank": {
                    "id": product.bank.id,
                    "name": product.bank.name,
                    "logo_url": product.bank.logo_url
                } if product.bank else None
            }
            products_data.append(product_dict)
        
        return products_data
        
    except Exception as e:
        print(f"Erreur dans get_bank_savings_products: {str(e)}")
        raise HTTPException(status_code=500, detail=f"Erreur lors de la récupération des produits d'épargne: {str(e)}")

@router.get("/test")
async def test_banks_endpoint():
    """Test de fonctionnement du router banks"""
    return {
        "status": "OK", 
        "message": "Banks router fonctionne correctement",
        "timestamp": "2024-01-15T10:00:00Z"
    }