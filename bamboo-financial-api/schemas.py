# schemas.py - Schémas Pydantic pour l'API Bamboo Financial
from __future__ import annotations
from pydantic import BaseModel,EmailStr, validator, Field
from typing import Optional, List, Dict, Any, Union
from datetime import datetime, date
from enum import Enum
from decimal import Decimal

# ==================== ENUMS ====================

class CreditType(str, Enum):
    PERSONAL = "personal"
    MORTGAGE = "mortgage"
    AUTO = "auto"
    BUSINESS = "business"
    STUDENT = "student"
    IMMOBILIER = "immobilier"
    CONSOMMATION = "consommation"
    EQUIPEMENT = "equipement"
    PROFESSIONNEL = "professionnel"

class SavingsType(str, Enum):
    CURRENT = "current"
    SAVINGS = "savings"
    TERM_DEPOSIT = "term_deposit"
    RETIREMENT = "retirement"
    LIVRET = "livret"
    TERME = "terme"
    PLAN_EPARGNE = "plan_epargne"

class InsuranceType(str, Enum):
    AUTO = "auto"
    HOME = "home"
    LIFE = "life"
    HEALTH = "health"
    TRAVEL = "travel"
    HABITATION = "habitation"
    VIE = "vie"
    SANTE = "sante"
    VOYAGE = "voyage"
    TRANSPORT = "transport"
    RESPONSABILITE = "responsabilite"

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
    SUPER_ADMIN = "super_admin"
    ADMIN = "admin"
    MANAGER = "manager"
    OPERATOR = "operator"
    MODERATOR = "moderator"
    READONLY = "readonly"

# ==================== SCHÉMAS DE BASE ====================

class BaseSchema(BaseModel):
    class Config:
        from_attributes = True
        json_encoders = {
            datetime: lambda v: v.isoformat() if v else None
        }

# ==================== SCHÉMAS BANQUES ====================

class BankBase(BaseModel):
    name: str
    full_name: Optional[str] = None
    description: Optional[str] = None
    logo_url: Optional[str] = None
    website: Optional[str] = None
    contact_phone: Optional[str] = None
    contact_email: Optional[str] = None
    address: Optional[str] = None
    swift_code: Optional[str] = None
    license_number: Optional[str] = None
    established_year: Optional[int] = None
    total_assets: Optional[float] = None
    rating: Optional[str] = None
    is_active: bool = True

    @validator('logo_url')
    def validate_logo_url(cls, v):
        if v and not v.startswith(('http://', 'https://')):
            # Si l'URL ne commence pas par http/https, on la retourne telle quelle
            # ou on peut choisir de préfixer avec https://
            # return f"https://{v}"  # Option 1: Ajouter https://
            return v  # Option 2: Retourner tel quel (moins strict)
        return v


class BankCreate(BankBase):
    id: str = Field(..., min_length=2, max_length=50)

    @validator('id')
    def validate_id(cls, v):
        if not v.islower():
            raise ValueError('ID doit être en minuscules')
        if not all(c.isalnum() or c in '_-' for c in v):
            raise ValueError('ID ne peut contenir que des lettres, chiffres, tirets et underscores')
        return v

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
    
    # Statistiques calculées (optionnelles)
    credit_products_count: Optional[int] = None
    savings_products_count: Optional[int] = None
    total_simulations: Optional[int] = None
    last_simulation_date: Optional[datetime] = None

class BankListResponse(BaseSchema):
    banks: List[Bank]
    total: int
    skip: int
    limit: int

class BankStats(BaseSchema):
    banks: Dict[str, int]
    products: Dict[str, int]
    simulations: Dict[str, int]
    top_banks: List[Dict[str, Any]]

class BankValidationResponse(BaseSchema):
    available: bool

class BankWithProducts(Bank):
    credit_products: List['CreditProduct'] = []
    savings_products: List['SavingsProduct'] = []

# ==================== SCHÉMAS COMPAGNIES D'ASSURANCE ====================

