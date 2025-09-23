# savings_applications.py - Endpoint complet corrigé

from fastapi import APIRouter, Depends, HTTPException, Request, Body
from sqlalchemy.orm import Session, joinedload
from sqlalchemy import desc, func
from typing import Optional, Dict, Any
from datetime import datetime, date
import uuid
import time

from database import get_db
from models import SavingsApplication, SavingsProduct, SavingsSimulation, Bank
from schemas import ApplicationNotification, PaginatedResponse
from pydantic import BaseModel, EmailStr, validator, ValidationError, Field

router = APIRouter()

# Schéma Pydantic corrigé
class SavingsApplicationCreate(BaseModel):
    savings_product_id: str
    simulation_id: Optional[str] = None
    applicant_name: str
    applicant_email: Optional[EmailStr] = None
    applicant_phone: Optional[str] = None
    applicant_address: Optional[str] = None
    birth_date: Optional[date] = None
    nationality: Optional[str] = None
    marital_status: Optional[str] = None
    
    # Informations professionnelles
    profession: Optional[str] = None
    employer: Optional[str] = None
    monthly_income: Optional[float] = None
    
    # Informations épargne
    initial_deposit: float
    monthly_contribution: Optional[float] = None
    savings_goal: Optional[str] = None
    target_amount: Optional[float] = None
    target_date: Optional[date] = None
    
    application_data: Optional[Dict[str, Any]] = Field(default_factory=dict)
    
    @validator('initial_deposit')
    def validate_initial_deposit(cls, v):
        if v <= 0:
            raise ValueError('Le dépôt initial doit être supérieur à 0')
        return v
    
    @validator('monthly_contribution')
    def validate_monthly_contribution(cls, v):
        if v is not None and v < 0:
            raise ValueError('La contribution mensuelle ne peut pas être négative')
        return v
    
    @validator('applicant_phone')
    def validate_phone(cls, v):
        if v and not v.startswith('+241'):
            clean_phone = v.replace(' ', '').replace('-', '')
            if clean_phone.startswith('0') and len(clean_phone) == 9:
                return f'+241{clean_phone[1:]}'
            elif len(clean_phone) == 8:
                return f'+241{clean_phone}'
        return v

def create_default_simulation(
    db: Session,
    savings_product_id: str,
    initial_amount: float,
    monthly_contribution: float = 0,
    duration_months: int = 12
) -> SavingsSimulation:
    """Crée une simulation par défaut pour une demande d'épargne"""
    
    # Récupérer le produit d'épargne pour le taux d'intérêt
    savings_product = db.query(SavingsProduct).filter(
        SavingsProduct.id == savings_product_id
    ).first()
    
    if not savings_product:
        raise ValueError(f"Produit d'épargne {savings_product_id} non trouvé")
    
    # Calculs basiques
    annual_rate = float(savings_product.interest_rate) / 100
    monthly_rate = annual_rate / 12
    
    # Calcul du montant final avec intérêts composés
    final_amount = initial_amount
    total_contributions = initial_amount
    
    for month in range(duration_months):
        final_amount = final_amount * (1 + monthly_rate) + monthly_contribution
        total_contributions += monthly_contribution
    
    total_interest = final_amount - total_contributions
    
    # Créer la simulation avec les bonnes valeurs
    simulation = SavingsSimulation(
        id=f"sim_{int(time.time() * 1000)}_{uuid.uuid4().hex[:8]}",
        session_id=f"auto_session_{uuid.uuid4().hex[:8]}",
        savings_product_id=savings_product_id,
        initial_amount=initial_amount,
        monthly_contribution=monthly_contribution,
        duration_months=duration_months,
        final_amount=round(final_amount, 2),
        total_contributions=total_contributions,
        total_interest=round(total_interest, 2),
        effective_rate=float(savings_product.interest_rate),
        client_ip="127.0.0.1",
        user_agent="Auto-generated for application"
    )
    
    # Assigner recommendations après création pour éviter le problème PostgreSQL
    simulation.recommendations = []
    
    return simulation

