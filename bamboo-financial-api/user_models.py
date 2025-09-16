# user_models.py - Modèles SQLAlchemy corrigés pour les utilisateurs

from sqlalchemy import Column, String, DateTime, Boolean, Text, Integer, Numeric, Date, ForeignKey, JSON, CheckConstraint
from sqlalchemy.orm import relationship
from sqlalchemy.ext.declarative import declarative_base
from sqlalchemy.sql import func
from datetime import datetime
import uuid
import secrets

# Importer la base existante si elle existe, sinon créer une nouvelle
try:
    from models import Base
except ImportError:
    from sqlalchemy.ext.declarative import declarative_base
    Base = declarative_base()

# ==================== MODÈLES UTILISATEUR ====================

class User(Base):
    __tablename__ = "users"
    
    id = Column(String(50), primary_key=True)
    
    # Informations de contact
    email = Column(String(100), unique=True, nullable=True, index=True)
    phone = Column(String(20), unique=True, nullable=True, index=True)
    
    # Informations personnelles
    first_name = Column(String(100), nullable=False)
    last_name = Column(String(100), nullable=False)
    date_of_birth = Column(Date, nullable=True)
    gender = Column(String(10), nullable=True)
    
    # Informations professionnelles
    profession = Column(String(100), nullable=True)
    monthly_income = Column(Numeric(12, 2), nullable=True)
    
    # Localisation
    city = Column(String(100), nullable=True)
    address = Column(Text, nullable=True)
    
    # Authentification
    password_hash = Column(String(255), nullable=True)
    registration_method = Column(String(20), nullable=False)
    
    # Vérification
    email_verified = Column(Boolean, default=False, nullable=False)
    phone_verified = Column(Boolean, default=False, nullable=False)
    verification_code = Column(String(10), nullable=True)
    verification_expires_at = Column(DateTime, nullable=True)
    
    # Statut et préférences
    is_active = Column(Boolean, default=True, nullable=False)
    preferences = Column(JSON, default=dict, nullable=False)
    
    # Métadonnées
    last_login = Column(DateTime, nullable=True)
    created_at = Column(DateTime, default=func.now(), nullable=False)
    updated_at = Column(DateTime, default=func.now(), onupdate=func.now(), nullable=False)
    
    # Relations
    sessions = relationship("UserSession", back_populates="user", cascade="all, delete-orphan")
    notifications = relationship("UserNotification", back_populates="user", cascade="all, delete-orphan")
    credit_applications = relationship("UserCreditApplication", back_populates="user", cascade="all, delete-orphan")
    savings_applications = relationship("UserSavingsApplication", back_populates="user", cascade="all, delete-orphan")
    insurance_applications = relationship("UserInsuranceApplication", back_populates="user", cascade="all, delete-orphan")
    documents = relationship("UserDocument", back_populates="user", cascade="all, delete-orphan")
    
    # Contraintes
    __table_args__ = (
        CheckConstraint(
            "(email IS NOT NULL AND email != '') OR (phone IS NOT NULL AND phone != '')",
            name="check_contact_method"
        ),
        CheckConstraint(
            "registration_method IN ('email', 'phone')",
            name="check_registration_method"
        ),
        CheckConstraint(
            "gender IN ('male', 'female', 'other') OR gender IS NULL",
            name="check_gender"
        )
    )

    def __init__(self, **kwargs):
        # Générer un ID unique si non fourni
        if 'id' not in kwargs or not kwargs['id']:
            timestamp = int(datetime.utcnow().timestamp())
            random_part = secrets.token_hex(3)
            kwargs['id'] = f"user_{timestamp}_{random_part}"
        
        # Définir les valeurs par défaut
        if 'preferences' not in kwargs:
            kwargs['preferences'] = {}
        if 'is_active' not in kwargs:
            kwargs['is_active'] = True
        if 'email_verified' not in kwargs:
            kwargs['email_verified'] = False
        if 'phone_verified' not in kwargs:
            kwargs['phone_verified'] = False
        if 'created_at' not in kwargs:
            kwargs['created_at'] = datetime.utcnow()
        if 'updated_at' not in kwargs:
            kwargs['updated_at'] = datetime.utcnow()
            
        super().__init__(**kwargs)

    def __repr__(self):
        return f"<User(id={self.id}, email={self.email}, phone={self.phone})>"

