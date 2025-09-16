# routers/admin_auth_router.py - Routeur d'authentification admin corrigé
from fastapi import APIRouter, Depends, HTTPException, status, BackgroundTasks, Request
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from sqlalchemy.orm import Session
from typing import Optional, Dict, Any
from datetime import datetime, timedelta
from jose import JWTError, jwt
from passlib.context import CryptContext
import logging
import os

# Imports locaux (ajustez selon votre structure)
from database import get_db
from admin_models import AdminUser, AdminSession
from admin_schemas import (
    AdminLoginRequest, AdminLoginResponse, AdminUserResponse
)

# Configuration du logging
logger = logging.getLogger(__name__)

# Configuration de sécurité
SECRET_KEY = os.getenv("SECRET_KEY", "votre-cle-secrete-changez-moi")
ALGORITHM = "HS256"
ACCESS_TOKEN_EXPIRE_MINUTES = 1440  # 24 heures

pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")
security = HTTPBearer(auto_error=False)

router = APIRouter()

# ==================== FONCTIONS UTILITAIRES ====================

def verify_password(plain_password: str, hashed_password: str) -> bool:
    """Vérifie un mot de passe"""
    return pwd_context.verify(plain_password, hashed_password)

def get_password_hash(password: str) -> str:
    """Hash un mot de passe"""
    return pwd_context.hash(password)

def create_access_token(data: dict, expires_delta: Optional[timedelta] = None):
    """Crée un token JWT pour un admin"""
    to_encode = data.copy()
    if expires_delta:
        expire = datetime.utcnow() + expires_delta
    else:
        expire = datetime.utcnow() + timedelta(minutes=ACCESS_TOKEN_EXPIRE_MINUTES)
    
    to_encode.update({"exp": expire, "type": "admin_access"})
    encoded_jwt = jwt.encode(to_encode, SECRET_KEY, algorithm=ALGORITHM)
    return encoded_jwt

async def get_current_admin_user(
    credentials: Optional[HTTPAuthorizationCredentials] = Depends(security),
    db: Session = Depends(get_db)
) -> Optional[AdminUser]:
    """Récupère l'utilisateur admin connecté"""
    if not credentials:
        return None
    
    try:
        payload = jwt.decode(credentials.credentials, SECRET_KEY, algorithms=[ALGORITHM])
        admin_id: str = payload.get("sub")
        token_type: str = payload.get("type")
        
        if admin_id is None or token_type != "admin_access":
            return None
            
        # Vérifier que la session existe et est active
        session = db.query(AdminSession).filter(
            AdminSession.token == credentials.credentials,
            AdminSession.is_active == True,
            AdminSession.expires_at > datetime.utcnow()
        ).first()
        
        if not session:
            return None
        
        admin = db.query(AdminUser).filter(
            AdminUser.id == admin_id,
            AdminUser.is_active == True
        ).first()
        
        if admin:
            # Mettre à jour la dernière activité
            session.last_activity = datetime.utcnow()
            db.commit()
            
        return admin
        
    except JWTError as e:
        logger.error(f"Erreur JWT: {e}")
        return None
    except Exception as e:
        logger.error(f"Erreur lors de la vérification du token: {e}")
        return None

# ==================== ENDPOINTS D'AUTHENTIFICATION ====================

