# auth.py - Module d'authentification simple et fonctionnel
from fastapi import Depends, HTTPException, status
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from jose import JWTError, jwt
from passlib.context import CryptContext
from datetime import datetime, timedelta
from typing import Optional
import os
from dotenv import load_dotenv

load_dotenv()

# Configuration
SECRET_KEY = os.getenv("SECRET_KEY", "votre-cle-secrete-tres-securisee-changez-moi")
ALGORITHM = "HS256"
ACCESS_TOKEN_EXPIRE_MINUTES = 30

pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")
security = HTTPBearer(auto_error=False)

class MockAdminUser:
    """Utilisateur admin fictif pour les tests"""
    def __init__(self):
        self.id = "admin-test"
        self.username = "admin"
        self.email = "admin@test.com"
        self.role = "super_admin"
        self.is_active = True
        self.first_name = "Admin"
        self.last_name = "User"
        self.permissions = {
            "banks": ["create", "read", "update", "delete"],
            "credit_products": ["create", "read", "update", "delete"],
            "savings_products": ["create", "read", "update", "delete"],
            "insurance_products": ["create", "read", "update", "delete"],
            "simulations": ["read", "delete"],
            "users": ["create", "read", "update", "delete"]
        }
        self.created_at = datetime.utcnow()
        self.last_login = None

def verify_password(plain_password: str, hashed_password: str) -> bool:
    """Vérifie un mot de passe"""
    return pwd_context.verify(plain_password, hashed_password)

def get_password_hash(password: str) -> str:
    """Hash un mot de passe"""
    return pwd_context.hash(password)

def create_access_token(data: dict, expires_delta: Optional[timedelta] = None):
    """Crée un token JWT"""
    to_encode = data.copy()
    if expires_delta:
        expire = datetime.utcnow() + expires_delta
    else:
        expire = datetime.utcnow() + timedelta(minutes=ACCESS_TOKEN_EXPIRE_MINUTES)
    
    to_encode.update({"exp": expire})
    encoded_jwt = jwt.encode(to_encode, SECRET_KEY, algorithm=ALGORITHM)
    return encoded_jwt

async def get_current_admin_user(
    credentials: Optional[HTTPAuthorizationCredentials] = Depends(security)
):
    """
    Fonction temporaire qui retourne toujours un admin valide
    À remplacer par une vraie authentification plus tard
    """
    # Pour le développement, on retourne toujours un utilisateur admin fictif
    # Vous pouvez ajouter une vérification de token plus tard
    return MockAdminUser()

def authenticate_admin(username: str, password: str):
    """
    Authentifie un admin - version simplifiée pour le développement
    """
    # Pour le développement, accepter admin/admin
    if username == "admin" and password == "admin":
        return MockAdminUser()
    return None

def get_current_admin_user_with_token(
    credentials: HTTPAuthorizationCredentials = Depends(security)
):
    """
    Version avec vérification de token - pour usage futur
    """
    if not credentials:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Token manquant",
            headers={"WWW-Authenticate": "Bearer"},
        )
    
    credentials_exception = HTTPException(
        status_code=status.HTTP_401_UNAUTHORIZED,
        detail="Impossible de valider les credentials",
        headers={"WWW-Authenticate": "Bearer"},
    )
    
    try:
        payload = jwt.decode(credentials.credentials, SECRET_KEY, algorithms=[ALGORITHM])
        username: str = payload.get("sub")
        if username is None:
            raise credentials_exception
    except JWTError:
        raise credentials_exception
    
    # Pour l'instant, retourner un utilisateur fictif si le token est valide
    return MockAdminUser()