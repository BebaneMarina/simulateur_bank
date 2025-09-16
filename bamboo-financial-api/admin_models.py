# admin_models.py - Modèles SQLAlchemy pour l'administration
from sqlalchemy import Column, String, Boolean, DateTime, Text, JSON, ForeignKey
from sqlalchemy.ext.declarative import declarative_base
from sqlalchemy.orm import relationship
from sqlalchemy.sql import func
from datetime import datetime
import uuid

Base = declarative_base()

def generate_id():
    """Génère un ID unique"""
    return str(uuid.uuid4())

class AdminUser(Base):
    """Modèle pour les utilisateurs administrateurs"""
    __tablename__ = "admin_users"
    
    id = Column(String(50), primary_key=True, default=generate_id)
    username = Column(String(50), unique=True, nullable=False, index=True)
    email = Column(String(100), unique=True, nullable=False, index=True)
    password_hash = Column(String(255), nullable=False)
    first_name = Column(String(100), nullable=True)
    last_name = Column(String(100), nullable=True)
    role = Column(String(50), nullable=False, default="admin")
    permissions = Column(JSON, nullable=True)
    is_active = Column(Boolean, default=True, nullable=False)
    last_login = Column(DateTime, nullable=True)
    created_by = Column(String(50), nullable=True)
    created_at = Column(DateTime, default=func.now(), nullable=False)
    updated_at = Column(DateTime, default=func.now(), onupdate=func.now(), nullable=True)
    
    # Relations
    sessions = relationship("AdminSession", back_populates="admin_user", cascade="all, delete-orphan")
    audit_logs = relationship("AuditLog", back_populates="admin_user")
    
    def __repr__(self):
        return f"<AdminUser(id='{self.id}', username='{self.username}', role='{self.role}')>"
    
    @property
    def full_name(self):
        if self.first_name and self.last_name:
            return f"{self.first_name} {self.last_name}"
        return self.username
    
    def has_permission(self, entity: str, action: str) -> bool:
        """Vérifie si l'utilisateur a une permission spécifique"""
        if self.role == 'super_admin':
            return True
        
        if not self.permissions:
            return False
        
        entity_permissions = self.permissions.get(entity, [])
        if isinstance(entity_permissions, list):
            return action in entity_permissions
        elif isinstance(entity_permissions, dict):
            return entity_permissions.get(action, False)
        
        return False

class AdminSession(Base):
    """Modèle pour les sessions d'administration"""
    __tablename__ = "admin_sessions"
    
    id = Column(String(50), primary_key=True, default=generate_id)
    admin_user_id = Column(String(50), ForeignKey("admin_users.id"), nullable=False)
    token = Column(String(500), nullable=False, unique=True, index=True)
    ip_address = Column(String(45), nullable=True)  # Support IPv4 et IPv6
    user_agent = Column(Text, nullable=True)
    expires_at = Column(DateTime, nullable=False)
    is_active = Column(Boolean, default=True, nullable=False)
    created_at = Column(DateTime, default=func.now(), nullable=False)
    last_activity = Column(DateTime, default=func.now(), nullable=True)
    logout_at = Column(DateTime, nullable=True)
    
    # Relations
    admin_user = relationship("AdminUser", back_populates="sessions")
    
    def __repr__(self):
        return f"<AdminSession(id='{self.id}', user='{self.admin_user_id}', active={self.is_active})>"
    
    @property
    def is_expired(self):
        """Vérifie si la session est expirée"""
        return datetime.utcnow() > self.expires_at
    
    def invalidate(self):
        """Invalide la session"""
        self.is_active = False
        self.logout_at = datetime.utcnow()

class AuditLog(Base):
    """Modèle pour les logs d'audit"""
    __tablename__ = "audit_logs"
    
    id = Column(String(50), primary_key=True, default=generate_id)
    admin_user_id = Column(String(50), ForeignKey("admin_users.id"), nullable=True)
    action = Column(String(100), nullable=False)
    entity_type = Column(String(50), nullable=False)
    entity_id = Column(String(100), nullable=True)
    old_values = Column(JSON, nullable=True)
    new_values = Column(JSON, nullable=True)
    ip_address = Column(String(45), nullable=True)
    user_agent = Column(Text, nullable=True)
    created_at = Column(DateTime, default=func.now(), nullable=False)
    
    # Relations
    admin_user = relationship("AdminUser", back_populates="audit_logs")
    
    def __repr__(self):
        return f"<AuditLog(id='{self.id}', action='{self.action}', entity='{self.entity_type}')>"

