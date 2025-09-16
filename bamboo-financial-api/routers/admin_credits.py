# routers/credit_admin.py - Router d'administration des produits de crédit
from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.orm import Session
from sqlalchemy import func, desc, and_, or_
from typing import List, Optional
from datetime import datetime
import uuid
import models
import schemas
from database import get_db

router = APIRouter()

@router.get("/admin/credit-products")
async def get_credit_products_admin(
    skip: int = Query(0, ge=0),
    limit: int = Query(20, ge=1, le=100),
    search: Optional[str] = Query(None),
    bank_id: Optional[str] = Query(None),
    type: Optional[str] = Query(None),
    is_active: Optional[bool] = Query(None),
    db: Session = Depends(get_db)
):
    """Récupère tous les produits de crédit avec informations banque"""
    try:
        # Requête de base
        query = db.query(models.CreditProduct).join(models.Bank)
        
        # Application des filtres
        filters = []
        
        if search:
            search_filter = f"%{search}%"
            filters.append(or_(
                models.CreditProduct.name.ilike(search_filter),
                models.CreditProduct.description.ilike(search_filter),
                models.CreditProduct.type.ilike(search_filter),
                models.Bank.name.ilike(search_filter)
            ))
        
        if bank_id:
            filters.append(models.CreditProduct.bank_id == bank_id)
            
        if type:
            filters.append(models.CreditProduct.type == type)
            
        if is_active is not None:
            filters.append(models.CreditProduct.is_active == is_active)

        if filters:
            query = query.filter(and_(*filters))

        # Compter le total
        total = query.count()
        
        # Pagination
        products = query.order_by(desc(models.CreditProduct.created_at)).offset(skip).limit(limit).all()

        # Formatage de la réponse
        items = []
        for product in products:
            items.append({
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
                "is_active": product.is_active,
                "is_featured": product.is_featured,
                "created_at": product.created_at.isoformat(),
                "updated_at": product.updated_at.isoformat(),
                "bank": {
                    "id": product.bank.id,
                    "name": product.bank.name,
                    "logo_url": product.bank.logo_url
                }
            })

        pages = (total + limit - 1) // limit
        
        return {
            "items": items,
            "total": total,
            "page": (skip // limit) + 1,
            "limit": limit,
            "pages": pages
        }

    except Exception as e:
        print(f"Erreur get_credit_products_admin: {e}")
        import traceback
        traceback.print_exc()
        raise HTTPException(status_code=500, detail=f"Erreur lors de la récupération des produits: {str(e)}")

@router.get("/admin/credit-products/{product_id}")
async def get_credit_product_admin(product_id: str, db: Session = Depends(get_db)):
    """Récupère un produit de crédit par son ID"""
    try:
        product = db.query(models.CreditProduct).filter(models.CreditProduct.id == product_id).first()
        if not product:
            raise HTTPException(status_code=404, detail="Produit non trouvé")

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
            "created_at": product.created_at.isoformat(),
            "updated_at": product.updated_at.isoformat(),
            "bank": {
                "id": product.bank.id,
                "name": product.bank.name,
                "logo_url": product.bank.logo_url
            }
        }

    except HTTPException:
        raise
    except Exception as e:
        print(f"Erreur get_credit_product_admin: {e}")
        raise HTTPException(status_code=500, detail="Erreur lors de la récupération du produit")

@router.post("/admin/credit-products")
async def create_credit_product_admin(product: schemas.CreditProductCreate, db: Session = Depends(get_db)):
    """Crée un nouveau produit de crédit"""
    try:
        # Vérifier que la banque existe
        bank = db.query(models.Bank).filter(models.Bank.id == product.bank_id).first()
        if not bank:
            raise HTTPException(status_code=404, detail="Banque non trouvée")

        # Créer le produit
        product_data = product.dict()
        if not product_data.get('id'):
            product_data['id'] = str(uuid.uuid4())
            
        db_product = models.CreditProduct(**product_data)
        db.add(db_product)
        db.commit()
        db.refresh(db_product)

        return {
            "message": "Produit créé avec succès",
            "id": db_product.id
        }

    except HTTPException:
        raise
    except Exception as e:
        db.rollback()
        print(f"Erreur create_credit_product_admin: {e}")
        raise HTTPException(status_code=500, detail="Erreur lors de la création du produit")

