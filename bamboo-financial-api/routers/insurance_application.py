# routers/insurance_application.py - Correction pour le quote_id
from fastapi import APIRouter, Depends, HTTPException, Request
from sqlalchemy.orm import Session, joinedload
from sqlalchemy.exc import IntegrityError, SQLAlchemyError
from sqlalchemy import desc
from typing import Optional, Dict, Any
from datetime import datetime
import uuid
from pydantic import BaseModel, Field
import traceback

from database import get_db
from models import InsuranceApplication, InsuranceProduct, InsuranceCompany, InsuranceQuote

router = APIRouter()

# Schémas Pydantic
class InsuranceApplicationCreate(BaseModel):
    insurance_product_id: str = Field(..., min_length=1, max_length=200)
    quote_id: Optional[str] = None
    
    # Informations personnelles
    applicant_name: str = Field(..., min_length=1, max_length=200)
    applicant_email: Optional[str] = None
    applicant_phone: Optional[str] = Field(None, max_length=20)
    applicant_address: Optional[str] = None
    birth_date: Optional[str] = None
    nationality: Optional[str] = None
    marital_status: Optional[str] = None
    
    # Informations spécifiques
    profession: Optional[str] = None
    employer: Optional[str] = None
    coverage_amount: Optional[float] = None
    
    # Bénéficiaires (pour assurance vie)
    beneficiaries: Optional[str] = None
    
    # Informations véhicule (pour assurance auto)
    vehicle_make: Optional[str] = None
    vehicle_model: Optional[str] = None
    vehicle_year: Optional[int] = None
    vehicle_value: Optional[float] = None
    
    # Informations logement (pour assurance habitation)
    property_type: Optional[str] = None
    property_value: Optional[float] = None
    property_address: Optional[str] = None
    
    # Informations santé
    medical_history: Optional[str] = None
    current_treatments: Optional[str] = None
    
    # Données d'application
    application_data: Optional[Dict[str, Any]] = Field(default_factory=dict)

class ApplicationNotification(BaseModel):
    success: bool
    application_id: str
    application_number: str
    message: str
    next_steps: list[str]
    expected_processing_time: str
    contact_info: Dict[str, str]

