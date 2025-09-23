# models.py - Modèles mis à jour avec InsuranceApplication
from sqlalchemy import Column, String, Boolean, DateTime, Integer, DECIMAL, Text, ForeignKey, JSON, event, Numeric
from sqlalchemy.orm import relationship, configure_mappers
from sqlalchemy.sql import func
from database import Base
from datetime import datetime
import uuid

# ==================== MODÈLE BANQUE MIS À JOUR ====================

class Bank(Base):
    __tablename__ = "banks"
    
    id = Column(String(50), primary_key=True, index=True)
    name = Column(String(200), nullable=False)
    full_name = Column(String(300))
    description = Column(Text)
    logo_url = Column(String(500))
    logo_data = Column(Text)  # Pour stocker l'image en base64
    logo_content_type = Column(String(100))  # Type MIME de l'image
    website = Column(String(200))
    contact_phone = Column(String(20))
    contact_email = Column(String(100))
    address = Column(Text)
    swift_code = Column(String(11))
    license_number = Column(String(50))
    established_year = Column(Integer)
    total_assets = Column(DECIMAL(15, 2))
    rating = Column(String(10))
    is_active = Column(Boolean, default=True)
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), server_default=func.now(), onupdate=func.now())
    
    # Relations
    credit_products = relationship("CreditProduct", back_populates="bank", cascade="all, delete-orphan")
    savings_products = relationship("SavingsProduct", back_populates="bank", cascade="all, delete-orphan")
    # Relation avec les administrateurs assignés
    admin_users = relationship("AdminUser", back_populates="assigned_bank", foreign_keys="AdminUser.assigned_bank_id")

class InsuranceCompany(Base):
    __tablename__ = "insurance_companies"
    
    id = Column(String(50), primary_key=True, index=True)
    name = Column(String(200), nullable=False)
    full_name = Column(String(300))
    description = Column(Text)
    logo_url = Column(String(500))
    logo_data = Column(Text)  # Pour stocker l'image en base64
    logo_content_type = Column(String(100))
    website = Column(String(200))
    contact_phone = Column(String(20))
    contact_email = Column(String(100))
    address = Column(Text)
    license_number = Column(String(50))
    established_year = Column(Integer)
    solvency_ratio = Column(DECIMAL(5, 2))
    rating = Column(String(10))
    specialties = Column(JSON, default=[])
    coverage_areas = Column(JSON, default=[]) 
    is_active = Column(Boolean, default=True)
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), server_default=func.now(), onupdate=func.now())
    
    # Relations
    insurance_products = relationship("InsuranceProduct", back_populates="insurance_company", cascade="all, delete-orphan")
    # Relation avec les administrateurs assignés
    admin_users = relationship("AdminUser", back_populates="assigned_insurance_company", foreign_keys="AdminUser.assigned_insurance_company_id")

class CreditProduct(Base):
    __tablename__ = "credit_products"
    
    id = Column(String(50), primary_key=True, index=True)
    bank_id = Column(String(50), ForeignKey("banks.id"), nullable=False)
    name = Column(String(200), nullable=False)
    type = Column(String(50), nullable=False)
    description = Column(Text)
    min_amount = Column(DECIMAL(12, 2), nullable=False)
    max_amount = Column(DECIMAL(12, 2), nullable=False)
    min_duration_months = Column(Integer, nullable=False)
    max_duration_months = Column(Integer, nullable=False)
    average_rate = Column(DECIMAL(5, 2), nullable=False)
    min_rate = Column(DECIMAL(5, 2))
    max_rate = Column(DECIMAL(5, 2))
    processing_time_hours = Column(Integer, default=72)
    required_documents = Column(JSON)
    eligibility_criteria = Column(JSON)
    fees = Column(JSON)
    features = Column(JSON, default=list)
    advantages = Column(JSON, default=list)
    special_conditions = Column(Text)
    is_featured = Column(Boolean, default=False)
    is_active = Column(Boolean, default=True)
    # Ajout de champs pour traçabilité
    created_by_admin = Column(String(50), ForeignKey("admin_users.id"))
    updated_by_admin = Column(String(50), ForeignKey("admin_users.id"))
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), server_default=func.now(), onupdate=func.now())
    
    # Relations
    bank = relationship("Bank", back_populates="credit_products")
    simulations = relationship("CreditSimulation", back_populates="credit_product", cascade="all, delete-orphan")
    # Relations avec les administrateurs
    created_by = relationship("AdminUser", foreign_keys=[created_by_admin], post_update=True)
    updated_by = relationship("AdminUser", foreign_keys=[updated_by_admin], post_update=True)

