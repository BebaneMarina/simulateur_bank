# security.py - Version corrigée pour le problème bcrypt
from datetime import datetime, timedelta
from typing import Optional
from jose import JWTError, jwt
import bcrypt
from fastapi import HTTPException, status, Depends, Header, Request
from sqlalchemy.orm import Session
import os
from dotenv import load_dotenv
from database import get_db
import models

load_dotenv()

# Configuration
SECRET_KEY = os.getenv("SECRET_KEY", "bamboo-financial-secret-key-change-in-production")
ALGORITHM = "HS256"
ACCESS_TOKEN_EXPIRE_MINUTES = 60 * 24 * 7  # 7 jours

def verify_password(plain_password: str, hashed_password: str) -> bool:
    """Vérifier le mot de passe avec bcrypt direct"""
    try:
        # Utiliser bcrypt directement au lieu de passlib
        return bcrypt.checkpw(plain_password.encode('utf-8'), hashed_password.encode('utf-8'))
    except Exception as e:
        print(f"Erreur vérification mot de passe: {e}")
        return False

def get_password_hash(password: str) -> str:
    """Hasher le mot de passe avec bcrypt direct"""
    salt = bcrypt.gensalt()
    return bcrypt.hashpw(password.encode('utf-8'), salt).decode('utf-8')

def create_access_token(data: dict, expires_delta: Optional[timedelta] = None):
    """Créer un token JWT"""
    to_encode = data.copy()
    if expires_delta:
        expire = datetime.utcnow() + expires_delta
    else:
        expire = datetime.utcnow() + timedelta(minutes=ACCESS_TOKEN_EXPIRE_MINUTES)
    
    to_encode.update({"exp": expire})
    encoded_jwt = jwt.encode(to_encode, SECRET_KEY, algorithm=ALGORITHM)
    return encoded_jwt

def verify_token(token: str) -> Optional[str]:
    """Vérifier et décoder le token JWT"""
    try:
        payload = jwt.decode(token, SECRET_KEY, algorithms=[ALGORITHM])
        username: str = payload.get("sub")
        if username is None:
            return None
        return username
    except JWTError:
        return None

async def get_current_user(
    request: Request,
    authorization: str = Header(None),
    db: Session = Depends(get_db)
) -> models.AdminUser:
    """Récupérer l'utilisateur connecté à partir du token"""
    
    credentials_exception = HTTPException(
        status_code=status.HTTP_401_UNAUTHORIZED,
        detail="Token d'authentification requis",
        headers={"WWW-Authenticate": "Bearer"},
    )
    
    if not authorization or not authorization.startswith("Bearer "):
        raise credentials_exception
    
    token = authorization.replace("Bearer ", "")
    username = verify_token(token)
    
    if not username:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Token invalide ou expiré"
        )
    
    user = db.query(models.AdminUser).filter(models.AdminUser.username == username).first()
    if not user or not user.is_active:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Utilisateur non trouvé ou inactif"
        )
    
    return user

def require_permission(entity: str, action: str):
    """Décorateur pour vérifier les permissions"""
    def permission_checker(current_user: models.AdminUser = Depends(get_current_user)):
        # Super admin a tous les droits
        if current_user.role == 'super_admin':
            return current_user
        
        # Vérifier les permissions spécifiques
        if current_user.permissions and entity in current_user.permissions:
            if isinstance(current_user.permissions[entity], list) and action in current_user.permissions[entity]:
                return current_user
        
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail=f"Permission refusée: {action} sur {entity}"
        )
    
    return permission_checker

def log_admin_action(
    db: Session,
    admin_user_id: str,
    action: str,
    entity_type: str,
    entity_id: str = None,
    old_values: dict = None,
    new_values: dict = None,
    request: Request = None
):
    """Enregistrer une action admin dans les logs d'audit"""
    audit_log = models.AuditLog(
        admin_user_id=admin_user_id,
        action=action,
        entity_type=entity_type,
        entity_id=entity_id,
        old_values=old_values,
        new_values=new_values,
        ip_address=request.client.host if request else None,
        user_agent=request.headers.get("user-agent") if request else None
    )
    db.add(audit_log)
    db.commit()