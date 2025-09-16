# credit_products_admin.py - Endpoints FastAPI pour les produits de crédit
from fastapi import APIRouter, Depends, HTTPException, status, Query
from sqlalchemy.orm import Session, joinedload
from sqlalchemy import and_, or_, desc, asc
from typing import List, Optional
from database import get_db
from models import CreditProduct, Bank
from schemas import (
    CreditProductCreate, 
    CreditProductUpdate, 
    CreditProduct as CreditProductSchema,
    PaginatedResponse,
    Message
)
import uuid
from datetime import datetime

router = APIRouter(prefix="/admin/credit-products", tags=["credit_admin"]) 

@router.get("/", response_model=dict)
def get_credit_products(
    db: Session = Depends(get_db),
    page: int = Query(1, ge=1, description="Numéro de page"),
    limit: int = Query(10, ge=1, le=100, description="Nombre d'éléments par page"),
    search: Optional[str] = Query(None, description="Recherche par nom ou description"),
    bank_id: Optional[str] = Query(None, description="Filtrer par banque"),
    type: Optional[str] = Query(None, description="Filtrer par type de crédit"),
    is_active: Optional[str] = Query(None, description="Filtrer par statut (true/false)"),
):
    """
    Récupère la liste des produits de crédit avec pagination et filtres
    """
    try:
        # Construction de la requête de base
        query = db.query(CreditProduct).options(joinedload(CreditProduct.bank))
        
        # Application des filtres
        filters = []
        
        if search:
            search_filter = or_(
                CreditProduct.name.ilike(f"%{search}%"),
                CreditProduct.description.ilike(f"%{search}%"),
                CreditProduct.type.ilike(f"%{search}%")
            )
            filters.append(search_filter)
        
        if bank_id:
            filters.append(CreditProduct.bank_id == bank_id)
        
        if type:
            filters.append(CreditProduct.type == type)
        
        if is_active == "true":
            filters.append(CreditProduct.is_active == True)
        elif is_active == "false":
            filters.append(CreditProduct.is_active == False)
        
        if filters:
            query = query.filter(and_(*filters))
        
        # Tri par date de création (plus récent en premier)
        query = query.order_by(desc(CreditProduct.created_at))
        
        # Comptage total pour la pagination
        total = query.count()
        
        # Calcul de la pagination
        skip = (page - 1) * limit
        total_pages = (total + limit - 1) // limit
        
        # Récupération des produits avec pagination
        products = query.offset(skip).limit(limit).all()
        
        return {
            "items": [
                {
                    "id": product.id,
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
                    "is_featured": product.is_featured,
                    "is_active": product.is_active,
                    "features": product.features or [],
                    "advantages": product.advantages or [],
                    "special_conditions": product.special_conditions,
                    "created_at": product.created_at.isoformat(),
                    "updated_at": product.updated_at.isoformat(),
                    "bank": {
                        "id": product.bank.id,
                        "name": product.bank.name,
                        "logo_url": product.bank.logo_url
                    } if product.bank else None
                }
                for product in products
            ],
            "total": total,
            "page": page,
            "limit": limit,
            "pages": total_pages
        }
        
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Erreur lors de la récupération des produits de crédit: {str(e)}"
        )

@router.post("/", response_model=dict, status_code=status.HTTP_201_CREATED)
def create_credit_product(
    product_data: CreditProductCreate,
    db: Session = Depends(get_db)
):
    """
    Crée un nouveau produit de crédit
    """
    try:
        # Vérifier que la banque existe
        bank = db.query(Bank).filter(Bank.id == product_data.bank_id).first()
        if not bank:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail=f"Banque avec l'ID {product_data.bank_id} introuvable"
            )
        
        # Validation des montants
        if product_data.max_amount <= product_data.min_amount:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Le montant maximum doit être supérieur au montant minimum"
            )
        
        if product_data.max_duration_months <= product_data.min_duration_months:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="La durée maximum doit être supérieure à la durée minimum"
            )
        
        # Génération de l'ID si non fourni
        product_id = product_data.id if hasattr(product_data, 'id') and product_data.id else str(uuid.uuid4())
        
        # Conversion des listes en format approprié pour PostgreSQL
        features_list = product_data.features if isinstance(product_data.features, list) else []
        advantages_list = product_data.advantages if isinstance(product_data.advantages, list) else []
        
        # Création du produit
        new_product = CreditProduct(
            id=product_id,
            bank_id=product_data.bank_id,
            name=product_data.name,
            type=product_data.type,
            description=product_data.description,
            min_amount=product_data.min_amount,
            max_amount=product_data.max_amount,
            min_duration_months=product_data.min_duration_months,
            max_duration_months=product_data.max_duration_months,
            average_rate=product_data.average_rate,
            min_rate=product_data.min_rate,
            max_rate=product_data.max_rate,
            processing_time_hours=product_data.processing_time_hours,
            required_documents=product_data.required_documents or {},
            eligibility_criteria=product_data.eligibility_criteria or {},
            fees=product_data.fees or {},
            features=features_list,
            advantages=advantages_list,
            special_conditions=product_data.special_conditions,
            is_featured=product_data.is_featured,
            is_active=product_data.is_active,
            created_at=datetime.utcnow(),
            updated_at=datetime.utcnow()
        )
        
        db.add(new_product)
        db.commit()
        db.refresh(new_product)
        
        return {
            "message": "Produit de crédit créé avec succès",
            "id": new_product.id
        }
        
    except HTTPException:
        raise
    except Exception as e:
        db.rollback()
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Erreur lors de la création du produit: {str(e)}"
        )

