# routers/admin_management_complete.py
from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.orm import Session, joinedload
from sqlalchemy import and_, or_, desc, func
from typing import List, Optional, Dict, Any
from datetime import datetime
import uuid
import secrets
import string

from database import get_db
from models import AdminUser, Bank, InsuranceCompany
from passlib.context import CryptContext
from pydantic import BaseModel, EmailStr

router = APIRouter(prefix="/api/admin/management", tags=["admin_management"])
pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")

def hash_password(password: str) -> str:
    return pwd_context.hash(password)

def generate_temporary_password(length: int = 12) -> str:
    """Générer un mot de passe temporaire"""
    alphabet = string.ascii_letters + string.digits + "!@#$%"
    return ''.join(secrets.choice(alphabet) for _ in range(length))

# Modèles Pydantic
class CreateAdminRequest(BaseModel):
    username: str
    email: EmailStr
    password: str
    first_name: str
    last_name: str
    role: str
    assigned_bank_id: Optional[str] = None
    assigned_insurance_company_id: Optional[str] = None
    permissions: Optional[Dict[str, Any]] = None
    is_active: bool = True

class UpdateAdminRequest(BaseModel):
    username: Optional[str] = None
    email: Optional[EmailStr] = None
    first_name: Optional[str] = None
    last_name: Optional[str] = None
    role: Optional[str] = None
    assigned_bank_id: Optional[str] = None
    assigned_insurance_company_id: Optional[str] = None
    permissions: Optional[Dict[str, Any]] = None
    is_active: Optional[bool] = None

# Permissions par défaut selon le rôle - FORMAT UNIFORME
DEFAULT_PERMISSIONS = {
    "super_admin": {
        "banks": ["create", "read", "update", "delete"],
        "insurance_companies": ["create", "read", "update", "delete"],
        "credit_products": ["create", "read", "update", "delete"],
        "savings_products": ["create", "read", "update", "delete"],
        "insurance_products": ["create", "read", "update", "delete"],
        "simulations": ["read", "delete"],
        "applications": ["read", "update", "delete"],
        "users": ["create", "read", "update", "delete"],
        "audit": ["read"],
        "system_settings": ["read", "update"],
        "admin_management": ["create", "read", "update", "delete"]
    },
    "admin": {
        "banks": ["read"],
        "insurance_companies": ["read"],
        "credit_products": ["create", "read", "update", "delete"],
        "savings_products": ["create", "read", "update", "delete"],
        "insurance_products": ["create", "read", "update", "delete"],
        "simulations": ["read"],
        "applications": ["read", "update"]
    },
    "bank_admin": {
        "banks": ["read"],
        "credit_products": ["create", "read", "update", "delete"],
        "savings_products": ["create", "read", "update", "delete"],
        "simulations": ["read"],
        "applications": ["read", "update"]
    },
    "insurance_admin": {
        "insurance_companies": ["read"],
        "insurance_products": ["create", "read", "update", "delete"],
        "quotes": ["read"],
        "applications": ["read", "update"]
    },
    "moderator": {
        "banks": ["read"],
        "insurance_companies": ["read"],
        "credit_products": ["read", "update"],
        "savings_products": ["read", "update"],
        "insurance_products": ["read", "update"],
        "applications": ["read", "update"]
    },
    "readonly": {
        "banks": ["read"],
        "insurance_companies": ["read"],
        "credit_products": ["read"],
        "savings_products": ["read"],
        "insurance_products": ["read"],
        "simulations": ["read"],
        "applications": ["read"]
    }
}

@router.get("/institutions")
async def get_institutions(db: Session = Depends(get_db)):
    """Récupérer la liste des institutions pour assignation"""
    try:
        # Récupérer les banques actives
        banks = db.query(Bank).filter(Bank.is_active == True).all()
        banks_data = [
            {
                "id": bank.id,
                "name": bank.name,
                "full_name": bank.full_name or bank.name
            } for bank in banks
        ]
        
        # Récupérer les compagnies d'assurance actives
        insurance_companies = db.query(InsuranceCompany).filter(InsuranceCompany.is_active == True).all()
        insurance_data = [
            {
                "id": company.id,
                "name": company.name,
                "full_name": company.full_name or company.name
            } for company in insurance_companies
        ]
        
        return {
            "banks": banks_data,
            "insurance_companies": insurance_data,
            "total_banks": len(banks_data),
            "total_insurance": len(insurance_data)
        }
        
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Erreur: {str(e)}")

