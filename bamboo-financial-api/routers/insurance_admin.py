# routers/insurance_admin.py - Version corrigée avec routing correct
from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.orm import Session, joinedload
from sqlalchemy import and_, or_, desc, func
from typing import List, Optional, Dict, Any
from pydantic import BaseModel, Field
from datetime import datetime
import uuid
import json

from database import get_db
from models import InsuranceProduct, InsuranceCompany

# Import conditionnel pour InsuranceQuote
try:
    from models import InsuranceQuote
    INSURANCE_QUOTE_AVAILABLE = True
except ImportError:
    INSURANCE_QUOTE_AVAILABLE = False
    print("Warning: InsuranceQuote model not available")

router = APIRouter(prefix="/admin/insurance", tags=["insurance_admin"]) 

# ==================== SCHEMAS PYDANTIC ====================

class InsuranceCompanyCreate(BaseModel):
    name: str = Field(..., min_length=2, max_length=100)
    full_name: Optional[str] = None
    description: Optional[str] = None
    logo_url: Optional[str] = None
    website: Optional[str] = None
    contact_phone: Optional[str] = None
    contact_email: Optional[str] = None
    address: Optional[str] = None
    license_number: Optional[str] = None
    established_year: Optional[int] = None
    solvency_ratio: Optional[float] = None
    rating: Optional[str] = None
    specialties: Optional[List[str]] = []
    coverage_areas: Optional[List[str]] = []

class InsuranceCompanyUpdate(InsuranceCompanyCreate):
    is_active: Optional[bool] = True

class GuaranteeSchema(BaseModel):
    name: str
    amount: float
    description: Optional[str] = None

class InsuranceProductCreate(BaseModel):
    name: str = Field(..., min_length=3, max_length=200)
    type: str = Field(..., description="Type d'assurance: vie, sante, auto, habitation, voyage")
    description: Optional[str] = None
    insurance_company_id: str = Field(..., description="ID de la compagnie d'assurance")
    base_premium: float = Field(..., gt=0, description="Prime de base annuelle")
    coverage_details: Optional[dict] = {}
    deductibles: Optional[dict] = {}
    age_limits: Optional[dict] = {}
    exclusions: Optional[List[str]] = []
    features: Optional[List[str]] = []
    guarantees: Optional[List[GuaranteeSchema]] = []
    max_coverage: Optional[float] = None
    duration_years: Optional[int] = 1
    age_min: Optional[int] = 18
    age_max: Optional[int] = 65
    requires_medical_exam: Optional[bool] = False
    accepts_preexisting_conditions: Optional[bool] = False
    is_renewable: Optional[bool] = True
    has_waiting_period: Optional[bool] = False
    waiting_period_days: Optional[int] = 0
    status: Optional[str] = "active"

class InsuranceProductUpdate(InsuranceProductCreate):
    is_active: Optional[bool] = True

# ==================== UTILITAIRES ====================

def safe_serialize_json_field(field_value, default_value=None):
    """Sérialise de manière sécurisée un champ JSON"""
    if field_value is None:
        return default_value
    
    if isinstance(field_value, (dict, list)):
        return field_value
    
    try:
        return json.loads(field_value) if isinstance(field_value, str) else field_value
    except (json.JSONDecodeError, TypeError):
        return default_value

def validate_company_data(company_data):
    """Valide les données d'une compagnie"""
    errors = []
    
    if not company_data.name or len(company_data.name.strip()) < 2:
        errors.append("Le nom de la compagnie est requis (min. 2 caractères)")
    
    if company_data.established_year and (company_data.established_year < 1800 or company_data.established_year > datetime.now().year):
        errors.append("L'année de création doit être valide")
    
    if company_data.solvency_ratio and (company_data.solvency_ratio < 0 or company_data.solvency_ratio > 1000):
        errors.append("Le ratio de solvabilité doit être entre 0 et 1000")
    
    return errors

