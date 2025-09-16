# routers/auth_router.py - Routeur d'authentification pour les utilisateurs

from fastapi import APIRouter, Depends, HTTPException, status, BackgroundTasks, Request
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from sqlalchemy.orm import Session
from sqlalchemy import or_
from typing import Optional, Dict, Any
from datetime import datetime, timedelta
from jose import JWTError, jwt
from passlib.context import CryptContext
import secrets
import string
import logging
import os
import re

# Imports locaux
from database import get_db
from user_models import User, UserSession, UserNotification
from user_auth_schema import (
    UserRegistrationRequest, UserLoginRequest, VerificationRequest,
    ResendVerificationRequest, PasswordResetRequest, PasswordResetConfirm,
    LoginResponse, RegistrationResponse, UserResponse, ChangePasswordRequest,
    UserProfileUpdate
)

# Configuration du logging
logger = logging.getLogger(__name__)

# Configuration de sécurité
SECRET_KEY = os.getenv("SECRET_KEY", "votre-cle-secrete-changez-moi")
ALGORITHM = "HS256"
ACCESS_TOKEN_EXPIRE_MINUTES = 1440  # 24 heures pour les utilisateurs

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
    """Crée un token JWT pour un utilisateur"""
    to_encode = data.copy()
    if expires_delta:
        expire = datetime.utcnow() + expires_delta
    else:
        expire = datetime.utcnow() + timedelta(minutes=ACCESS_TOKEN_EXPIRE_MINUTES)
    
    to_encode.update({"exp": expire, "type": "user_access"})
    encoded_jwt = jwt.encode(to_encode, SECRET_KEY, algorithm=ALGORITHM)
    return encoded_jwt

def generate_verification_code() -> str:
    """Génère un code de vérification à 6 chiffres"""
    return ''.join(secrets.choice(string.digits) for _ in range(6))

def format_phone_number(phone: str) -> str:
    """Formate un numéro de téléphone gabonais"""
    if not phone:
        return phone
    
    # Supprimer tous les espaces et caractères non numériques sauf le +
    cleaned = re.sub(r'[^\d+]', '', phone)
    
    # Ajouter le préfixe pays si nécessaire
    if cleaned.startswith('0'):
        cleaned = '+241' + cleaned[1:]
    elif cleaned.startswith('241'):
        cleaned = '+' + cleaned
    elif not cleaned.startswith('+241'):
        cleaned = '+241' + cleaned
    
    return cleaned

def validate_phone_number(phone: str) -> bool:
    """Valide un numéro de téléphone gabonais"""
    formatted = format_phone_number(phone)
    # Format: +241 suivi de 8 chiffres
    pattern = r'^\+241[0-9]{8}$'
    return bool(re.match(pattern, formatted))

async def get_current_user(
    credentials: Optional[HTTPAuthorizationCredentials] = Depends(security),
    db: Session = Depends(get_db)
) -> Optional[User]:
    """Récupère l'utilisateur connecté"""
    if not credentials:
        return None
    
    try:
        payload = jwt.decode(credentials.credentials, SECRET_KEY, algorithms=[ALGORITHM])
        user_id: str = payload.get("sub")
        token_type: str = payload.get("type")
        
        if user_id is None or token_type != "user_access":
            return None
            
        # Vérifier que la session existe et est active
        session = db.query(UserSession).filter(
            UserSession.token == credentials.credentials,
            UserSession.is_active == True,
            UserSession.expires_at > datetime.utcnow()
        ).first()
        
        if not session:
            return None
        
        user = db.query(User).filter(User.id == user_id).first()
        return user
        
    except JWTError:
        return None

def send_verification_sms(phone: str, code: str):
    """Envoie un SMS de vérification (à implémenter avec un service SMS)"""
    # TODO: Intégrer avec un service SMS comme Twilio, Orange API, etc.
    logger.info(f"SMS de vérification envoyé à {phone}: {code}")
    # Pour le développement, on log juste le code

