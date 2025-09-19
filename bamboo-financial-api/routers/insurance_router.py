# routers/insurance_router.py
from fastapi import APIRouter, HTTPException, Depends, Query, File, UploadFile, status, Request
from fastapi.responses import StreamingResponse
from sqlalchemy.orm import Session, joinedload
from sqlalchemy import and_, or_, func, desc, asc, text
from typing import List, Optional, Dict, Any
import io
import base64
from datetime import datetime, timedelta
import uuid

from database import get_db
from models import InsuranceCompany, InsuranceProduct, InsuranceApplication, InsuranceQuote
# Import seulement les schémas qui existent
from schemas import (
    InsuranceCompanyCreate, InsuranceCompanyUpdate, 
    InsuranceProductCreate, InsuranceProductUpdate,
    Message, ErrorResponse
)

router = APIRouter(prefix="/api/admin", tags=["Insurance Management"])

# ==================== COMPAGNIES D'ASSURANCE ====================

@router.get("/insurance-companies", response_model=Dict[str, Any])
async def get_insurance_companies(
    search: Optional[str] = Query(None, description="Recherche dans nom/description"),
    status: Optional[str] = Query(None, description="active/inactive"),
    specialty: Optional[str] = Query(None, description="Spécialité"),
    page: int = Query(1, ge=1, description="Numéro de page"),
    size: int = Query(20, ge=1, le=100, description="Taille de page"),
    sort_by: str = Query("name", description="Champ de tri"),
    sort_order: str = Query("asc", description="Ordre de tri: asc/desc"),
    db: Session = Depends(get_db)
):
    """Récupérer la liste des compagnies d'assurance avec filtres et pagination."""
    try:
        query = db.query(InsuranceCompany)
        
        # Filtres
        if search:
            search_term = f"%{search}%"
            query = query.filter(
                or_(
                    InsuranceCompany.name.ilike(search_term),
                    InsuranceCompany.full_name.ilike(search_term),
                    InsuranceCompany.description.ilike(search_term)
                )
            )
        
        if status:
            is_active = status == "active"
            query = query.filter(InsuranceCompany.is_active == is_active)
        
        if specialty:
            query = query.filter(InsuranceCompany.specialties.contains([specialty]))
        
        # Tri
        if hasattr(InsuranceCompany, sort_by):
            order_field = getattr(InsuranceCompany, sort_by)
            if sort_order.lower() == "desc":
                query = query.order_by(desc(order_field))
            else:
                query = query.order_by(asc(order_field))
        else:
            query = query.order_by(asc(InsuranceCompany.name))
        
        # Pagination
        total = query.count()
        companies = query.offset((page - 1) * size).limit(size).all()
        
        # Enrichir avec statistiques
        enriched_companies = []
        for company in companies:
            company_dict = {
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
                "solvency_ratio": company.solvency_ratio,
                "rating": company.rating,
                "specialties": company.specialties or [],
                "coverage_areas": company.coverage_areas or [],
                "is_active": company.is_active,
                "created_at": company.created_at,
                "updated_at": company.updated_at
            }
            
            # Ajouter statistiques
            products_count = db.query(InsuranceProduct).filter(
                InsuranceProduct.insurance_company_id == company.id
            ).count()
            
            active_products_count = db.query(InsuranceProduct).filter(
                and_(
                    InsuranceProduct.insurance_company_id == company.id,
                    InsuranceProduct.is_active == True
                )
            ).count()
            
            applications_count = db.query(InsuranceApplication).join(InsuranceProduct).filter(
                InsuranceProduct.insurance_company_id == company.id
            ).count()
            
            company_dict.update({
                "products_count": products_count,
                "active_products_count": active_products_count,
                "applications_count": applications_count
            })
            
            enriched_companies.append(company_dict)
        
        return {
            "data": enriched_companies,
            "total": total,
            "page": page,
            "size": size,
            "pages": (total + size - 1) // size,
            "has_next": page * size < total,
            "has_prev": page > 1
        }
        
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Erreur lors de la récupération: {str(e)}")