class InsuranceCompanyCreate(BaseModel):
    id: Optional[str] = None
    name: str
    full_name: Optional[str] = None
    description: Optional[str] = None
    logo_url: Optional[str] = None
    logo_data: Optional[str] = None
    logo_content_type: Optional[str] = None
    website: Optional[str] = None
    contact_phone: Optional[str] = None
    contact_email: Optional[str] = None
    address: Optional[str] = None
    license_number: Optional[str] = None
    established_year: Optional[int] = None
    solvency_ratio: Optional[Decimal] = None
    rating: Optional[str] = None
    specialties: Optional[List[str]] = []
    coverage_areas: Optional[List[str]] = []
    is_active: bool = True

    @validator('specialties', pre=True, always=True)
    def validate_specialties(cls, v):
        if isinstance(v, str):
            import json
            return json.loads(v) if v else []
        return v or []

    @validator('coverage_areas', pre=True, always=True)
    def validate_coverage_areas(cls, v):
        if isinstance(v, str):
            import json
            return json.loads(v) if v else []
        return v or []

class InsuranceCompanyUpdate(BaseModel):
    name: Optional[str] = None
    full_name: Optional[str] = None
    description: Optional[str] = None
    logo_url: Optional[str] = None
    logo_data: Optional[str] = None
    logo_content_type: Optional[str] = None
    website: Optional[str] = None
    contact_phone: Optional[str] = None
    contact_email: Optional[str] = None
    address: Optional[str] = None
    license_number: Optional[str] = None
    established_year: Optional[int] = None
    solvency_ratio: Optional[Decimal] = None
    rating: Optional[str] = None
    specialties: Optional[List[str]] = None
    coverage_areas: Optional[List[str]] = None
    is_active: Optional[bool] = None

class InsuranceProductCreate(BaseModel):
    id: Optional[str] = None
    insurance_company_id: str
    name: str
    type: str
    description: Optional[str] = None
    base_premium: Optional[Decimal] = None
    min_coverage: Optional[Decimal] = None
    max_coverage: Optional[Decimal] = None
    features: Optional[List[str]] = []
    advantages: Optional[List[str]] = []
    exclusions: Optional[List[str]] = []
    is_active: bool = True
    is_featured: bool = False

class InsuranceProductUpdate(BaseModel):
    insurance_company_id: Optional[str] = None
    name: Optional[str] = None
    type: Optional[str] = None
    description: Optional[str] = None
    base_premium: Optional[Decimal] = None
    min_coverage: Optional[Decimal] = None
    max_coverage: Optional[Decimal] = None
    features: Optional[List[str]] = None
    advantages: Optional[List[str]] = None
    exclusions: Optional[List[str]] = None
    is_active: Optional[bool] = None
    is_featured: Optional[bool] = None

# ==================== SCHÉMAS PRODUITS DE CRÉDIT ====================

class CreditProductBase(BaseSchema):
    bank_id: str
    name: str = Field(..., min_length=2, max_length=100)
    type: Union[CreditType, str]
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
    id: Optional[str] = None  # Sera généré automatiquement si non fourni

class CreditProductUpdate(BaseSchema):
    bank_id: Optional[str] = None
    name: Optional[str] = None
    type: Optional[Union[CreditType, str]] = None
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
    type: Union[SavingsType, str]
    description: Optional[str] = None
    interest_rate: float = Field(..., ge=0, le=100)
    minimum_deposit: float = Field(..., ge=0)
    maximum_deposit: Optional[float] = None
    minimum_balance: float = Field(default=0, ge=0)
    liquidity: Union[LiquidityType, str]
    notice_period_days: int = Field(default=0, ge=0, le=365)
    term_months: Optional[int] = Field(None, ge=1, le=600)
    compounding_frequency: Union[CompoundingFrequency, str] = CompoundingFrequency.MONTHLY
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
    id: Optional[str] = None  # Sera généré automatiquement si non fourni

class SavingsProductUpdate(BaseSchema):
    bank_id: Optional[str] = None
    name: Optional[str] = None
    type: Optional[Union[SavingsType, str]] = None
    description: Optional[str] = None
    interest_rate: Optional[float] = None
    minimum_deposit: Optional[float] = None
    maximum_deposit: Optional[float] = None
    minimum_balance: Optional[float] = None
    liquidity: Optional[Union[LiquidityType, str]] = None
    notice_period_days: Optional[int] = None
    term_months: Optional[int] = None
    compounding_frequency: Optional[Union[CompoundingFrequency, str]] = None
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
    type: Union[InsuranceType, str]
    description: Optional[str] = None
    base_premium: float = Field(..., gt=0)
    coverage_details: Optional[Dict[str, Any]] = {}
    deductibles: Optional[Dict[str, Any]] = {}
    age_limits: Optional[Dict[str, Any]] = {}
    exclusions: Optional[List[str]] = []
    features: Optional[List[str]] = []
    advantages: Optional[List[str]] = []
    is_active: bool = True