class UserSession(Base):
    __tablename__ = "user_sessions"
    
    id = Column(String(50), primary_key=True)
    user_id = Column(String(50), ForeignKey("users.id", ondelete="CASCADE"), nullable=False, index=True)
    
    # Informations de session
    token = Column(String(500), unique=True, nullable=False, index=True)
    device_info = Column(JSON, default=dict, nullable=False)
    ip_address = Column(String(45), nullable=True)
    user_agent = Column(Text, nullable=True)
    
    # Validité
    expires_at = Column(DateTime, nullable=False)
    is_active = Column(Boolean, default=True, nullable=False)
    created_at = Column(DateTime, default=func.now(), nullable=False)
    
    # Relations
    user = relationship("User", back_populates="sessions")

    def __init__(self, **kwargs):
        if 'id' not in kwargs or not kwargs['id']:
            timestamp = int(datetime.utcnow().timestamp())
            random_part = secrets.token_hex(3)
            kwargs['id'] = f"session_{timestamp}_{random_part}"
        
        if 'device_info' not in kwargs:
            kwargs['device_info'] = {}
        if 'is_active' not in kwargs:
            kwargs['is_active'] = True
        if 'created_at' not in kwargs:
            kwargs['created_at'] = datetime.utcnow()
            
        super().__init__(**kwargs)

class UserNotification(Base):
    __tablename__ = "user_notifications"
    
    id = Column(String(50), primary_key=True)
    user_id = Column(String(50), ForeignKey("users.id", ondelete="CASCADE"), nullable=False, index=True)
    
    # Contenu
    type = Column(String(50), nullable=False)
    title = Column(String(200), nullable=False)
    message = Column(Text, nullable=False)
    
    # Liaison avec d'autres entités
    related_entity_type = Column(String(50), nullable=True)
    related_entity_id = Column(String(50), nullable=True)
    
    # Statut
    is_read = Column(Boolean, default=False, nullable=False)
    priority = Column(String(20), default="normal", nullable=False)
    created_at = Column(DateTime, default=func.now(), nullable=False)
    
    # Relations
    user = relationship("User", back_populates="notifications")
    
    # Contraintes
    __table_args__ = (
        CheckConstraint(
            "priority IN ('low', 'normal', 'high', 'urgent')",
            name="check_notification_priority"
        ),
    )

    def __init__(self, **kwargs):
        if 'id' not in kwargs or not kwargs['id']:
            timestamp = int(datetime.utcnow().timestamp())
            random_part = secrets.token_hex(3)
            kwargs['id'] = f"notif_{timestamp}_{random_part}"
        
        if 'is_read' not in kwargs:
            kwargs['is_read'] = False
        if 'priority' not in kwargs:
            kwargs['priority'] = 'normal'
        if 'created_at' not in kwargs:
            kwargs['created_at'] = datetime.utcnow()
            
        super().__init__(**kwargs)

# ==================== MODÈLES APPLICATIONS ====================