def send_verification_email(email: str, code: str):
    """Envoie un email de vérification (à implémenter avec un service email)"""
    # TODO: Intégrer avec un service email comme SendGrid, AWS SES, etc.
    logger.info(f"Email de vérification envoyé à {email}: {code}")
    # Pour le développement, on log juste le code

def create_notification(db: Session, user_id: str, title: str, message: str, type: str = "info"):
    """Crée une notification pour l'utilisateur"""
    notification = UserNotification(
        user_id=user_id,
        type=type,
        title=title,
        message=message
    )
    db.add(notification)
    db.commit()

# ==================== ENDPOINTS D'AUTHENTIFICATION ====================

@router.post("/auth/debug-register")
async def debug_register(request: dict):
    """
    Endpoint temporaire pour débugger les données d'inscription
    """
    logger.info(f"Données brutes reçues: {request}")
    return {
        "received_data": request,
        "keys": list(request.keys()) if isinstance(request, dict) else "not a dict",
        "registration_method": request.get("registration_method") if isinstance(request, dict) else None
    }

@router.post("/auth/register")
async def register_user_bypass(request: Request, db: Session = Depends(get_db)):
    """Bypass temporaire de la validation"""
    try:
        data = await request.json()
        logger.info(f"Données brutes: {data}")
        
        user = User(
            email=data.get('email'),
            first_name=data.get('first_name', 'Unknown'),
            last_name=data.get('last_name', 'User'),
            registration_method=data.get('registration_method', 'email')
        )
        
        if data.get('password'):
            user.password_hash = get_password_hash(data['password'])
        
        db.add(user)
        db.commit()
        db.refresh(user)
        
        return {
            "success": True,
            "user": {
                "id": user.id,
                "email": user.email,
                "first_name": user.first_name,
                "last_name": user.last_name,
                "registration_method": user.registration_method,
                "email_verified": user.email_verified,
                "phone_verified": user.phone_verified,
                "is_active": user.is_active,
                "created_at": user.created_at.isoformat(),
                "preferences": user.preferences
            },
            "verification_required": True,
            "verification_method": "email",
            "message": "Inscription réussie"
        }
        
    except Exception as e:
        db.rollback()
        logger.error(f"Erreur: {e}", exc_info=True)
        raise HTTPException(status_code=500, detail=str(e))

@router.post("/auth/login", response_model=LoginResponse)
async def login_user(
    login_data: UserLoginRequest,
    db: Session = Depends(get_db)
):
    """
    Connexion d'un utilisateur
    """
    try:
        # Formatter le téléphone si fourni
        if login_data.phone:
            login_data.phone = format_phone_number(login_data.phone)
        
        # Rechercher l'utilisateur
        user = None
        if login_data.email:
            user = db.query(User).filter(User.email == login_data.email).first()
        elif login_data.phone:
            user = db.query(User).filter(User.phone == login_data.phone).first()
        
        if not user:
            raise HTTPException(
                status_code=401,
                detail="Identifiants incorrects"
            )
        
        # Vérifier le mot de passe
        if not user.password_hash or not verify_password(login_data.password, user.password_hash):
            raise HTTPException(
                status_code=401,
                detail="Identifiants incorrects"
            )
        
        # Vérifier que le compte est actif
        if not user.is_active:
            raise HTTPException(
                status_code=403,
                detail="Compte désactivé"
            )
        
        # Vérifier la vérification selon la méthode d'inscription
        if user.registration_method == "email" and not user.email_verified:
            raise HTTPException(
                status_code=403,
                detail="Veuillez vérifier votre email avant de vous connecter"
            )
        elif user.registration_method == "phone" and not user.phone_verified:
            raise HTTPException(
                status_code=403,
                detail="Veuillez vérifier votre téléphone avant de vous connecter"
            )
        
        # Créer le token d'accès
        access_token_expires = timedelta(minutes=ACCESS_TOKEN_EXPIRE_MINUTES)
        access_token = create_access_token(
            data={"sub": user.id},
            expires_delta=access_token_expires
        )
        
        # Créer une nouvelle session
        session = UserSession(
            user_id=user.id,
            token=access_token,
            device_info=login_data.device_info,
            expires_at=datetime.utcnow() + access_token_expires
        )
        db.add(session)
        
        # Mettre à jour la dernière connexion
        user.last_login = datetime.utcnow()
        db.commit()
        
        logger.info(f"Connexion réussie pour l'utilisateur: {user.id}")
        
        # Créer la réponse utilisateur
        user_response = UserResponse(
            id=user.id,
            email=user.email,
            phone=user.phone,
            first_name=user.first_name,
            last_name=user.last_name,
            date_of_birth=user.date_of_birth,
            gender=user.gender,
            profession=user.profession,
            monthly_income=float(user.monthly_income) if user.monthly_income else None,
            city=user.city,
            address=user.address,
            registration_method=user.registration_method,
            email_verified=user.email_verified,
            phone_verified=user.phone_verified,
            is_active=user.is_active,
            last_login=user.last_login,
            created_at=user.created_at,
            preferences=user.preferences
        )
        
        return LoginResponse(
            success=True,
            user=user_response,
            token=access_token,
            expires_in=ACCESS_TOKEN_EXPIRE_MINUTES * 60,
            message="Connexion réussie"
        )
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Erreur lors de la connexion: {str(e)}")
        raise HTTPException(
            status_code=500,
            detail="Erreur interne lors de la connexion"
        )

