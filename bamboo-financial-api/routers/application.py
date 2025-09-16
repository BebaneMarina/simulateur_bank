# routers/applications.py - Router pour les applications de crédit
from fastapi import APIRouter, Depends, HTTPException, status, Request
from sqlalchemy.orm import Session, joinedload
from typing import List, Optional
from datetime import datetime
import uuid
import logging

from database import get_db
from models import (
    CreditApplication, 
    CreditProduct,
    Bank
)
from schemas import (
    CreditApplicationCreate, 
    CreditApplicationResponse, 
    CreditApplicationUpdate,
    ApplicationNotification
)

# Configuration du logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

router = APIRouter(prefix="/api/applications", tags=["Applications"])

def get_client_ip(request: Request) -> str:
    """Récupère l'IP du client"""
    forwarded = request.headers.get("X-Forwarded-For")
    if forwarded:
        return forwarded.split(",")[0]
    return request.client.host if request.client else "unknown"

def generate_application_number() -> str:
    """Génère un numéro de demande unique"""
    timestamp = datetime.now().strftime("%Y%m%d")
    random_part = str(uuid.uuid4()).split("-")[0].upper()
    return f"DEM-{timestamp}-{random_part}"

# APPLICATIONS DE CRÉDIT

@router.post("/credit", response_model=ApplicationNotification)
async def create_credit_application(
    application_data: CreditApplicationCreate,
    request: Request,
    db: Session = Depends(get_db)
):
    """Créer une demande de crédit"""
    try:
        logger.info(f"Création demande crédit - Données reçues: {application_data.dict()}")
        
        # Vérifications des champs obligatoires
        if not application_data.applicant_name or len(application_data.applicant_name.strip()) == 0:
            raise HTTPException(
                status_code=422,
                detail="Le nom du demandeur ne peut pas être vide"
            )
        
        if not application_data.requested_amount or application_data.requested_amount <= 0:
            raise HTTPException(
                status_code=422,
                detail="Le montant demandé doit être supérieur à 0"
            )
        
        if not application_data.credit_product_id or len(application_data.credit_product_id.strip()) == 0:
            raise HTTPException(
                status_code=422,
                detail="Le produit de crédit est obligatoire"
            )
        
        # Vérifier que le produit de crédit existe et est actif
        credit_product = db.query(CreditProduct).options(
            joinedload(CreditProduct.bank)
        ).filter(CreditProduct.id == application_data.credit_product_id).first()
        
        if not credit_product:
            raise HTTPException(
                status_code=422,
                detail=f"Le produit de crédit '{application_data.credit_product_id}' n'existe pas"
            )
        
        if not credit_product.is_active:
            raise HTTPException(
                status_code=422,
                detail="Ce produit de crédit n'est plus disponible"
            )
        
        # Préparer les données d'application
        application_json_data = {}
        if application_data.application_data:
            application_json_data = application_data.application_data.copy()
        
        # Ajouter les métadonnées
        application_json_data.update({
            "client_ip": get_client_ip(request),
            "user_agent": request.headers.get("User-Agent", ""),
            "submitted_at": datetime.utcnow().isoformat(),
        })
        
        # Créer la demande avec mapping correct vers la DB
        application_id = str(uuid.uuid4())
        
        application = CreditApplication(
            id=application_id,
            simulation_id=None,  # Pas de simulation liée pour l'instant
            credit_product_id=application_data.credit_product_id,
            # Champs obligatoires selon la DB schema
            applicant_name=application_data.applicant_name,
            requested_amount=float(application_data.requested_amount),
            # Champs optionnels
            applicant_email=application_data.applicant_email,
            applicant_phone=application_data.applicant_phone,
            applicant_address=getattr(application_data, 'applicant_address', None),
            birth_date=getattr(application_data, 'birth_date', None),
            nationality=getattr(application_data, 'nationality', None),
            marital_status=getattr(application_data, 'marital_status', None),
            profession=getattr(application_data, 'profession', None),
            employer=getattr(application_data, 'employer', None),
            work_address=getattr(application_data, 'work_address', None),
            employment_type=getattr(application_data, 'employment_type', None),
            employment_duration_months=getattr(application_data, 'employment_duration_months', None),
            monthly_income=float(getattr(application_data, 'monthly_income', 0)) if getattr(application_data, 'monthly_income', None) else None,
            other_income=float(getattr(application_data, 'other_income', 0)) if getattr(application_data, 'other_income', None) else None,
            purpose=getattr(application_data, 'purpose', None),
            duration_months=getattr(application_data, 'duration_months', 60),
            # Statut par défaut
            status='pending',
            # Données complètes en JSON
            application_data=application_json_data,
            # Documents vide par défaut
            documents_uploaded=[],
            # Timestamps
            submitted_at=datetime.utcnow(),
            updated_at=datetime.utcnow(),
            client_ip=get_client_ip(request),
            user_agent=request.headers.get("User-Agent", "")
        )
        
        logger.info(f"Création objet CreditApplication: ID={application.id}")
        
        # Tentative de sauvegarde
        try:
            db.add(application)
            db.commit()
            db.refresh(application)
            logger.info(f"Demande créée avec succès: {application.id}")
        except Exception as db_error:
            db.rollback()
            logger.error(f"Erreur lors de la sauvegarde: {str(db_error)}")
            raise HTTPException(
                status_code=500,
                detail=f"Erreur lors de la sauvegarde en base de données: {str(db_error)}"
            )
        
        # Générer le numéro de demande
        application_number = generate_application_number()
        
        # Informations de contact
        bank_name = credit_product.bank.name if credit_product.bank else "Votre Banque"
        bank_phone = credit_product.bank.contact_phone if credit_product.bank else "+241 01 00 00 00"
        bank_email = credit_product.bank.contact_email if credit_product.bank else "contact@banque.ga"
        processing_time = f"{credit_product.processing_time_hours}h" if credit_product.processing_time_hours else "48h"
        
        # Retourner la notification de réception
        response = ApplicationNotification(
            success=True,
            application_id=application.id,
            application_number=application_number,
            message=f"Votre demande de crédit a été reçue avec succès !",
            next_steps=[
                "Vous recevrez un email de confirmation dans les 24h",
                f"Un conseiller de {bank_name} vous contactera sous 48h",
                "Préparez vos documents justificatifs (pièce d'identité, bulletins de salaire, etc.)",
                "Suivez l'évolution de votre demande avec votre numéro de dossier"
            ],
            expected_processing_time=processing_time,
            contact_info={
                "bank_name": bank_name,
                "phone": bank_phone,
                "email": bank_email,
                "application_number": application_number
            }
        )
        
        logger.info(f"Réponse envoyée avec succès pour la demande {application.id}")
        return response
        
    except HTTPException:
        db.rollback()
        raise
    except Exception as e:
        db.rollback()
        logger.error(f"Erreur création demande crédit: {str(e)}", exc_info=True)
        raise HTTPException(
            status_code=500,
            detail=f"Erreur interne du serveur: {str(e)}"
        )