@router.get("/admins")
async def get_all_admins(
    skip: int = Query(0, ge=0),
    limit: int = Query(50, le=100),
    search: Optional[str] = Query(None),
    role: Optional[str] = Query(None),
    is_active: Optional[bool] = Query(None),
    db: Session = Depends(get_db)
):
    """Récupérer tous les administrateurs"""
    try:
        query = db.query(AdminUser).filter(AdminUser.role != 'super_admin')
        
        # Filtres - ignorer les valeurs "undefined" ou vides
        if search and search.strip() and search != "undefined":
            search_term = f"%{search.strip()}%"
            query = query.filter(
                or_(
                    AdminUser.username.ilike(search_term),
                    AdminUser.first_name.ilike(search_term),
                    AdminUser.last_name.ilike(search_term),
                    AdminUser.email.ilike(search_term)
                )
            )
        
        if role and role.strip() and role != "undefined":
            query = query.filter(AdminUser.role == role.strip())
        
        if is_active is not None:
            query = query.filter(AdminUser.is_active == is_active)
        
        # Pagination
        total = query.count()
        admins = query.options(
            joinedload(AdminUser.assigned_bank),
            joinedload(AdminUser.assigned_insurance_company)
        ).order_by(desc(AdminUser.created_at)).offset(skip).limit(limit).all()
        
        # Formatage des résultats
        result_admins = []
        for admin in admins:
            assigned_bank = None
            if admin.assigned_bank:
                assigned_bank = {
                    "id": admin.assigned_bank.id,
                    "name": admin.assigned_bank.name,
                    "full_name": admin.assigned_bank.full_name
                }
            
            assigned_insurance = None
            if admin.assigned_insurance_company:
                assigned_insurance = {
                    "id": admin.assigned_insurance_company.id,
                    "name": admin.assigned_insurance_company.name,
                    "full_name": admin.assigned_insurance_company.full_name
                }
            
            result_admins.append({
                "id": admin.id,
                "username": admin.username,
                "email": admin.email,
                "first_name": admin.first_name,
                "last_name": admin.last_name,
                "role": admin.role,
                "assigned_bank": assigned_bank,
                "assigned_insurance_company": assigned_insurance,
                "permissions": admin.permissions or {},
                "is_active": admin.is_active,
                "last_login": admin.last_login,
                "created_at": admin.created_at,
                "updated_at": admin.updated_at
            })
        
        return {
            "admins": result_admins,
            "total": total,
            "skip": skip,
            "limit": limit
        }
        
    except Exception as e:
        print(f"Erreur get_all_admins: {e}")
        raise HTTPException(status_code=500, detail=f"Erreur: {str(e)}")

@router.post("/admins")
async def create_admin(
    admin_data: CreateAdminRequest,
    db: Session = Depends(get_db)
):
    """Créer un nouvel administrateur"""
    try:
        # Vérifications d'unicité
        existing_username = db.query(AdminUser).filter(AdminUser.username == admin_data.username).first()
        if existing_username:
            raise HTTPException(status_code=400, detail="Ce nom d'utilisateur existe déjà")
        
        existing_email = db.query(AdminUser).filter(AdminUser.email == admin_data.email).first()
        if existing_email:
            raise HTTPException(status_code=400, detail="Cette adresse email existe déjà")
        
        # Valider le rôle
        if admin_data.role not in DEFAULT_PERMISSIONS:
            raise HTTPException(status_code=400, detail="Rôle invalide")
        
        # Hasher le mot de passe
        hashed_password = hash_password(admin_data.password)
        
        # Utiliser les permissions par défaut ou celles fournies
        permissions = admin_data.permissions or DEFAULT_PERMISSIONS.get(admin_data.role, {})
        
        # Créer l'administrateur
        new_admin = AdminUser(
            id=str(uuid.uuid4()),
            username=admin_data.username,
            email=admin_data.email,
            password_hash=hashed_password,
            first_name=admin_data.first_name,
            last_name=admin_data.last_name,
            role=admin_data.role,
            assigned_bank_id=admin_data.assigned_bank_id,
            assigned_insurance_company_id=admin_data.assigned_insurance_company_id,
            permissions=permissions,
            is_active=admin_data.is_active,
            created_by='current_admin',
            created_at=datetime.now(),
            updated_at=datetime.now()
        )
        
        db.add(new_admin)
        db.commit()
        db.refresh(new_admin)
        
        return {
            "message": "Administrateur créé avec succès",
            "admin": {
                "id": new_admin.id,
                "username": new_admin.username,
                "email": new_admin.email,
                "role": new_admin.role,
                "permissions": new_admin.permissions,
                "is_active": new_admin.is_active
            }
        }
        
    except HTTPException:
        raise
    except Exception as e:
        db.rollback()
        print(f"Erreur create_admin: {e}")
        raise HTTPException(status_code=500, detail="Erreur lors de la création de l'administrateur")