@router.put("/admin/credit-products/{product_id}")
async def update_credit_product_admin(product_id: str, product_update: schemas.CreditProductUpdate, db: Session = Depends(get_db)):
    """Met à jour un produit de crédit"""
    try:
        db_product = db.query(models.CreditProduct).filter(models.CreditProduct.id == product_id).first()
        if not db_product:
            raise HTTPException(status_code=404, detail="Produit non trouvé")

        # Vérifier la banque si elle est modifiée
        update_data = product_update.dict(exclude_unset=True)
        if 'bank_id' in update_data:
            bank = db.query(models.Bank).filter(models.Bank.id == update_data['bank_id']).first()
            if not bank:
                raise HTTPException(status_code=404, detail="Banque non trouvée")

        # Mettre à jour
        for field, value in update_data.items():
            setattr(db_product, field, value)

        db.commit()
        db.refresh(db_product)

        return {"message": "Produit mis à jour avec succès"}

    except HTTPException:
        raise
    except Exception as e:
        db.rollback()
        print(f"Erreur update_credit_product_admin: {e}")
        raise HTTPException(status_code=500, detail="Erreur lors de la mise à jour")

@router.delete("/admin/credit-products/{product_id}")
async def delete_credit_product_admin(product_id: str, db: Session = Depends(get_db)):
    """Supprime un produit de crédit"""
    try:
        db_product = db.query(models.CreditProduct).filter(models.CreditProduct.id == product_id).first()
        if not db_product:
            raise HTTPException(status_code=404, detail="Produit non trouvé")

        # Vérifier s'il y a des simulations liées
        simulations_count = db.query(models.CreditSimulation).filter(
            models.CreditSimulation.credit_product_id == product_id
        ).count()
        
        if simulations_count > 0:
            raise HTTPException(
                status_code=409, 
                detail=f"Impossible de supprimer le produit. Il a {simulations_count} simulations associées."
            )

        product_name = db_product.name
        db.delete(db_product)
        db.commit()

        return {"message": f"Produit '{product_name}' supprimé avec succès"}

    except HTTPException:
        raise
    except Exception as e:
        db.rollback()
        print(f"Erreur delete_credit_product_admin: {e}")
        raise HTTPException(status_code=500, detail="Erreur lors de la suppression")

@router.get("/admin/credit-products/stats")
async def get_credit_products_stats(db: Session = Depends(get_db)):
    """Statistiques des produits de crédit"""
    try:
        total_products = db.query(models.CreditProduct).count()
        active_products = db.query(models.CreditProduct).filter(models.CreditProduct.is_active == True).count()
        
        # Taux moyen
        avg_rate_result = db.query(func.avg(models.CreditProduct.average_rate)).filter(
            models.CreditProduct.is_active == True
        ).scalar()
        
        average_rate = float(avg_rate_result) if avg_rate_result else 0

        # Répartition par type
        types_stats = db.query(
            models.CreditProduct.type,
            func.count(models.CreditProduct.id).label('count')
        ).filter(
            models.CreditProduct.is_active == True
        ).group_by(models.CreditProduct.type).all()

        return {
            "total_products": total_products,
            "active_products": active_products,
            "inactive_products": total_products - active_products,
            "average_rate": round(average_rate, 2),
            "types_distribution": [
                {"type": stat.type, "count": stat.count} 
                for stat in types_stats
            ]
        }

    except Exception as e:
        print(f"Erreur get_credit_products_stats: {e}")
        raise HTTPException(status_code=500, detail="Erreur lors de la récupération des statistiques")