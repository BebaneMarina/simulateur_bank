# admin_insurance_applications.py - Endpoints admin pour les demandes d'assurance
from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.orm import Session, joinedload
from sqlalchemy import func, desc, asc, or_
from typing import List, Optional
from datetime import datetime, timedelta
import math

from database import get_db
from models import InsuranceApplication, InsuranceProduct, InsuranceCompany
from schemas import PaginatedResponse

router = APIRouter(prefix="/api/admin/applications", tags=["Admin Insurance Applications"])

@router.get("/insurance", response_model=dict)
async def get_admin_insurance_applications(
    page: int = Query(1, ge=1),
    limit: int = Query(15, ge=1, le=100),
    search: Optional[str] = Query(None),
    status: Optional[str] = Query(None),
    insurance_type: Optional[str] = Query(None),
    company_id: Optional[str] = Query(None),
    priority: Optional[str] = Query(None),
    date_from: Optional[str] = Query(None),
    date_to: Optional[str] = Query(None),
    db: Session = Depends(get_db)
):
    """Récupérer les demandes d'assurance pour l'admin avec pagination et filtres"""
    try:
        # Query de base avec relations CORRIGÉES
        query = db.query(InsuranceApplication).options(
            joinedload(InsuranceApplication.insurance_product).joinedload(InsuranceProduct.insurance_company),
            # Retirer cette ligne car la relation n'existe pas :
            # joinedload(InsuranceApplication.insurance_company)
        )
        
        # Filtres de recherche
        if search:
            search_pattern = f"%{search}%"
            query = query.filter(
                or_(
                    InsuranceApplication.applicant_name.ilike(search_pattern),
                    InsuranceApplication.applicant_email.ilike(search_pattern),
                    InsuranceApplication.applicant_phone.ilike(search_pattern)
                )
            )
        
        # Filtre par statut
        if status:
            query = query.filter(InsuranceApplication.status == status)
        
        # Filtre par type d'assurance
        if insurance_type:
            query = query.join(InsuranceProduct).filter(InsuranceProduct.type == insurance_type)
        
        # Filtre par compagnie d'assurance - CORRIGÉ
        if company_id:
            query = query.join(InsuranceProduct).filter(InsuranceProduct.insurance_company_id == company_id)
        
        # Filtre par date
        if date_from:
            try:
                date_from_obj = datetime.fromisoformat(date_from)
                query = query.filter(InsuranceApplication.submitted_at >= date_from_obj)
            except ValueError:
                pass
        
        if date_to:
            try:
                date_to_obj = datetime.fromisoformat(date_to)
                query = query.filter(InsuranceApplication.submitted_at <= date_to_obj)
            except ValueError:
                pass
        
        # Tri par date de création (plus récent en premier)
        query = query.order_by(desc(InsuranceApplication.submitted_at))
        
        # Pagination
        offset = (page - 1) * limit
        total = query.count()
        
        applications = query.offset(offset).limit(limit).all()
        
        # Calculer pagination
        pages = math.ceil(total / limit)
        has_next = page < pages
        has_prev = page > 1
        
        # Enrichir les données avec des informations calculées
        enriched_applications = []
        for app in applications:
            app_dict = {
                "id": app.id,
                "quote_id": app.quote_id,
                "applicant_name": app.applicant_name,
                "applicant_email": app.applicant_email,
                "applicant_phone": app.applicant_phone,
                "coverage_amount": app.coverage_amount,
                "status": app.status,
                "processing_notes": app.processing_notes,
                "assigned_to": app.assigned_to,
                "submitted_at": app.submitted_at.isoformat(),
                "updated_at": app.updated_at.isoformat() if app.updated_at else None,
                
                # Informations du produit d'assurance - CORRIGÉ
                "insurance_product": {
                    "id": app.insurance_product.id,
                    "name": app.insurance_product.name,
                    "type": app.insurance_product.type,
                    "description": app.insurance_product.description,
                    "base_premium": app.insurance_product.base_premium,
                    "insurance_company": {
                        "id": app.insurance_product.insurance_company.id,
                        "name": app.insurance_product.insurance_company.name,
                        "full_name": app.insurance_product.insurance_company.full_name,
                        "contact_phone": app.insurance_product.insurance_company.contact_phone,
                        "contact_email": app.insurance_product.insurance_company.contact_email
                    } if app.insurance_product.insurance_company else None
                } if app.insurance_product else None,
                
                # Calculs utiles
                "days_since_submission": (datetime.utcnow() - app.submitted_at).days,
                "priority": calculate_priority(app),
                "risk_level": assess_risk_level(app)
            }
            enriched_applications.append(app_dict)
        
        return {
            "items": enriched_applications,
            "total": total,
            "page": page,
            "per_page": limit,
            "pages": pages,
            "has_next": has_next,
            "has_prev": has_prev
        }
        
    except Exception as e:
        print(f"Erreur détaillée: {str(e)}")
        raise HTTPException(status_code=500, detail=f"Erreur serveur: {str(e)}")