@router.get("/insurance-companies/{company_id}")
async def get_insurance_company(
    company_id: str,
    include_products: bool = Query(False, description="Inclure les produits"),
    include_stats: bool = Query(True, description="Inclure les statistiques"),
    db: Session = Depends(get_db)
):
    """Récupérer une compagnie d'assurance par son ID."""
    try:
        query = db.query(InsuranceCompany)
        
        if include_products:
            query = query.options(joinedload(InsuranceCompany.insurance_products))
        
        company = query.filter(InsuranceCompany.id == company_id).first()
        
        if not company:
            raise HTTPException(status_code=404, detail="Compagnie introuvable")
        
        result = {
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
            "solvency_ratio": company.solvency_ratio,
            "rating": company.rating,
            "specialties": company.specialties or [],
            "coverage_areas": company.coverage_areas or [],
            "is_active": company.is_active,
            "created_at": company.created_at,
            "updated_at": company.updated_at
        }
        
        if include_products:
            products = []
            for product in company.insurance_products:
                products.append({
                    "id": product.id,
                    "name": product.name,
                    "type": product.type,
                    "base_premium": product.base_premium,
                    "is_active": product.is_active,
                    "is_featured": product.is_featured
                })
            result["products"] = products
        
        if include_stats:
            # Statistiques de la compagnie
            stats = db.query(
                func.count(InsuranceProduct.id).label("total_products"),
                func.count(InsuranceProduct.id).filter(InsuranceProduct.is_active == True).label("active_products"),
                func.count(InsuranceApplication.id).label("total_applications")
            ).select_from(InsuranceProduct).outerjoin(InsuranceApplication).filter(
                InsuranceProduct.insurance_company_id == company_id
            ).first()
            
            result["stats"] = {
                "total_products": stats.total_products or 0,
                "active_products": stats.active_products or 0,
                "total_applications": stats.total_applications or 0
            }
        
        return result
        
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Erreur lors de la récupération: {str(e)}")

# Dans insurance_router.py - Correction de la route de création

@router.post("/insurance-companies", response_model=Dict[str, Any])
async def create_insurance_company(
    company_data: InsuranceCompanyCreate,  # ← Utilisez le schéma Pydantic approprié
    request: Request,
    db: Session = Depends(get_db)
):
    """Créer une nouvelle compagnie d'assurance."""
    try:
        # Convertir en dict pour traitement
        company_dict = company_data.dict()
        
        # Vérifier si l'ID existe déjà (s'il est fourni)
        if "id" in company_dict and company_dict["id"]:
            existing = db.query(InsuranceCompany).filter(
                InsuranceCompany.id == company_dict["id"]
            ).first()
            if existing:
                raise HTTPException(
                    status_code=400, 
                    detail=f"Une compagnie avec l'ID '{company_dict['id']}' existe déjà"
                )
        else:
            # Générer un ID basé sur le nom si non fourni
            base_id = company_dict["name"].lower().replace(" ", "_").replace("'", "")
            # Garder seulement les caractères alphanumériques et underscores
            base_id = ''.join(c for c in base_id if c.isalnum() or c == '_')
            
            # Vérifier l'unicité et ajouter un suffixe si nécessaire
            counter = 1
            company_id = base_id
            while db.query(InsuranceCompany).filter(InsuranceCompany.id == company_id).first():
                company_id = f"{base_id}_{counter}"
                counter += 1
            
            company_dict["id"] = company_id
        
        # Traitement du logo si présent
        if "logo_data" in company_dict and company_dict["logo_data"]:
            try:
                logo_data = company_dict["logo_data"]
                if logo_data.startswith('data:image/'):
                    # Extraire le type MIME
                    header, data = logo_data.split(',', 1)
                    content_type = header.split(';')[0].split(':')[1]
                    company_dict["logo_content_type"] = content_type
                    
                    # Valider que c'est une image
                    if not content_type.startswith('image/'):
                        raise ValueError("Le fichier doit être une image")
                else:
                    # Données base64 brutes
                    company_dict["logo_content_type"] = "image/png"  # Par défaut
                    
            except Exception as e:
                raise HTTPException(status_code=400, detail=f"Erreur logo: {str(e)}")
        
        # Créer la compagnie
        company = InsuranceCompany(**company_dict)
        db.add(company)
        
        # Commit explicite avec gestion d'erreur
        try:
            db.commit()
            db.refresh(company)
        except Exception as e:
            db.rollback()
            print(f"Erreur lors du commit: {e}")
            raise HTTPException(status_code=500, detail=f"Erreur base de données: {str(e)}")
        
        # Retourner les données formatées
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
            "solvency_ratio": company.solvency_ratio,
            "rating": company.rating,
            "specialties": company.specialties or [],
            "coverage_areas": company.coverage_areas or [],
            "is_active": company.is_active,
            "created_at": company.created_at.isoformat() if company.created_at else None,
            "updated_at": company.updated_at.isoformat() if company.updated_at else None
        }
        
    except HTTPException:
        raise
    except Exception as e:
        db.rollback()
        print(f"Erreur complète: {e}")
        raise HTTPException(status_code=500, detail=f"Erreur lors de la création: {str(e)}")