def validate_product_data(product_data):
    """Valide les données d'un produit"""
    errors = []
    
    if not product_data.name or len(product_data.name.strip()) < 3:
        errors.append("Le nom du produit est requis (min. 3 caractères)")
    
    if not product_data.type:
        errors.append("Le type d'assurance est requis")
    
    if not product_data.insurance_company_id:
        errors.append("La compagnie d'assurance est requise")
    
    if product_data.base_premium <= 0:
        errors.append("La prime de base doit être positive")
    
    if product_data.age_min is not None and product_data.age_max is not None:
        if product_data.age_min >= product_data.age_max:
            errors.append("L'âge maximum doit être supérieur à l'âge minimum")
    
    if product_data.guarantees:
        for i, guarantee in enumerate(product_data.guarantees):
            if not guarantee.name or not guarantee.name.strip():
                errors.append(f"Le nom de la garantie {i+1} est requis")
            if guarantee.amount <= 0:
                errors.append(f"Le montant de la garantie {i+1} doit être positif")
    
    return errors

# ==================== COMPAGNIES D'ASSURANCE ====================

@router.get("/companies")
def get_insurance_companies_admin(
    db: Session = Depends(get_db),
    skip: int = Query(0, ge=0),
    limit: int = Query(100, le=100),
    search: Optional[str] = Query(None),
    is_active: Optional[bool] = Query(None)
):
    """Récupérer toutes les compagnies d'assurance pour le backoffice"""
    try:
        query = db.query(InsuranceCompany)
        
        # Filtrage par recherche
        if search:
            search_term = f"%{search}%"
            query = query.filter(
                or_(
                    InsuranceCompany.name.ilike(search_term),
                    InsuranceCompany.full_name.ilike(search_term),
                    InsuranceCompany.description.ilike(search_term)
                )
            )
        
        # Filtrage par statut actif
        if is_active is not None:
            query = query.filter(InsuranceCompany.is_active == is_active)
        
        # Pagination
        total = query.count()
        companies = query.order_by(desc(InsuranceCompany.created_at)).offset(skip).limit(limit).all()
        
        companies_data = []
        for company in companies:
            # Compter les produits actifs
            products_count = db.query(InsuranceProduct).filter(
                InsuranceProduct.insurance_company_id == company.id,
                InsuranceProduct.is_active == True
            ).count()
            
            # Sérialiser correctement les données JSON
            specialties = safe_serialize_json_field(company.specialties, [])
            coverage_areas = safe_serialize_json_field(company.coverage_areas, [])
            
            company_data = {
                "id": company.id,
                "name": company.name,
                "full_name": company.full_name,
                "description": company.description,
                "logo_url": company.logo_url,
                "website": company.website,
                "contact_phone": company.contact_phone,
                "contact_email": company.contact_email,
                "address": company.address,
                "license_number": company.license_number,
                "established_year": company.established_year,
                "solvency_ratio": float(company.solvency_ratio) if company.solvency_ratio else None,
                "rating": company.rating,
                "specialties": specialties,
                "coverage_areas": coverage_areas,
                "is_active": company.is_active,
                "products_count": products_count,
                "created_at": company.created_at,
                "updated_at": company.updated_at
            }
            companies_data.append(company_data)
        
        return {
            "companies": companies_data,
            "total": total,
            "skip": skip,
            "limit": limit
        }
        
    except Exception as e:
        print(f"Erreur get_insurance_companies_admin: {str(e)}")
        raise HTTPException(status_code=500, detail=f"Erreur lors de la récupération des compagnies: {str(e)}")

