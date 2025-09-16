# schemas.py - Schémas Pydantic pour l'API Bamboo Financial
from pydantic import BaseModel, validator, Field
from typing import Optional, List, Dict, Any
from datetime import datetime
from enum import Enum

# ==================== ENUMS ====================

class CreditType(str, Enum):
    PERSONAL = "personal"
    MORTGAGE = "mortgage"
    AUTO = "auto"
    BUSINESS = "business"
    STUDENT = "student"

class SavingsType(str, Enum):
    CURRENT = "current"
    SAVINGS = "savings"
    TERM_DEPOSIT = "term_deposit"
    RETIREMENT = "retirement"

class InsuranceType(str, Enum):
    AUTO = "auto"
    HOME = "home"
    LIFE = "life"
    HEALTH = "health"
    TRAVEL = "travel"

class LiquidityType(str, Enum):
    IMMEDIATE = "immediate"
    NOTICE = "notice"
    TERM = "term"

class CompoundingFrequency(str, Enum):
    DAILY = "daily"
    WEEKLY = "weekly"
    MONTHLY = "monthly"
    QUARTERLY = "quarterly"
    ANNUALLY = "annually"

class UserRole(str, Enum):
    ADMIN = "admin"
    MANAGER = "manager"
    OPERATOR = "operator"

# ==================== SCHÉMAS DE BASE ====================

class BaseSchema(BaseModel):
    class Config:
        from_attributes = True
        json_encoders = {
            datetime: lambda v: v.isoformat()
        }

# ==================== SCHÉMAS BANQUES ====================

class BankBase(BaseSchema):
    name: str = Field(..., min_length=2, max_length=100)
    full_name: Optional[str] = None
    logo_url: Optional[str] = None
    description: Optional[str] = None
    contact_phone: Optional[str] = None
    contact_email: Optional[str] = None
    website: Optional[str] = None
    address: Optional[str] = None
    swift_code: Optional[str] = None
    license_number: Optional[str] = None
    established_year: Optional[int] = None
    total_assets: Optional[float] = None
    rating: Optional[str] = None
    is_active: bool = True

class BankCreate(BankBase):
    pass

class BankUpdate(BaseSchema):
    name: Optional[str] = None
    full_name: Optional[str] = None
    logo_url: Optional[str] = None
    description: Optional[str] = None
    contact_phone: Optional[str] = None
    contact_email: Optional[str] = None
    website: Optional[str] = None
    address: Optional[str] = None
    swift_code: Optional[str] = None
    license_number: Optional[str] = None
    established_year: Optional[int] = None
    total_assets: Optional[float] = None
    rating: Optional[str] = None
    is_active: Optional[bool] = None

class Bank(BankBase):
    id: str
    created_at: datetime
    updated_at: datetime

class BankWithProducts(Bank):
    credit_products: List['CreditProduct'] = []
    savings_products: List['SavingsProduct'] = []

# ==================== SCHÉMAS COMPAGNIES D'ASSURANCE ====================

class InsuranceCompanyBase(BaseSchema):
    name: str = Field(..., min_length=2, max_length=100)
    full_name: Optional[str] = None
    description: Optional[str] = None
    logo_url: Optional[str] = None
    website: Optional[str] = None
    contact_phone: Optional[str] = None
    contact_email: Optional[str] = None
    address: Optional[str] = None
    license_number: Optional[str] = None
    established_year: Optional[int] = None
    solvency_ratio: Optional[float] = None
    rating: Optional[str] = None
    specialties: Optional[List[str]] = []
    coverage_areas: Optional[List[str]] = []
    is_active: bool = True

class InsuranceCompanyCreate(InsuranceCompanyBase):
    pass

class InsuranceCompanyUpdate(BaseSchema):
    name: Optional[str] = None
    full_name: Optional[str] = None
    description: Optional[str] = None
    logo_url: Optional[str] = None
    website: Optional[str] = None
    contact_phone: Optional[str] = None
    contact_email: Optional[str] = None
    address: Optional[str] = None
    license_number: Optional[str] = None
    established_year: Optional[int] = None
    solvency_ratio: Optional[float] = None
    rating: Optional[str] = None
    specialties: Optional[List[str]] = None
    coverage_areas: Optional[List[str]] = None
    is_active: Optional[bool] = None