class UserCreditApplication(Base):
    __tablename__ = "user_credit_applications"
    
    id = Column(String(50), primary_key=True)
    user_id = Column(String(50), ForeignKey("users.id", ondelete="CASCADE"), nullable=False, index=True)
    credit_product_id = Column(String(50), nullable=True)  # ForeignKey sera ajoutée si la table existe
    simulation_id = Column(String(50), nullable=True)  # ForeignKey sera ajoutée si la table existe
    
    # Détails de la demande
    requested_amount = Column(Numeric(12, 2), nullable=False)
    duration_months = Column(Integer, nullable=False)
    purpose = Column(Text, nullable=False)
    
    # Informations financières
    monthly_income = Column(Numeric(10, 2), nullable=False)
    current_debts = Column(Numeric(10, 2), default=0, nullable=False)
    down_payment = Column(Numeric(12, 2), default=0, nullable=False)
    
    # Informations emploi
    employment_type = Column(String(50), nullable=True)
    employer_name = Column(String(200), nullable=True)
    employment_duration_months = Column(Integer, nullable=True)
    
    # Documents et traitement
    documents = Column(JSON, default=list, nullable=False)
    status = Column(String(50), default="pending", nullable=False)
    bank_response = Column(JSON, nullable=True)
    bank_contact_info = Column(JSON, nullable=True)
    
    # Suivi administratif
    processing_notes = Column(Text, nullable=True)
    priority_level = Column(Integer, default=3, nullable=False)
    assigned_to = Column(String(50), nullable=True)
    expected_response_date = Column(Date, nullable=True)
    
    # Notifications
    user_notified = Column(Boolean, default=False, nullable=False)
    last_notification_sent = Column(DateTime, nullable=True)
    
    # Métadonnées
    submitted_at = Column(DateTime, default=func.now(), nullable=False)
    updated_at = Column(DateTime, default=func.now(), onupdate=func.now(), nullable=False)
    
    # Relations
    user = relationship("User", back_populates="credit_applications")
    
    # Contraintes
    __table_args__ = (
        CheckConstraint(
            "status IN ('pending', 'under_review', 'approved', 'rejected', 'on_hold', 'completed')",
            name="check_credit_application_status"
        ),
        CheckConstraint(
            "priority_level BETWEEN 1 AND 5",
            name="check_priority_level"
        )
    )

    def __init__(self, **kwargs):
        if 'id' not in kwargs or not kwargs['id']:
            timestamp = int(datetime.utcnow().timestamp())
            kwargs['id'] = f"app_credit_{timestamp}"
        
        if 'documents' not in kwargs:
            kwargs['documents'] = []
        if 'status' not in kwargs:
            kwargs['status'] = 'pending'
        if 'current_debts' not in kwargs:
            kwargs['current_debts'] = 0
        if 'down_payment' not in kwargs:
            kwargs['down_payment'] = 0
        if 'priority_level' not in kwargs:
            kwargs['priority_level'] = 3
        if 'user_notified' not in kwargs:
            kwargs['user_notified'] = False
        if 'submitted_at' not in kwargs:
            kwargs['submitted_at'] = datetime.utcnow()
        if 'updated_at' not in kwargs:
            kwargs['updated_at'] = datetime.utcnow()
            
        super().__init__(**kwargs)

class UserSavingsApplication(Base):
    __tablename__ = "user_savings_applications"
    
    id = Column(String(50), primary_key=True)
    user_id = Column(String(50), ForeignKey("users.id", ondelete="CASCADE"), nullable=False, index=True)
    savings_product_id = Column(String(50), nullable=True)  # ForeignKey sera ajoutée si la table existe
    simulation_id = Column(String(50), nullable=True)  # ForeignKey sera ajoutée si la table existe
    
    # Détails de la demande
    initial_deposit = Column(Numeric(12, 2), nullable=False)
    monthly_contribution = Column(Numeric(10, 2), nullable=True)
    savings_goal = Column(Text, nullable=True)
    target_amount = Column(Numeric(12, 2), nullable=True)
    target_date = Column(Date, nullable=True)
    
    # Documents et traitement
    documents = Column(JSON, default=list, nullable=False)
    status = Column(String(50), default="pending", nullable=False)
    bank_response = Column(JSON, nullable=True)
    account_number = Column(String(50), nullable=True)
    
    # Suivi administratif
    processing_notes = Column(Text, nullable=True)
    assigned_to = Column(String(50), nullable=True)
    
    # Métadonnées
    submitted_at = Column(DateTime, default=func.now(), nullable=False)
    updated_at = Column(DateTime, default=func.now(), onupdate=func.now(), nullable=False)
    
    # Relations
    user = relationship("User", back_populates="savings_applications")
    
    # Contraintes
    __table_args__ = (
        CheckConstraint(
            "status IN ('pending', 'under_review', 'approved', 'rejected', 'opened', 'active')",
            name="check_savings_application_status"
        ),
    )

    def __init__(self, **kwargs):
        if 'id' not in kwargs or not kwargs['id']:
            timestamp = int(datetime.utcnow().timestamp())
            kwargs['id'] = f"app_savings_{timestamp}"
        
        if 'documents' not in kwargs:
            kwargs['documents'] = []
        if 'status' not in kwargs:
            kwargs['status'] = 'pending'
        if 'submitted_at' not in kwargs:
            kwargs['submitted_at'] = datetime.utcnow()
        if 'updated_at' not in kwargs:
            kwargs['updated_at'] = datetime.utcnow()
            
        super().__init__(**kwargs)