@router.get("/companies/{company_id}")
def get_insurance_company_admin(
    company_id: str,
    db: Session = Depends(get_db)
):
    """Récupérer une compagnie d'assurance spécifique"""
    try:
        company = db.query(InsuranceCompany).filter(InsuranceCompany.id == company_id).first()
        
        if not company:
            raise HTTPException(status_code=404, detail="Compagnie non trouvée")
        
        # Statistiques de la compagnie
        products_count = db.query(InsuranceProduct).filter(
            InsuranceProduct.insurance_company_id == company_id,
            InsuranceProduct.is_active == True
        ).count()
        
        total_products = db.query(InsuranceProduct).filter(
            InsuranceProduct.insurance_company_id == company_id
        ).count()
        
        # Sérialiser les données JSON
        specialties = safe_serialize_json_field(company.specialties, [])
        coverage_areas = safe_serialize_json_field(company.coverage_areas, [])
        
        return {
            "id": company.id,
            "name": company.name,
            "full_name": company.full_name,
            "description": company.description,
            "logo_url": company.logo_url,
            "website": company.website,
            "contact_phone": company.contact_phone,
            "contact_email": company.contact_email,
            "address": company.address,
            "license_number": company.license_number,
            "established_year": company.established_year,
            "solvency_ratio": float(company.solvency_ratio) if company.solvency_ratio else None,
            "rating": company.rating,
            "specialties": specialties,
            "coverage_areas": coverage_areas,
            "is_active": company.is_active,
            "products_count": products_count,
            "total_products": total_products,
            "created_at": company.created_at,
            "updated_at": company.updated_at
        }
        
    except HTTPException:
        raise
    except Exception as e:
        print(f"Erreur get_insurance_company_admin: {str(e)}")
        raise HTTPException(status_code=500, detail=f"Erreur lors de la récupération de la compagnie: {str(e)}")

@router.post("/companies")
def create_insurance_company(
    company_data: InsuranceCompanyCreate,
    db: Session = Depends(get_db)
):
    """Créer une nouvelle compagnie d'assurance"""
    try:
        # Validation des données
        errors = validate_company_data(company_data)
        if errors:
            raise HTTPException(status_code=400, detail={"errors": errors})
        
        # Vérifier l'unicité du nom
        existing = db.query(InsuranceCompany).filter(
            InsuranceCompany.name == company_data.name.strip()
        ).first()
        
        if existing:
            raise HTTPException(status_code=400, detail="Une compagnie avec ce nom existe déjà")
        
        # Préparer les données JSON
        specialties = company_data.specialties if company_data.specialties else []
        coverage_areas = company_data.coverage_areas if company_data.coverage_areas else []
        
        # Créer la compagnie
        company = InsuranceCompany(
            id=str(uuid.uuid4()),
            name=company_data.name.strip(),
            full_name=company_data.full_name.strip() if company_data.full_name else None,
            description=company_data.description.strip() if company_data.description else None,
            logo_url=company_data.logo_url.strip() if company_data.logo_url else None,
            website=company_data.website.strip() if company_data.website else None,
            contact_phone=company_data.contact_phone.strip() if company_data.contact_phone else None,
            contact_email=company_data.contact_email.strip() if company_data.contact_email else None,
            address=company_data.address.strip() if company_data.address else None,
            license_number=company_data.license_number.strip() if company_data.license_number else None,
            established_year=company_data.established_year,
            solvency_ratio=company_data.solvency_ratio,
            rating=company_data.rating.strip() if company_data.rating else None,
            specialties=specialties,
            coverage_areas=coverage_areas,
            is_active=True,
            created_at=datetime.now(),
            updated_at=datetime.now()
        )
        
        db.add(company)
        db.commit()
        db.refresh(company)
        
        return {
            "message": "Compagnie d'assurance créée avec succès",
            "company": {
                "id": company.id,
                "name": company.name,
                "full_name": company.full_name,
                "is_active": company.is_active,
                "created_at": company.created_at
            }
        }
        
    except HTTPException:
        raise
    except Exception as e:
        db.rollback()
        print(f"Erreur create_insurance_company: {str(e)}")
        raise HTTPException(status_code=500, detail=f"Erreur lors de la création de la compagnie: {str(e)}")