@router.get("/credit/{application_id}", response_model=CreditApplicationResponse)
async def get_credit_application(application_id: str, db: Session = Depends(get_db)):
    """Récupérer une demande de crédit par son ID"""
    try:
        application = db.query(CreditApplication).options(
            joinedload(CreditApplication.credit_product).joinedload(CreditProduct.bank),
            joinedload(CreditApplication.simulation)
        ).filter(CreditApplication.id == application_id).first()
        
        if not application:
            raise HTTPException(status_code=404, detail="Demande non trouvée")
        
        return application
    except Exception as e:
        logger.error(f"Erreur récupération demande {application_id}: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))

@router.get("/credit", response_model=List[CreditApplicationResponse])
async def get_credit_applications(
    skip: int = 0,
    limit: int = 50,
    status: Optional[str] = None,
    db: Session = Depends(get_db)
):
    """Récupérer la liste des demandes de crédit"""
    try:
        query = db.query(CreditApplication).options(
            joinedload(CreditApplication.credit_product).joinedload(CreditProduct.bank),
            joinedload(CreditApplication.simulation)
        )
        
        if status:
            query = query.filter(CreditApplication.status == status)
        
        applications = query.offset(skip).limit(limit).all()
        return applications
    except Exception as e:
        logger.error(f"Erreur récupération liste demandes: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))

@router.put("/credit/{application_id}", response_model=CreditApplicationResponse)
async def update_credit_application(
    application_id: str,
    application_update: CreditApplicationUpdate,
    db: Session = Depends(get_db)
):
    """Mettre à jour une demande de crédit (pour l'admin)"""
    try:
        application = db.query(CreditApplication).filter(
            CreditApplication.id == application_id
        ).first()
        
        if not application:
            raise HTTPException(status_code=404, detail="Demande non trouvée")
        
        # Mettre à jour les champs fournis
        update_data = application_update.dict(exclude_unset=True)
        for field, value in update_data.items():
            setattr(application, field, value)
        
        # Mettre à jour le timestamp
        application.updated_at = datetime.utcnow()
        
        db.commit()
        db.refresh(application)
        
        return application
        
    except HTTPException:
        raise
    except Exception as e:
        db.rollback()
        logger.error(f"Erreur mise à jour demande {application_id}: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))

# ENDPOINT POUR VÉRIFIER LE STATUT D'UNE DEMANDE
@router.get("/status/credit/{application_id}")
async def check_application_status(
    application_id: str,
    db: Session = Depends(get_db)
):
    """Vérifier le statut d'une demande"""
    try:
        application = db.query(CreditApplication).filter(
            CreditApplication.id == application_id
        ).first()
        
        if not application:
            raise HTTPException(status_code=404, detail="Demande non trouvée")
        
        status_messages = {
            'pending': 'En attente de traitement',
            'under_review': 'En cours d\'examen',
            'approved': 'Approuvée',
            'rejected': 'Refusée',
            'completed': 'Finalisée'
        }
        
        return {
            "application_id": application.id,
            "status": application.status,
            "status_message": status_messages.get(application.status, 'Statut inconnu'),
            "submitted_at": application.submitted_at,
            "updated_at": application.updated_at,
            "processing_notes": getattr(application, 'processing_notes', None)
        }
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Erreur vérification statut: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))