@router.get("/admins/{admin_id}")
async def get_admin_by_id(admin_id: str, db: Session = Depends(get_db)):
    """Récupérer un administrateur par ID"""
    try:
        admin = db.query(AdminUser).options(
            joinedload(AdminUser.assigned_bank),
            joinedload(AdminUser.assigned_insurance_company)
        ).filter(AdminUser.id == admin_id).first()
        
        if not admin:
            raise HTTPException(status_code=404, detail="Administrateur non trouvé")
        
        assigned_bank = None
        if admin.assigned_bank:
            assigned_bank = {
                "id": admin.assigned_bank.id,
                "name": admin.assigned_bank.name,
                "full_name": admin.assigned_bank.full_name
            }
        
        assigned_insurance = None
        if admin.assigned_insurance_company:
            assigned_insurance = {
                "id": admin.assigned_insurance_company.id,
                "name": admin.assigned_insurance_company.name,
                "full_name": admin.assigned_insurance_company.full_name
            }
        
        return {
            "id": admin.id,
            "username": admin.username,
            "email": admin.email,
            "first_name": admin.first_name,
            "last_name": admin.last_name,
            "role": admin.role,
            "assigned_bank": assigned_bank,
            "assigned_insurance_company": assigned_insurance,
            "permissions": admin.permissions or {},
            "is_active": admin.is_active,
            "last_login": admin.last_login,
            "created_at": admin.created_at,
            "updated_at": admin.updated_at
        }
        
    except HTTPException:
        raise
    except Exception as e:
        print(f"Erreur get_admin_by_id: {e}")
        raise HTTPException(status_code=500, detail="Erreur lors de la récupération de l'administrateur")

@router.put("/admins/{admin_id}")
async def update_admin(
    admin_id: str,
    admin_data: UpdateAdminRequest,
    db: Session = Depends(get_db)
):
    """Mettre à jour un administrateur"""
    try:
        admin = db.query(AdminUser).filter(AdminUser.id == admin_id).first()
        if not admin:
            raise HTTPException(status_code=404, detail="Administrateur non trouvé")
        
        # Vérifier l'unicité du username si modifié
        if admin_data.username and admin_data.username != admin.username:
            existing = db.query(AdminUser).filter(AdminUser.username == admin_data.username).first()
            if existing:
                raise HTTPException(status_code=400, detail="Ce nom d'utilisateur existe déjà")
        
        # Vérifier l'unicité de l'email si modifié
        if admin_data.email and admin_data.email != admin.email:
            existing = db.query(AdminUser).filter(AdminUser.email == admin_data.email).first()
            if existing:
                raise HTTPException(status_code=400, detail="Cette adresse email existe déjà")
        
        # Mettre à jour les champs
        update_data = admin_data.dict(exclude_unset=True)
        
        # Si le rôle change, mettre à jour les permissions par défaut
        if admin_data.role and admin_data.role != admin.role:
            if admin_data.role in DEFAULT_PERMISSIONS:
                update_data['permissions'] = DEFAULT_PERMISSIONS[admin_data.role]
            else:
                raise HTTPException(status_code=400, detail="Rôle invalide")
        
        for field, value in update_data.items():
            setattr(admin, field, value)
        
        admin.updated_at = datetime.now()
        
        db.commit()
        
        return {
            "message": "Administrateur mis à jour avec succès",
            "admin": {
                "id": admin.id,
                "username": admin.username,
                "email": admin.email,
                "role": admin.role,
                "permissions": admin.permissions,
                "is_active": admin.is_active
            }
        }
        
    except HTTPException:
        raise
    except Exception as e:
        db.rollback()
        print(f"Erreur update_admin: {e}")
        raise HTTPException(status_code=500, detail="Erreur lors de la mise à jour")

@router.delete("/admins/{admin_id}")
async def delete_admin(admin_id: str, db: Session = Depends(get_db)):
    """Supprimer un administrateur"""
    try:
        admin = db.query(AdminUser).filter(AdminUser.id == admin_id).first()
        if not admin:
            raise HTTPException(status_code=404, detail="Administrateur non trouvé")
        
        if admin.role == 'super_admin':
            raise HTTPException(status_code=400, detail="Impossible de supprimer un super administrateur")
        
        db.delete(admin)
        db.commit()
        
        return {"message": "Administrateur supprimé avec succès"}
        
    except HTTPException:
        raise
    except Exception as e:
        db.rollback()
        print(f"Erreur delete_admin: {e}")
        raise HTTPException(status_code=500, detail="Erreur lors de la suppression")

