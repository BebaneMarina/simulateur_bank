# savings_products_router.py - Endpoints FastAPI pour les produits d'épargne
from fastapi import APIRouter, Depends, HTTPException, status, Query
from sqlalchemy.orm import Session, joinedload
from sqlalchemy import and_, or_, desc, asc
from typing import List, Optional
from database import get_db
from models import SavingsProduct, Bank
from schemas import (
    SavingsProductCreate, 
    SavingsProductUpdate, 
    SavingsProduct as SavingsProductSchema,
    PaginatedResponse,
    Message
)
import uuid
from datetime import datetime

router = APIRouter(prefix="/admin/savings-products", tags=["savings_admin"]) 

@router.get("/", response_model=dict)
def get_savings_products(
    db: Session = Depends(get_db),
    skip: int = Query(0, ge=0, description="Nombre d'éléments à ignorer"),
    limit: int = Query(50, ge=1, le=100, description="Nombre d'éléments par page"),
    search: Optional[str] = Query(None, description="Recherche par nom ou type"),
    bank_id: Optional[str] = Query(None, description="Filtrer par banque"),
    type: Optional[str] = Query(None, description="Filtrer par type de produit"),
    status: Optional[str] = Query(None, description="Filtrer par statut (active/inactive)"),
    sort_by: Optional[str] = Query("created_at", description="Champ de tri"),
    sort_order: Optional[str] = Query("desc", description="Ordre de tri (asc/desc)")
):
    """
    Récupère la liste des produits d'épargne avec pagination et filtres
    """
    try:
        # Construction de la requête de base
        query = db.query(SavingsProduct).options(joinedload(SavingsProduct.bank))
        
        # Application des filtres
        filters = []
        
        if search:
            search_filter = or_(
                SavingsProduct.name.ilike(f"%{search}%"),
                SavingsProduct.type.ilike(f"%{search}%"),
                SavingsProduct.description.ilike(f"%{search}%")
            )
            filters.append(search_filter)
        
        if bank_id:
            filters.append(SavingsProduct.bank_id == bank_id)
        
        if type:
            filters.append(SavingsProduct.type == type)
        
        if status == "active":
            filters.append(SavingsProduct.is_active == True)
        elif status == "inactive":
            filters.append(SavingsProduct.is_active == False)
        
        if filters:
            query = query.filter(and_(*filters))
        
        # Tri
        if sort_by and hasattr(SavingsProduct, sort_by):
            sort_column = getattr(SavingsProduct, sort_by)
            if sort_order == "asc":
                query = query.order_by(asc(sort_column))
            else:
                query = query.order_by(desc(sort_column))
        else:
            query = query.order_by(desc(SavingsProduct.created_at))
        
        # Comptage total pour la pagination
        total = query.count()
        
        # Pagination
        products = query.offset(skip).limit(limit).all()
        
        # Calcul des statistiques
        total_pages = (total + limit - 1) // limit
        current_page = (skip // limit) + 1
        
        return {
            "products": [
                {
                    "id": product.id,
                    "name": product.name,
                    "type": product.type,
                    "interest_rate": float(product.interest_rate),
                    "minimum_deposit": float(product.minimum_deposit),
                    "maximum_deposit": float(product.maximum_deposit) if product.maximum_deposit else None,
                    "minimum_balance": float(product.minimum_balance),
                    "liquidity": product.liquidity,
                    "term_months": product.term_months,
                    "risk_level": product.risk_level,
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
                for product in products
            ],
            "pagination": {
                "total": total,
                "skip": skip,
                "limit": limit,
                "pages": total_pages,
                "current_page": current_page,
                "has_next": skip + limit < total,
                "has_prev": skip > 0
            }
        }
        
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Erreur lors de la récupération des produits d'épargne: {str(e)}"
        )

# Correction de la fonction create_savings_product dans savings_admin.py

@router.post("/", response_model=dict, status_code=status.HTTP_201_CREATED)
def create_savings_product(
    product_data: SavingsProductCreate,
    db: Session = Depends(get_db)
):
    """
    Crée un nouveau produit d'épargne
    """
    try:
        # Vérifier que la banque existe
        bank = db.query(Bank).filter(Bank.id == product_data.bank_id).first()
        if not bank:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail=f"Banque avec l'ID {product_data.bank_id} introuvable"
            )
        
        # Vérifier l'unicité du nom pour cette banque
        existing_product = db.query(SavingsProduct).filter(
            and_(
                SavingsProduct.bank_id == product_data.bank_id,
                SavingsProduct.name == product_data.name
            )
        ).first()
        
        if existing_product:
            raise HTTPException(
                status_code=status.HTTP_409_CONFLICT,
                detail=f"Un produit avec le nom '{product_data.name}' existe déjà pour cette banque"
            )
        
        # Validation des montants
        if product_data.maximum_deposit and product_data.maximum_deposit <= product_data.minimum_deposit:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Le montant maximum doit être supérieur au montant minimum"
            )
        
        if product_data.minimum_balance > product_data.minimum_deposit:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Le solde minimum ne peut pas être supérieur au dépôt minimum"
            )
        
        # Génération de l'ID si non fourni
        product_id = product_data.id if hasattr(product_data, 'id') and product_data.id else str(uuid.uuid4())
        
        # CORRECTION CRITIQUE : Conversion explicite des valeurs enum en chaînes
        type_value = product_data.type.value if hasattr(product_data.type, 'value') else str(product_data.type)
        liquidity_value = product_data.liquidity.value if hasattr(product_data.liquidity, 'value') else str(product_data.liquidity)
        compounding_frequency_value = product_data.compounding_frequency.value if hasattr(product_data.compounding_frequency, 'value') else str(product_data.compounding_frequency)
        
        # CORRECTION CRITIQUE : Gestion des champs JSON - PostgreSQL attend des objets Python bruts
        fees_data = product_data.fees if product_data.fees is not None else {}
        features_data = product_data.features if product_data.features is not None else []
        advantages_data = product_data.advantages if product_data.advantages is not None else []
        tax_benefits_data = product_data.tax_benefits if product_data.tax_benefits is not None else []
        
        # Création du produit avec types corrects
        new_product = SavingsProduct(
            id=product_id,
            bank_id=product_data.bank_id,
            name=product_data.name,
            type=type_value,  # Valeur string, pas enum
            description=product_data.description,
            interest_rate=product_data.interest_rate,
            minimum_deposit=product_data.minimum_deposit,
            maximum_deposit=product_data.maximum_deposit,
            minimum_balance=product_data.minimum_balance,
            liquidity=liquidity_value,  # Valeur string, pas enum
            notice_period_days=product_data.notice_period_days,
            term_months=product_data.term_months,
            compounding_frequency=compounding_frequency_value,  # Valeur string, pas enum
            fees=fees_data,  # Objet dict brut pour PostgreSQL JSON
            features=features_data,  # Liste brute pour PostgreSQL JSON
            advantages=advantages_data,  # Liste brute pour PostgreSQL JSON
            tax_benefits=tax_benefits_data,  # Liste brute pour PostgreSQL JSON
            risk_level=product_data.risk_level,
            early_withdrawal_penalty=product_data.early_withdrawal_penalty,
            is_islamic_compliant=product_data.is_islamic_compliant,
            is_featured=product_data.is_featured,
            is_active=product_data.is_active,
            created_at=datetime.utcnow(),
            updated_at=datetime.utcnow()
        )
        
        db.add(new_product)
        
        # Commit avec gestion d'erreur détaillée
        try:
            db.commit()
            db.refresh(new_product)
            print(f"Produit créé avec succès : {new_product.id}")
        except Exception as commit_error:
            db.rollback()
            print(f"Erreur lors du commit: {commit_error}")
            print(f"Type de l'erreur: {type(commit_error)}")
            raise HTTPException(
                status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                detail=f"Erreur lors de la sauvegarde en base : {str(commit_error)}"
            )
        
        # Récupération du produit avec les relations
        created_product = db.query(SavingsProduct).options(
            joinedload(SavingsProduct.bank)
        ).filter(SavingsProduct.id == new_product.id).first()
        
        return {
            "message": "Produit d'épargne créé avec succès",
            "product": {
                "id": created_product.id,
                "name": created_product.name,
                "type": created_product.type,
                "interest_rate": float(created_product.interest_rate),
                "minimum_deposit": float(created_product.minimum_deposit),
                "maximum_deposit": float(created_product.maximum_deposit) if created_product.maximum_deposit else None,
                "is_active": created_product.is_active,
                "bank": {
                    "id": created_product.bank.id,
                    "name": created_product.bank.name
                }
            }
        }
        
    except HTTPException:
        db.rollback()
        raise
    except Exception as e:
        db.rollback()
        print(f"Erreur inattendue: {e}")
        print(f"Type de l'erreur: {type(e)}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Erreur lors de la création du produit: {str(e)}"
        )

