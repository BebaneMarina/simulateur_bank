# admin_schemas.py - Schémas simplifiés pour l'authentification admin
from pydantic import BaseModel, EmailStr, validator
from typing import Optional, Dict, Any
from datetime import datetime

class AdminLoginRequest(BaseModel):
    username: str
    password: str
    
    @validator('username')
    def validate_username(cls, v):
        if not v or len(v.strip()) < 3:
            raise ValueError('Le nom d\'utilisateur doit contenir au moins 3 caractères')
        return v.strip().lower()

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