@router.put("/insurance-companies/{company_id}")
async def update_insurance_company(
    company_id: str,
    company_data: dict,
    db: Session = Depends(get_db)
):
    """Mettre à jour une compagnie d'assurance."""
    try:
        company = db.query(InsuranceCompany).filter(InsuranceCompany.id == company_id).first()
        if not company:
            raise HTTPException(status_code=404, detail="Compagnie introuvable")
        
        # Traitement du logo si présent dans les données
        if "logo_data" in company_data and company_data["logo_data"]:
            try:
                logo_data = company_data["logo_data"]
                if logo_data.startswith('data:image/'):
                    header, data = logo_data.split(',', 1)
                    content_type = header.split(';')[0].split(':')[1]
                    company_data["logo_content_type"] = content_type
                    
                    if not content_type.startswith('image/'):
                        raise ValueError("Le fichier doit être une image")
                else:
                    company_data["logo_content_type"] = "image/png"
                    
            except Exception as e:
                raise HTTPException(status_code=400, detail=f"Erreur logo: {str(e)}")
        
        # Mettre à jour les champs
        for key, value in company_data.items():
            if hasattr(company, key):
                setattr(company, key, value)
        
        company.updated_at = datetime.utcnow()
        db.commit()
        db.refresh(company)
        
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
            "solvency_ratio": company.solvency_ratio,
            "rating": company.rating,
            "specialties": company.specialties or [],
            "coverage_areas": company.coverage_areas or [],
            "is_active": company.is_active,
            "created_at": company.created_at,
            "updated_at": company.updated_at
        }
        
    except HTTPException:
        raise
    except Exception as e:
        db.rollback()
        raise HTTPException(status_code=500, detail=f"Erreur lors de la mise à jour: {str(e)}")

@router.delete("/insurance-companies/{company_id}")
async def delete_insurance_company(
    company_id: str,
    force: bool = Query(False, description="Forcer la suppression même avec des produits"),
    db: Session = Depends(get_db)
):
    """Supprimer une compagnie d'assurance."""
    try:
        company = db.query(InsuranceCompany).filter(InsuranceCompany.id == company_id).first()
        if not company:
            raise HTTPException(status_code=404, detail="Compagnie introuvable")
        
        # Vérifier s'il y a des produits liés
        products_count = db.query(InsuranceProduct).filter(
            InsuranceProduct.insurance_company_id == company_id
        ).count()
        
        if products_count > 0 and not force:
            raise HTTPException(
                status_code=400, 
                detail=f"Impossible de supprimer la compagnie. {products_count} produit(s) y sont associés. Utilisez force=true pour forcer la suppression."
            )
        
        # Supprimer les produits liés si force=true
        if force and products_count > 0:
            # Supprimer d'abord les applications liées aux produits
            db.query(InsuranceApplication).filter(
                InsuranceApplication.insurance_product_id.in_(
                    db.query(InsuranceProduct.id).filter(
                        InsuranceProduct.insurance_company_id == company_id
                    )
                )
            ).delete(synchronize_session=False)
            
            # Supprimer les devis liés aux produits
            db.query(InsuranceQuote).filter(
                InsuranceQuote.insurance_product_id.in_(
                    db.query(InsuranceProduct.id).filter(
                        InsuranceProduct.insurance_company_id == company_id
                    )
                )
            ).delete(synchronize_session=False)
            
            # Supprimer les produits
            db.query(InsuranceProduct).filter(
                InsuranceProduct.insurance_company_id == company_id
            ).delete(synchronize_session=False)
        
        # Supprimer la compagnie
        db.delete(company)
        db.commit()
        
        return {"message": "Compagnie supprimée avec succès"}
        
    except HTTPException:
        raise
    except Exception as e:
        db.rollback()
        raise HTTPException(status_code=500, detail=f"Erreur lors de la suppression: {str(e)}")