@router.get("/insurance/{application_id}")
async def get_admin_insurance_application(
    application_id: str,
    db: Session = Depends(get_db)
):
    """Récupérer une demande d'assurance spécifique pour l'admin"""
    try:
        application = db.query(InsuranceApplication).options(
            joinedload(InsuranceApplication.insurance_product).joinedload(InsuranceProduct.insurance_company),
            joinedload(InsuranceApplication.insurance_company)
        ).filter(InsuranceApplication.id == application_id).first()
        
        if not application:
            raise HTTPException(status_code=404, detail="Demande non trouvée")
        
        # Enrichir avec des données calculées
        return {
            **application.__dict__,
            "days_since_submission": (datetime.utcnow() - application.submitted_at).days,
            "priority": calculate_priority(application),
            "risk_level": assess_risk_level(application),
            "recommended_actions": get_recommended_actions(application)
        }
        
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Erreur serveur: {str(e)}")

@router.put("/insurance/{application_id}")
async def update_admin_insurance_application(
    application_id: str,
    update_data: dict,
    db: Session = Depends(get_db)
):
    """Mettre à jour une demande d'assurance (admin)"""
    try:
        application = db.query(InsuranceApplication).filter(
            InsuranceApplication.id == application_id
        ).first()
        
        if not application:
            raise HTTPException(status_code=404, detail="Demande non trouvée")
        
        # Champs autorisés pour la mise à jour
        allowed_fields = [
            'status', 'processing_notes', 'assigned_to', 'insurance_response',
            'policy_number', 'premium_offered', 'deductible_offered',
            'medical_exam_required', 'medical_exam_date', 'documents_required',
            'documents_submitted', 'risk_assessment', 'premium_calculation'
        ]
        
        # Enregistrer l'ancien statut pour l'historique
        old_status = application.status
        
        for field, value in update_data.items():
            if field in allowed_fields and value is not None:
                setattr(application, field, value)
        
        application.updated_at = datetime.utcnow()
        
        # Marquer comme traité si le statut change vers approved/rejected/completed
        if application.status in ['approved', 'rejected', 'completed'] and not application.processed_at:
            application.processed_at = datetime.utcnow()
        
        db.commit()
        db.refresh(application)
        
        # Enregistrer l'historique du changement de statut
        if old_status != application.status:
            await log_status_change(db, application_id, old_status, application.status, update_data.get('assigned_to', 'system'))
        
        return application
        
    except Exception as e:
        db.rollback()
        raise HTTPException(status_code=500, detail=f"Erreur serveur: {str(e)}")

@router.get("/insurance/stats/summary")
async def get_insurance_applications_stats(db: Session = Depends(get_db)):
    """Obtenir les statistiques des demandes d'assurance"""
    try:
        # Statistiques générales
        total = db.query(InsuranceApplication).count()
        pending = db.query(InsuranceApplication).filter(InsuranceApplication.status == 'pending').count()
        under_review = db.query(InsuranceApplication).filter(InsuranceApplication.status == 'under_review').count()
        approved = db.query(InsuranceApplication).filter(InsuranceApplication.status == 'approved').count()
        rejected = db.query(InsuranceApplication).filter(InsuranceApplication.status == 'rejected').count()
        completed = db.query(InsuranceApplication).filter(InsuranceApplication.status == 'completed').count()
        
        # Statistiques par type d'assurance
        stats_by_type = db.query(
            InsuranceProduct.type,
            func.count(InsuranceApplication.id).label('count')
        ).join(InsuranceApplication).group_by(InsuranceProduct.type).all()
        
        # Statistiques par compagnie
        stats_by_company = db.query(
            InsuranceCompany.name,
            func.count(InsuranceApplication.id).label('count')
        ).join(InsuranceApplication).group_by(InsuranceCompany.name).all()
        
        # Temps de traitement moyen
        avg_processing_time = db.query(
            func.avg(
                func.extract('epoch', InsuranceApplication.processed_at - InsuranceApplication.submitted_at) / 86400
            ).label('avg_days')
        ).filter(InsuranceApplication.processed_at.isnot(None)).scalar()
        
        # Applications récentes (7 derniers jours)
        seven_days_ago = datetime.utcnow() - timedelta(days=7)
        recent_applications = db.query(InsuranceApplication).filter(
            InsuranceApplication.submitted_at >= seven_days_ago
        ).count()
        
        # Applications nécessitant une attention urgente
        urgent_applications = db.query(InsuranceApplication).filter(
            InsuranceApplication.status == 'pending',
            InsuranceApplication.submitted_at <= datetime.utcnow() - timedelta(days=3)
        ).count()
        
        return {
            "total": total,
            "pending": pending,
            "under_review": under_review,
            "approved": approved,
            "rejected": rejected,
            "completed": completed,
            "stats_by_type": [{"type": stat.type, "count": stat.count} for stat in stats_by_type],
            "stats_by_company": [{"company": stat.name, "count": stat.count} for stat in stats_by_company],
            "avg_processing_time_days": round(avg_processing_time or 0, 1),
            "recent_applications": recent_applications,
            "urgent_applications": urgent_applications
        }
        
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Erreur serveur: {str(e)}")