@router.put("/companies/{company_id}")
def update_insurance_company(
    company_id: str,
    company_data: InsuranceCompanyUpdate,
    db: Session = Depends(get_db)
):
    """Mettre à jour une compagnie d'assurance"""
    try:
        company = db.query(InsuranceCompany).filter(InsuranceCompany.id == company_id).first()
        
        if not company:
            raise HTTPException(status_code=404, detail="Compagnie non trouvée")
        
        # Validation des données
        errors = validate_company_data(company_data)
        if errors:
            raise HTTPException(status_code=400, detail={"errors": errors})
        
        # Vérifier l'unicité du nom (sauf pour la compagnie actuelle)
        if company_data.name and company_data.name.strip() != company.name:
            existing = db.query(InsuranceCompany).filter(
                InsuranceCompany.name == company_data.name.strip(),
                InsuranceCompany.id != company_id
            ).first()
            
            if existing:
                raise HTTPException(status_code=400, detail="Une compagnie avec ce nom existe déjà")
        
        # Mettre à jour les champs
        update_data = company_data.dict(exclude_unset=True)
        for field, value in update_data.items():
            if field in ['specialties', 'coverage_areas'] and value is not None:
                value = value if isinstance(value, list) else []
            elif field in ['name', 'full_name', 'description', 'logo_url', 'website', 'contact_phone', 'contact_email', 'address', 'license_number', 'rating'] and value is not None:
                value = value.strip() if isinstance(value, str) else value
            
            setattr(company, field, value)
        
        company.updated_at = datetime.now()
        
        db.commit()
        db.refresh(company)
        
        return {
            "message": "Compagnie mise à jour avec succès",
            "company": {
                "id": company.id,
                "name": company.name,
                "full_name": company.full_name,
                "is_active": company.is_active,
                "updated_at": company.updated_at
            }
        }
        
    except HTTPException:
        raise
    except Exception as e:
        db.rollback()
        print(f"Erreur update_insurance_company: {str(e)}")
        raise HTTPException(status_code=500, detail=f"Erreur lors de la mise à jour: {str(e)}")

@router.delete("/companies/{company_id}")
def delete_insurance_company(
    company_id: str,
    db: Session = Depends(get_db)
):
    """Supprimer une compagnie d'assurance"""
    try:
        company = db.query(InsuranceCompany).filter(InsuranceCompany.id == company_id).first()
        
        if not company:
            raise HTTPException(status_code=404, detail="Compagnie non trouvée")
        
        # Vérifier s'il y a des produits actifs
        active_products = db.query(InsuranceProduct).filter(
            InsuranceProduct.insurance_company_id == company_id,
            InsuranceProduct.is_active == True
        ).count()
        
        if active_products > 0:
            raise HTTPException(
                status_code=400, 
                detail=f"Impossible de supprimer. {active_products} produit(s) actif(s) sont liés à cette compagnie"
            )
        
        # Désactiver plutôt que supprimer si il y a des produits inactifs
        total_products = db.query(InsuranceProduct).filter(
            InsuranceProduct.insurance_company_id == company_id
        ).count()
        
        if total_products > 0:
            company.is_active = False
            company.updated_at = datetime.now()
            db.commit()
            return {"message": "Compagnie désactivée avec succès (produits inactifs liés)"}
        else:
            db.delete(company)
            db.commit()
            return {"message": "Compagnie supprimée avec succès"}
        
    except HTTPException:
        raise
    except Exception as e:
        db.rollback()
        print(f"Erreur delete_insurance_company: {str(e)}")
        raise HTTPException(status_code=500, detail=f"Erreur lors de la suppression: {str(e)}")

# ==================== PRODUITS D'ASSURANCE ====================

