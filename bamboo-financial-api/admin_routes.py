# admin_routes.py
from fastapi import APIRouter, HTTPException, status, Depends
from fastapi.security import HTTPAuthorizationCredentials
from pydantic import BaseModel
from typing import Optional, Dict, Any
from datetime import datetime, timedelta
import logging

# Importez vos modules existants
from .auth import (
    authenticate_admin, 
    create_access_token, 
    get_current_admin_user,
    ACCESS_TOKEN_EXPIRE_MINUTES
)

# Si vous avez défini les schemas dans un autre fichier
class LoginRequest(BaseModel):
    username: str
    password: str

class UserResponse(BaseModel):
    id: str
    username: str
    email: str
    first_name: Optional[str] = None
    last_name: Optional[str] = None
    role: str
    permissions: Optional[Dict[str, Any]] = None
    is_active: bool
    last_login: Optional[datetime] = None

class LoginResponse(BaseModel):
    success: bool
    user: UserResponse
    token: str
    message: Optional[str] = None

class TokenValidationResponse(BaseModel):
    valid: bool

# Créer le router
router = APIRouter(prefix="/api/admin", tags=["admin-auth"])

@router.post("/login", response_model=LoginResponse)
async def admin_login(login_data: LoginRequest):
    """
    Endpoint de connexion pour les administrateurs
    """
    try:
        # Authentifier l'utilisateur
        admin_user = authenticate_admin(login_data.username, login_data.password)
        
        if not admin_user:
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="Nom d'utilisateur ou mot de passe incorrect"
            )
        
        if not admin_user.is_active:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="Compte désactivé"
            )
        
        # Créer le token JWT
        access_token_expires = timedelta(minutes=ACCESS_TOKEN_EXPIRE_MINUTES)
        access_token = create_access_token(
            data={"sub": admin_user.username, "role": admin_user.role},
            expires_delta=access_token_expires
        )
        
        # Mettre à jour la dernière connexion
        admin_user.last_login = datetime.utcnow()
        
        # Créer la réponse utilisateur
        user_response = UserResponse(
            id=admin_user.id,
            username=admin_user.username,
            email=admin_user.email,
            first_name=admin_user.first_name,
            last_name=admin_user.last_name,
            role=admin_user.role,
            permissions=admin_user.permissions,
            is_active=admin_user.is_active,
            last_login=admin_user.last_login
        )
        
        return LoginResponse(
            success=True,
            user=user_response,
            token=access_token,
            message="Connexion réussie"
        )
        
    except HTTPException:
        raise
    except Exception as e:
        logging.error(f"Erreur lors de la connexion admin: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Erreur interne du serveur"
        )

@router.post("/logout")
async def admin_logout(current_user = Depends(get_current_admin_user)):
    """
    Endpoint de déconnexion
    """
    return {"success": True, "message": "Déconnexion réussie"}

@router.get("/profile", response_model=UserResponse)
async def get_admin_profile(current_user = Depends(get_current_admin_user)):
    """
    Récupérer le profil de l'admin connecté
    """
    return UserResponse(
        id=current_user.id,
        username=current_user.username,
        email=current_user.email,
        first_name=current_user.first_name,
        last_name=current_user.last_name,
        role=current_user.role,
        permissions=current_user.permissions,
        is_active=current_user.is_active,
        last_login=current_user.last_login
    )

@router.get("/validate-token", response_model=TokenValidationResponse)
async def validate_admin_token(current_user = Depends(get_current_admin_user)):
    """
    Valider le token JWT
    """
    try:
        # Si on arrive ici, c'est que le token est valide
        return TokenValidationResponse(valid=True)
    except Exception:
        return TokenValidationResponse(valid=False)