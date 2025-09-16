# savings_applications.py - Endpoints pour les demandes d'épargne
from dataclasses import Field
from jinja2 import BaseLoader
from fastapi import APIRouter, Depends, HTTPException, Request
from sqlalchemy.orm import Session, joinedload
from sqlalchemy import desc
from typing import Optional
from datetime import datetime, date
import uuid

from database import get_db
from models import SavingsApplication, SavingsProduct, Bank
from schemas import ApplicationNotification, PaginatedResponse

router = APIRouter()

# Modèle pour une demande d'épargne
class SavingsApplicationCreate(BaseLoader):
    savings_product_id: str = Field(..., min_length=1, max_length=200)
    simulation_id: Optional[str] = None
    applicant_name: str = Field(..., min_length=1, max_length=200)
    applicant_email: Optional[str] = None
    applicant_phone: Optional[str] = Field(None, max_length=20)
    applicant_address: Optional[str] = None
    birth_date: Optional[date] = None
    nationality: Optional[str] = None
    marital_status: Optional[str] = None
    
    # Informations professionnelles
    profession: Optional[str] = None
    employer: Optional[str] = None
    monthly_income: Optional[float] = None
    
    # Informations épargne
    initial_deposit: float = Field(..., gt=0)
    monthly_contribution: Optional[float] = Field(None, ge=0)
    savings_goal: Optional[str] = None
    target_amount: Optional[float] = Field(None, gt=0)
    target_date: Optional[date] = None
    
    application_data: Optional[Dict[str, Any]] = Field(default_factory=dict)

@router.post("/applications/savings", response_model=ApplicationNotification)
async def submit_savings_application(
    application: SavingsApplicationCreate,
    request: Request,
    db: Session = Depends(get_db)
):
    """Soumettre une demande d'ouverture de compte épargne"""
    try:
        # Vérifier que le produit d'épargne existe
        savings_product = db.query(SavingsProduct).options(
            joinedload(SavingsProduct.bank)
        ).filter(SavingsProduct.id == application.savings_product_id).first()
        
        if not savings_product:
            raise HTTPException(status_code=404, detail="Produit d'épargne non trouvé")
        
        # Vérifier les montants minimum et maximum
        if application.initial_deposit < savings_product.minimum_deposit:
            raise HTTPException(
                status_code=400, 
                detail=f"Dépôt minimum requis: {savings_product.minimum_deposit:,.0f} FCFA"
            )
        
        if (savings_product.maximum_deposit and 
            application.initial_deposit > savings_product.maximum_deposit):
            raise HTTPException(
                status_code=400, 
                detail=f"Dépôt maximum autorisé: {savings_product.maximum_deposit:,.0f} FCFA"
            )
        
        # Générer un ID unique pour la demande
        application_id = f"sav_app_{uuid.uuid4().hex[:8]}"
        application_number = f"EPG-{datetime.now().strftime('%Y%m%d')}-{uuid.uuid4().hex[:6].upper()}"
        
        # Créer l'enregistrement en base
        db_application = SavingsApplication(
            id=application_id,
            simulation_id=application.simulation_id,
            savings_product_id=application.savings_product_id,
            applicant_name=application.applicant_name,
            applicant_email=application.applicant_email,
            applicant_phone=application.applicant_phone,
            initial_deposit=application.initial_deposit,
            monthly_contribution=application.monthly_contribution,
            status="pending",
            application_data={
                **application.application_data,
                "personal_info": {
                    "address": application.applicant_address,
                    "birth_date": application.birth_date.isoformat() if application.birth_date else None,
                    "nationality": application.nationality,
                    "marital_status": application.marital_status
                },
                "professional_info": {
                    "profession": application.profession,
                    "employer": application.employer,
                    "monthly_income": application.monthly_income
                },
                "savings_goal": application.savings_goal,
                "target_amount": application.target_amount,
                "target_date": application.target_date.isoformat() if application.target_date else None,
                "client_ip": str(request.client.host),
                "user_agent": request.headers.get("user-agent", ""),
                "submitted_via": "web_portal",
                "product_details": {
                    "interest_rate": float(savings_product.interest_rate),
                    "product_type": savings_product.type,
                    "liquidity": savings_product.liquidity
                }
            },
            submitted_at=datetime.utcnow()
        )
        
        db.add(db_application)
        db.commit()
        db.refresh(db_application)
        
        # Préparer la réponse de notification
        bank_name = savings_product.bank.name if savings_product.bank else "Banque"
        
        next_steps = [
            "Vous recevrez un email de confirmation dans les 24h",
            "Un conseiller vous contactera sous 48h pour finaliser l'ouverture",
            "Préparez vos pièces justificatives (CNI, justificatifs de revenus)",
            "Votre compte sera ouvert sous 72h après validation de votre dossier"
        ]
        
        # Ajouter des étapes spécifiques selon le type de produit
        if savings_product.type == "terme":
            next_steps.append("Signature du contrat de dépôt à terme")
        elif savings_product.type == "plan_epargne":
            next_steps.append("Mise en place du plan de versements automatiques")
        
        notification = ApplicationNotification(
            success=True,
            application_id=application_id,
            application_number=application_number,
            message=f"Votre demande d'ouverture de compte épargne {savings_product.name} a été reçue avec succès !",
            next_steps=next_steps,
            expected_processing_time="48h à 72h",
            contact_info={
                "bank_name": bank_name,
                "phone": savings_product.bank.contact_phone or "+241 01 00 00 00",
                "email": savings_product.bank.contact_email or "epargne@banque.ga",
                "application_number": application_number
            }
        )
        
        return notification
        
    except Exception as e:
        db.rollback()
        raise HTTPException(status_code=500, detail=f"Erreur lors de la soumission: {str(e)}")