@router.get("/products")
def get_insurance_products_admin(
    db: Session = Depends(get_db),
    skip: int = Query(0, ge=0),
    limit: int = Query(50, le=100),
    search: Optional[str] = Query(None),
    type: Optional[str] = Query(None),
    company_id: Optional[str] = Query(None),
    is_active: Optional[bool] = Query(None),
    min_premium: Optional[float] = Query(None),
    max_premium: Optional[float] = Query(None)
):
    """Récupérer tous les produits d'assurance pour le backoffice"""
    try:
        query = db.query(InsuranceProduct).options(
            joinedload(InsuranceProduct.insurance_company)
        )
        
        # Filtrage par recherche
        if search:
            search_term = f"%{search}%"
            query = query.filter(
                or_(
                    InsuranceProduct.name.ilike(search_term),
                    InsuranceProduct.description.ilike(search_term),
                    InsuranceProduct.type.ilike(search_term)
                )
            )
        
        # Filtrage par type
        if type:
            query = query.filter(InsuranceProduct.type == type)
        
        # Filtrage par compagnie
        if company_id:
            query = query.filter(InsuranceProduct.insurance_company_id == company_id)
        
        # Filtrage par statut actif
        if is_active is not None:
            query = query.filter(InsuranceProduct.is_active == is_active)
        
        # Filtrage par prime minimum
        if min_premium is not None:
            query = query.filter(InsuranceProduct.base_premium >= min_premium)
            
        # Filtrage par prime maximum
        if max_premium is not None:
            query = query.filter(InsuranceProduct.base_premium <= max_premium)
        
        # Pagination
        total = query.count()
        products = query.order_by(desc(InsuranceProduct.created_at)).offset(skip).limit(limit).all()
        
        products_data = []
        for product in products:
            # Compter les devis
            quotes_count = 0
            last_quote_date = None
            if INSURANCE_QUOTE_AVAILABLE:
                try:
                    from models import InsuranceQuote
                    quotes_count = db.query(InsuranceQuote).filter(
                        InsuranceQuote.insurance_product_id == product.id
                    ).count()
                    
                    last_quote = db.query(InsuranceQuote).filter(
                        InsuranceQuote.insurance_product_id == product.id
                    ).order_by(desc(InsuranceQuote.created_at)).first()
                    
                    last_quote_date = last_quote.created_at if last_quote else None
                except Exception:
                    quotes_count = 0
            
            # Sérialiser correctement les données JSON
            coverage_details = safe_serialize_json_field(product.coverage_details, {})
            deductible_options = safe_serialize_json_field(product.deductible_options, {})
            age_limits = safe_serialize_json_field(product.age_limits, {})
            exclusions = safe_serialize_json_field(product.exclusions, [])
            features = safe_serialize_json_field(product.features, [])
            advantages = safe_serialize_json_field(getattr(product, 'advantages', None), [])
            
            product_data = {
                "id": product.id,
                "name": product.name,
                "type": product.type,
                "description": product.description,
                "insurance_company_id": product.insurance_company_id,
                "base_premium": float(product.base_premium) if product.base_premium else 0,
                "coverage_details": coverage_details,
                "deductible_options": deductible_options,
                "age_limits": age_limits,
                "exclusions": exclusions,
                "features": features,
                "advantages": advantages,
                "is_active": product.is_active,
                "created_at": product.created_at,
                "updated_at": product.updated_at,
                "quotes_count": quotes_count,
                "last_quote_date": last_quote_date,
                "insurance_company": {
                    "id": product.insurance_company.id,
                    "name": product.insurance_company.name,
                    "full_name": product.insurance_company.full_name,
                    "logo_url": product.insurance_company.logo_url
                } if product.insurance_company else None
            }
            products_data.append(product_data)
        
        return {
            "products": products_data,
            "total": total,
            "skip": skip,
            "limit": limit
        }
        
    except Exception as e:
        print(f"Erreur get_insurance_products_admin: {str(e)}")
        import traceback
        traceback.print_exc()
        raise HTTPException(status_code=500, detail=f"Erreur lors de la récupération des produits: {str(e)}")

