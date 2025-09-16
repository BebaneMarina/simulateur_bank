from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.orm import Session, joinedload
from sqlalchemy import func, desc, asc
from typing import List, Optional
from datetime import datetime, timedelta
import math

from database import get_db
from models import CreditApplication, CreditProduct, Bank
from schemas import CreditApplicationResponse, PaginatedResponse

router = APIRouter(prefix="/api/admin/applications", tags=["Admin Applications"])

@router.get("/credit", response_model=dict)
async def get_admin_credit_applications(
    page: int = Query(1, ge=1),
    limit: int = Query(15, ge=1, le=100),
    search: Optional[str] = Query(None),
    status: Optional[str] = Query(None),
    bank_id: Optional[str] = Query(None),
    priority: Optional[str] = Query(None),
    db: Session = Depends(get_db)
):
    """Récupérer les demandes de crédit pour l'admin avec pagination et filtres"""
    try:
        # Query de base avec relations
        query = db.query(CreditApplication).options(
            joinedload(CreditApplication.credit_product).joinedload(CreditProduct.bank)
        )
        
        # Filtres
        if search:
            search_pattern = f"%{search}%"
            query = query.filter(
                db.or_(
                    CreditApplication.applicant_name.ilike(search_pattern),
                    CreditApplication.applicant_email.ilike(search_pattern),
                    CreditApplication.applicant_phone.ilike(search_pattern)
                )
            )
        
        if status:
            query = query.filter(CreditApplication.status == status)
        
        if bank_id:
            query = query.join(CreditProduct).filter(CreditProduct.bank_id == bank_id)
        
        # Tri par date de création (plus récent en premier)
        query = query.order_by(desc(CreditApplication.submitted_at))
        
        # Pagination
        offset = (page - 1) * limit
        total = query.count()
        
        applications = query.offset(offset).limit(limit).all()
        
        # Calculer pagination
        pages = math.ceil(total / limit)
        has_next = page < pages
        has_prev = page > 1
        
        return {
            "items": applications,
            "total": total,
            "page": page,
            "per_page": limit,
            "pages": pages,
            "has_next": has_next,
            "has_prev": has_prev
        }
        
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Erreur serveur: {str(e)}")

@router.get("/credit/{application_id}")
async def get_admin_credit_application(
    application_id: str,
    db: Session = Depends(get_db)
):
    """Récupérer une demande de crédit spécifique pour l'admin"""
    try:
        application = db.query(CreditApplication).options(
            joinedload(CreditApplication.credit_product).joinedload(CreditProduct.bank)
        ).filter(CreditApplication.id == application_id).first()
        
        if not application:
            raise HTTPException(status_code=404, detail="Demande non trouvée")
        
        return application
        
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Erreur serveur: {str(e)}")

@router.put("/credit/{application_id}")
async def update_admin_credit_application(
    application_id: str,
    update_data: dict,
    db: Session = Depends(get_db)
):
    """Mettre à jour une demande de crédit (admin)"""
    try:
        application = db.query(CreditApplication).filter(
            CreditApplication.id == application_id
        ).first()
        
        if not application:
            raise HTTPException(status_code=404, detail="Demande non trouvée")
        
        # Mettre à jour les champs autorisés
        allowed_fields = ['status', 'processing_notes', 'assigned_to', 'bank_response']
        
        for field, value in update_data.items():
            if field in allowed_fields and value is not None:
                setattr(application, field, value)
        
        application.updated_at = datetime.utcnow()
        
        db.commit()
        db.refresh(application)
        
        return application
        
    except Exception as e:
        db.rollback()
        raise HTTPException(status_code=500, detail=f"Erreur serveur: {str(e)}")

@router.get("/credit/stats/summary")
async def get_applications_stats(db: Session = Depends(get_db)):
    """Obtenir les statistiques des demandes"""
    try:
        total = db.query(CreditApplication).count()
        pending = db.query(CreditApplication).filter(CreditApplication.status == 'pending').count()
        approved = db.query(CreditApplication).filter(CreditApplication.status == 'approved').count()
        rejected = db.query(CreditApplication).filter(CreditApplication.status == 'rejected').count()
        
        return {
            "total": total,
            "pending": pending,
            "approved": approved,
            "rejected": rejected
        }
        
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Erreur serveur: {str(e)}")