# ==================== PRODUITS D'ASSURANCE ====================

@router.get("/insurance-products")
async def get_insurance_products(
    search: Optional[str] = Query(None, description="Recherche dans nom/description"),
    company: Optional[str] = Query(None, description="ID de la compagnie"),
    type: Optional[str] = Query(None, description="Type d'assurance"),
    status: Optional[str] = Query(None, description="active/inactive"),
    page: int = Query(1, ge=1, description="Numéro de page"),
    size: int = Query(20, ge=1, le=100, description="Taille de page"),
    sort_by: str = Query("name", description="Champ de tri"),
    sort_order: str = Query("asc", description="Ordre de tri: asc/desc"),
    db: Session = Depends(get_db)
):
    """Récupérer la liste des produits d'assurance avec filtres et pagination."""
    try:
        query = db.query(InsuranceProduct).options(joinedload(InsuranceProduct.insurance_company))
        
        # Filtres
        if search:
            search_term = f"%{search}%"
            query = query.filter(
                or_(
                    InsuranceProduct.name.ilike(search_term),
                    InsuranceProduct.description.ilike(search_term)
                )
            )
        
        if company:
            query = query.filter(InsuranceProduct.insurance_company_id == company)
        
        if type:
            query = query.filter(InsuranceProduct.type == type)
        
        if status:
            is_active = status == "active"
            query = query.filter(InsuranceProduct.is_active == is_active)
        
        # Tri
        if hasattr(InsuranceProduct, sort_by):
            order_field = getattr(InsuranceProduct, sort_by)
            if sort_order.lower() == "desc":
                query = query.order_by(desc(order_field))
            else:
                query = query.order_by(asc(order_field))
        else:
            query = query.order_by(asc(InsuranceProduct.name))
        
        # Pagination
        total = query.count()
        products = query.offset((page - 1) * size).limit(size).all()
        
        # Enrichir avec informations compagnie
        enriched_products = []
        for product in products:
            product_dict = {
                "id": product.id,
                "insurance_company_id": product.insurance_company_id,
                "name": product.name,
                "type": product.type,
                "description": product.description,
                "base_premium": product.base_premium,
                "min_coverage": product.min_coverage,
                "max_coverage": product.max_coverage,
                "coverage_details": product.coverage_details or {},
                "deductible_options": product.deductible_options or {},
                "age_limits": product.age_limits or {},
                "exclusions": product.exclusions or [],
                "features": product.features or [],
                "advantages": product.advantages or [],
                "claim_process": product.claim_process,
                "settlement_time_days": product.settlement_time_days,
                "renewable": product.renewable,
                "is_featured": product.is_featured,
                "is_active": product.is_active,
                "created_at": product.created_at,
                "updated_at": product.updated_at
            }
            
            # Ajouter informations compagnie
            if product.insurance_company:
                product_dict["company"] = {
                    "id": product.insurance_company.id,
                    "name": product.insurance_company.name,
                    "full_name": product.insurance_company.full_name
                }
            
            # Ajouter statistiques
            quotes_count = db.query(InsuranceQuote).filter(
                InsuranceQuote.insurance_product_id == product.id
            ).count()
            
            applications_count = db.query(InsuranceApplication).filter(
                InsuranceApplication.insurance_product_id == product.id
            ).count()
            
            product_dict.update({
                "quotes_count": quotes_count,
                "applications_count": applications_count
            })
            
            enriched_products.append(product_dict)
        
        return {
            "data": enriched_products,
            "total": total,
            "page": page,
            "size": size,
            "pages": (total + size - 1) // size,
            "has_next": page * size < total,
            "has_prev": page > 1
        }
        
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Erreur lors de la récupération: {str(e)}")