@router.get("/products/{product_id}")
def get_insurance_product_admin(
    product_id: str,
    db: Session = Depends(get_db)
):
    """Récupérer un produit d'assurance spécifique pour le backoffice"""
    try:
        product = db.query(InsuranceProduct).options(
            joinedload(InsuranceProduct.insurance_company)
        ).filter(InsuranceProduct.id == product_id).first()
        
        if not product:
            raise HTTPException(status_code=404, detail="Produit non trouvé")
        
        # Statistiques des devis
        quotes_count = 0
        last_quote_date = None
        if INSURANCE_QUOTE_AVAILABLE:
            try:
                from models import InsuranceQuote
                quotes_count = db.query(InsuranceQuote).filter(
                    InsuranceQuote.insurance_product_id == product_id
                ).count()
                
                last_quote = db.query(InsuranceQuote).filter(
                    InsuranceQuote.insurance_product_id == product_id
                ).order_by(desc(InsuranceQuote.created_at)).first()
                
                last_quote_date = last_quote.created_at if last_quote else None
            except Exception:
                pass
        
        # Sérialiser les données JSON
        coverage_details = safe_serialize_json_field(product.coverage_details, {})
        deductible_options = safe_serialize_json_field(product.deductible_options, {})
        age_limits = safe_serialize_json_field(product.age_limits, {})
        exclusions = safe_serialize_json_field(product.exclusions, [])
        features = safe_serialize_json_field(product.features, [])
        advantages = safe_serialize_json_field(getattr(product, 'advantages', None), [])
        
        return {
            "id": product.id,
            "name": product.name,
            "type": product.type,
            "description": product.description,
            "insurance_company_id": product.insurance_company_id,
            "base_premium": float(product.base_premium) if product.base_premium else 0,
            "coverage_details": coverage_details,
            "deductible_options": deductible_options,
            "age_limits": age_limits,
            "exclusions": exclusions,
            "features": features,
            "advantages": advantages,
            "is_active": product.is_active,
            "created_at": product.created_at,
            "updated_at": product.updated_at,
            "quotes_count": quotes_count,
            "last_quote_date": last_quote_date,
            "insurance_company": {
                "id": product.insurance_company.id,
                "name": product.insurance_company.name,
                "full_name": product.insurance_company.full_name,
                "description": product.insurance_company.description,
                "logo_url": product.insurance_company.logo_url,
                "website": product.insurance_company.website,
                "contact_phone": product.insurance_company.contact_phone,
                "contact_email": product.insurance_company.contact_email,
                "rating": product.insurance_company.rating,
                "solvency_ratio": float(product.insurance_company.solvency_ratio) if product.insurance_company.solvency_ratio else None
            } if product.insurance_company else None
        }
        
    except HTTPException:
        raise
    except Exception as e:
        print(f"Erreur get_insurance_product_admin: {str(e)}")
        raise HTTPException(status_code=500, detail=f"Erreur lors de la récupération du produit: {str(e)}")

@router.post("/products")
def create_insurance_product(
    product_data: InsuranceProductCreate,
    db: Session = Depends(get_db)
):
    """Créer un nouveau produit d'assurance"""
    try:
        # Validation des données
        errors = validate_product_data(product_data)
        if errors:
            raise HTTPException(status_code=400, detail={"errors": errors})
        
        # Vérifier que la compagnie existe
        company = db.query(InsuranceCompany).filter(
            InsuranceCompany.id == product_data.insurance_company_id
        ).first()
        
        if not company:
            raise HTTPException(status_code=400, detail="Compagnie d'assurance non trouvée")
        
        if not company.is_active:
            raise HTTPException(status_code=400, detail="La compagnie d'assurance est inactive")
        
        # Construire coverage_details à partir des garanties
        coverage_details = {}
        if product_data.guarantees:
            for guarantee in product_data.guarantees:
                coverage_details[guarantee.name] = {
                    "amount": float(guarantee.amount),
                    "description": guarantee.description or ""
                }
        
        # Ajouter les autres détails de couverture
        if hasattr(product_data, 'max_coverage') and product_data.max_coverage:
            coverage_details["max_coverage"] = float(product_data.max_coverage)
        
        if hasattr(product_data, 'duration_years') and product_data.duration_years:
            coverage_details["duration_years"] = int(product_data.duration_years)
            
        if hasattr(product_data, 'requires_medical_exam'):
            coverage_details["requires_medical_exam"] = bool(product_data.requires_medical_exam)
            
        if hasattr(product_data, 'accepts_preexisting_conditions'):
            coverage_details["accepts_preexisting_conditions"] = bool(product_data.accepts_preexisting_conditions)
            
        if hasattr(product_data, 'is_renewable'):
            coverage_details["is_renewable"] = bool(product_data.is_renewable)
            
        if hasattr(product_data, 'has_waiting_period'):
            coverage_details["has_waiting_period"] = bool(product_data.has_waiting_period)
            
        if hasattr(product_data, 'waiting_period_days'):
            coverage_details["waiting_period_days"] = int(product_data.waiting_period_days or 0)
        
        # Construire deductible_options
        deductible_options = {}
        if hasattr(product_data, 'deductibles') and product_data.deductibles:
            deductible_options = product_data.deductibles
        
        # Construire age_limits
        age_limits = {}
        if hasattr(product_data, 'age_min') and product_data.age_min is not None:
            age_limits["min_age"] = int(product_data.age_min)
        if hasattr(product_data, 'age_max') and product_data.age_max is not None:
            age_limits["max_age"] = int(product_data.age_max)
        
        # Créer le produit
        product = InsuranceProduct(
            id=str(uuid.uuid4()),
            insurance_company_id=product_data.insurance_company_id,
            name=product_data.name.strip(),
            type=product_data.type.strip(),
            description=product_data.description.strip() if product_data.description else None,
            coverage_details=coverage_details,
            deductible_options=deductible_options,
            age_limits=age_limits,
            base_premium=float(product_data.base_premium),
            exclusions=product_data.exclusions or [],
            features=product_data.features or [],
            advantages=getattr(product_data, 'advantages', []) or [],
            is_active=getattr(product_data, 'is_active', True),
            created_at=datetime.now(),
            updated_at=datetime.now()
        )
        
        db.add(product)
        db.commit()
        db.refresh(product)
        
        return {
            "message": "Produit d'assurance créé avec succès",
            "product": {
                "id": product.id,
                "name": product.name,
                "type": product.type,
                "insurance_company_id": product.insurance_company_id,
                "base_premium": float(product.base_premium),
                "is_active": product.is_active,
                "created_at": product.created_at
            }
        }
        
    except HTTPException:
        raise
    except Exception as e:
        db.rollback()
        print(f"Erreur create_insurance_product: {str(e)}")
        import traceback
        traceback.print_exc()
        raise HTTPException(status_code=500, detail=f"Erreur lors de la création du produit: {str(e)}")