class InsuranceCompany(InsuranceCompanyBase):
    id: str
    created_at: datetime
    updated_at: datetime

# ==================== SCHÉMAS PRODUITS DE CRÉDIT ====================

class CreditProductBase(BaseSchema):
    bank_id: str
    name: str = Field(..., min_length=2, max_length=100)
    type: str
    description: Optional[str] = None
    min_amount: float = Field(..., gt=0)
    max_amount: float = Field(..., gt=0)
    min_duration_months: int = Field(..., gt=0, le=600)
    max_duration_months: int = Field(..., gt=0, le=600)
    min_rate: float = Field(..., ge=0, le=100)
    max_rate: float = Field(..., ge=0, le=100)
    average_rate: float = Field(..., ge=0, le=100)
    processing_time_hours: int = Field(default=72, ge=1, le=8760)
    required_documents: Optional[Dict[str, Any]] = {}
    eligibility_criteria: Optional[Dict[str, Any]] = {}
    fees: Optional[Dict[str, Any]] = {}
    features: Optional[List[str]] = []
    advantages: Optional[List[str]] = []
    special_conditions: Optional[str] = None
    is_featured: bool = False
    is_active: bool = True

    @validator('max_amount')
    def validate_max_amount(cls, v, values):
        if 'min_amount' in values and v <= values['min_amount']:
            raise ValueError('max_amount must be greater than min_amount')
        return v

    @validator('max_duration_months')
    def validate_max_duration(cls, v, values):
        if 'min_duration_months' in values and v <= values['min_duration_months']:
            raise ValueError('max_duration_months must be greater than min_duration_months')
        return v

    @validator('max_rate')
    def validate_max_rate(cls, v, values):
        if 'min_rate' in values and v < values['min_rate']:
            raise ValueError('max_rate must be greater than or equal to min_rate')
        return v

    @validator('average_rate')
    def validate_average_rate(cls, v, values):
        if 'min_rate' in values and 'max_rate' in values:
            if v < values['min_rate'] or v > values['max_rate']:
                raise ValueError('average_rate must be between min_rate and max_rate')
        return v

class CreditProductCreate(CreditProductBase):
    pass

class CreditProductUpdate(BaseSchema):
    bank_id: Optional[str] = None
    name: Optional[str] = None
    type: Optional[str] = None
    description: Optional[str] = None
    min_amount: Optional[float] = None
    max_amount: Optional[float] = None
    min_duration_months: Optional[int] = None
    max_duration_months: Optional[int] = None
    min_rate: Optional[float] = None
    max_rate: Optional[float] = None
    average_rate: Optional[float] = None
    processing_time_hours: Optional[int] = None
    required_documents: Optional[Dict[str, Any]] = None
    eligibility_criteria: Optional[Dict[str, Any]] = None
    fees: Optional[Dict[str, Any]] = None
    features: Optional[List[str]] = None
    advantages: Optional[List[str]] = None
    special_conditions: Optional[str] = None
    is_featured: Optional[bool] = None
    is_active: Optional[bool] = None

class CreditProduct(CreditProductBase):
    id: str
    created_at: datetime
    updated_at: datetime
    bank: Optional[Bank] = None

# ==================== SCHÉMAS PRODUITS D'ÉPARGNE ====================

class SavingsProductBase(BaseSchema):
    bank_id: str
    name: str = Field(..., min_length=2, max_length=100)
    type: str
    description: Optional[str] = None
    interest_rate: float = Field(..., ge=0, le=100)
    minimum_deposit: float = Field(..., ge=0)
    maximum_deposit: Optional[float] = None
    minimum_balance: float = Field(default=0, ge=0)
    liquidity: str
    notice_period_days: int = Field(default=0, ge=0, le=365)
    term_months: Optional[int] = Field(None, ge=1, le=600)
    compounding_frequency: str = "monthly"
    fees: Optional[Dict[str, Any]] = {}
    features: Optional[List[str]] = []
    advantages: Optional[List[str]] = []
    tax_benefits: Optional[List[str]] = []
    risk_level: int = Field(default=1, ge=1, le=5)
    early_withdrawal_penalty: Optional[float] = Field(None, ge=0, le=100)
    is_islamic_compliant: bool = False
    is_featured: bool = False
    is_active: bool = True

    @validator('maximum_deposit')
    def validate_maximum_deposit(cls, v, values):
        if v is not None and 'minimum_deposit' in values and v <= values['minimum_deposit']:
            raise ValueError('maximum_deposit must be greater than minimum_deposit')
        return v