@router.post("/admin/login", response_model=AdminLoginResponse)
async def login_admin(
    login_data: AdminLoginRequest,
    request: Request,
    db: Session = Depends(get_db)
):
    """
    Connexion d'un administrateur
    """
    try:
        # Rechercher l'administrateur
        admin = db.query(AdminUser).filter(
            AdminUser.username == login_data.username,
            AdminUser.is_active == True
        ).first()
        
        if not admin:
            logger.warning(f"Tentative de connexion avec un nom d'utilisateur inexistant: {login_data.username}")
            raise HTTPException(
                status_code=401,
                detail="Nom d'utilisateur ou mot de passe incorrect"
            )
        
        # Vérifier le mot de passe
        if not verify_password(login_data.password, admin.password_hash):
            logger.warning(f"Tentative de connexion avec un mot de passe incorrect pour: {login_data.username}")
            raise HTTPException(
                status_code=401,
                detail="Nom d'utilisateur ou mot de passe incorrect"
            )
        
        # Créer le token d'accès
        access_token_expires = timedelta(minutes=ACCESS_TOKEN_EXPIRE_MINUTES)
        access_token = create_access_token(
            data={"sub": admin.id, "username": admin.username, "role": admin.role},
            expires_delta=access_token_expires
        )
        
        # Désactiver les anciennes sessions de cet admin
        db.query(AdminSession).filter(
            AdminSession.admin_user_id == admin.id,
            AdminSession.is_active == True
        ).update({"is_active": False})
        
        # Créer une nouvelle session
        session = AdminSession(
            admin_user_id=admin.id,
            token=access_token,
            ip_address=request.client.host if request.client else None,
            user_agent=request.headers.get("user-agent"),
            expires_at=datetime.utcnow() + access_token_expires,
            is_active=True
        )
        db.add(session)
        
        # Mettre à jour la dernière connexion
        admin.last_login = datetime.utcnow()
        db.commit()
        
        logger.info(f"Connexion réussie pour l'administrateur: {admin.username}")
        
        # Créer la réponse utilisateur
        admin_response = AdminUserResponse(
            id=admin.id,
            username=admin.username,
            email=admin.email,
            first_name=admin.first_name,
            last_name=admin.last_name,
            role=admin.role,
            permissions=admin.permissions,
            is_active=admin.is_active,
            last_login=admin.last_login,
            created_at=admin.created_at,
            updated_at=admin.updated_at
        )
        
        return AdminLoginResponse(
            success=True,
            user=admin_response,
            token=access_token,
            expires_in=ACCESS_TOKEN_EXPIRE_MINUTES * 60,
            message="Connexion réussie"
        )
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Erreur lors de la connexion admin: {str(e)}")
        raise HTTPException(
            status_code=500,
            detail="Erreur interne lors de la connexion"
        )

@router.post("/admin/logout")
async def logout_admin(
    current_admin: AdminUser = Depends(get_current_admin_user),
    credentials: HTTPAuthorizationCredentials = Depends(security),
    db: Session = Depends(get_db)
):
    """
    Déconnexion de l'administrateur
    """
    if not current_admin:
        raise HTTPException(status_code=401, detail="Non authentifié")
    
    try:
        # Désactiver la session actuelle
        if credentials:
            session = db.query(AdminSession).filter(
                AdminSession.token == credentials.credentials,
                AdminSession.admin_user_id == current_admin.id
            ).first()
            
            if session:
                session.is_active = False
                session.logout_at = datetime.utcnow()
                db.commit()
        
        logger.info(f"Déconnexion de l'administrateur: {current_admin.username}")
        return {"success": True, "message": "Déconnexion réussie"}
        
    except Exception as e:
        logger.error(f"Erreur lors de la déconnexion: {str(e)}")
        raise HTTPException(status_code=500, detail="Erreur interne")

@router.get("/admin/me", response_model=AdminUserResponse)
async def get_current_admin_info(
    current_admin: AdminUser = Depends(get_current_admin_user)
):
    """
    Récupère les informations de l'administrateur connecté
    """
    if not current_admin:
        raise HTTPException(status_code=401, detail="Non authentifié")
    
    return AdminUserResponse(
        id=current_admin.id,
        username=current_admin.username,
        email=current_admin.email,
        first_name=current_admin.first_name,
        last_name=current_admin.last_name,
        role=current_admin.role,
        permissions=current_admin.permissions,
        is_active=current_admin.is_active,
        last_login=current_admin.last_login,
        created_at=current_admin.created_at,
        updated_at=current_admin.updated_at
    )