class InsuranceProductCreate(InsuranceProductBase):
    id: Optional[str] = None  # Sera généré automatiquement si non fourni

class InsuranceProductUpdate(BaseSchema):
    insurance_company_id: Optional[str] = None
    name: Optional[str] = None
    type: Optional[Union[InsuranceType, str]] = None
    description: Optional[str] = None
    base_premium: Optional[float] = None
    coverage_details: Optional[Dict[str, Any]] = None
    deductibles: Optional[Dict[str, Any]] = None
    age_limits: Optional[Dict[str, Any]] = None
    exclusions: Optional[List[str]] = None
    features: Optional[List[str]] = None
    advantages: Optional[List[str]] = None
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
    insurance_type: Union[InsuranceType, str]
    age: int = Field(..., ge=18, le=100)
    risk_factors: Dict[str, Any]
    coverage_amount: Optional[float] = None
    session_id: Optional[str] = None

class InsuranceQuoteResponse(BaseSchema):
    id: str
    insurance_product_id: str
    insurance_type: Union[InsuranceType, str]
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

# schemas.py - Ajouts pour la gestion des admins
from pydantic import BaseModel, EmailStr, Field
from typing import Optional, Dict, Any, List
from datetime import datetime

class AdminUserCreate(BaseModel):
    username: str = Field(..., min_length=3, max_length=50)
    email: EmailStr
    password: str = Field(..., min_length=6)
    first_name: str = Field(..., min_length=1, max_length=100)
    last_name: str = Field(..., min_length=1, max_length=100)
    role: str = Field(..., description="Role: bank_admin, insurance_admin, moderator")
    
    # Assignations
    assigned_bank_id: Optional[str] = None
    assigned_insurance_company_id: Optional[str] = None
    
    # Permissions
    can_create_products: bool = True
    can_edit_products: bool = True
    can_delete_products: bool = False
    can_view_simulations: bool = True
    can_manage_applications: bool = True
    
    is_active: bool = True

class AdminUserUpdate(BaseModel):
    email: Optional[EmailStr] = None
    first_name: Optional[str] = None
    last_name: Optional[str] = None
    password: Optional[str] = Field(None, min_length=6)
    role: Optional[str] = None
    assigned_bank_id: Optional[str] = None
    assigned_insurance_company_id: Optional[str] = None
    can_create_products: Optional[bool] = None
    can_edit_products: Optional[bool] = None
    can_delete_products: Optional[bool] = None
    can_view_simulations: Optional[bool] = None
    can_manage_applications: Optional[bool] = None
    is_active: Optional[bool] = None

class InstitutionInfo(BaseModel):
    id: str
    name: str
    full_name: Optional[str] = None

class AdminUserResponse(BaseModel):
    id: str
    username: str
    email: str
    first_name: Optional[str]
    last_name: Optional[str]
    role: str
    assigned_bank: Optional[InstitutionInfo] = None
    assigned_insurance_company: Optional[InstitutionInfo] = None
    permissions: Dict[str, Any]
    is_active: bool
    last_login: Optional[datetime] = None
    created_at: datetime
    updated_at: datetime

    class Config:
        from_attributes = True

class AdminListResponse(BaseModel):
    admins: List[AdminUserResponse]
    total: int
    skip: int
    limit: int

class AdminStats(BaseModel):
    total_admins: int
    active_admins: int
    inactive_admins: int
    by_role: Dict[str, int]
    recent_admins: int

class InstitutionsResponse(BaseModel):
    banks: List[InstitutionInfo]
    insurance_companies: List[InstitutionInfo]
    total_banks: int
    total_insurance: int

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

# ==================== SCHÉMAS SPÉCIFIQUES ADMIN ====================

class BankProductSummary(BaseSchema):
    id: str
    name: str
    type: str
    rate: Optional[float]
    min_amount: Optional[float]
    max_amount: Optional[float]
    is_active: bool

class BankDetailedResponse(Bank):
    credit_products: List[BankProductSummary] = []
    savings_products: List[BankProductSummary] = []
    recent_simulations: List[Dict[str, Any]] = []
    monthly_stats: Dict[str, int] = {}