@router.get("/{product_id}", response_model=dict)
def get_credit_product(
    product_id: str,
    db: Session = Depends(get_db)
):
    """
    Récupère un produit de crédit par son ID
    """
    try:
        product = db.query(CreditProduct).options(
            joinedload(CreditProduct.bank)
        ).filter(CreditProduct.id == product_id).first()
        
        if not product:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail=f"Produit de crédit avec l'ID {product_id} introuvable"
            )
        
        return {
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
            "features": product.features or [],
            "advantages": product.advantages or [],
            "special_conditions": product.special_conditions,
            "is_featured": product.is_featured,
            "is_active": product.is_active,
            "created_at": product.created_at.isoformat(),
            "updated_at": product.updated_at.isoformat(),
            "bank": {
                "id": product.bank.id,
                "name": product.bank.name,
                "logo_url": product.bank.logo_url
            } if product.bank else None
        }
        
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Erreur lors de la récupération du produit: {str(e)}"
        )

@router.put("/{product_id}", response_model=dict)
def update_credit_product(
    product_id: str,
    product_data: CreditProductUpdate,
    db: Session = Depends(get_db)
):
    """
    Met à jour un produit de crédit
    """
    try:
        product = db.query(CreditProduct).filter(CreditProduct.id == product_id).first()
        
        if not product:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail=f"Produit de crédit avec l'ID {product_id} introuvable"
            )
        
        # Mise à jour des champs modifiés
        update_data = product_data.dict(exclude_unset=True)
        
        for field, value in update_data.items():
            if hasattr(product, field):
                setattr(product, field, value)
        
        product.updated_at = datetime.utcnow()
        
        db.commit()
        db.refresh(product)
        
        return {
            "message": "Produit de crédit mis à jour avec succès"
        }
        
    except HTTPException:
        raise
    except Exception as e:
        db.rollback()
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Erreur lors de la mise à jour du produit: {str(e)}"
        )

@router.delete("/{product_id}", response_model=dict)
def delete_credit_product(
    product_id: str,
    db: Session = Depends(get_db)
):
    """
    Supprime un produit de crédit
    """
    try:
        product = db.query(CreditProduct).filter(CreditProduct.id == product_id).first()
        
        if not product:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail=f"Produit de crédit avec l'ID {product_id} introuvable"
            )
        
        db.delete(product)
        db.commit()
        
        return {
            "message": "Produit de crédit supprimé avec succès"
        }
        
    except HTTPException:
        raise
    except Exception as e:
        db.rollback()
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Erreur lors de la suppression du produit: {str(e)}"
        )

@router.get("/stats", response_model=dict)
def get_credit_products_stats(db: Session = Depends(get_db)):
    """
    Récupère les statistiques des produits de crédit
    """
    try:
        from sqlalchemy import func
        
        # Statistiques globales
        total_products = db.query(CreditProduct).count()
        active_products = db.query(CreditProduct).filter(CreditProduct.is_active == True).count()
        
        # Taux moyen
        avg_rate_result = db.query(func.avg(CreditProduct.average_rate)).scalar()
        average_rate = float(avg_rate_result) if avg_rate_result else 0.0
        
        return {
            "total_products": total_products,
            "active_products": active_products,
            "average_rate": round(average_rate, 2)
        }
        
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Erreur lors du calcul des statistiques: {str(e)}"
        )