@router.post("/insurance/{application_id}/assign")
async def assign_insurance_application(
    application_id: str,
    assigned_to: str,
    db: Session = Depends(get_db)
):
    """Assigner une demande d'assurance à un agent"""
    try:
        application = db.query(InsuranceApplication).filter(
            InsuranceApplication.id == application_id
        ).first()
        
        if not application:
            raise HTTPException(status_code=404, detail="Demande non trouvée")
        
        old_assigned = application.assigned_to
        application.assigned_to = assigned_to
        application.updated_at = datetime.utcnow()
        
        # Changer le statut en "under_review" si c'était "pending"
        if application.status == "pending":
            application.status = "under_review"
        
        db.commit()
        
        return {
            "success": True,
            "message": f"Demande assignée à {assigned_to}",
            "previous_assigned": old_assigned,
            "new_assigned": assigned_to
        }
        
    except Exception as e:
        db.rollback()
        raise HTTPException(status_code=500, detail=f"Erreur serveur: {str(e)}")

@router.post("/insurance/{application_id}/medical-exam")
async def toggle_medical_exam_requirement(
    application_id: str,
    required: bool,
    exam_date: Optional[str] = None,
    db: Session = Depends(get_db)
):
    """Définir si un examen médical est requis"""
    try:
        application = db.query(InsuranceApplication).filter(
            InsuranceApplication.id == application_id
        ).first()
        
        if not application:
            raise HTTPException(status_code=404, detail="Demande non trouvée")
        
        application.medical_exam_required = required
        
        if required and exam_date:
            try:
                application.medical_exam_date = datetime.fromisoformat(exam_date)
            except ValueError:
                pass
        elif not required:
            application.medical_exam_date = None
        
        application.updated_at = datetime.utcnow()
        db.commit()
        
        return {
            "success": True,
            "message": f"Examen médical {'requis' if required else 'non requis'}",
            "medical_exam_required": required,
            "exam_date": application.medical_exam_date.isoformat() if application.medical_exam_date else None
        }
        
    except Exception as e:
        db.rollback()
        raise HTTPException(status_code=500, detail=f"Erreur serveur: {str(e)}")

@router.get("/insurance/{application_id}/history")
async def get_insurance_application_history(
    application_id: str,
    db: Session = Depends(get_db)
):
    """Récupérer l'historique d'une demande d'assurance"""
    try:
        from models import InsuranceApplicationStatusHistory
        
        history = db.query(InsuranceApplicationStatusHistory).filter(
            InsuranceApplicationStatusHistory.application_id == application_id
        ).order_by(desc(InsuranceApplicationStatusHistory.changed_at)).all()
        
        return {
            "application_id": application_id,
            "history": [
                {
                    "id": h.id,
                    "previous_status": h.previous_status,
                    "new_status": h.new_status,
                    "changed_by": h.changed_by,
                    "reason": h.reason,
                    "notes": h.notes,
                    "changed_at": h.changed_at.isoformat()
                } for h in history
            ]
        }
        
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Erreur serveur: {str(e)}")