@router.get("/{product_id}", response_model=dict)
def get_savings_product(
    product_id: str,
    db: Session = Depends(get_db)
):
    """
    Récupère un produit d'épargne par son ID
    """
    try:
        product = db.query(SavingsProduct).options(
            joinedload(SavingsProduct.bank)
        ).filter(SavingsProduct.id == product_id).first()
        
        if not product:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail=f"Produit d'épargne avec l'ID {product_id} introuvable"
            )
        
        return {
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
            "created_at": product.created_at.isoformat(),
            "updated_at": product.updated_at.isoformat(),
            "bank": {
                "id": product.bank.id,
                "name": product.bank.name,
                "full_name": product.bank.full_name,
                "logo_url": product.bank.logo_url,
                "website": product.bank.website
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
def update_savings_product(
    product_id: str,
    product_data: SavingsProductUpdate,
    db: Session = Depends(get_db)
):
    """
    Met à jour un produit d'épargne
    """
    try:
        product = db.query(SavingsProduct).filter(SavingsProduct.id == product_id).first()
        
        if not product:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail=f"Produit d'épargne avec l'ID {product_id} introuvable"
            )
        
        # Vérification de la banque si changée
        if product_data.bank_id and product_data.bank_id != product.bank_id:
            bank = db.query(Bank).filter(Bank.id == product_data.bank_id).first()
            if not bank:
                raise HTTPException(
                    status_code=status.HTTP_404_NOT_FOUND,
                    detail=f"Banque avec l'ID {product_data.bank_id} introuvable"
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
            "message": "Produit d'épargne mis à jour avec succès",
            "product_id": product.id
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
def delete_savings_product(
    product_id: str,
    db: Session = Depends(get_db)
):
    """
    Supprime un produit d'épargne
    """
    try:
        product = db.query(SavingsProduct).filter(SavingsProduct.id == product_id).first()
        
        if not product:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail=f"Produit d'épargne avec l'ID {product_id} introuvable"
            )
        
        # Vérifier s'il y a des simulations associées
        from models import SavingsSimulation
        simulations_count = db.query(SavingsSimulation).filter(
            SavingsSimulation.savings_product_id == product_id
        ).count()
        
        if simulations_count > 0:
            # Désactiver le produit au lieu de le supprimer
            product.is_active = False
            product.updated_at = datetime.utcnow()
            db.commit()
            
            return {
                "message": f"Produit désactivé (il y a {simulations_count} simulation(s) associée(s))",
                "action": "deactivated"
            }
        else:
            # Suppression définitive
            db.delete(product)
            db.commit()
            
            return {
                "message": "Produit d'épargne supprimé avec succès",
                "action": "deleted"
            }
        
    except HTTPException:
        raise
    except Exception as e:
        db.rollback()
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Erreur lors de la suppression du produit: {str(e)}"
        )