@router.post("/applications/insurance", response_model=ApplicationNotification)
async def submit_insurance_application(
    application: InsuranceApplicationCreate,
    request: Request,
    db: Session = Depends(get_db)
):
    """Soumettre une demande d'assurance avec gestion correcte du quote_id"""
    try:
        print(f"🔥 Demande d'assurance reçue: {application.applicant_name}")
        
        # Générer un ID unique pour la demande
        application_id = f"ins_app_{uuid.uuid4().hex[:8]}"
        application_number = f"ASS-{datetime.now().strftime('%Y%m%d')}-{uuid.uuid4().hex[:6].upper()}"
        
        # Vérifier que le produit d'assurance existe
        insurance_product = db.query(InsuranceProduct).options(
            joinedload(InsuranceProduct.insurance_company)
        ).filter(InsuranceProduct.id == application.insurance_product_id).first()
        
        if not insurance_product:
            raise HTTPException(
                status_code=404, 
                detail=f"Produit d'assurance non trouvé: {application.insurance_product_id}"
            )
        
        # ✅ GESTION DU QUOTE_ID : Vérifier s'il existe ou le mettre à None
        valid_quote_id = None
        if application.quote_id:
            # Vérifier si le devis existe dans la base
            existing_quote = db.query(InsuranceQuote).filter(
                InsuranceQuote.id == application.quote_id
            ).first()
            
            if existing_quote:
                valid_quote_id = application.quote_id
                print(f"✅ Devis trouvé: {application.quote_id}")
            else:
                print(f"⚠️ Devis non trouvé, passage en mode sans devis: {application.quote_id}")
                valid_quote_id = None
        
        company_name = insurance_product.insurance_company.name if insurance_product.insurance_company else "Compagnie d'assurance"
        insurance_type = insurance_product.type
        
        # Préparer les données d'application structurées
        structured_data = {
            **application.application_data,
            "personal_info": {
                "name": application.applicant_name,
                "email": application.applicant_email,
                "phone": application.applicant_phone,
                "address": application.applicant_address,
                "birth_date": application.birth_date,
                "nationality": application.nationality,
                "marital_status": application.marital_status,
                "profession": application.profession,
                "employer": application.employer
            },
            "coverage_info": {
                "amount": application.coverage_amount,
                "beneficiaries": application.beneficiaries
            },
            "client_metadata": {
                "ip": str(request.client.host),
                "user_agent": request.headers.get("user-agent", ""),
                "submitted_via": "web_portal",
                "submission_timestamp": datetime.utcnow().isoformat(),
                "original_quote_id": application.quote_id,
                "processed_quote_id": valid_quote_id
            }
        }
        
        # Ajouter les informations spécifiques selon le type
        if application.vehicle_make:
            structured_data["vehicle_info"] = {
                "make": application.vehicle_make,
                "model": application.vehicle_model,
                "year": application.vehicle_year,
                "value": application.vehicle_value
            }
            insurance_type = "auto"
        
        if application.property_type:
            structured_data["property_info"] = {
                "type": application.property_type,
                "value": application.property_value,
                "address": application.property_address
            }
            insurance_type = "habitation"
        
        if application.medical_history:
            structured_data["health_info"] = {
                "medical_history": application.medical_history,
                "current_treatments": application.current_treatments
            }
            insurance_type = "sante"
        
        if application.beneficiaries:
            insurance_type = "vie"
        
        print(f"💾 Création de l'enregistrement en base avec quote_id: {valid_quote_id}")
        
        # Créer l'enregistrement en base avec le quote_id valide ou None
        db_application = InsuranceApplication(
            id=application_id,
            quote_id=valid_quote_id,  # ✅ Utiliser None si le devis n'existe pas
            insurance_product_id=application.insurance_product_id,
            applicant_name=application.applicant_name,
            applicant_email=application.applicant_email,
            applicant_phone=application.applicant_phone,
            applicant_address=application.applicant_address,
            birth_date=application.birth_date,
            nationality=application.nationality,
            marital_status=application.marital_status,
            profession=application.profession,
            employer=application.employer,
            coverage_amount=application.coverage_amount,
            beneficiaries=application.beneficiaries,
            vehicle_make=application.vehicle_make,
            vehicle_model=application.vehicle_model,
            vehicle_year=application.vehicle_year,
            vehicle_value=application.vehicle_value,
            property_type=application.property_type,
            property_value=application.property_value,
            property_address=application.property_address,
            medical_history=application.medical_history,
            current_treatments=application.current_treatments,
            status="pending",
            application_data=structured_data,
            submitted_at=datetime.utcnow()
        )
        
        # Sauvegarder en base
        db.add(db_application)
        db.commit()
        db.refresh(db_application)
        
        print(f"✅ Demande sauvegardée avec succès en base: {application_id}")
        
        # Déterminer les prochaines étapes selon le type d'assurance
        next_steps = [
            "Vous recevrez un email de confirmation dans les 24h",
            "Un conseiller vous contactera sous 48h pour finaliser votre dossier",
            "Préparez vos documents justificatifs"
        ]
        
        if insurance_type in ['vie', 'sante']:
            next_steps.append("Un examen médical pourrait être requis selon le type d'assurance")
        elif insurance_type == 'auto':
            next_steps.append("Inspection du véhicule si nécessaire")
        elif insurance_type == 'habitation':
            next_steps.append("Visite de l'expert si nécessaire")
        
        # Préparer la réponse de notification
        notification = ApplicationNotification(
            success=True,
            application_id=application_id,
            application_number=application_number,
            message=f"Votre demande d'assurance {insurance_type} a été reçue avec succès !",
            next_steps=next_steps,
            expected_processing_time="48h à 72h",
            contact_info={
                "company_name": company_name,
                "phone": "+241 01 00 00 00",
                "email": "contact@assurance.ga",
                "application_number": application_number
            }
        )
        
        print(f"✅ Demande traitée avec succès: {application_number}")
        return notification
        
    except HTTPException:
        # Rollback en cas d'erreur HTTPException
        db.rollback()
        raise
    except IntegrityError as e:
        # Rollback en cas d'erreur d'intégrité
        db.rollback()
        print(f"❌ Erreur d'intégrité: {str(e)}")
        raise HTTPException(
            status_code=400, 
            detail="Erreur de données : vérifiez que tous les identifiants référencés existent"
        )
    except SQLAlchemyError as e:
        # Rollback en cas d'erreur SQLAlchemy
        db.rollback()
        print(f"❌ Erreur base de données: {str(e)}")
        raise HTTPException(
            status_code=500, 
            detail="Erreur de base de données lors de la sauvegarde"
        )
    except Exception as e:
        # Rollback en cas d'erreur générale
        db.rollback()
        print(f"❌ Erreur inattendue: {str(e)}")
        print(f"Traceback: {traceback.format_exc()}")
        raise HTTPException(
            status_code=500, 
            detail=f"Erreur lors de la sauvegarde: {str(e)}"
        )

# Autres endpoints restent identiques...
@router.get("/applications/insurance/{application_id}")
async def get_insurance_application(
    application_id: str,
    db: Session = Depends(get_db)
):
    """Récupérer une demande d'assurance par ID"""
    try:
        application = db.query(InsuranceApplication).options(
            joinedload(InsuranceApplication.insurance_product).joinedload(InsuranceProduct.insurance_company)
        ).filter(InsuranceApplication.id == application_id).first()
        
        if not application:
            raise HTTPException(status_code=404, detail="Demande non trouvée")
        
        return {
            "id": application.id,
            "quote_id": application.quote_id,
            "insurance_product_id": application.insurance_product_id,
            "applicant_name": application.applicant_name,
            "applicant_email": application.applicant_email,
            "applicant_phone": application.applicant_phone,
            "status": application.status,
            "submitted_at": application.submitted_at.isoformat(),
            "insurance_product": {
                "id": application.insurance_product.id,
                "name": application.insurance_product.name,
                "type": application.insurance_product.type,
                "insurance_company": {
                    "id": application.insurance_product.insurance_company.id,
                    "name": application.insurance_product.insurance_company.name
                } if application.insurance_product.insurance_company else None
            } if application.insurance_product else None
        }
        
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Erreur: {str(e)}")

@router.get("/applications/test")
async def test_insurance_applications():
    """Test pour vérifier que le router fonctionne"""
    return {
        "message": "Insurance application router is working!",
        "timestamp": datetime.utcnow().isoformat(),
        "endpoints": [
            "POST /applications/insurance - Soumettre une demande",
            "GET /applications/insurance/{id} - Récupérer une demande"
        ]
    }