@router.post("/applications/savings", response_model=ApplicationNotification)
async def submit_savings_application(
    request: Request,
    db: Session = Depends(get_db),
    raw_data: dict = Body(...)
):
    """Soumettre une demande d'ouverture de compte épargne"""
    
    print("=== DEBUG SAVINGS APPLICATION START ===")
    print(f"Données brutes reçues: {raw_data}")
    
    try:
        # Validation des données avec gestion d'erreur détaillée
        try:
            application = SavingsApplicationCreate(**raw_data)
            print(f"Validation Pydantic réussie")
            print(f"Application validée: {application.dict()}")
        except ValidationError as ve:
            print(f"Erreur de validation Pydantic: {ve}")
            errors = []
            for error in ve.errors():
                field = " -> ".join(str(x) for x in error['loc'])
                message = error['msg']
                errors.append(f"{field}: {message}")
            raise HTTPException(
                status_code=422,
                detail={
                    "message": "Erreurs de validation des données",
                    "errors": errors,
                    "received_data": raw_data
                }
            )
        
        # Vérifier que le produit d'épargne existe
        savings_product = db.query(SavingsProduct).options(
            joinedload(SavingsProduct.bank)
        ).filter(SavingsProduct.id == application.savings_product_id).first()
        
        if not savings_product:
            print(f"Produit d'épargne non trouvé: {application.savings_product_id}")
            raise HTTPException(status_code=404, detail="Produit d'épargne non trouvé")
        
        print(f"Produit trouvé: {savings_product.name} - {savings_product.bank.name}")
        
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
        
        # Gestion du simulation_id
        simulation_id = None
        simulation_created = False
        
        if application.simulation_id:
            # Vérifier si la simulation existe
            existing_simulation = db.query(SavingsSimulation).filter(
                SavingsSimulation.id == application.simulation_id
            ).first()
            
            if existing_simulation:
                simulation_id = application.simulation_id
                print(f"Simulation existante trouvée: {simulation_id}")
            else:
                print(f"Simulation {application.simulation_id} non trouvée, création d'une nouvelle")
                
                # Créer une nouvelle simulation
                new_simulation = create_default_simulation(
                    db=db,
                    savings_product_id=application.savings_product_id,
                    initial_amount=application.initial_deposit,
                    monthly_contribution=application.monthly_contribution or 0,
                    duration_months=24  # 2 ans par défaut
                )
                
                db.add(new_simulation)
                db.flush()  # Pour obtenir l'ID généré
                simulation_id = new_simulation.id
                simulation_created = True
                print(f"Nouvelle simulation créée: {simulation_id}")
        else:
            # Pas de simulation_id fourni, en créer une
            print("Aucun simulation_id fourni, création d'une nouvelle simulation")
            
            new_simulation = create_default_simulation(
                db=db,
                savings_product_id=application.savings_product_id,
                initial_amount=application.initial_deposit,
                monthly_contribution=application.monthly_contribution or 0,
                duration_months=24
            )
            
            db.add(new_simulation)
            db.flush()
            simulation_id = new_simulation.id
            simulation_created = True
            print(f"Simulation créée automatiquement: {simulation_id}")
        
        # Générer un ID unique pour la demande
        application_id = f"sav_app_{uuid.uuid4().hex[:8]}"
        application_number = f"EPG-{datetime.now().strftime('%Y%m%d')}-{uuid.uuid4().hex[:6].upper()}"
        
        # Créer l'enregistrement en base
        db_application = SavingsApplication(
            id=application_id,
            simulation_id=simulation_id,
            savings_product_id=application.savings_product_id,
            applicant_name=application.applicant_name,
            applicant_email=application.applicant_email,
            applicant_phone=application.applicant_phone,
            initial_deposit=application.initial_deposit,
            monthly_contribution=application.monthly_contribution,
            status="pending",
            application_data={
                **application.application_data,
                "simulation_created": simulation_created,
                "original_simulation_id": application.simulation_id,
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
        
        print(f"Tentative d'ajout de l'application: {application_id}")
        db.add(db_application)
        db.commit()
        db.refresh(db_application)
        
        print(f"Application sauvegardée avec succès: {application_id}")
        
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
        
        print("=== DEBUG SAVINGS APPLICATION SUCCESS ===")
        return notification
        
    except HTTPException:
        # Re-lancer les exceptions HTTP (erreurs 4xx et 5xx)
        raise
    except Exception as e:
        print(f"Erreur inattendue: {str(e)}")
        print(f"Type d'erreur: {type(e)}")
        import traceback
        print(f"Stack trace: {traceback.format_exc()}")
        
        db.rollback()
        raise HTTPException(
            status_code=500, 
            detail={
                "message": "Erreur serveur lors de la soumission",
                "error": str(e),
                "type": str(type(e).__name__)
            }
        )

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