@router.get("/applications/savings/{application_id}")
async def get_savings_application(
    application_id: str,
    db: Session = Depends(get_db)
):
    """Récupérer une demande d'épargne par ID"""
    application = db.query(SavingsApplication).options(
        joinedload(SavingsApplication.savings_product).joinedload(SavingsProduct.bank)
    ).filter(SavingsApplication.id == application_id).first()
    
    if not application:
        raise HTTPException(status_code=404, detail="Demande non trouvée")
    
    return application

@router.get("/applications/savings")
async def get_savings_applications(
    skip: int = 0,
    limit: int = 20,
    status: Optional[str] = None,
    db: Session = Depends(get_db)
):
    """Récupérer toutes les demandes d'épargne (pour l'admin)"""
    query = db.query(SavingsApplication).options(
        joinedload(SavingsApplication.savings_product).joinedload(SavingsProduct.bank)
    )
    
    if status:
        query = query.filter(SavingsApplication.status == status)
    
    query = query.order_by(desc(SavingsApplication.submitted_at))
    
    total = query.count()
    applications = query.offset(skip).limit(limit).all()
    
    return {
        "items": applications,
        "total": total,
        "skip": skip,
        "limit": limit
    }

@router.put("/applications/savings/{application_id}")
async def update_savings_application(
    application_id: str,
    update_data: dict,
    db: Session = Depends(get_db)
):
    """Mettre à jour une demande d'épargne (admin)"""
    application = db.query(SavingsApplication).filter(
        SavingsApplication.id == application_id
    ).first()
    
    if not application:
        raise HTTPException(status_code=404, detail="Demande non trouvée")
    
    # Champs autorisés pour la mise à jour
    allowed_fields = [
        'status', 'processing_notes', 'assigned_to', 
        'bank_response', 'account_number'
    ]
    
    for field, value in update_data.items():
        if field in allowed_fields and value is not None:
            setattr(application, field, value)
    
    application.updated_at = datetime.utcnow()
    
    db.commit()
    db.refresh(application)
    
    return application

@router.get("/applications/savings/stats/summary")
async def get_savings_applications_stats(db: Session = Depends(get_db)):
    """Obtenir les statistiques des demandes d'épargne"""
    try:
        total = db.query(SavingsApplication).count()
        pending = db.query(SavingsApplication).filter(SavingsApplication.status == 'pending').count()
        approved = db.query(SavingsApplication).filter(SavingsApplication.status == 'approved').count()
        opened = db.query(SavingsApplication).filter(SavingsApplication.status == 'opened').count()
        
        # Statistiques par type de produit
        product_stats = db.query(
            SavingsProduct.type,
            func.count(SavingsApplication.id)
        ).join(SavingsApplication).group_by(SavingsProduct.type).all()
        
        return {
            "total": total,
            "pending": pending,
            "approved": approved,
            "opened": opened,
            "by_product_type": {ptype: count for ptype, count in product_stats}
        }
        
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Erreur serveur: {str(e)}")