# Schémas adaptés pour credit_applications

# Schéma de base pour une demande de crédit
class CreditApplicationCreate(BaseModel):
    # Champs obligatoires
    credit_product_id: str = Field(..., min_length=1, max_length=200)
    applicant_name: str = Field(..., min_length=1, max_length=200)
    requested_amount: float = Field(..., gt=0)
    
    # Champs optionnels avec valeurs par défaut
    applicant_email: Optional[EmailStr] = None
    applicant_phone: Optional[str] = Field(None, max_length=20)
    applicant_address: Optional[str] = None
    birth_date: Optional[date] = None
    nationality: Optional[str] = None
    marital_status: Optional[str] = None
    profession: Optional[str] = None
    employer: Optional[str] = None
    work_address: Optional[str] = None
    employment_type: Optional[str] = None
    employment_duration_months: Optional[int] = None
    monthly_income: Optional[float] = None
    other_income: Optional[float] = None
    purpose: Optional[str] = None
    duration_months: Optional[int] = 60  # Valeur par défaut
    
    # Données d'application stockées en JSONB
    application_data: Optional[Dict[str, Any]] = Field(default_factory=dict)
    
    class Config:
        json_schema_extra = {
            "example": {
                "credit_product_id": "cbao_conso",
                "applicant_name": "Jean Dupont",
                "applicant_email": "jean.dupont@email.com",
                "applicant_phone": "+241 06 12 34 56",
                "requested_amount": 2000000,
                "duration_months": 60,
                "profession": "Ingénieur",
                "employer": "Total Gabon",
                "monthly_income": 750000
            }
        }

# Schéma pour mettre à jour une demande (admin)
class CreditApplicationUpdate(BaseModel):
    status: Optional[str] = Field(None, regex=r'^(pending|under_review|approved|rejected|cancelled|completed)$')
    processing_notes: Optional[str] = None
    assigned_to: Optional[str] = Field(None, max_length=100)
    bank_response: Optional[Dict[str, Any]] = None
    application_data: Optional[Dict[str, Any]] = None

    @validator('bank_response')
    def validate_bank_response(cls, v):
        """Valide la réponse de la banque"""
        if v is None:
            return v
            
        # Structure suggérée pour bank_response
        if 'decision' in v:
            valid_decisions = ['approved', 'rejected', 'conditional']
            if v['decision'] not in valid_decisions:
                raise ValueError(f'decision must be one of: {valid_decisions}')
                
        if 'approved_amount' in v and v['approved_amount'] is not None:
            if not isinstance(v['approved_amount'], (int, float)) or v['approved_amount'] <= 0:
                raise ValueError('approved_amount must be a positive number')
                
        return v

    class Config:
        json_schema_extra = {
            "example": {
                "status": "approved",
                "processing_notes": "Dossier complet et validé",
                "assigned_to": "agent_001",
                "bank_response": {
                    "decision": "approved",
                    "approved_amount": 1850000,
                    "approved_rate": 8.5,
                    "approved_duration": 48,
                    "conditions": ["Assurance obligatoire", "Domiciliation des revenus"],
                    "expiry_date": "2024-12-31T23:59:59Z",
                    "contact_person": "M. MBADINGA",
                    "contact_phone": "+241 01 23 45 67"
                }
            }
        }

# Schéma de réponse pour une demande de crédit
class CreditApplicationResponse(BaseModel):
    id: str
    credit_product_id: str
    applicant_name: str
    applicant_email: Optional[str] = None
    applicant_phone: Optional[str] = None
    applicant_address: Optional[str] = None
    birth_date: Optional[date] = None
    marital_status: Optional[str] = None
    profession: Optional[str] = None
    employer: Optional[str] = None
    employment_type: Optional[str] = None
    employment_duration_months: Optional[int] = None
    monthly_income: Optional[float] = None
    other_income: Optional[float] = None
    requested_amount: float
    duration_months: Optional[int] = None
    purpose: Optional[str] = None
    status: str = "pending"
    application_data: Optional[Dict[str, Any]] = None
    bank_response: Optional[Dict[str, Any]] = None
    processing_notes: Optional[str] = None
    assigned_to: Optional[str] = None
    submitted_at: datetime
    updated_at: Optional[datetime] = None
    
    class Config:
        from_attributes = True
        json_encoders = {
            datetime: lambda v: v.isoformat() if v else None
        }