@router.post("/auth/verify")
async def verify_account(
    verification_data: VerificationRequest,
    db: Session = Depends(get_db)
):
    """
    Vérification du compte utilisateur
    """
    try:
        # Rechercher l'utilisateur
        user = None
        if verification_data.email:
            user = db.query(User).filter(User.email == verification_data.email).first()
        elif verification_data.phone:
            formatted_phone = format_phone_number(verification_data.phone)
            user = db.query(User).filter(User.phone == formatted_phone).first()
        
        if not user:
            raise HTTPException(status_code=404, detail="Utilisateur non trouvé")
        
        # Vérifier le code
        if (not user.verification_code or 
            user.verification_code != verification_data.code or
            user.verification_expires_at < datetime.utcnow()):
            raise HTTPException(status_code=400, detail="Code de vérification invalide ou expiré")
        
        # Marquer comme vérifié
        if verification_data.email:
            user.email_verified = True
        elif verification_data.phone:
            user.phone_verified = True
        
        # Nettoyer le code de vérification
        user.verification_code = None
        user.verification_expires_at = None
        
        db.commit()
        
        logger.info(f"Compte vérifié avec succès: {user.id}")
        
        # Créer automatiquement une session si pas de mot de passe (inscription SMS)
        if not user.password_hash:
            access_token_expires = timedelta(minutes=ACCESS_TOKEN_EXPIRE_MINUTES)
            access_token = create_access_token(
                data={"sub": user.id},
                expires_delta=access_token_expires
            )
            
            session = UserSession(
                user_id=user.id,
                token=access_token,
                expires_at=datetime.utcnow() + access_token_expires
            )
            db.add(session)
            user.last_login = datetime.utcnow()
            db.commit()
            
            # Créer la réponse utilisateur
            user_response = UserResponse(
                id=user.id,
                email=user.email,
                phone=user.phone,
                first_name=user.first_name,
                last_name=user.last_name,
                date_of_birth=user.date_of_birth,
                gender=user.gender,
                profession=user.profession,
                monthly_income=float(user.monthly_income) if user.monthly_income else None,
                city=user.city,
                address=user.address,
                registration_method=user.registration_method,
                email_verified=user.email_verified,
                phone_verified=user.phone_verified,
                is_active=user.is_active,
                last_login=user.last_login,
                created_at=user.created_at,
                preferences=user.preferences
            )
            
            return LoginResponse(
                success=True,
                user=user_response,
                token=access_token,
                expires_in=ACCESS_TOKEN_EXPIRE_MINUTES * 60,
                message="Compte vérifié et connexion automatique"
            )
        
        return {"success": True, "message": "Compte vérifié avec succès"}
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Erreur lors de la vérification: {str(e)}")
        raise HTTPException(status_code=500, detail="Erreur interne")

