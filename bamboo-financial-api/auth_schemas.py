# auth_schemas.py - Nouveau fichier à créer
from pydantic import BaseModel, EmailStr
from typing import Optional, Dict, Any
from datetime import datetime

class LoginRequest(BaseModel):
    username: str
    password: str

class UserResponse(BaseModel):
    id: str
    username: str
    email: EmailStr
    first_name: Optional[str] = None
    last_name: Optional[str] = None
    role: str
    permissions: Optional[Dict[str, Any]] = None
    is_active: bool
    last_login: Optional[datetime] = None

    class Config:
        from_attributes = True

class LoginResponse(BaseModel):
    success: bool
    user: UserResponse
    token: str
    message: Optional[str] = None

class TokenValidationResponse(BaseModel):
    valid: bool

class DashboardStats(BaseModel):
    total_banks: int
    active_banks: int
    total_insurance_companies: int
    active_insurance_companies: int
    active_credit_products: int
    active_savings_products: int
    active_insurance_products: int
    total_simulations_today: int
    total_applications_pending: int

class AuditLogResponse(BaseModel):
    id: str
    action: str
    entity_type: str
    entity_id: Optional[str] = None
    created_at: datetime
    user: Optional[Dict[str, str]] = None

    class Config:
        from_attributes = True