# Classe mock pour les tests (compatible avec les modèles SQLAlchemy)
class MockAdminUser:
    """Utilisateur admin fictif pour les tests - Compatible avec AdminUser"""
    def __init__(self, username="admin", role="super_admin"):
        self.id = f"mock_{username}"
        self.username = username
        self.email = f"{username}@bamboo-credit.ga"
        self.first_name = username.capitalize()
        self.last_name = "User"
        self.role = role
        self.is_active = True
        self.permissions = {
            "banks": ["create", "read", "update", "delete"],
            "credit_products": ["create", "read", "update", "delete"],
            "savings_products": ["create", "read", "update", "delete"],
            "insurance_products": ["create", "read", "update", "delete"],
            "simulations": ["read", "delete"],
            "users": ["create", "read", "update", "delete"],
            "admin_management": ["create", "read", "update", "delete"] if role == "super_admin" else []
        }
        self.created_at = datetime.utcnow()
        self.updated_at = datetime.utcnow()
        self.last_login = None
    
    def has_permission(self, entity: str, action: str) -> bool:
        """Vérifie si l'utilisateur a une permission spécifique"""
        if self.role == 'super_admin':
            return True
        
        if not self.permissions:
            return False
        
        entity_permissions = self.permissions.get(entity, [])
        if isinstance(entity_permissions, list):
            return action in entity_permissions
        elif isinstance(entity_permissions, dict):
            return entity_permissions.get(action, False)
        
        return False
    
    @property
    def full_name(self):
        return f"{self.first_name} {self.last_name}"

# Fonction pour créer les tables
def create_admin_tables(engine):
    """Crée les tables d'administration"""
    Base.metadata.create_all(bind=engine)

# Fonction pour initialiser les données de test
def init_test_admin_data(db_session):
    """Initialise les données de test pour l'administration"""
    from passlib.context import CryptContext
    
    pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")
    
    # Vérifier si des admins existent déjà
    existing_admin = db_session.query(AdminUser).first()
    if existing_admin:
        return
    
    # Créer les administrateurs de test
    test_admins = [
        {
            "username": "superadmin",
            "email": "superadmin@bamboo-credit.ga",
            "password": "BambooAdmin2024!",
            "first_name": "Super",
            "last_name": "Admin",
            "role": "super_admin",
            "permissions": {
                "banks": ["create", "read", "update", "delete"],
                "credit_products": ["create", "read", "update", "delete"],
                "savings_products": ["create", "read", "update", "delete"],
                "insurance_products": ["create", "read", "update", "delete"],
                "simulations": ["read", "delete"],
                "users": ["create", "read", "update", "delete"],
                "admin_management": ["create", "read", "update", "delete"]
            }
        },
        {
            "username": "admin",
            "email": "admin@bamboo-credit.ga",
            "password": "admin",
            "first_name": "Admin",
            "last_name": "User",
            "role": "admin",
            "permissions": {
                "banks": ["read", "update"],
                "credit_products": ["create", "read", "update", "delete"],
                "savings_products": ["create", "read", "update", "delete"],
                "insurance_products": ["create", "read", "update", "delete"],
                "simulations": ["read"]
            }
        },
        {
            "username": "admin_credit",
            "email": "admin_credit@bamboo-credit.ga",
            "password": "BambooAdmin2024!",
            "first_name": "Admin",
            "last_name": "Crédit",
            "role": "admin",
            "permissions": {
                "credit_products": ["create", "read", "update", "delete"],
                "simulations": ["read"]
            }
        }
    ]
    
    for admin_data in test_admins:
        admin = AdminUser(
            username=admin_data["username"],
            email=admin_data["email"],
            password_hash=pwd_context.hash(admin_data["password"]),
            first_name=admin_data["first_name"],
            last_name=admin_data["last_name"],
            role=admin_data["role"],
            permissions=admin_data["permissions"],
            is_active=True
        )
        db_session.add(admin)
    
    try:
        db_session.commit()
        print("Administrateurs de test créés avec succès")
    except Exception as e:
        db_session.rollback()
        print(f"Erreur lors de la création des administrateurs de test: {e}")