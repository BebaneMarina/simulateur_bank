# schemas/admin.py
from pydantic import BaseModel, EmailStr
from typing import Optional, List, Dict, Any
from datetime import datetime
from enum import Enum

class AdminRole(str, Enum):
    SUPER_ADMIN = "super_admin"
    ADMIN = "admin"
    MODERATOR = "moderator"
    READONLY = "readonly"

class AdminUserCreate(BaseModel):
    username: str
    email: EmailStr
    password: str
    first_name: str
    last_name: str
    role: AdminRole
    permissions: Optional[Dict[str, List[str]]] = None

class AdminUserUpdate(BaseModel):
    email: Optional[EmailStr] = None
    first_name: Optional[str] = None
    last_name: Optional[str] = None
    role: Optional[AdminRole] = None
    permissions: Optional[Dict[str, List[str]]] = None
    is_active: Optional[bool] = None

class AdminUser(BaseModel):
    id: str
    username: str
    email: EmailStr
    first_name: Optional[str]
    last_name: Optional[str]
    role: AdminRole
    permissions: Dict[str, List[str]]
    is_active: bool
    last_login: Optional[datetime]
    created_at: datetime
    updated_at: datetime

class LoginRequest(BaseModel):
    username: str
    password: str

class TokenResponse(BaseModel):
    access_token: str
    token_type: str
    expires_in: int
    user: AdminUser

# Schémas pour les entités métier
class BankCreate(BaseModel):
    id: str
    name: str
    full_name: Optional[str] = None
    description: Optional[str] = None
    logo_url: Optional[str] = None
    website: Optional[str] = None
    contact_phone: Optional[str] = None
    contact_email: Optional[EmailStr] = None
    address: Optional[str] = None
    swift_code: Optional[str] = None
    license_number: Optional[str] = None
    established_year: Optional[int] = None
    total_assets: Optional[float] = None
    rating: Optional[str] = None

class BankUpdate(BaseModel):
    name: Optional[str] = None
    full_name: Optional[str] = None
    description: Optional[str] = None
    logo_url: Optional[str] = None
    website: Optional[str] = None
    contact_phone: Optional[str] = None
    contact_email: Optional[EmailStr] = None
    address: Optional[str] = None
    swift_code: Optional[str] = None
    license_number: Optional[str] = None
    established_year: Optional[int] = None
    total_assets: Optional[float] = None
    rating: Optional[str] = None
    is_active: Optional[bool] = None

class CreditProductCreate(BaseModel):
    bank_id: str
    name: str
    type: str
    description: Optional[str] = None
    min_amount: float
    max_amount: float
    min_duration_months: int
    max_duration_months: int
    average_rate: float
    min_rate: Optional[float] = None
    max_rate: Optional[float] = None
    processing_time_hours: Optional[int] = 72
    required_documents: Optional[Dict[str, Any]] = None
    eligibility_criteria: Optional[Dict[str, Any]] = None
    fees: Optional[Dict[str, Any]] = None
    features: Optional[List[str]] = None
    advantages: Optional[List[str]] = None
    special_conditions: Optional[str] = None
    is_featured: Optional[bool] = False

class DashboardStats(BaseModel):
    total_banks: int
    active_banks: int
    total_insurance_companies: int
    active_insurance_companies: int
    total_credit_products: int
    active_credit_products: int
    total_savings_products: int
    active_savings_products: int
    total_insurance_products: int
    active_insurance_products: int
    total_simulations_today: int
    total_applications_pending: int