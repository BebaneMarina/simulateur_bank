# user_auth_schemas.py - Schémas Pydantic corrigés pour l'authentification utilisateur

from pydantic import BaseModel, EmailStr, validator, Field
from typing import Optional, Dict, Any, List, Literal
from datetime import datetime, date
from enum import Enum
import re  # AJOUT MANQUANT

# ==================== ENUMS ====================

class RegistrationMethod(str, Enum):
    EMAIL = "email"
    PHONE = "phone"

class Gender(str, Enum):
    MALE = "male"
    FEMALE = "female"
    OTHER = "other"

class ApplicationStatus(str, Enum):
    PENDING = "pending"
    UNDER_REVIEW = "under_review"
    APPROVED = "approved"
    REJECTED = "rejected"
    ON_HOLD = "on_hold"
    COMPLETED = "completed"
    ACTIVE = "active"
    OPENED = "opened"
    MEDICAL_EXAM_REQUIRED = "medical_exam_required"

class NotificationPriority(str, Enum):
    LOW = "low"
    NORMAL = "normal"
    HIGH = "high"
    URGENT = "urgent"

# ==================== AUTHENTIFICATION ====================

class UserRegistrationRequest(BaseModel):
    # Changement: utiliser str au lieu de Literal pour plus de flexibilité
    registration_method: str = Field(..., regex="^(email|phone)$")
    email: Optional[str] = None  # Changement: EmailStr peut être trop strict
    phone: Optional[str] = None
    first_name: str = Field(..., min_length=1, max_length=100)
    last_name: str = Field(..., min_length=1, max_length=100)
    password: Optional[str] = Field(None, min_length=6)
    date_of_birth: Optional[str] = None  # Changement: str au lieu de date pour flexibilité
    gender: Optional[str] = None  # Changement: str au lieu de Literal
    profession: Optional[str] = None
    monthly_income: Optional[float] = Field(None, ge=0)
    city: Optional[str] = None
    address: Optional[str] = None
    preferences: Optional[Dict[str, Any]] = None
    
    @validator('email')
    def email_required_if_email_method(cls, v, values):
        registration_method = values.get('registration_method')
        if registration_method == 'email' and not v:
            raise ValueError('Email requis pour inscription par email')
        # Validation email basique si fourni
        if v and '@' not in v:
            raise ValueError('Format email invalide')
        return v
    
    @validator('phone')  
    def phone_required_if_phone_method(cls, v, values):
        registration_method = values.get('registration_method')
        if registration_method == 'phone' and not v:
            raise ValueError('Téléphone requis pour inscription par SMS')
        if v:
            # Format gabonais simple
            try:
                cleaned = re.sub(r'[^\d+]', '', v)
                if not cleaned.startswith('+241'):
                    if cleaned.startswith('241'):
                        v = '+' + cleaned
                    elif len(cleaned) == 8:
                        v = '+241' + cleaned
            except Exception:
                pass  # Si erreur de formatage, on garde la valeur originale
        return v
    
    @validator('password')
    def validate_password(cls, v, values):
        registration_method = values.get('registration_method')
        # Mot de passe obligatoire pour inscription email
        if registration_method == 'email' and not v:
            raise ValueError('Mot de passe requis pour inscription par email')
        return v

class UserLoginRequest(BaseModel):
    # L'utilisateur peut se connecter avec email ou téléphone
    email: Optional[str] = None  # Changement: str au lieu d'EmailStr
    phone: Optional[str] = None
    password: str = Field(..., min_length=1)
    remember_me: bool = False
    device_info: Optional[Dict[str, Any]] = {}
    
    @validator('phone')
    def validate_phone(cls, v):
        if v and not v.startswith('+241'):
            try:
                if v.startswith('241'):
                    v = '+' + v
                elif v.startswith('0'):
                    v = '+241' + v[1:]
                else:
                    v = '+241' + v
            except Exception:
                pass
        return v
    
    @validator('password')
    def validate_login_data(cls, v, values):
        if not values.get('email') and not values.get('phone'):
            raise ValueError('Email ou téléphone requis pour la connexion')
        return v

class VerificationRequest(BaseModel):
    email: Optional[str] = None  # Changement: str au lieu d'EmailStr
    phone: Optional[str] = None
    code: str = Field(..., min_length=4, max_length=10)

class ResendVerificationRequest(BaseModel):
    email: Optional[str] = None  # Changement: str au lieu d'EmailStr
    phone: Optional[str] = None

class PasswordResetRequest(BaseModel):
    email: Optional[str] = None  # Changement: str au lieu d'EmailStr
    phone: Optional[str] = None

class PasswordResetConfirm(BaseModel):
    email: Optional[str] = None  # Changement: str au lieu d'EmailStr
    phone: Optional[str] = None
    code: str = Field(..., min_length=4, max_length=10)
    new_password: str = Field(..., min_length=8)

# ==================== RÉPONSES ====================

class UserResponse(BaseModel):
    id: str
    email: Optional[str] = None
    phone: Optional[str] = None
    first_name: str
    last_name: str
    date_of_birth: Optional[date] = None
    gender: Optional[str] = None
    profession: Optional[str] = None
    monthly_income: Optional[float] = None
    city: Optional[str] = None
    address: Optional[str] = None
    registration_method: str
    email_verified: bool
    phone_verified: bool
    is_active: bool
    last_login: Optional[datetime] = None
    created_at: datetime
    preferences: Dict[str, Any] = {}