class SavingsProduct(Base):
    __tablename__ = "savings_products"
    
    id = Column(String(50), primary_key=True, index=True)
    bank_id = Column(String(50), ForeignKey("banks.id"), nullable=False)
    name = Column(String(200), nullable=False)
    type = Column(String(50), nullable=False)
    description = Column(Text)
    interest_rate = Column(DECIMAL(5, 2), nullable=False)
    minimum_deposit = Column(DECIMAL(12, 2), nullable=False)
    maximum_deposit = Column(DECIMAL(12, 2))
    minimum_balance = Column(DECIMAL(12, 2), default=0)
    liquidity = Column(String(20), nullable=False)
    notice_period_days = Column(Integer, default=0)
    term_months = Column(Integer)
    compounding_frequency = Column(String(20), default="monthly")
    fees = Column(JSON)
    features = Column(JSON, default=list)
    advantages = Column(JSON, default=list)
    tax_benefits = Column(JSON, default=list)
    risk_level = Column(Integer, default=1)
    early_withdrawal_penalty = Column(DECIMAL(5, 2))
    is_islamic_compliant = Column(Boolean, default=False)
    is_featured = Column(Boolean, default=False)
    is_active = Column(Boolean, default=True)
    terms_conditions = Column(Text)
    # Ajout de champs pour traçabilité
    created_by_admin = Column(String(50), ForeignKey("admin_users.id"))
    updated_by_admin = Column(String(50), ForeignKey("admin_users.id"))
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), server_default=func.now(), onupdate=func.now())
    
    # Relations
    bank = relationship("Bank", back_populates="savings_products")
    simulations = relationship("SavingsSimulation", back_populates="savings_product", cascade="all, delete-orphan")
    # Relations avec les administrateurs
    created_by = relationship("AdminUser", foreign_keys=[created_by_admin], post_update=True)
    updated_by = relationship("AdminUser", foreign_keys=[updated_by_admin], post_update=True)

class InsuranceProduct(Base):
    __tablename__ = "insurance_products"
    
    id = Column(String(50), primary_key=True, index=True)
    insurance_company_id = Column(String(50), ForeignKey("insurance_companies.id"), nullable=False)
    name = Column(String(200), nullable=False)
    type = Column(String(50), nullable=False)
    description = Column(Text)
    coverage_details = Column(JSON, default=dict)
    premium_calculation = Column(JSON)
    base_premium = Column(DECIMAL(10, 2))
    min_coverage = Column(DECIMAL(12, 2))
    max_coverage = Column(DECIMAL(12, 2))
    deductible_options = Column(JSON, default=dict)
    age_limits = Column(JSON, default=dict)
    exclusions = Column(JSON, default=list)
    features = Column(JSON, default=list)
    advantages = Column(JSON, default=list)
    claim_process = Column(Text)
    settlement_time_days = Column(Integer, default=15)
    renewable = Column(Boolean, default=True)
    is_featured = Column(Boolean, default=False)
    is_active = Column(Boolean, default=True)
    # Ajout de champs pour traçabilité
    created_by_admin = Column(String(50), ForeignKey("admin_users.id"))
    updated_by_admin = Column(String(50), ForeignKey("admin_users.id"))
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), server_default=func.now(), onupdate=func.now())
    
    # Relations
    insurance_company = relationship("InsuranceCompany", back_populates="insurance_products")
    quotes = relationship("InsuranceQuote", back_populates="insurance_product", cascade="all, delete-orphan")
    applications = relationship("InsuranceApplication", back_populates="insurance_product", cascade="all, delete-orphan")
    # Relations avec les administrateurs
    created_by = relationship("AdminUser", foreign_keys=[created_by_admin], post_update=True)
    updated_by = relationship("AdminUser", foreign_keys=[updated_by_admin], post_update=True)