@router.patch("/admins/{admin_id}/toggle-status")
async def toggle_admin_status(admin_id: str, db: Session = Depends(get_db)):
    """Activer/Désactiver un administrateur"""
    try:
        admin = db.query(AdminUser).filter(AdminUser.id == admin_id).first()
        if not admin:
            raise HTTPException(status_code=404, detail="Administrateur non trouvé")
        
        if admin.role == 'super_admin':
            raise HTTPException(status_code=400, detail="Impossible de désactiver un super administrateur")
        
        admin.is_active = not admin.is_active
        admin.updated_at = datetime.now()
        
        db.commit()
        
        status_text = "activé" if admin.is_active else "désactivé"
        return {
            "is_active": admin.is_active,
            "message": f"Administrateur {status_text} avec succès"
        }
        
    except HTTPException:
        raise
    except Exception as e:
        db.rollback()
        print(f"Erreur toggle_admin_status: {e}")
        raise HTTPException(status_code=500, detail="Erreur lors du changement de statut")

@router.post("/admins/{admin_id}/reset-password")
async def reset_admin_password(admin_id: str, db: Session = Depends(get_db)):
    """Réinitialiser le mot de passe d'un administrateur"""
    try:
        admin = db.query(AdminUser).filter(AdminUser.id == admin_id).first()
        if not admin:
            raise HTTPException(status_code=404, detail="Administrateur non trouvé")
        
        # Générer un mot de passe temporaire
        temp_password = generate_temporary_password()
        admin.password_hash = hash_password(temp_password)
        admin.updated_at = datetime.now()
        
        db.commit()
        
        return {
            "temporary_password": temp_password,
            "message": "Mot de passe réinitialisé avec succès"
        }
        
    except HTTPException:
        raise
    except Exception as e:
        db.rollback()
        print(f"Erreur reset_admin_password: {e}")
        raise HTTPException(status_code=500, detail="Erreur lors de la réinitialisation")

@router.get("/stats")
async def get_admin_stats(db: Session = Depends(get_db)):
    """Statistiques des administrateurs"""
    try:
        total_admins = db.query(AdminUser).filter(AdminUser.role != 'super_admin').count()
        active_admins = db.query(AdminUser).filter(
            AdminUser.role != 'super_admin',
            AdminUser.is_active == True
        ).count()
        
        # Par rôle
        bank_admins = db.query(AdminUser).filter(AdminUser.role == 'bank_admin').count()
        insurance_admins = db.query(AdminUser).filter(AdminUser.role == 'insurance_admin').count()
        moderators = db.query(AdminUser).filter(AdminUser.role == 'moderator').count()
        
        # Admins récents (ce mois)
        recent_admins = db.query(AdminUser).filter(
            AdminUser.role != 'super_admin',
            AdminUser.created_at >= datetime.now().replace(day=1, hour=0, minute=0, second=0, microsecond=0)
        ).count()
        
        return {
            "total_admins": total_admins,
            "active_admins": active_admins,
            "inactive_admins": total_admins - active_admins,
            "by_role": {
                "bank_admins": bank_admins,
                "insurance_admins": insurance_admins,
                "moderators": moderators
            },
            "recent_admins": recent_admins
        }
        
    except Exception as e:
        print(f"Erreur get_admin_stats: {e}")
        return {
            "total_admins": 0,
            "active_admins": 0,
            "inactive_admins": 0,
            "by_role": {
                "bank_admins": 0,
                "insurance_admins": 0,
                "moderators": 0
            },
            "recent_admins": 0
        }

@router.get("/check-username/{username}")
async def check_username_availability(username: str, db: Session = Depends(get_db)):
    """Vérifier la disponibilité d'un username"""
    try:
        existing = db.query(AdminUser).filter(AdminUser.username == username).first()
        return {"available": existing is None}
    except Exception as e:
        print(f"Erreur check_username: {e}")
        return {"available": False}

@router.get("/check-email/{email}")
async def check_email_availability(email: str, db: Session = Depends(get_db)):
    """Vérifier la disponibilité d'un email"""
    try:
        existing = db.query(AdminUser).filter(AdminUser.email == email).first()
        return {"available": existing is None}
    except Exception as e:
        print(f"Erreur check_email: {e}")
        return {"available": False}