@router.post("/auth/resend-verification")
async def resend_verification_code(
    resend_data: ResendVerificationRequest,
    background_tasks: BackgroundTasks,
    db: Session = Depends(get_db)
):
    """
    Renvoie un code de vérification
    """
    try:
        # Rechercher l'utilisateur
        user = None
        if resend_data.email:
            user = db.query(User).filter(User.email == resend_data.email).first()
        elif resend_data.phone:
            formatted_phone = format_phone_number(resend_data.phone)
            user = db.query(User).filter(User.phone == formatted_phone).first()
        
        if not user:
            raise HTTPException(status_code=404, detail="Utilisateur non trouvé")
        
        # Vérifier si déjà vérifié
        if ((resend_data.email and user.email_verified) or 
            (resend_data.phone and user.phone_verified)):
            raise HTTPException(status_code=400, detail="Compte déjà vérifié")
        
        # Générer un nouveau code
        verification_code = generate_verification_code()
        user.verification_code = verification_code
        user.verification_expires_at = datetime.utcnow() + timedelta(minutes=15)
        
        db.commit()
        
        # Envoyer le code
        if resend_data.email:
            background_tasks.add_task(send_verification_email, resend_data.email, verification_code)
        elif resend_data.phone:
            background_tasks.add_task(send_verification_sms, resend_data.phone, verification_code)
        
        return {"success": True, "message": "Code de vérification renvoyé"}
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Erreur lors du renvoi du code: {str(e)}")
        raise HTTPException(status_code=500, detail="Erreur interne")

@router.post("/auth/logout")
async def logout_user(
    current_user: User = Depends(get_current_user),
    credentials: HTTPAuthorizationCredentials = Depends(security),
    db: Session = Depends(get_db)
):
    """
    Déconnexion de l'utilisateur
    """
    if not current_user:
        raise HTTPException(status_code=401, detail="Non authentifié")
    
    try:
        # Désactiver la session actuelle
        session = db.query(UserSession).filter(
            UserSession.token == credentials.credentials
        ).first()
        
        if session:
            session.is_active = False
            db.commit()
        
        logger.info(f"Déconnexion de l'utilisateur: {current_user.id}")
        return {"success": True, "message": "Déconnexion réussie"}
        
    except Exception as e:
        logger.error(f"Erreur lors de la déconnexion: {str(e)}")
        raise HTTPException(status_code=500, detail="Erreur interne")

@router.get("/auth/me", response_model=UserResponse)
async def get_current_user_info(
    current_user: User = Depends(get_current_user)
):
    """
    Récupère les informations de l'utilisateur connecté
    """
    if not current_user:
        raise HTTPException(status_code=401, detail="Non authentifié")
    
    return UserResponse(
        id=current_user.id,
        email=current_user.email,
        phone=current_user.phone,
        first_name=current_user.first_name,
        last_name=current_user.last_name,
        date_of_birth=current_user.date_of_birth,
        gender=current_user.gender,
        profession=current_user.profession,
        monthly_income=float(current_user.monthly_income) if current_user.monthly_income else None,
        city=current_user.city,
        address=current_user.address,
        registration_method=current_user.registration_method,
        email_verified=current_user.email_verified,
        phone_verified=current_user.phone_verified,
        is_active=current_user.is_active,
        last_login=current_user.last_login,
        created_at=current_user.created_at,
        preferences=current_user.preferences
    )

# ==================== GESTION DU PROFIL ====================