class SavingsProductCreate(SavingsProductBase):
    pass

class SavingsProductUpdate(BaseSchema):
    bank_id: Optional[str] = None
    name: Optional[str] = None
    type: Optional[str] = None
    description: Optional[str] = None
    interest_rate: Optional[float] = None
    minimum_deposit: Optional[float] = None
    maximum_deposit: Optional[float] = None
    minimum_balance: Optional[float] = None
    liquidity: Optional[str] = None
    notice_period_days: Optional[int] = None
    term_months: Optional[int] = None
    compounding_frequency: Optional[str] = None
    fees: Optional[Dict[str, Any]] = None
    features: Optional[List[str]] = None
    advantages: Optional[List[str]] = None
    tax_benefits: Optional[List[str]] = None
    risk_level: Optional[int] = None
    early_withdrawal_penalty: Optional[float] = None
    is_islamic_compliant: Optional[bool] = None
    is_featured: Optional[bool] = None
    is_active: Optional[bool] = None

class SavingsProduct(SavingsProductBase):
    id: str
    created_at: datetime
    updated_at: datetime
    bank: Optional[Bank] = None

# ==================== SCHÉMAS PRODUITS D'ASSURANCE ====================

class InsuranceProductBase(BaseSchema):
    insurance_company_id: str
    name: str = Field(..., min_length=2, max_length=100)
    type: str
    description: Optional[str] = None
    base_premium: float = Field(..., gt=0)
    coverage_details: Optional[Dict[str, Any]] = {}
    deductibles: Optional[Dict[str, Any]] = {}
    age_limits: Optional[Dict[str, Any]] = {}
    exclusions: Optional[List[str]] = []
    features: Optional[List[str]] = []
    is_active: bool = True

class InsuranceProductCreate(InsuranceProductBase):
    pass

class InsuranceProductUpdate(BaseSchema):
    insurance_company_id: Optional[str] = None
    name: Optional[str] = None
    type: Optional[str] = None
    description: Optional[str] = None
    base_premium: Optional[float] = None
    coverage_details: Optional[Dict[str, Any]] = None
    deductibles: Optional[Dict[str, Any]] = None
    age_limits: Optional[Dict[str, Any]] = None
    exclusions: Optional[List[str]] = None
    features: Optional[List[str]] = None
    is_active: Optional[bool] = None

class InsuranceProduct(InsuranceProductBase):
    id: str
    created_at: datetime
    updated_at: datetime
    insurance_company: Optional[InsuranceCompany] = None

# ==================== SCHÉMAS DE SIMULATION DE CRÉDIT ====================

class CreditSimulationRequest(BaseSchema):
    credit_product_id: str
    requested_amount: float = Field(..., gt=0)
    duration_months: int = Field(..., gt=0, le=600)
    monthly_income: float = Field(..., gt=0)
    current_debts: float = Field(default=0, ge=0)
    down_payment: float = Field(default=0, ge=0)
    user_id: Optional[str] = None
    session_id: Optional[str] = None

class AmortizationEntry(BaseSchema):
    month: int
    payment: float
    principal: float
    interest: float
    remaining_balance: float

class CreditSimulationResponse(BaseSchema):
    id: str
    credit_product_id: str
    requested_amount: float
    duration_months: int
    monthly_income: float
    current_debts: float
    down_payment: float
    applied_rate: float
    monthly_payment: float
    total_interest: float
    total_cost: float
    debt_ratio: float
    eligible: bool
    risk_score: Optional[int]
    recommendations: List[str]
    amortization_schedule: Optional[List[AmortizationEntry]] = []
    created_at: datetime
    credit_product: Optional[CreditProduct] = None