class InsuranceQuote(Base):
    __tablename__ = "insurance_quotes"
    
    id = Column(String(50), primary_key=True, index=True)
    session_id = Column(String(100))
    insurance_product_id = Column(String(50), ForeignKey("insurance_products.id"))
    insurance_type = Column(String(50), nullable=False)
    age = Column(Integer, nullable=False)
    risk_factors = Column(JSON, nullable=False)
    coverage_amount = Column(DECIMAL(12, 2))
    monthly_premium = Column(DECIMAL(10, 2), nullable=False)
    annual_premium = Column(DECIMAL(10, 2), nullable=False)
    deductible = Column(DECIMAL(10, 2))
    coverage_details = Column(JSON)
    exclusions = Column(JSON, default=list)
    valid_until = Column(DateTime(timezone=True))
    client_ip = Column(String(45))
    user_agent = Column(Text)
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    
    # Relations
    insurance_product = relationship("InsuranceProduct", back_populates="quotes")
    applications = relationship("InsuranceApplication", back_populates="quote", cascade="all, delete-orphan")

# ==================== NOUVEAU MODÈLE INSURANCE APPLICATION ====================

class InsuranceApplication(Base):
    __tablename__ = "insurance_applications"
    
    id = Column(String(50), primary_key=True, default=lambda: str(uuid.uuid4()))
    quote_id = Column(String(50), ForeignKey("insurance_quotes.id"), nullable=True)
    insurance_product_id = Column(String(50), ForeignKey("insurance_products.id"), nullable=False)
    
    # Informations personnelles
    applicant_name = Column(String(200), nullable=False)
    applicant_email = Column(String(100), nullable=True)
    applicant_phone = Column(String(20), nullable=True)
    applicant_address = Column(Text, nullable=True)
    birth_date = Column(String(20), nullable=True)  # Format YYYY-MM-DD en string
    nationality = Column(String(50), nullable=True)
    marital_status = Column(String(50), nullable=True)
    profession = Column(String(100), nullable=True)
    employer = Column(String(200), nullable=True)
    
    # Informations spécifiques
    coverage_amount = Column(DECIMAL(12, 2), nullable=True)
    beneficiaries = Column(Text, nullable=True)
    
    # Informations véhicule (pour assurance auto)
    vehicle_make = Column(String(100), nullable=True)
    vehicle_model = Column(String(100), nullable=True)
    vehicle_year = Column(Integer, nullable=True)
    vehicle_value = Column(DECIMAL(12, 2), nullable=True)
    
    # Informations logement (pour assurance habitation)
    property_type = Column(String(100), nullable=True)
    property_value = Column(DECIMAL(12, 2), nullable=True)
    property_address = Column(Text, nullable=True)
    
    # Informations santé
    medical_history = Column(Text, nullable=True)
    current_treatments = Column(Text, nullable=True)
    
    # Statut et traitement
    status = Column(String(50), default="pending")
    processing_notes = Column(Text, nullable=True)
    assigned_to = Column(String(100), nullable=True)
    insurance_response = Column(JSON, nullable=True)
    policy_number = Column(String(50), nullable=True)
    premium_offered = Column(DECIMAL(10, 2), nullable=True)
    deductible_offered = Column(DECIMAL(10, 2), nullable=True)
    
    # Informations médicales
    medical_exam_required = Column(Boolean, default=False)
    medical_exam_date = Column(DateTime(timezone=True), nullable=True)
    
    # Documents
    documents_required = Column(JSON, nullable=True)
    documents_submitted = Column(JSON, nullable=True)
    
    # Données d'application
    application_data = Column(JSON, nullable=True)
    
    # Dates
    submitted_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), nullable=True)
    processed_at = Column(DateTime(timezone=True), nullable=True)
    
    # Relations
    insurance_product = relationship("InsuranceProduct", back_populates="applications")
    quote = relationship("InsuranceQuote", back_populates="applications")