# Fonctions utilitaires
def calculate_priority(application: InsuranceApplication) -> str:
    """Calculer la priorité d'une demande d'assurance"""
    priority_score = 0
    
    # Critères basés sur le montant de couverture
    if application.coverage_amount:
        if application.coverage_amount > 100000000:  # Plus de 100M FCFA
            priority_score += 3
        elif application.coverage_amount > 50000000:  # Plus de 50M FCFA
            priority_score += 2
        elif application.coverage_amount > 20000000:  # Plus de 20M FCFA
            priority_score += 1
    
    # Critères basés sur l'âge de la demande
    days_since_submission = (datetime.utcnow() - application.submitted_at).days
    if days_since_submission > 7:
        priority_score += 2
    elif days_since_submission > 3:
        priority_score += 1
    
    # Critères basés sur le type d'assurance
    if application.insurance_product and application.insurance_product.type in ['vie', 'sante']:
        priority_score += 1
    
    # Déterminer la priorité
    if priority_score >= 5:
        return 'urgent'
    elif priority_score >= 3:
        return 'high'
    elif priority_score >= 1:
        return 'normal'
    else:
        return 'low'

def assess_risk_level(application: InsuranceApplication) -> str:
    """Évaluer le niveau de risque d'une demande"""
    risk_score = 0
    
    # Analyse des antécédents médicaux pour l'assurance vie/santé
    if application.medical_history:
        if 'diabète' in application.medical_history.lower() or 'cancer' in application.medical_history.lower():
            risk_score += 3
        elif 'hypertension' in application.medical_history.lower():
            risk_score += 2
        elif 'allergie' in application.medical_history.lower():
            risk_score += 1
    
    # Analyse de l'âge pour l'assurance vie
    if application.insurance_product and application.insurance_product.type == 'vie':
        # Calculer l'âge approximatif si la date de naissance est disponible
        if application.birth_date:
            from datetime import date
            today = date.today()
            birth_date = datetime.strptime(application.birth_date, '%Y-%m-%d').date()
            age = today.year - birth_date.year - ((today.month, today.day) < (birth_date.month, birth_date.day))
            
            if age > 65:
                risk_score += 3
            elif age > 50:
                risk_score += 2
            elif age > 35:
                risk_score += 1
    
    # Analyse de la valeur du véhicule pour l'assurance auto
    if application.vehicle_value:
        if application.vehicle_value > 50000000:  # Véhicule de luxe
            risk_score += 2
        elif application.vehicle_value < 5000000:  # Véhicule ancien
            risk_score += 1
    
    # Déterminer le niveau de risque
    if risk_score >= 6:
        return 'high'
    elif risk_score >= 3:
        return 'medium'
    else:
        return 'low'

def get_recommended_actions(application: InsuranceApplication) -> List[str]:
    """Obtenir les actions recommandées pour une demande"""
    actions = []
    
    # Actions basées sur le type d'assurance
    if application.insurance_product:
        if application.insurance_product.type in ['vie', 'sante']:
            actions.append("Vérifier les antécédents médicaux")
            if not application.medical_exam_required:
                actions.append("Évaluer la nécessité d'un examen médical")
        
        elif application.insurance_product.type == 'auto':
            actions.append("Vérifier les documents du véhicule")
            actions.append("Contrôler le permis de conduire")
        
        elif application.insurance_product.type == 'habitation':
            actions.append("Évaluer les risques du logement")
            actions.append("Vérifier les mesures de sécurité")
    
    # Actions basées sur le statut
    if application.status == 'pending':
        actions.append("Assigner à un gestionnaire")
        actions.append("Envoyer accusé de réception")
    
    # Actions basées sur l'âge de la demande
    days_since_submission = (datetime.utcnow() - application.submitted_at).days
    if days_since_submission > 7:
        actions.append("Traitement prioritaire - délai dépassé")
    elif days_since_submission > 3:
        actions.append("Contacter le demandeur pour suivi")
    
    return actions

async def log_status_change(db: Session, application_id: str, old_status: str, new_status: str, changed_by: str):
    """Enregistrer l'historique de changement de statut"""
    try:
        from models import InsuranceApplicationStatusHistory
        import uuid
        
        history_entry = InsuranceApplicationStatusHistory(
            id=str(uuid.uuid4()),
            application_id=application_id,
            previous_status=old_status,
            new_status=new_status,
            changed_by=changed_by,
            reason=f"Changement de statut de {old_status} vers {new_status}",
            notes=f"Modification effectuée par {changed_by}",
            changed_at=datetime.utcnow()
        )
        
        db.add(history_entry)
        db.commit()
        
    except Exception as e:
        print(f"Erreur lors de l'enregistrement de l'historique: {str(e)}")
        # Ne pas faire échouer l'opération principale
        pass