# ==================== STATISTIQUES ====================

@router.get("/insurance/stats")
async def get_insurance_stats(
    date_from: Optional[datetime] = Query(None, description="Date de début pour les stats"),
    date_to: Optional[datetime] = Query(None, description="Date de fin pour les stats"),
    db: Session = Depends(get_db)
):
    """Obtenir les statistiques des assurances."""
    try:
        # Statistiques générales
        companies_count = db.query(InsuranceCompany).count()
        active_companies_count = db.query(InsuranceCompany).filter(InsuranceCompany.is_active == True).count()
        products_count = db.query(InsuranceProduct).count()
        active_products_count = db.query(InsuranceProduct).filter(InsuranceProduct.is_active == True).count()
        
        # Requête de base pour les applications
        applications_query = db.query(InsuranceApplication)
        quotes_query = db.query(InsuranceQuote)
        
        # Filtres de date si fournis
        if date_from:
            applications_query = applications_query.filter(InsuranceApplication.submitted_at >= date_from)
            quotes_query = quotes_query.filter(InsuranceQuote.created_at >= date_from)
        
        if date_to:
            applications_query = applications_query.filter(InsuranceApplication.submitted_at <= date_to)
            quotes_query = quotes_query.filter(InsuranceQuote.created_at <= date_to)
        
        applications_count = applications_query.count()
        quotes_count = quotes_query.count()
        
        return {
            "summary": {
                "total_companies": companies_count,
                "active_companies": active_companies_count,
                "total_products": products_count,
                "active_products": active_products_count,
                "total_applications": applications_count,
                "total_quotes": quotes_count
            },
            "period": {
                "from": date_from.isoformat() if date_from else None,
                "to": date_to.isoformat() if date_to else None
            }
        }
        
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Erreur lors du calcul des statistiques: {str(e)}")

# ==================== UTILITAIRES ====================

@router.get("/insurance/specialties")
async def get_insurance_specialties():
    """Obtenir la liste des spécialités d'assurance disponibles."""
    return {
        "specialties": [
            {"value": "auto", "label": "Automobile"},
            {"value": "habitation", "label": "Habitation"},
            {"value": "vie", "label": "Assurance Vie"},
            {"value": "sante", "label": "Santé"},
            {"value": "voyage", "label": "Voyage"},
            {"value": "transport", "label": "Transport"}
        ]
    }

@router.get("/insurance/types")
async def get_insurance_types():
    """Obtenir la liste des types d'assurance disponibles."""
    return {
        "types": [
            {"value": "auto", "label": "Automobile"},
            {"value": "habitation", "label": "Habitation"},
            {"value": "vie", "label": "Assurance Vie"},
            {"value": "sante", "label": "Santé"},
            {"value": "voyage", "label": "Voyage"},
            {"value": "transport", "label": "Transport"}
        ]
    }

@router.get("/insurance/health")
async def check_insurance_health(db: Session = Depends(get_db)):
    """Vérifier la santé du système d'assurance."""
    try:
        # Test de connexion base de données
        db.execute(text("SELECT 1"))
        
        # Compter les entités principales
        companies_count = db.query(InsuranceCompany).count()
        products_count = db.query(InsuranceProduct).count()
        applications_count = db.query(InsuranceApplication).count()
        
        return {
            "status": "healthy",
            "timestamp": datetime.utcnow().isoformat(),
            "database": "connected",
            "entities": {
                "companies": companies_count,
                "products": products_count,
                "applications": applications_count
            },
            "version": "1.0.0"
        }
        
    except Exception as e:
        raise HTTPException(
            status_code=503,
            detail={
                "status": "unhealthy",
                "error": str(e),
                "timestamp": datetime.utcnow().isoformat()
            }
        )