class LoginResponse(BaseModel):
    success: bool
    user: UserResponse
    token: str
    refresh_token: Optional[str] = None
    expires_in: int
    message: Optional[str] = None

class RegistrationResponse(BaseModel):
    success: bool
    user: UserResponse
    verification_required: bool
    verification_method: Optional[str] = None
    message: str

# ==================== PROFIL UTILISATEUR ====================

class UserProfileUpdate(BaseModel):
    first_name: Optional[str] = Field(None, min_length=2, max_length=100)
    last_name: Optional[str] = Field(None, min_length=2, max_length=100)
    date_of_birth: Optional[str] = None  # Changement: str au lieu de date
    gender: Optional[str] = None  # Changement: str au lieu de Gender enum
    profession: Optional[str] = None
    monthly_income: Optional[float] = Field(None, ge=0)
    city: Optional[str] = None
    address: Optional[str] = None
    preferences: Optional[Dict[str, Any]] = None

class ChangePasswordRequest(BaseModel):
    current_password: str
    new_password: str = Field(..., min_length=8)

class AddContactMethodRequest(BaseModel):
    email: Optional[str] = None  # Changement: str au lieu d'EmailStr
    phone: Optional[str] = None
    password: str  # Confirmation avec mot de passe

# ==================== SIMULATIONS ET APPLICATIONS ====================

class SaveSimulationRequest(BaseModel):
    simulation_id: str
    simulation_type: str = Field(..., regex="^(credit|savings|insurance)$")
    name: str = Field(..., min_length=1, max_length=200)

class CreditApplicationRequest(BaseModel):
    credit_product_id: str
    simulation_id: Optional[str] = None
    requested_amount: float = Field(..., gt=0)
    duration_months: int = Field(..., gt=0)
    purpose: str = Field(..., min_length=10)
    
    # Informations financières
    monthly_income: float = Field(..., gt=0)
    current_debts: float = Field(0, ge=0)
    down_payment: float = Field(0, ge=0)
    
    # Informations emploi
    employment_type: Optional[str] = None
    employer_name: Optional[str] = None
    employment_duration_months: Optional[int] = Field(None, ge=0)
    
    # Documents (IDs des fichiers uploadés)
    document_ids: List[str] = []

class SavingsApplicationRequest(BaseModel):
    savings_product_id: str 
    simulation_id: Optional[str] = None
    initial_deposit: float = Field(..., gt=0)
    monthly_contribution: Optional[float] = Field(None, ge=0)
    savings_goal: Optional[str] = None
    target_amount: Optional[float] = Field(None, gt=0)
    target_date: Optional[str] = None  # Changement: str au lieu de date
    document_ids: List[str] = []

class InsuranceApplicationRequest(BaseModel):
    insurance_product_id: str
    quote_id: Optional[str] = None
    insurance_type: str
    coverage_amount: Optional[float] = Field(None, gt=0)
    
    # Bénéficiaires
    beneficiaries: List[Dict[str, Any]] = []
    
    # Informations spécifiques selon le type
    vehicle_info: Optional[Dict[str, Any]] = None
    property_info: Optional[Dict[str, Any]] = None
    health_info: Optional[Dict[str, Any]] = None
    travel_info: Optional[Dict[str, Any]] = None
    business_info: Optional[Dict[str, Any]] = None
    
    document_ids: List[str] = []

# ==================== NOTIFICATIONS ====================

class NotificationResponse(BaseModel):
    id: str
    type: str
    title: str
    message: str
    related_entity_type: Optional[str] = None
    related_entity_id: Optional[str] = None
    is_read: bool
    priority: str
    created_at: datetime

class MarkNotificationReadRequest(BaseModel):
    notification_ids: List[str]

# ==================== DASHBOARD UTILISATEUR ====================

class UserStatsResponse(BaseModel):
    total_credit_simulations: int
    total_savings_simulations: int
    total_insurance_quotes: int
    total_credit_applications: int
    total_savings_applications: int
    total_insurance_applications: int
    unread_notifications: int

class ApplicationSummary(BaseModel):
    id: str
    type: str = Field(..., regex="^(credit|savings|insurance)$")
    product_name: str
    bank_or_company_name: str
    amount: Optional[float] = None
    status: str
    submitted_at: datetime
    updated_at: datetime

class SimulationSummary(BaseModel):
    id: str
    type: str = Field(..., regex="^(credit|savings|insurance)$")
    product_name: str
    bank_or_company_name: str
    name: Optional[str] = None
    saved: bool
    created_at: datetime
    # Résultats principaux selon le type
    result_summary: Dict[str, Any]

class UserDashboardResponse(BaseModel):
    user: UserResponse
    stats: UserStatsResponse
    recent_simulations: List[SimulationSummary]
    recent_applications: List[ApplicationSummary]
    notifications: List[NotificationResponse]

# ==================== DOCUMENTS ====================

class DocumentUploadResponse(BaseModel):
    document_id: str
    filename: str
    file_type: str
    file_size: int
    upload_url: Optional[str] = None  # URL pour upload direct si utilisé
    message: str

class DocumentInfo(BaseModel):
    id: str
    filename: str
    file_type: str
    file_size: int
    uploaded_at: datetime
    application_type: Optional[str] = None
    application_id: Optional[str] = None