@router.get("/admin/verify-token")
async def verify_admin_token(
    current_admin: AdminUser = Depends(get_current_admin_user)
):
    """
    Vérifie la validité du token d'authentification
    """
    if not current_admin:
        raise HTTPException(status_code=401, detail="Token invalide")
    
    return {
        "valid": True,
        "user_id": current_admin.id,
        "username": current_admin.username,
        "role": current_admin.role
    }

@router.post("/admin/refresh-token")
async def refresh_admin_token(
    current_admin: AdminUser = Depends(get_current_admin_user),
    credentials: HTTPAuthorizationCredentials = Depends(security),
    db: Session = Depends(get_db)
):
    """
    Rafraîchit le token d'authentification
    """
    if not current_admin:
        raise HTTPException(status_code=401, detail="Non authentifié")
    
    try:
        # Créer un nouveau token
        access_token_expires = timedelta(minutes=ACCESS_TOKEN_EXPIRE_MINUTES)
        new_access_token = create_access_token(
            data={"sub": current_admin.id, "username": current_admin.username, "role": current_admin.role},
            expires_delta=access_token_expires
        )
        
        # Mettre à jour la session existante
        if credentials:
            session = db.query(AdminSession).filter(
                AdminSession.token == credentials.credentials,
                AdminSession.admin_user_id == current_admin.id
            ).first()
            
            if session:
                session.token = new_access_token
                session.expires_at = datetime.utcnow() + access_token_expires
                session.last_activity = datetime.utcnow()
                db.commit()
        
        return {
            "access_token": new_access_token,
            "token_type": "bearer",
            "expires_in": ACCESS_TOKEN_EXPIRE_MINUTES * 60
        }
        
    except Exception as e:
        logger.error(f"Erreur lors du rafraîchissement du token: {str(e)}")
        raise HTTPException(status_code=500, detail="Erreur interne")

@router.get("/admin/sessions")
async def get_admin_sessions(
    current_admin: AdminUser = Depends(get_current_admin_user),
    db: Session = Depends(get_db)
):
    """
    Récupère les sessions actives de l'administrateur
    """
    if not current_admin:
        raise HTTPException(status_code=401, detail="Non authentifié")
    
    try:
        sessions = db.query(AdminSession).filter(
            AdminSession.admin_user_id == current_admin.id,
            AdminSession.is_active == True,
            AdminSession.expires_at > datetime.utcnow()
        ).order_by(AdminSession.created_at.desc()).all()
        
        session_list = []
        for session in sessions:
            session_info = {
                "id": session.id,
                "ip_address": session.ip_address,
                "user_agent": session.user_agent,
                "created_at": session.created_at,
                "last_activity": session.last_activity,
                "expires_at": session.expires_at
            }
            session_list.append(session_info)
        
        return {
            "sessions": session_list,
            "total": len(session_list)
        }
        
    except Exception as e:
        logger.error(f"Erreur lors de la récupération des sessions: {str(e)}")
        raise HTTPException(status_code=500, detail="Erreur interne")

# ==================== UTILITAIRES DE PERMISSION ====================

def require_permission(entity: str, action: str):
    """Décorateur pour vérifier les permissions"""
    def decorator(func):
        async def wrapper(*args, **kwargs):
            # Récupérer l'admin actuel depuis les arguments
            current_admin = None
            for arg in args:
                if isinstance(arg, AdminUser):
                    current_admin = arg
                    break
            
            if not current_admin:
                raise HTTPException(status_code=401, detail="Non authentifié")
            
            # Vérifier les permissions
            if current_admin.role == 'super_admin':
                return await func(*args, **kwargs)
            
            permissions = current_admin.permissions or {}
            if entity in permissions:
                if isinstance(permissions[entity], list):
                    if action in permissions[entity]:
                        return await func(*args, **kwargs)
                elif isinstance(permissions[entity], dict):
                    if permissions[entity].get(action) is True:
                        return await func(*args, **kwargs)
            
            raise HTTPException(status_code=403, detail="Permission insuffisante")
        
        return wrapper
    return decorator