@router.put("/products/{product_id}")
def update_insurance_product(
    product_id: str,
    product_data: InsuranceProductUpdate,
    db: Session = Depends(get_db)
):
    """Mettre à jour un produit d'assurance"""
    try:
        product = db.query(InsuranceProduct).filter(InsuranceProduct.id == product_id).first()
        
        if not product:
            raise HTTPException(status_code=404, detail="Produit non trouvé")
        
        # Validation des données
        errors = validate_product_data(product_data)
        if errors:
            raise HTTPException(status_code=400, detail={"errors": errors})
        
        # Vérifier la compagnie si changée
        if product_data.insurance_company_id and product_data.insurance_company_id != product.insurance_company_id:
            company = db.query(InsuranceCompany).filter(
                InsuranceCompany.id == product_data.insurance_company_id
            ).first()
            
            if not company or not company.is_active:
                raise HTTPException(status_code=400, detail="Compagnie d'assurance invalide ou inactive")
        
        # Mettre à jour les champs
        update_data = product_data.dict(exclude_unset=True)
        
        # Traitement spécial pour les garanties
        if 'guarantees' in update_data:
            coverage_details = dict(product.coverage_details) if product.coverage_details else {}
            
            # Réinitialiser les garanties
            keys_to_remove = [k for k in coverage_details.keys() if isinstance(coverage_details[k], dict) and 'amount' in coverage_details[k]]
            for key in keys_to_remove:
                del coverage_details[key]
            
            # Ajouter les nouvelles garanties
            for guarantee in update_data['guarantees']:
                coverage_details[guarantee['name']] = {
                    "amount": float(guarantee['amount']),
                    "description": guarantee.get('description', "")
                }
            
            update_data['coverage_details'] = coverage_details
            del update_data['guarantees']
        
        # Mettre à jour les autres champs de coverage_details
        if any(field in update_data for field in ['max_coverage', 'duration_years', 'requires_medical_exam', 'accepts_preexisting_conditions', 'is_renewable', 'has_waiting_period', 'waiting_period_days']):
            coverage_details = dict(product.coverage_details) if product.coverage_details else {}
            
            for field in ['max_coverage', 'duration_years', 'requires_medical_exam', 'accepts_preexisting_conditions', 'is_renewable', 'has_waiting_period', 'waiting_period_days']:
                if field in update_data:
                    coverage_details[field] = update_data[field]
                    del update_data[field]
            
            update_data['coverage_details'] = coverage_details
        
        # Appliquer les mises à jour
        for field, value in update_data.items():
            if field in ['name', 'description'] and value is not None:
                value = value.strip() if isinstance(value, str) else value
            setattr(product, field, value)
        
        product.updated_at = datetime.now()
        
        db.commit()
        db.refresh(product)
        
        return {
            "message": "Produit mis à jour avec succès",
            "product": {
                "id": product.id,
                "name": product.name,
                "type": product.type,
                "is_active": product.is_active,
                "updated_at": product.updated_at
            }
        }
        
    except HTTPException:
        raise
    except Exception as e:
        db.rollback()
        print(f"Erreur update_insurance_product: {str(e)}")
        raise HTTPException(status_code=500, detail=f"Erreur lors de la mise à jour: {str(e)}")