@router.get("/banks/list", response_model=dict)
def get_banks_for_products(db: Session = Depends(get_db)):
    """
    Récupère la liste des banques pour les formulaires de produits
    """
    try:
        banks = db.query(Bank).filter(Bank.is_active == True).order_by(Bank.name).all()
        
        return {
            "banks": [
                {
                    "id": bank.id,
                    "name": bank.name,
                    "full_name": bank.full_name,
                    "logo_url": bank.logo_url
                }
                for bank in banks
            ]
        }
        
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Erreur lors de la récupération des banques: {str(e)}"
        )

@router.get("/stats", response_model=dict)
def get_savings_products_statistics(db: Session = Depends(get_db)):
    """
    Récupère les statistiques des produits d'épargne
    """
    try:
        from sqlalchemy import func
        
        # Statistiques globales
        total_products = db.query(SavingsProduct).count()
        active_products = db.query(SavingsProduct).filter(SavingsProduct.is_active == True).count()
        featured_products = db.query(SavingsProduct).filter(SavingsProduct.is_featured == True).count()
        
        # Statistiques par type
        type_stats = db.query(
            SavingsProduct.type,
            func.count(SavingsProduct.id).label('count')
        ).group_by(SavingsProduct.type).all()
        
        # Statistiques par banque
        bank_stats = db.query(
            Bank.name,
            func.count(SavingsProduct.id).label('count')
        ).join(SavingsProduct).group_by(Bank.name).order_by(func.count(SavingsProduct.id).desc()).limit(10).all()
        
        # Taux moyens par type
        rate_stats = db.query(
            SavingsProduct.type,
            func.avg(SavingsProduct.interest_rate).label('avg_rate'),
            func.min(SavingsProduct.interest_rate).label('min_rate'),
            func.max(SavingsProduct.interest_rate).label('max_rate')
        ).group_by(SavingsProduct.type).all()
        
        return {
            "overview": {
                "total_products": total_products,
                "active_products": active_products,
                "featured_products": featured_products,
                "inactive_products": total_products - active_products
            },
            "by_type": [
                {"type": stat.type, "count": stat.count}
                for stat in type_stats
            ],
            "by_bank": [
                {"bank_name": stat.name, "count": stat.count}
                for stat in bank_stats
            ],
            "rates_by_type": [
                {
                    "type": stat.type,
                    "avg_rate": float(stat.avg_rate),
                    "min_rate": float(stat.min_rate),
                    "max_rate": float(stat.max_rate)
                }
                for stat in rate_stats
            ]
        }
        
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Erreur lors du calcul des statistiques: {str(e)}"
        )