# Schéma pour la notification de réception
class ApplicationNotification(BaseModel):
    success: bool
    application_id: str
    application_number: str
    message: str
    next_steps: List[str]
    expected_processing_time: str
    contact_info: Dict[str, str]

    class Config:
        json_schema_extra = {
            "example": {
                "success": True,
                "application_id": "app_123456",
                "application_number": "DEM-20241215-ABC123",
                "message": "Votre demande de crédit a été reçue avec succès !",
                "next_steps": [
                    "Vous recevrez un email de confirmation dans les 24h",
                    "Un conseiller vous contactera sous 48h",
                    "Préparez vos documents justificatifs",
                    "Suivez l'évolution avec votre numéro de dossier"
                ],
                "expected_processing_time": "48h",
                "contact_info": {
                    "bank_name": "CBAO Gabon",
                    "phone": "+241 01 72 35 00",
                    "email": "info@cbao.ga",
                    "application_number": "DEM-20241215-ABC123"
                }
            }
        }

# Schéma pour le statut d'une demande
class ApplicationStatus(BaseModel):
    application_id: str
    status: str
    status_message: str
    submitted_at: datetime
    updated_at: Optional[datetime] = None
    processing_notes: Optional[str] = None
    
    class Config:
        json_schema_extra = {
            "example": {
                "application_id": "app_123456",
                "status": "under_review",
                "status_message": "En cours d'examen",
                "submitted_at": "2024-12-15T10:30:00Z",
                "updated_at": "2024-12-16T14:15:00Z",
                "processing_notes": "Documents reçus, analyse en cours"
            }
        }

# Schéma pour la réponse paginée
class PaginatedResponse(BaseModel):
    items: List[Any]
    total: int
    page: int
    per_page: int
    pages: int
    has_next: bool
    has_prev: bool

# Schéma pour les statistiques des demandes
class CreditApplicationStats(BaseModel):
    total_applications: int
    status_breakdown: Dict[str, int]
    monthly_trends: Dict[str, int]
    average_processing_time_days: Optional[float] = None
    approval_rate: Optional[float] = None
    top_products: List[Dict[str, Any]]
    recent_activities: List[Dict[str, Any]]

# Schéma pour les actions spécifiques
class CreditApplicationStatusUpdate(BaseModel):
    """Mise à jour du statut uniquement"""
    status: str = Field(..., regex=r'^(pending|under_review|approved|rejected|cancelled|completed)$')
    processing_notes: Optional[str] = None

class CreditApplicationAssignment(BaseModel):
    """Assignation à un agent"""
    assigned_to: str = Field(..., min_length=1, max_length=100)
    notes: Optional[str] = None

# ==================== MISE À JOUR DES RÉFÉRENCES CIRCULAIRES ====================

# Pour Pydantic v2, on utilise model_rebuild() pour résoudre les références circulaires
try:
    # Mise à jour des modèles avec des références circulaires
    if hasattr(BankWithProducts, 'model_rebuild'):
        BankWithProducts.model_rebuild()
    if hasattr(CreditProduct, 'model_rebuild'):
        CreditProduct.model_rebuild()
    if hasattr(SavingsProduct, 'model_rebuild'):
        SavingsProduct.model_rebuild()
    if hasattr(InsuranceProduct, 'model_rebuild'):
        InsuranceProduct.model_rebuild()
    if hasattr(CreditSimulationResponse, 'model_rebuild'):
        CreditSimulationResponse.model_rebuild()
    if hasattr(SavingsSimulationResponse, 'model_rebuild'):
        SavingsSimulationResponse.model_rebuild()
    if hasattr(AdminLoginResponse, 'model_rebuild'):
        AdminLoginResponse.model_rebuild()
    if hasattr(BankDetailedResponse, 'model_rebuild'):
        BankDetailedResponse.model_rebuild()
except (AttributeError, NameError):
    # Fallback pour les versions de Pydantic qui ne supportent pas model_rebuild
    pass

# Export de tous les schémas
__all__ = [
    # Enums
    "CreditType", "SavingsType", "InsuranceType", "LiquidityType", 
    "CompoundingFrequency", "UserRole",
    
    # Banques
    "BankBase", "BankCreate", "BankUpdate", "Bank", "BankWithProducts",
    "BankListResponse", "BankStats", "BankValidationResponse", "BankDetailedResponse",
    "BankProductSummary",
    
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