class CreditSimulation(CreditSimulationResponse):
    user_id: Optional[str] = None
    session_id: Optional[str] = None
    client_ip: Optional[str] = None
    user_agent: Optional[str] = None

# ==================== SCHÉMAS DE SIMULATION D'ÉPARGNE ====================

class SavingsSimulationRequest(BaseSchema):
    savings_product_id: str
    initial_amount: float = Field(..., ge=0)
    monthly_contribution: float = Field(..., ge=0)
    duration_months: int = Field(..., gt=0, le=600)
    user_id: Optional[str] = None
    session_id: Optional[str] = None

class MonthlyBreakdownEntry(BaseSchema):
    month: int
    contribution: float
    interest: float
    balance: float

class SavingsSimulationResponse(BaseSchema):
    id: str
    savings_product_id: str
    initial_amount: float
    monthly_contribution: float
    duration_months: int
    final_amount: float
    total_contributions: float
    total_interest: float
    effective_rate: Optional[float]
    monthly_breakdown: Optional[List[MonthlyBreakdownEntry]] = []
    recommendations: List[str]
    created_at: datetime
    savings_product: Optional[SavingsProduct] = None

class SavingsSimulation(SavingsSimulationResponse):
    user_id: Optional[str] = None
    session_id: Optional[str] = None
    client_ip: Optional[str] = None
    user_agent: Optional[str] = None

# ==================== SCHÉMAS DEVIS D'ASSURANCE ====================

class InsuranceQuoteRequest(BaseSchema):
    insurance_product_id: str
    insurance_type: str
    age: int = Field(..., ge=18, le=100)
    risk_factors: Dict[str, Any]
    coverage_amount: Optional[float] = None
    session_id: Optional[str] = None

class InsuranceQuoteResponse(BaseSchema):
    id: str
    insurance_product_id: str
    insurance_type: str
    age: int
    risk_factors: Dict[str, Any]
    coverage_amount: Optional[float]
    monthly_premium: float
    annual_premium: float
    deductible: Optional[float]
    coverage_details: Dict[str, Any]
    exclusions: List[str]
    valid_until: Optional[datetime]
    created_at: datetime

class InsuranceQuote(InsuranceQuoteResponse):
    session_id: Optional[str] = None
    client_ip: Optional[str] = None
    user_agent: Optional[str] = None

# ==================== SCHÉMAS D'AUTHENTIFICATION ADMIN ====================

class AdminLogin(BaseSchema):
    username: str = Field(..., min_length=3, max_length=50)
    password: str = Field(..., min_length=6)

class AdminLoginResponse(BaseSchema):
    access_token: str
    token_type: str = "bearer"
    expires_in: int
    admin_user: 'AdminUserInfo'

class AdminUserBase(BaseSchema):
    username: str = Field(..., min_length=3, max_length=50)
    email: str = Field(..., max_length=100)
    first_name: Optional[str] = None
    last_name: Optional[str] = None
    role: str
    permissions: Optional[Dict[str, Any]] = {}
    is_active: bool = True

class AdminUserCreate(AdminUserBase):
    password: str = Field(..., min_length=8)

class AdminUserUpdate(BaseSchema):
    username: Optional[str] = None
    email: Optional[str] = None
    first_name: Optional[str] = None
    last_name: Optional[str] = None
    role: Optional[str] = None
    permissions: Optional[Dict[str, Any]] = None
    is_active: Optional[bool] = None
    password: Optional[str] = None

class AdminUserInfo(BaseSchema):
    id: str
    username: str
    email: str
    first_name: Optional[str]
    last_name: Optional[str]
    role: str
    permissions: Dict[str, Any]
    is_active: bool
    last_login: Optional[datetime]
    created_at: datetime

class AdminUser(AdminUserInfo):
    created_by: Optional[str]
    updated_at: datetime

# ==================== SCHÉMAS DE TABLEAU DE BORD ====================

class DashboardStats(BaseSchema):
    total_banks: int
    total_credit_products: int
    total_savings_products: int
    total_insurance_products: int
    total_credit_simulations: int
    total_savings_simulations: int
    total_insurance_quotes: int
    active_admin_users: int
    recent_simulations: int
    popular_products: List[Dict[str, Any]]