@router.put("/auth/profile", response_model=UserResponse)
async def update_profile(
    profile_data: UserProfileUpdate,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """
    Met à jour le profil utilisateur
    """
    if not current_user:
        raise HTTPException(status_code=401, detail="Non authentifié")
    
    try:
        # Mettre à jour les champs fournis
        update_data = profile_data.dict(exclude_unset=True)
        
        for field, value in update_data.items():
            if field == "gender" and value:
                setattr(current_user, field, value.value if hasattr(value, 'value') else value)
            else:
                setattr(current_user, field, value)
        
        current_user.updated_at = datetime.utcnow()
        db.commit()
        db.refresh(current_user)
        
        logger.info(f"Profil mis à jour: {current_user.id}")
        
        return UserResponse(
            id=current_user.id,
            email=current_user.email,
            phone=current_user.phone,
            first_name=current_user.first_name,
            last_name=current_user.last_name,
            date_of_birth=current_user.date_of_birth,
            gender=current_user.gender,
            profession=current_user.profession,
            monthly_income=float(current_user.monthly_income) if current_user.monthly_income else None,
            city=current_user.city,
            address=current_user.address,
            registration_method=current_user.registration_method,
            email_verified=current_user.email_verified,
            phone_verified=current_user.phone_verified,
            is_active=current_user.is_active,
            last_login=current_user.last_login,
            created_at=current_user.created_at,
            preferences=current_user.preferences
        )
        
    except Exception as e:
        logger.error(f"Erreur lors de la mise à jour du profil: {str(e)}")
        raise HTTPException(status_code=500, detail="Erreur interne")

@router.post("/auth/change-password")
async def change_password(
    password_data: ChangePasswordRequest,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """
    Change le mot de passe de l'utilisateur
    """
    if not current_user:
        raise HTTPException(status_code=401, detail="Non authentifié")
    
    try:
        # Vérifier l'ancien mot de passe
        if not current_user.password_hash:
            raise HTTPException(status_code=400, detail="Aucun mot de passe défini")
        
        if not verify_password(password_data.current_password, current_user.password_hash):
            raise HTTPException(status_code=400, detail="Mot de passe actuel incorrect")
        
        # Mettre à jour le mot de passe
        current_user.password_hash = get_password_hash(password_data.new_password)
        current_user.updated_at = datetime.utcnow()
        
        db.commit()
        
        logger.info(f"Mot de passe changé: {current_user.id}")
        return {"success": True, "message": "Mot de passe modifié avec succès"}
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Erreur lors du changement de mot de passe: {str(e)}")
        raise HTTPException(status_code=500, detail="Erreur interne")

# ==================== RÉCUPÉRATION DE MOT DE PASSE ====================

@router.post("/auth/forgot-password")
async def forgot_password(
    reset_data: PasswordResetRequest,
    background_tasks: BackgroundTasks,
    db: Session = Depends(get_db)
):
    """
    Demande de réinitialisation de mot de passe
    """
    try:
        # Rechercher l'utilisateur
        user = None
        if reset_data.email:
            user = db.query(User).filter(User.email == reset_data.email).first()
        elif reset_data.phone:
            formatted_phone = format_phone_number(reset_data.phone)
            user = db.query(User).filter(User.phone == formatted_phone).first()
        
        if not user:
            # Ne pas révéler si l'utilisateur existe ou non
            return {"success": True, "message": "Si ce compte existe, un code de récupération a été envoyé"}
        
        # Générer un code de récupération
        reset_code = generate_verification_code()
        user.verification_code = reset_code
        user.verification_expires_at = datetime.utcnow() + timedelta(minutes=30)  # 30 minutes pour reset
        
        db.commit()
        
        # Envoyer le code
        if reset_data.email:
            background_tasks.add_task(send_verification_email, reset_data.email, reset_code)
        elif reset_data.phone:
            background_tasks.add_task(send_verification_sms, reset_data.phone, reset_code)
        
        return {"success": True, "message": "Si ce compte existe, un code de récupération a été envoyé"}
        
    except Exception as e:
        logger.error(f"Erreur lors de la demande de reset: {str(e)}")
        raise HTTPException(status_code=500, detail="Erreur interne")

@router.post("/auth/reset-password")
async def reset_password(
    reset_data: PasswordResetConfirm,
    db: Session = Depends(get_db)
):
    """
    Réinitialisation du mot de passe avec code
    """
    try:
        # Rechercher l'utilisateur
        user = None
        if reset_data.email:
            user = db.query(User).filter(User.email == reset_data.email).first()
        elif reset_data.phone:
            formatted_phone = format_phone_number(reset_data.phone)
            user = db.query(User).filter(User.phone == formatted_phone).first()
        
        if not user:
            raise HTTPException(status_code=404, detail="Utilisateur non trouvé")
        
        # Vérifier le code
        if (not user.verification_code or 
            user.verification_code != reset_data.code or
            user.verification_expires_at < datetime.utcnow()):
            raise HTTPException(status_code=400, detail="Code de récupération invalide ou expiré")
        
        # Mettre à jour le mot de passe
        user.password_hash = get_password_hash(reset_data.new_password)
        user.verification_code = None
        user.verification_expires_at = None
        user.updated_at = datetime.utcnow()
        
        # Désactiver toutes les sessions existantes
        db.query(UserSession).filter(UserSession.user_id == user.id).update({"is_active": False})
        
        db.commit()
        
        logger.info(f"Mot de passe réinitialisé: {user.id}")
        return {"success": True, "message": "Mot de passe réinitialisé avec succès"}
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Erreur lors de la réinitialisation: {str(e)}")
        raise HTTPException(status_code=500, detail="Erreur interne")

# ==================== ENDPOINTS UTILITAIRES ====================

@router.get("/auth/check-availability")
async def check_availability(
    email: Optional[str] = None,
    phone: Optional[str] = None,
    db: Session = Depends(get_db)
):
    """
    Vérifie la disponibilité d'un email ou téléphone
    """
    if not email and not phone:
        raise HTTPException(status_code=400, detail="Email ou téléphone requis")
    
    try:
        user = None
        
        if email:
            user = db.query(User).filter(User.email == email).first()
        elif phone:
            formatted_phone = format_phone_number(phone)
            user = db.query(User).filter(User.phone == formatted_phone).first()
        
        is_available = user is None
        
        return {
            "available": is_available,
            "message": "Disponible" if is_available else "Déjà utilisé"
        }
        
    except Exception as e:
        logger.error(f"Erreur lors de la vérification de disponibilité: {str(e)}")
        raise HTTPException(status_code=500, detail="Erreur interne")

@router.post("/auth/logout-all")
async def logout_all_devices(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """
    Déconnecte l'utilisateur de tous les appareils
    """
    if not current_user:
        raise HTTPException(status_code=401, detail="Non authentifié")
    
    try:
        # Désactiver toutes les sessions
        db.query(UserSession).filter(UserSession.user_id == current_user.id).update({"is_active": False})
        db.commit()
        
        logger.info(f"Déconnexion de tous les appareils: {current_user.id}")
        return {"success": True, "message": "Déconnexion de tous les appareils réussie"}
        
    except Exception as e:
        logger.error(f"Erreur lors de la déconnexion globale: {str(e)}")
        raise HTTPException(status_code=500, detail="Erreur interne")

@router.get("/auth/sessions")
async def get_user_sessions(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """
    Récupère les sessions actives de l'utilisateur
    """
    if not current_user:
        raise HTTPException(status_code=401, detail="Non authentifié")
    
    try:
        sessions = db.query(UserSession).filter(
            UserSession.user_id == current_user.id,
            UserSession.is_active == True,
            UserSession.expires_at > datetime.utcnow()
        ).order_by(UserSession.created_at.desc()).all()
        
        session_list = []
        for session in sessions:
            session_info = {
                "id": session.id,
                "device_info": session.device_info or {},
                "ip_address": session.ip_address,
                "created_at": session.created_at,
                "expires_at": session.expires_at,
                "is_current": False  # sera mis à jour par le frontend si nécessaire
            }
            session_list.append(session_info)
        
        return {
            "sessions": session_list,
            "total": len(session_list)
        }
        
    except Exception as e:
        logger.error(f"Erreur lors de la récupération des sessions: {str(e)}")
        raise HTTPException(status_code=500, detail="Erreur interne")

@router.delete("/auth/sessions/{session_id}")
async def revoke_session(
    session_id: str,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """
    Révoque une session spécifique
    """
    if not current_user:
        raise HTTPException(status_code=401, detail="Non authentifié")
    
    try:
        session = db.query(UserSession).filter(
            UserSession.id == session_id,
            UserSession.user_id == current_user.id
        ).first()
        
        if not session:
            raise HTTPException(status_code=404, detail="Session non trouvée")
        
        session.is_active = False
        db.commit()
        
        return {"success": True, "message": "Session révoquée avec succès"}
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Erreur lors de la révocation de session: {str(e)}")
        raise HTTPException(status_code=500, detail="Erreur interne")

# ==================== ENDPOINTS DE PRÉFÉRENCES ====================

@router.put("/auth/preferences")
async def update_preferences(
    preferences: Dict[str, Any],
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """
    Met à jour les préférences utilisateur
    """
    if not current_user:
        raise HTTPException(status_code=401, detail="Non authentifié")
    
    try:
        # Fusionner avec les préférences existantes
        current_preferences = current_user.preferences or {}
        current_preferences.update(preferences)
        
        current_user.preferences = current_preferences
        current_user.updated_at = datetime.utcnow()
        
        db.commit()
        
        logger.info(f"Préférences mises à jour: {current_user.id}")
        return {
            "success": True,
            "message": "Préférences mises à jour avec succès",
            "preferences": current_preferences
        }
        
    except Exception as e:
        logger.error(f"Erreur lors de la mise à jour des préférences: {str(e)}")
        raise HTTPException(status_code=500, detail="Erreur interne")

@router.get("/auth/preferences")
async def get_preferences(
    current_user: User = Depends(get_current_user)
):
    """
    Récupère les préférences utilisateur
    """
    if not current_user:
        raise HTTPException(status_code=401, detail="Non authentifié")
    
    return {
        "preferences": current_user.preferences or {},
        "default_preferences": {
            "email_notifications": True,
            "sms_notifications": False,
            "marketing_emails": True,
            "language": "fr",
            "timezone": "Africa/Libreville"
        }
    }

# ==================== ENDPOINT DE SUPPRESSION DE COMPTE ====================

@router.delete("/auth/account")
async def delete_account(
    password: str,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """
    Supprime le compte utilisateur (à utiliser avec précaution)
    """
    if not current_user:
        raise HTTPException(status_code=401, detail="Non authentifié")
    
    try:
        # Vérifier le mot de passe
        if not current_user.password_hash or not verify_password(password, current_user.password_hash):
            raise HTTPException(status_code=400, detail="Mot de passe incorrect")
        
        # Désactiver le compte au lieu de le supprimer (soft delete)
        current_user.is_active = False
        current_user.email = f"deleted_{current_user.id}_{current_user.email}" if current_user.email else None
        current_user.phone = f"deleted_{current_user.id}_{current_user.phone}" if current_user.phone else None
        
        # Désactiver toutes les sessions
        db.query(UserSession).filter(UserSession.user_id == current_user.id).update({"is_active": False})
        
        db.commit()
        
        logger.info(f"Compte désactivé: {current_user.id}")
        return {"success": True, "message": "Compte supprimé avec succès"}
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Erreur lors de la suppression de compte: {str(e)}")
        raise HTTPException(status_code=500, detail="Erreur interne")