class UserInsuranceApplication(Base):
    __tablename__ = "user_insurance_applications"
    
    id = Column(String(50), primary_key=True)
    user_id = Column(String(50), ForeignKey("users.id", ondelete="CASCADE"), nullable=False, index=True)
    insurance_product_id = Column(String(50), nullable=True)  # ForeignKey sera ajoutée si la table existe
    quote_id = Column(String(50), nullable=True)  # ForeignKey sera ajoutée si la table existe
    
    # Informations de base
    insurance_type = Column(String(50), nullable=False)
    coverage_amount = Column(Numeric(12, 2), nullable=True)
    beneficiaries = Column(JSON, default=list, nullable=False)
    
    # Informations spécifiques par type d'assurance
    vehicle_info = Column(JSON, nullable=True)  # Pour assurance auto
    property_info = Column(JSON, nullable=True)  # Pour assurance habitation
    health_info = Column(JSON, nullable=True)  # Pour assurance santé/vie
    travel_info = Column(JSON, nullable=True)  # Pour assurance voyage
    business_info = Column(JSON, nullable=True)  # Pour assurance professionnelle
    
    # Documents et examens
    documents = Column(JSON, default=list, nullable=False)
    medical_exam_required = Column(Boolean, default=False, nullable=False)
    medical_exam_completed = Column(Boolean, default=False, nullable=False)
    
    # Traitement
    status = Column(String(50), default="pending", nullable=False)
    insurance_response = Column(JSON, nullable=True)
    policy_number = Column(String(50), nullable=True)
    premium_amount = Column(Numeric(10, 2), nullable=True)
    
    # Suivi administratif
    processing_notes = Column(Text, nullable=True)
    assigned_to = Column(String(50), nullable=True)
    
    # Métadonnées
    submitted_at = Column(DateTime, default=func.now(), nullable=False)
    updated_at = Column(DateTime, default=func.now(), onupdate=func.now(), nullable=False)
    
    # Relations
    user = relationship("User", back_populates="insurance_applications")
    
    # Contraintes
    __table_args__ = (
        CheckConstraint(
            "status IN ('pending', 'under_review', 'medical_exam_required', 'approved', 'rejected', 'active')",
            name="check_insurance_application_status"
        ),
    )

    def __init__(self, **kwargs):
        if 'id' not in kwargs or not kwargs['id']:
            timestamp = int(datetime.utcnow().timestamp())
            kwargs['id'] = f"app_insurance_{timestamp}"
        
        if 'documents' not in kwargs:
            kwargs['documents'] = []
        if 'beneficiaries' not in kwargs:
            kwargs['beneficiaries'] = []
        if 'status' not in kwargs:
            kwargs['status'] = 'pending'
        if 'medical_exam_required' not in kwargs:
            kwargs['medical_exam_required'] = False
        if 'medical_exam_completed' not in kwargs:
            kwargs['medical_exam_completed'] = False
        if 'submitted_at' not in kwargs:
            kwargs['submitted_at'] = datetime.utcnow()
        if 'updated_at' not in kwargs:
            kwargs['updated_at'] = datetime.utcnow()
            
        super().__init__(**kwargs)

# ==================== MODÈLE POUR DOCUMENTS ====================

class UserDocument(Base):
    __tablename__ = "user_documents"
    
    id = Column(String(50), primary_key=True)
    user_id = Column(String(50), ForeignKey("users.id", ondelete="CASCADE"), nullable=False, index=True)
    
    # Informations du fichier
    filename = Column(String(255), nullable=False)
    original_filename = Column(String(255), nullable=False)
    file_type = Column(String(50), nullable=False)
    file_size = Column(Integer, nullable=False)
    file_path = Column(String(500), nullable=True)  # Chemin sur le serveur ou S3
    file_url = Column(String(500), nullable=True)  # URL d'accès
    
    # Classification
    document_type = Column(String(50), nullable=True)  # 'id_card', 'payslip', 'bank_statement', etc.
    application_type = Column(String(50), nullable=True)  # 'credit', 'savings', 'insurance'
    application_id = Column(String(50), nullable=True)
    
    # Métadonnées
    is_verified = Column(Boolean, default=False, nullable=False)
    verified_by = Column(String(50), nullable=True)
    verified_at = Column(DateTime, nullable=True)
    
    uploaded_at = Column(DateTime, default=func.now(), nullable=False)
    expires_at = Column(DateTime, nullable=True)  # Pour documents temporaires
    
    # Relations
    user = relationship("User", back_populates="documents")

    def __init__(self, **kwargs):
        if 'id' not in kwargs or not kwargs['id']:
            kwargs['id'] = f"doc_{uuid.uuid4().hex}"
        
        if 'is_verified' not in kwargs:
            kwargs['is_verified'] = False
        if 'uploaded_at' not in kwargs:
            kwargs['uploaded_at'] = datetime.utcnow()
            
        super().__init__(**kwargs)