# ==================== AUTRES MODÈLES ====================

class CreditSimulation(Base):
    __tablename__ = "credit_simulations"
    
    id = Column(String(50), primary_key=True, index=True)
    session_id = Column(String(100))
    credit_product_id = Column(String(50), ForeignKey("credit_products.id"))
    requested_amount = Column(DECIMAL(12, 2), nullable=False)
    duration_months = Column(Integer, nullable=False)
    monthly_income = Column(DECIMAL(10, 2), nullable=False)
    current_debts = Column(DECIMAL(10, 2), default=0)
    down_payment = Column(DECIMAL(12, 2), default=0)
    applied_rate = Column(DECIMAL(5, 2), nullable=False)
    monthly_payment = Column(DECIMAL(10, 2), nullable=False)
    total_cost = Column(DECIMAL(12, 2), nullable=False)
    total_interest = Column(DECIMAL(12, 2), nullable=False)
    debt_ratio = Column(DECIMAL(5, 2), nullable=False)
    eligible = Column(Boolean, nullable=False)
    risk_score = Column(Integer)
    recommendations = Column(JSON, default=list)
    amortization_schedule = Column(JSON)
    client_ip = Column(String(45))
    user_agent = Column(Text)
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    
    # Relations
    credit_product = relationship("CreditProduct", back_populates="simulations")
    applications = relationship("CreditApplication", back_populates="simulation")

class SavingsSimulation(Base):
    __tablename__ = "savings_simulations"
    
    id = Column(String(50), primary_key=True, index=True)
    session_id = Column(String(100))
    savings_product_id = Column(String(50), ForeignKey("savings_products.id"))
    initial_amount = Column(DECIMAL(12, 2), nullable=False)
    monthly_contribution = Column(DECIMAL(10, 2), nullable=False)
    duration_months = Column(Integer, nullable=False)
    final_amount = Column(DECIMAL(12, 2), nullable=False)
    total_contributions = Column(DECIMAL(12, 2), nullable=False)
    total_interest = Column(DECIMAL(12, 2), nullable=False)
    effective_rate = Column(DECIMAL(5, 2))
    monthly_breakdown = Column(JSON)
    recommendations = Column(JSON, default=list)
    client_ip = Column(String(45))
    user_agent = Column(Text)
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    
    # Relations
    savings_product = relationship("SavingsProduct", back_populates="simulations")
    applications = relationship("SavingsApplication", back_populates="simulation")

class SavingsApplication(Base):
    __tablename__ = "savings_applications"

    id = Column(String(50), primary_key=True, default=lambda: str(uuid.uuid4()))
    simulation_id = Column(String(50), ForeignKey("savings_simulations.id"), nullable=True)
    savings_product_id = Column(String(50), ForeignKey("savings_products.id"), nullable=False)
    
    # Informations personnelles
    applicant_name = Column(String(200), nullable=False)
    applicant_email = Column(String(100), nullable=True)
    applicant_phone = Column(String(20), nullable=True)
    applicant_address = Column(Text, nullable=True)
    birth_date = Column(DateTime, nullable=True)
    
    # Informations sur l'épargne
    initial_deposit = Column(Numeric(12,2), nullable=False)
    monthly_contribution = Column(Numeric(10,2), nullable=True)
    savings_goal = Column(String(100), nullable=True)
    
    # Statut de la demande
    status = Column(String(50), default='pending')
    application_data = Column(JSON)
    bank_response = Column(JSON)
    processing_notes = Column(Text)
    assigned_to = Column(String(100))
    
    # Métadonnées
    submitted_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)
    
    # Relations
    simulation = relationship("SavingsSimulation", back_populates="applications")
    savings_product = relationship("SavingsProduct")