class RecentActivity(BaseSchema):
    id: str
    action: str
    entity_type: str
    entity_id: Optional[str]
    admin_user_id: str
    created_at: datetime
    details: Optional[Dict[str, Any]]

# ==================== SCHÉMAS D'AUDIT ====================

class AuditLogBase(BaseSchema):
    admin_user_id: str
    action: str = Field(..., min_length=1, max_length=100)
    entity_type: str = Field(..., min_length=1, max_length=50)
    entity_id: Optional[str] = None
    old_values: Optional[Dict[str, Any]] = {}
    new_values: Optional[Dict[str, Any]] = {}

class AuditLogCreate(AuditLogBase):
    pass

class AuditLog(AuditLogBase):
    id: str
    ip_address: Optional[str]
    user_agent: Optional[str]
    created_at: datetime

# ==================== SCHÉMAS DE RÉPONSE GÉNÉRIQUES ====================

class Message(BaseSchema):
    message: str
    status: str = "success"
    timestamp: datetime = Field(default_factory=datetime.utcnow)

class ErrorResponse(BaseSchema):
    error: bool = True
    message: str
    status_code: int
    timestamp: datetime = Field(default_factory=datetime.utcnow)
    details: Optional[Dict[str, Any]] = None

class PaginatedResponse(BaseSchema):
    items: List[Any]
    total: int
    page: int
    per_page: int
    pages: int
    has_next: bool
    has_prev: bool

class SearchResponse(BaseSchema):
    query: str
    results: Dict[str, List[Any]]
    total_found: int
    search_time_ms: Optional[float] = None

class HealthCheck(BaseSchema):
    status: str
    timestamp: datetime
    database: str
    version: str
    cors: str
    admin_panel: str
    authentication: str

# ==================== MISE À JOUR DES RÉFÉRENCES CIRCULAIRES ====================

# Mise à jour des modèles avec des références circulaires
BankWithProducts.model_rebuild()
CreditProduct.model_rebuild()
SavingsProduct.model_rebuild()
InsuranceProduct.model_rebuild()
CreditSimulationResponse.model_rebuild()
SavingsSimulationResponse.model_rebuild()
AdminLoginResponse.model_rebuild()

# Export de tous les schémas
__all__ = [
    # Enums
    "CreditType", "SavingsType", "InsuranceType", "LiquidityType", 
    "CompoundingFrequency", "UserRole",
    
    # Banques
    "BankBase", "BankCreate", "BankUpdate", "Bank", "BankWithProducts",
    
    # Compagnies d'assurance
    "InsuranceCompanyBase", "InsuranceCompanyCreate", "InsuranceCompanyUpdate", "InsuranceCompany",
    
    # Produits de crédit
    "CreditProductBase", "CreditProductCreate", "CreditProductUpdate", "CreditProduct",
    
    # Produits d'épargne
    "SavingsProductBase", "SavingsProductCreate", "SavingsProductUpdate", "SavingsProduct",
    
    # Produits d'assurance
    "InsuranceProductBase", "InsuranceProductCreate", "InsuranceProductUpdate", "InsuranceProduct",
    
    # Simulations de crédit
    "CreditSimulationRequest", "CreditSimulationResponse", "CreditSimulation", "AmortizationEntry",
    
    # Simulations d'épargne
    "SavingsSimulationRequest", "SavingsSimulationResponse", "SavingsSimulation", "MonthlyBreakdownEntry",
    
    # Devis d'assurance
    "InsuranceQuoteRequest", "InsuranceQuoteResponse", "InsuranceQuote",
    
    # Authentification admin
    "AdminLogin", "AdminLoginResponse", "AdminUserBase", "AdminUserCreate", 
    "AdminUserUpdate", "AdminUserInfo", "AdminUser",
    
    # Tableau de bord
    "DashboardStats", "RecentActivity",
    
    # Audit
    "AuditLogBase", "AuditLogCreate", "AuditLog",
    
    # Réponses génériques
    "Message", "ErrorResponse", "PaginatedResponse", "SearchResponse", "HealthCheck"
]