# ==================== FONCTIONS UTILITAIRES ====================

def create_user_tables(engine=None):
    """
    Fonction pour créer toutes les tables utilisateur
    """
    if engine is None:
        from sqlalchemy import create_engine
        import os
        DATABASE_URL = os.getenv("DATABASE_URL", "postgresql://user:password@localhost/bamboo_db")
        engine = create_engine(DATABASE_URL)
    
    # Créer toutes les tables
    Base.metadata.create_all(engine)
    print("Tables utilisateur créées avec succès !")

def get_sql_for_existing_tables():
    """
    Script SQL pour ajouter les colonnes user aux tables existantes
    """
    sql_commands = [
        # Ajouter colonnes à credit_simulations (si elle existe)
        """
        DO $$ 
        BEGIN
            IF EXISTS (SELECT FROM information_schema.tables WHERE table_name = 'credit_simulations') THEN
                IF NOT EXISTS (SELECT FROM information_schema.columns WHERE table_name='credit_simulations' and column_name='user_id') THEN
                    ALTER TABLE credit_simulations ADD COLUMN user_id VARCHAR(50);
                    ALTER TABLE credit_simulations ADD COLUMN saved BOOLEAN DEFAULT FALSE;
                    ALTER TABLE credit_simulations ADD COLUMN name VARCHAR(200);
                END IF;
            END IF;
        END $$;
        """,
        
        # Ajouter colonnes à savings_simulations (si elle existe)
        """
        DO $$ 
        BEGIN
            IF EXISTS (SELECT FROM information_schema.tables WHERE table_name = 'savings_simulations') THEN
                IF NOT EXISTS (SELECT FROM information_schema.columns WHERE table_name='savings_simulations' and column_name='user_id') THEN
                    ALTER TABLE savings_simulations ADD COLUMN user_id VARCHAR(50);
                    ALTER TABLE savings_simulations ADD COLUMN saved BOOLEAN DEFAULT FALSE;
                    ALTER TABLE savings_simulations ADD COLUMN name VARCHAR(200);
                END IF;
            END IF;
        END $$;
        """,
        
        # Ajouter colonnes à insurance_quotes (si elle existe)
        """
        DO $$ 
        BEGIN
            IF EXISTS (SELECT FROM information_schema.tables WHERE table_name = 'insurance_quotes') THEN
                IF NOT EXISTS (SELECT FROM information_schema.columns WHERE table_name='insurance_quotes' and column_name='user_id') THEN
                    ALTER TABLE insurance_quotes ADD COLUMN user_id VARCHAR(50);
                    ALTER TABLE insurance_quotes ADD COLUMN saved BOOLEAN DEFAULT FALSE;
                    ALTER TABLE insurance_quotes ADD COLUMN name VARCHAR(200);
                END IF;
            END IF;
        END $$;
        """,
        
        # Créer des index pour les performances
        """
        CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_credit_simulations_user ON credit_simulations(user_id);
        CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_savings_simulations_user ON savings_simulations(user_id);
        CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_insurance_quotes_user ON insurance_quotes(user_id);
        """
    ]
    
    return sql_commands

# ==================== FONCTION DE TEST ====================

def test_user_creation():
    """
    Test de création d'un utilisateur
    """
    try:
        user = User(
            email="test@example.com",
            first_name="Test",
            last_name="User",
            registration_method="email"
        )
        print(f"Utilisateur créé avec succès: {user.id}")
        print(f"Email: {user.email}")
        print(f"Nom complet: {user.first_name} {user.last_name}")
        print(f"Préférences: {user.preferences}")
        return user
    except Exception as e:
        print(f"Erreur lors de la création de l'utilisateur: {e}")
        return None

if __name__ == "__main__":
    # Test de création d'utilisateur
    test_user = test_user_creation()
    if test_user:
        print("\nTest réussi !")
    else:
        print("\nTest échoué !")