class CreditApplication(Base):
    __tablename__ = "credit_applications"

    id = Column(String(50), primary_key=True, default=lambda: str(uuid.uuid4()))
    simulation_id = Column(String(50), ForeignKey("credit_simulations.id"), nullable=False)
    credit_product_id = Column(String(50), ForeignKey("credit_products.id"), nullable=False)
    
    # Informations personnelles du demandeur
    applicant_name = Column(String(200), nullable=False)
    applicant_email = Column(String(100), nullable=True)
    applicant_phone = Column(String(20), nullable=True)
    applicant_address = Column(Text, nullable=True)
    birth_date = Column(DateTime, nullable=True)
    nationality = Column(String(50), nullable=True)
    marital_status = Column(String(20), nullable=True)
    
    # Informations professionnelles
    profession = Column(String(100), nullable=True)
    employer = Column(String(200), nullable=True)
    work_address = Column(Text, nullable=True)
    employment_type = Column(String(50), nullable=True)  # CDI, CDD, Indépendant, etc.
    employment_duration_months = Column(Integer, nullable=True)
    monthly_income = Column(Numeric(12,2), nullable=True)
    other_income = Column(Numeric(12,2), nullable=True)
    
    # Informations sur le crédit
    requested_amount = Column(Numeric(12,2), nullable=False)
    duration_months = Column(Integer, nullable=False)
    purpose = Column(String(200), nullable=True)
    guarantor_info = Column(JSON, nullable=True)
    
    # Statut de la demande
    status = Column(String(50), default='pending')  # pending, under_review, approved, rejected, completed
    application_data = Column(JSON)  # Données complètes du formulaire
    documents_uploaded = Column(JSON)  # Liste des documents uploadés
    bank_response = Column(JSON)  # Réponse de la banque
    processing_notes = Column(Text)  # Notes internes
    assigned_to = Column(String(100))  # Agent assigné
    
    # Métadonnées
    submitted_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)
    client_ip = Column(String(45))
    user_agent = Column(Text)
    
    # Relations
    simulation = relationship("CreditSimulation", back_populates="applications")
    credit_product = relationship("CreditProduct")

# ==================== MODÈLE ADMIN UTILISATEUR ====================

class AdminUser(Base):
    __tablename__ = "admin_users"
    
    id = Column(String(50), primary_key=True, index=True)
    username = Column(String(50), unique=True, nullable=False)
    email = Column(String(100), unique=True, nullable=False)
    password_hash = Column(String(255), nullable=False)
    first_name = Column(String(100))
    last_name = Column(String(100))
    role = Column(String(50), nullable=False)  # super_admin, bank_admin, insurance_admin, moderator
    
    # Assignation
    assigned_bank_id = Column(String(50), ForeignKey("banks.id"), nullable=True)
    assigned_insurance_company_id = Column(String(50), ForeignKey("insurance_companies.id"), nullable=True)
    
    permissions = Column(JSON)  # Permissions détaillées
    is_active = Column(Boolean, default=True)
    last_login = Column(DateTime(timezone=True))
    
    # Métadonnées
    created_by = Column(String(50), ForeignKey("admin_users.id"))
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), server_default=func.now(), onupdate=func.now())
    
    # Relations
    assigned_bank = relationship("Bank", back_populates="admin_users", foreign_keys=[assigned_bank_id])
    assigned_insurance_company = relationship("InsuranceCompany", back_populates="admin_users", foreign_keys=[assigned_insurance_company_id])
    
    # Relation self-referential pour created_by
    created_by_user = relationship("AdminUser", remote_side=[id], foreign_keys=[created_by])
    
    # Relation avec les logs d'audit
    audit_logs = relationship("AuditLog", back_populates="admin_user")

