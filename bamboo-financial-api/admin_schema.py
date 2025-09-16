# admin_schemas.py - Schémas Pydantic pour l'authentification admin
from pydantic import BaseModel, EmailStr, validator
from typing import Optional, Dict, Any
from datetime import datetime
import re

class AdminLoginRequest(BaseModel):
    username: str
    password: str
    
    @validator('username')
    def validate_username(cls, v):
        if not v or len(v.strip()) < 3:
            raise ValueError('Le nom d\'utilisateur doit contenir au moins 3 caractères')
        return v.strip().lower()
    
    @validator('password')
    def validate_password(cls, v):
        if not v or len(v) < 3:
            raise ValueError('Le mot de passe doit contenir au moins 3 caractères')
        return v

class AdminUserResponse(BaseModel):
    id: str
    username: str
    email: str
    first_name: Optional[str] = None
    last_name: Optional[str] = None
    role: str
    permissions: Optional[Dict[str, Any]] = None
    is_active: bool
    last_login: Optional[datetime] = None
    created_at: datetime
    updated_at: Optional[datetime] = None
    
    class Config:
        from_attributes = True

class AdminLoginResponse(BaseModel):
    success: bool
    user: AdminUserResponse
    token: str
    expires_in: int
    message: Optional[str] = None

class AdminCreateRequest(BaseModel):
    username: str
    email: EmailStr
    password: str
    first_name: Optional[str] = None
    last_name: Optional[str] = None
    role: str
    permissions: Optional[Dict[str, Any]] = None
    
    @validator('username')
    def validate_username(cls, v):
        if not v or len(v.strip()) < 3:
            raise ValueError('Le nom d\'utilisateur doit contenir au moins 3 caractères')
        if not re.match(r'^[a-zA-Z0-9_]+$', v.strip()):
            raise ValueError('Le nom d\'utilisateur ne peut contenir que des lettres, chiffres et underscore')
        return v.strip().lower()
    
    @validator('password')
    def validate_password(cls, v):
        if not v or len(v) < 8:
            raise ValueError('Le mot de passe doit contenir au moins 8 caractères')
        return v
    
    @validator('role')
    def validate_role(cls, v):
        allowed_roles = ['super_admin', 'admin', 'manager', 'moderator', 'readonly']
        if v not in allowed_roles:
            raise ValueError(f'Le rôle doit être l\'un de: {", ".join(allowed_roles)}')
        return v

class AdminUpdateRequest(BaseModel):
    email: Optional[EmailStr] = None
    first_name: Optional[str] = None
    last_name: Optional[str] = None
    role: Optional[str] = None
    permissions: Optional[Dict[str, Any]] = None
    is_active: Optional[bool] = None
    
    @validator('role')
    def validate_role(cls, v):
        if v is not None:
            allowed_roles = ['super_admin', 'admin', 'manager', 'moderator', 'readonly']
            if v not in allowed_roles:
                raise ValueError(f'Le rôle doit être l\'un de: {", ".join(allowed_roles)}')
        return v

class PasswordChangeRequest(BaseModel):
    current_password: str
    new_password: str
    
    @validator('new_password')
    def validate_new_password(cls, v):
        if not v or len(v) < 8:
            raise ValueError('Le nouveau mot de passe doit contenir au moins 8 caractères')
        return v

class TokenResponse(BaseModel):
    access_token: str
    token_type: str
    expires_in: int

class SessionResponse(BaseModel):
    id: str
    ip_address: Optional[str] = None
    user_agent: Optional[str] = None
    created_at: datetime
    last_activity: Optional[datetime] = None
    expires_at: datetime
    
    class Config:
        from_attributes = True

class SessionsListResponse(BaseModel):
    sessions: list[SessionResponse]
    total: int

class PermissionCheckRequest(BaseModel):
    entity: str
    action: str

class PermissionCheckResponse(BaseModel):
    allowed: bool
    user_role: str
    entity: str
    action: str