@router.delete("/products/{product_id}")
def delete_insurance_product(
    product_id: str,
    db: Session = Depends(get_db)
):
    """Supprimer un produit d'assurance"""
    try:
        product = db.query(InsuranceProduct).filter(InsuranceProduct.id == product_id).first()
        
        if not product:
            raise HTTPException(status_code=404, detail="Produit non trouvé")
        
        # Vérifier s'il y a des devis liés
        if INSURANCE_QUOTE_AVAILABLE:
            try:
                from models import InsuranceQuote
                quotes_count = db.query(InsuranceQuote).filter(
                    InsuranceQuote.insurance_product_id == product_id
                ).count()
                
                if quotes_count > 0:
                    # Désactiver au lieu de supprimer
                    product.is_active = False
                    product.updated_at = datetime.now()
                    db.commit()
                    return {"message": f"Produit désactivé (il y a {quotes_count} devis liés)"}
            except Exception:
                pass
        
        db.delete(product)
        db.commit()
        
        return {"message": "Produit supprimé avec succès"}
        
    except HTTPException:
        raise
    except Exception as e:
        db.rollback()
        print(f"Erreur delete_insurance_product: {str(e)}")
        raise HTTPException(status_code=500, detail=f"Erreur lors de la suppression: {str(e)}")

# ==================== STATISTIQUES ====================

@router.get("/stats")
def get_insurance_admin_stats(db: Session = Depends(get_db)):
    """Récupérer les statistiques administratives des assurances"""
    try:
        # Statistiques des compagnies
        total_companies = db.query(InsuranceCompany).count()
        active_companies = db.query(InsuranceCompany).filter(InsuranceCompany.is_active == True).count()
        
        # Statistiques des produits
        total_products = db.query(InsuranceProduct).count()
        active_products = db.query(InsuranceProduct).filter(InsuranceProduct.is_active == True).count()
        
        # Produits par type
        products_by_type = db.query(
            InsuranceProduct.type,
            func.count(InsuranceProduct.id).label("count")
        ).filter(InsuranceProduct.is_active == True).group_by(InsuranceProduct.type).all()
        
        # Prime moyenne
        avg_premium = db.query(func.avg(InsuranceProduct.base_premium)).filter(
            InsuranceProduct.is_active == True
        ).scalar() or 0
        
        # Statistiques des devis (si disponible)
        total_quotes = 0
        if INSURANCE_QUOTE_AVAILABLE:
            try:
                from models import InsuranceQuote
                total_quotes = db.query(InsuranceQuote).count()
            except Exception:
                total_quotes = 0
        
        result = {
            "companies": {
                "total": total_companies,
                "active": active_companies,
                "inactive": total_companies - active_companies
            },
            "products": {
                "total": total_products,
                "active": active_products,
                "inactive": total_products - active_products
            },
            "quotes": {
                "total": total_quotes
            },
            "products_by_type": [
                {"type": item.type, "count": item.count}
                for item in products_by_type
            ],
            "average_premium": float(avg_premium)
        }
        
        return result
        
    except Exception as e:
        print(f"Erreur get_insurance_admin_stats: {str(e)}")
        import traceback
        traceback.print_exc()
        raise HTTPException(
            status_code=500,
            detail=f"Erreur lors de la récupération des statistiques: {str(e)}"
        )