class AuditLog(Base):
    __tablename__ = "audit_logs"
    
    id = Column(String(50), primary_key=True, index=True)
    admin_user_id = Column(String(50), ForeignKey("admin_users.id"))
    action = Column(String(100), nullable=False)  # CREATE, UPDATE, DELETE, LOGIN, LOGOUT
    entity_type = Column(String(50), nullable=False)  # bank, insurance_company, credit_product, etc.
    entity_id = Column(String(100))
    old_values = Column(JSON)
    new_values = Column(JSON)
    ip_address = Column(String(45))
    user_agent = Column(Text)
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    
    # Relations
    admin_user = relationship("AdminUser", back_populates="audit_logs")

# ==================== FONCTIONS UTILITAIRES ====================

def generate_uuid():
    """Génère un UUID pour les nouvelles entrées"""
    return str(uuid.uuid4())

def generate_uuid_if_needed(mapper, connection, target):
    """Génère un UUID si l'ID n'est pas fourni"""
    if not target.id:
        target.id = generate_uuid()

# ==================== ÉVÉNEMENTS POUR GÉNÉRATION AUTO D'UUID ====================

# Pour les simulations et quotes qui n'ont pas d'ID fourni par l'utilisateur
event.listen(CreditSimulation, 'before_insert', generate_uuid_if_needed)
event.listen(SavingsSimulation, 'before_insert', generate_uuid_if_needed)
event.listen(InsuranceQuote, 'before_insert', generate_uuid_if_needed)
event.listen(AdminUser, 'before_insert', generate_uuid_if_needed)
event.listen(AuditLog, 'before_insert', generate_uuid_if_needed)

# Pour les applications
event.listen(InsuranceApplication, 'before_insert', generate_uuid_if_needed)
event.listen(CreditApplication, 'before_insert', generate_uuid_if_needed)
event.listen(SavingsApplication, 'before_insert', generate_uuid_if_needed)

# Pour les produits, on peut aussi générer des UUID si pas d'ID fourni
event.listen(CreditProduct, 'before_insert', generate_uuid_if_needed)
event.listen(SavingsProduct, 'before_insert', generate_uuid_if_needed)
event.listen(InsuranceProduct, 'before_insert', generate_uuid_if_needed)
event.listen(InsuranceCompany, 'before_insert', generate_uuid_if_needed)

# ==================== CONFIGURATION DES RELATIONS ====================

def configure_models():
    """Configure les relations SQLAlchemy"""
    try:
        configure_mappers()
        return True
    except Exception as e:
        print(f"Erreur configuration modèles: {e}")
        return False

# ==================== FONCTIONS DE TEST ====================

def test_connection():
    """Test de connexion à la base de données"""
    try:
        from sqlalchemy import text
        from database import SessionLocal
        db = SessionLocal()
        db.execute(text("SELECT 1"))
        db.close()
        return True
    except Exception as e:
        print(f"Erreur de connexion: {e}")
        return False

def create_tables():
    """Crée toutes les tables"""
    try:
        from database import engine
        Base.metadata.create_all(bind=engine)
        print("Tables créées avec succès")
        return True
    except Exception as e:
        print(f"Erreur lors de la création des tables: {e}")
        return False

def drop_all_tables():
    """Supprime toutes les tables (ATTENTION: destructif!)"""
    try:
        from database import engine
        Base.metadata.drop_all(bind=engine)
        print("Toutes les tables ont été supprimées")
        return True
    except Exception as e:
        print(f"Erreur lors de la suppression des tables: {e}")
        return False

# Configuration au chargement du module
configure_models()