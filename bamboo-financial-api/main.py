# main.py - Version complète corrigée avec tous les routers + routes admin intégrées
from fastapi import FastAPI, Depends, HTTPException, Request, status
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from sqlalchemy.orm import Session
from sqlalchemy import text
from contextlib import contextmanager
from pydantic import BaseModel, EmailStr
from typing import Optional, Dict, Any
from datetime import datetime, timedelta
from jose import JWTError, jwt
from passlib.context import CryptContext
import logging
import os
from dotenv import load_dotenv


# Chargement des variables d'environnement
load_dotenv()

# Imports locaux
import models
import schemas
from database import get_db, SessionLocal
from models import AdminUser, Bank, InsuranceCompany, CreditProduct, SavingsProduct, InsuranceProduct

from routers.admin_auth_router import router as admin_router

# ==================== CONFIGURATION AUTH ====================

# Configuration JWT
SECRET_KEY = os.getenv("SECRET_KEY", "votre-cle-secrete-tres-securisee-changez-moi")
ALGORITHM = "HS256"
ACCESS_TOKEN_EXPIRE_MINUTES = 30

pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")
security = HTTPBearer(auto_error=False)

# ==================== SCHEMAS AUTH ====================

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

class LoginResponse(BaseModel):
    success: bool
    user: UserResponse
    token: str
    message: Optional[str] = None

class TokenValidationResponse(BaseModel):
    valid: bool

# ==================== MOCK ADMIN USERS ====================

class MockAdminUser:
    """Utilisateur admin fictif pour les tests"""
    def __init__(self):
        self.id = "admin-test"
        self.username = "admin"
        self.email = "admin@test.com"
        self.role = "super_admin"
        self.is_active = True
        self.first_name = "Admin"
        self.last_name = "User"
        self.permissions = {
            "banks": ["create", "read", "update", "delete"],
            "credit_products": ["create", "read", "update", "delete"],
            "savings_products": ["create", "read", "update", "delete"],
            "insurance_products": ["create", "read", "update", "delete"],
            "simulations": ["read", "delete"],
            "users": ["create", "read", "update", "delete"]
        }
        self.created_at = datetime.utcnow()
        self.last_login = None

class MockAdminUser2:
    """Deuxième utilisateur admin pour les tests"""
    def __init__(self):
        self.id = "admin-credit"
        self.username = "admin_credit"
        self.email = "admin_credit@test.com"
        self.role = "admin"
        self.is_active = True
        self.first_name = "Admin"
        self.last_name = "Credit"
        self.permissions = {
            "credit_products": ["create", "read", "update", "delete"],
            "simulations": ["read"]
        }
        self.created_at = datetime.utcnow()
        self.last_login = None

class MockSuperAdmin:
    """Super administrateur pour les tests"""
    def __init__(self):
        self.id = "superadmin"
        self.username = "superadmin"
        self.email = "superadmin@test.com"
        self.role = "super_admin"
        self.is_active = True
        self.first_name = "Super"
        self.last_name = "Admin"
        self.permissions = {
            "banks": ["create", "read", "update", "delete"],
            "credit_products": ["create", "read", "update", "delete"],
            "savings_products": ["create", "read", "update", "delete"],
            "insurance_products": ["create", "read", "update", "delete"],
            "simulations": ["read", "delete"],
            "users": ["create", "read", "update", "delete"],
            "admin_management": ["create", "read", "update", "delete"]
        }
        self.created_at = datetime.utcnow()
        self.last_login = None

# ==================== FONCTIONS AUTH ====================

def verify_password(plain_password: str, hashed_password: str) -> bool:
    """Vérifie un mot de passe"""
    return pwd_context.verify(plain_password, hashed_password)

def get_password_hash(password: str) -> str:
    """Hash un mot de passe"""
    return pwd_context.hash(password)

def create_access_token(data: dict, expires_delta: Optional[timedelta] = None):
    """Crée un token JWT"""
    to_encode = data.copy()
    if expires_delta:
        expire = datetime.utcnow() + expires_delta
    else:
        expire = datetime.utcnow() + timedelta(minutes=ACCESS_TOKEN_EXPIRE_MINUTES)
    
    to_encode.update({"exp": expire})
    encoded_jwt = jwt.encode(to_encode, SECRET_KEY, algorithm=ALGORITHM)
    return encoded_jwt

def authenticate_admin(username: str, password: str, db: Session):
    """
    Authentifie un admin - version avec base de données
    """
    try:
        # D'abord chercher dans la base de données
        admin = db.query(AdminUser).filter(
            AdminUser.username == username,
            AdminUser.is_active == True
        ).first()
        
        if admin and verify_password(password, admin.password_hash):
            return admin
        
        # Fallback sur les comptes de test si pas trouvé en BDD
        test_accounts = {
            "admin": {"password": "admin", "user_class": MockAdminUser},
            "superadmin": {"password": "BambooAdmin2024!", "user_class": MockSuperAdmin},
            "admin_credit": {"password": "BambooAdmin2024!", "user_class": MockAdminUser2}
        }
        
        if username in test_accounts:
            account = test_accounts[username]
            if password == account["password"]:
                return account["user_class"]()
        
        return None
    except Exception as e:
        print(f"Erreur authentification: {e}")
        return None

async def get_current_admin_user(
    credentials: Optional[HTTPAuthorizationCredentials] = Depends(security)
):
    """
    Récupère l'utilisateur admin courant basé sur le token
    """
    if not credentials:
        return MockAdminUser()  # Pour le développement, retourner un utilisateur par défaut
    
    credentials_exception = HTTPException(
        status_code=status.HTTP_401_UNAUTHORIZED,
        detail="Token invalide",
        headers={"WWW-Authenticate": "Bearer"},
    )
    
    try:
        payload = jwt.decode(credentials.credentials, SECRET_KEY, algorithms=[ALGORITHM])
        username: str = payload.get("sub")
        role: str = payload.get("role")
        
        if username is None:
            raise credentials_exception
            
        # Retourner l'utilisateur correspondant
        if username == "admin":
            return MockAdminUser()
        elif username == "superadmin":
            return MockSuperAdmin()
        elif username == "admin_credit":
            return MockAdminUser2()
        else:
            raise credentials_exception
            
    except JWTError:
        raise credentials_exception

# Import des routers avec gestion d'erreurs

try:
    from routers import auth_router as auth
    auth_available = True
except ImportError:
    auth_available = False
    print("Warning: auth router not available")
try:
    from routers import banks
    banks_available = True
except ImportError:
    banks_available = False
    print("Warning: banks router not available")

try:
    from routers import bank_admin
    bank_admin_available = True
except ImportError:
    bank_admin_available = False
    print("Warning: bank_admin router not available")

try:
    from routers import admin_insurance_application
    admin_insurance_application_available = True
except ImportError:
    admin_insurance_application_available = False
    print("Warning: admin_insurance_application router not available")

try: 
    from routers import insurance_router
    insurance_router_available = True
except ImportError:
    insurance_router_available = False
    print("Warning: insurance_router not available")

try:
    from routers import credits
    credits_available = True
except ImportError:
    credits_available = False
    print("Warning: credits router not available")

try:
    from routers import application
    application_available = True
except ImportError:
    application_available = False
    print("Warning: application router not available")

try:
    from routers import simulations_save
    simulations_save_available = True
except ImportError:
    simulations_save_available = False
    print("Warning: simulations_save router not available")

try:
    from routers import credit_product_admin
    credit_product_admin_available = True
except ImportError:
    credit_product_admin_available = False
    print("Warning: credit_product_admin router not available")

try:
    from routers import analytics
    analytics_available = True
except ImportError:
    analytics_available = False
    print("Warning: analytics router not available")

try:
    from routers import simulations
    simulations_available = True
except ImportError:
    simulations_available = False
    print("Warning: simulations router not available")

try:
    from routers import insurance
    insurance_available = True
except ImportError:
    insurance_available = False
    print("Warning: insurance router not available")

try :
    from routers import insurance_application
    insurance_application_available = True
except ImportError:
    insurance_application_available = False
    print("Warning: insurance_application router not available")

try:
    from routers import auth_router as auth
    auth_available = True
except ImportError:
    auth_available = False
    print("Warning: auth router not available")

try:
    from routers import savings
    savings_available = True
except ImportError:
    savings_available = False
    print("Warning: savings router not available")

try:
    from routers import savings_admin
    savings_admin_available = True
except ImportError:
    savings_admin_available = False
    print("Warning: savings_admin router not available")


try:
    from routers import insurance_admin
    insurance_admin_available = True
except ImportError:
    insurance_admin_available = False
    print("Warning: insurance_admin router not available")

try:
    from routers import insurance_application
    insurance_application_available = True
except ImportError:
    insurance_application_available = False
    print("Warning: insurance_application router not available")

try:
    from routers import credit_admin
    credit_admin_available = True
except ImportError:
    credit_admin_available = False
    print("Warning: credit_admin router not available")

try:
    from routers import admin_management_simple
    admin_management_simple_available = True
except ImportError:
    admin_management_simple_available = False
    print("Warning: admin_management_simple router not available")

try:
    from routers import admin_application
    admin_application_available = True
except ImportError:
    admin_application_available = False
    print("Warning: admin_application router not available")

try:
    from routers import savings_application
    savings_application_available = True
except ImportError:
    savings_application_available = False
    print("Warning: savings_application router not available")

try:
    from routers import admin_dashboard
    admin_dashboard_available = True
except ImportError:
    admin_dashboard_available = False
    print("Warning: admin_dashboard router not available")



# Configuration de logging
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s',
    handlers=[
        logging.FileHandler('bamboo_api.log'),
        logging.StreamHandler()
    ]
)
logger = logging.getLogger(__name__)

# Configuration FastAPI
app = FastAPI(
    title="Bamboo Financial API",
    description="API de comparaison et simulation de produits financiers au Gabon",
    version="1.0.0",
    docs_url="/docs",
    redoc_url="/redoc"
)

# Configuration CORS
origins = [
    "http://localhost:4200",      # Angular dev server
    "http://127.0.0.1:4200",     # Alternative localhost
    "http://localhost:3000",      # Si vous utilisez React
    "http://127.0.0.1:3000",
    "https://bamboo-credit.ga",
    "https://www.bamboo-credit.ga"
]

app.add_middleware(
    CORSMiddleware,
    allow_origins=origins,
    allow_credentials=True,
    allow_methods=["GET", "POST", "PUT", "DELETE", "OPTIONS", "PATCH"],
    allow_headers=[
        "Accept",
        "Accept-Language", 
        "Content-Language",
        "Content-Type",
        "Authorization",
        "X-Requested-With",
        "X-API-Version"
    ],
    expose_headers=[
        "X-Process-Time",
        "X-API-Version",
        "Access-Control-Allow-Origin"
    ]
)

# ==================== ROUTES ADMIN AUTH INTÉGRÉES ====================

@app.post("/api/admin/login", response_model=LoginResponse)
async def admin_login(login_data: LoginRequest, db: Session = Depends(get_db)):
    """
    Endpoint de connexion pour les administrateurs
    """
    try:
        logger.info(f"Tentative de connexion pour: {login_data.username}")
        
        # Authentifier l'utilisateur avec accès à la BDD
        admin_user = authenticate_admin(login_data.username, login_data.password, db)
        
        if not admin_user:
            logger.warning(f"Échec d'authentification pour: {login_data.username}")
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="Nom d'utilisateur ou mot de passe incorrect"
            )
        if not admin_user.is_active:
            logger.warning(f"Compte désactivé pour: {login_data.username}")
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="Compte désactivé"
            )
        
        # Créer le token JWT
        access_token_expires = timedelta(minutes=ACCESS_TOKEN_EXPIRE_MINUTES)
        access_token = create_access_token(
            data={"sub": admin_user.username, "role": admin_user.role},
            expires_delta=access_token_expires
        )
        
        # Mettre à jour la dernière connexion
        admin_user.last_login = datetime.utcnow()
        
        # Créer la réponse utilisateur
        user_response = UserResponse(
            id=admin_user.id,
            username=admin_user.username,
            email=admin_user.email,
            first_name=admin_user.first_name,
            last_name=admin_user.last_name,
            role=admin_user.role,
            permissions=admin_user.permissions,
            is_active=admin_user.is_active,
            last_login=admin_user.last_login
        )
        
        logger.info(f"Connexion réussie pour: {login_data.username}")
        
        return LoginResponse(
            success=True,
            user=user_response,
            token=access_token,
            message="Connexion réussie"
        )
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Erreur lors de la connexion admin: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Erreur interne du serveur"
        )

@app.post("/api/admin/logout")
async def admin_logout(current_user = Depends(get_current_admin_user)):
    """
    Endpoint de déconnexion
    """
    logger.info(f"Déconnexion de l'utilisateur: {current_user.username}")
    return {"success": True, "message": "Déconnexion réussie"}

@app.get("/api/admin/profile", response_model=UserResponse)
async def get_admin_profile(current_user = Depends(get_current_admin_user)):
    """
    Récupérer le profil de l'admin connecté
    """
    return UserResponse(
        id=current_user.id,
        username=current_user.username,
        email=current_user.email,
        first_name=current_user.first_name,
        last_name=current_user.last_name,
        role=current_user.role,
        permissions=current_user.permissions,
        is_active=current_user.is_active,
        last_login=current_user.last_login
    )

@app.get("/api/admin/validate-token", response_model=TokenValidationResponse)
async def validate_admin_token(current_user = Depends(get_current_admin_user)):
    """
    Valider le token JWT
    """
    try:
        # Si on arrive ici, c'est que le token est valide
        return TokenValidationResponse(valid=True)
    except Exception:
        return TokenValidationResponse(valid=False)

# ==================== MIDDLEWARE CORS PERSONNALISÉ ====================

@app.middleware("http")
async def cors_handler(request: Request, call_next):
    """Middleware CORS personnalisé pour gérer tous les cas"""
    origin = request.headers.get('origin')
    
    # Traiter la requête
    if request.method == "OPTIONS":
        # Réponse preflight
        response = JSONResponse(content={"status": "ok"})
    else:
        response = await call_next(request)
    
    # Ajouter les headers CORS
    if origin and any(origin.startswith(allowed) for allowed in [
        "http://localhost:4200", 
        "http://127.0.0.1:4200",
        "http://localhost:3000",
        "https://bamboo-credit.ga"
    ]):
        response.headers["Access-Control-Allow-Origin"] = origin
    else:
        response.headers["Access-Control-Allow-Origin"] = "http://localhost:4200"
    
    response.headers["Access-Control-Allow-Methods"] = "GET, POST, PUT, DELETE, OPTIONS, PATCH"
    response.headers["Access-Control-Allow-Headers"] = "Accept, Accept-Language, Content-Language, Content-Type, Authorization, X-Requested-With, X-API-Version"
    response.headers["Access-Control-Allow-Credentials"] = "true"
    response.headers["Access-Control-Max-Age"] = "86400"
    
    return response

# Inclusion des routers - seulement ceux qui sont disponibles
if admin_router:
    app.include_router(admin_router, prefix="/api/admin", tags=["Admin"])
    logger.info("Admin router included")
if auth_available:
    app.include_router(auth.router, prefix="/api", tags=["Authentification"])
    logger.info("Auth router included")
if banks_available:
    app.include_router(banks.router, prefix="/api/banks", tags=["Banques"])
    logger.info("Banks router included")

if bank_admin_available:
    app.include_router(bank_admin.router, prefix="/api/admin/banks", tags=["Admin - Banques"])
    logger.info("Bank admin router included")

if credits_available:
    app.include_router(credits.router, prefix="/api/credits", tags=["Crédits"])
    logger.info("Credits router included")

if analytics_available:
    app.include_router(analytics.router, prefix="/api/analytics", tags=["Analytics"])
    logger.info("Analytics router included")

if admin_insurance_application_available:
    app.include_router(admin_insurance_application.router, tags=["Admin Insurance Applications"])
    logger.info("Admin insurance application router included")

if simulations_available:
    app.include_router(simulations.router, prefix="/api/simulations", tags=["Simulations"])
    logger.info("Simulations router included")

if insurance_router_available:
    app.include_router(insurance_router.router,tags=["Assurances"])
    logger.info("Insurance router included")

if simulations_save_available:
    app.include_router(simulations_save.router, prefix="/api/simulations", tags=["Simulations Save"])
    logger.info("Simulations save router included")

if insurance_available:
    app.include_router(insurance.router, prefix="/api/insurance", tags=["Assurances"])
    logger.info("Insurance router included")

if savings_application_available:
    app.include_router(savings_application.router, prefix="/api", tags=["Savings Applications"])
    logger.info("Savings application router included")

if insurance_admin_available:
    app.include_router(insurance_admin.router, prefix="/api")
    logger.info("Insurance admin router included")
    
if credit_product_admin_available:
    app.include_router(credit_product_admin.router, prefix="/api")
    logger.info("Credit product admin router included")

if auth_available:
    app.include_router(auth.router, prefix="/api", tags=["Authentification"])
    logger.info("Auth router included")

if application_available:
    app.include_router(application.router, tags=["Applications"])  # Pas de prefix car déjà défini dans le router
    logger.info("Application router included")

if admin_application_available:
    app.include_router(admin_application.router, tags=["Admin Applications"])
    logger.info("Admin application router included")

if savings_available:
    app.include_router(savings.router, prefix="/api/savings", tags=["Épargne"])
    logger.info("Savings router included")



if insurance_application_available:
    app.include_router(insurance_application.router, prefix="/api", tags=["Insurance Applications"])
    logger.info("Insurance application router included")
if savings_admin_available:
    app.include_router(savings_admin.router, prefix="/api")
    logger.info("Savings admin router included")

if credit_admin_available:
    app.include_router(credit_admin.router, prefix="/api/admin/credits", tags=["Admin - Crédits"])
    logger.info("Credit admin router included")

if admin_management_simple_available:
    app.include_router(admin_management_simple.router, tags=["Admin - Gestion"])
    logger.info("Admin management router included")

if admin_dashboard_available:
    app.include_router(admin_dashboard.router, prefix="/api", tags=["Admin - Dashboard"])
    logger.info("Admin dashboard router included")

# ==================== ENDPOINTS PRINCIPAUX ====================

@app.get("/")
async def root():
    """Point d'entrée principal de l'API"""
    available_routes = []
    if banks_available:
        available_routes.append("banks")
    if bank_admin_available:
        available_routes.append("bank_admin")
    if credits_available:
        available_routes.append("credits")
    if analytics_available:
        available_routes.append("analytics")
    if insurance_router_available:
        available_routes.append("insurance")
    if insurance_application_available:
        available_routes.append("insurance_application")
    if simulations_save_available:
        available_routes.append("simulations_save")
    if simulations_available:
        available_routes.append("simulations")
    if insurance_available:
        available_routes.append("insurance")
    if application_available:
        available_routes.append("application")
    if admin_application_available:
        available_routes.append("admin_application")
    if admin_insurance_application_available:
        available_routes.append("admin_insurance_application")
    if savings_available:
        available_routes.append("savings")
    if savings_admin_available:
        available_routes.append("savings_admin")
    if savings_application_available:
        available_routes.append("savings_application")
    if insurance_admin_available:
        available_routes.append("insurance_admin")
    if admin_management_simple_available:
        available_routes.append("admin_management_simple")
    if admin_dashboard_available:
        available_routes.append("admin_dashboard")
    
    available_routes.append("admin_auth")  # Toujours disponible maintenant
    
    return {
        "message": "Bienvenue sur l'API Bamboo Financial",
        "description": "Votre comparateur de produits financiers au Gabon",
        "version": "1.0.0",
        "documentation": "/docs",
        "status": "active",
        "cors_enabled": True,
        "available_routes": available_routes,
        "authentication": {
            "status": "available",  # Maintenant toujours disponible
            "login": "/api/admin/login",
            "profile": "/api/admin/profile",
            "logout": "/api/admin/logout",
            "validate_token": "/api/admin/validate-token"
        },
        "admin_routes": {
            "banks": "/api/admin/banks" if bank_admin_available else "not_available",
            "banks_stats": "/api/admin/banks/stats" if bank_admin_available else "not_available",
            "admin_management": "/api/admin/management/admins" if admin_management_simple_available else "not_available",
            "admin_stats": "/api/admin/management/stats" if admin_management_simple_available else "not_available",
            "dashboard": "/api/admin/dashboard/stats" if admin_dashboard_available else "not_available"
        },
        "public_routes": {
            "banks": "/api/banks" if banks_available else "not_available",
            "credits": "/api/credits/products" if credits_available else "not_available",
            "savings": "/api/savings/products" if savings_available else "not_available",
            "insurance": "/api/insurance/products" if insurance_available else "not_available",
            "simulations": "/api/simulations" if simulations_available else "not_available",
            "analytics": "/api/analytics/market-statistics" if analytics_available else "not_available"
        },
        "test_accounts": {
            "admin": {
                "username": "admin",
                "password": "admin",
                "role": "super_admin"
            },
            "superadmin": {
                "username": "superadmin",
                "password": "BambooAdmin2024!",
                "role": "super_admin"
            },
            "admin_credit": {
                "username": "admin_credit",
                "password": "BambooAdmin2024!",
                "role": "admin"
            }
        }
    }

@app.get("/api/health")
async def health_check():
    """Vérification de l'état de l'API et de la base de données"""
    try:
        # Test de connexion à la base de données
        db = SessionLocal()
        db.execute(text("SELECT 1"))
        db.close()
        
        return {
            "status": "healthy",
            "timestamp": datetime.utcnow(),
            "database": "connected",
            "version": "1.0.0",
            "cors": "enabled",
            "admin_panel": "available",  # Maintenant toujours disponible
            "authentication": "available",
            "available_modules": {
                "banks": banks_available,
                "bank_admin": bank_admin_available,
                "credits": credits_available,
                "savings": savings_available,
                "insurance": insurance_available,
                "simulations": simulations_available,
                "analytics": analytics_available,
                "auth": True,  # Maintenant intégré
                "admin_auth": True
            }
        }
    except Exception as e:
        logger.error(f"Health check failed: {str(e)}")
        return {
            "status": "unhealthy",
            "timestamp": datetime.utcnow(),
            "database": "disconnected",
            "error": str(e)
        }

# Test spécifique pour l'endpoint admin
@app.get("/api/admin/test")
async def test_admin_endpoint():
    """Test spécifique pour vérifier que les routes admin fonctionnent"""
    return {
        "message": "Admin routes are working correctly",
        "timestamp": datetime.utcnow(),
        "endpoints": {
            "login": "/api/admin/login",
            "profile": "/api/admin/profile", 
            "logout": "/api/admin/logout",
            "validate_token": "/api/admin/validate-token"
        },
        "test_credentials": {
            "username": "admin",
            "password": "admin"
        }
    }

@app.get("/api/debug/all-routes")
async def debug_all_routes():
    """Debug : Liste toutes les routes disponibles"""
    routes_info = []
    for route in app.routes:
        if hasattr(route, 'methods') and hasattr(route, 'path'):
            routes_info.append({
                "path": route.path,
                "methods": list(route.methods),
                "name": getattr(route, 'name', 'unnamed')
            })
    
    # Filtrer les routes qui contiennent 'application' ou 'insurance'
    relevant_routes = [r for r in routes_info if 'application' in r['path'] or 'insurance' in r['path']]
    
    return {
        "total_routes": len(routes_info),
        "relevant_routes": relevant_routes,
        "all_routes": routes_info
    }

# Endpoint de test CORS spécifique
@app.get("/api/test-cors")
async def test_cors():
    """Test spécifique pour vérifier CORS"""
    return {
        "message": "CORS is working correctly",
        "timestamp": datetime.utcnow(),
        "server": "FastAPI",
        "cors_enabled": True,
        "authentication_enabled": True
    }

# Ajoutez cet endpoint temporaire dans main.py pour le debug

@app.get("/api/admin/debug/users")
async def debug_list_users(db: Session = Depends(get_db)):
    """Endpoint temporaire pour lister tous les utilisateurs admin"""
    try:
        # Lister tous les utilisateurs admin
        users = db.query(AdminUser).all()
        
        result = []
        for user in users:
            result.append({
                "id": user.id,
                "username": user.username,
                "email": user.email,
                "role": user.role,
                "is_active": user.is_active,
                "password_hash_preview": user.password_hash[:20] + "..." if user.password_hash else None
            })
            
        return {
            "total_users": len(result),
            "users": result
        }
        
    except Exception as e:
        return {
            "error": str(e),
            "users": []
        }

@app.post("/api/admin/debug/verify-password")
async def debug_verify_password(
    data: dict,
    db: Session = Depends(get_db)
):
    """Endpoint temporaire pour vérifier un mot de passe"""
    try:
        username = data.get("username")
        password = data.get("password")
        
        if not username or not password:
            return {"error": "Username et password requis"}
            
        # Chercher l'utilisateur
        user = db.query(AdminUser).filter(AdminUser.username == username).first()
        
        if not user:
            return {
                "found": False,
                "error": "Utilisateur non trouvé"
            }
            
        # Vérifier le mot de passe
        password_valid = verify_password(password, user.password_hash)
        
        return {
            "found": True,
            "username": user.username,
            "is_active": user.is_active,
            "password_valid": password_valid,
            "role": user.role
        }
        
    except Exception as e:
        return {"error": str(e)}

@app.get("/api/stats")
async def get_api_stats(db: Session = Depends(get_db)):
    """Statistiques générales de l'API"""
    try:
        stats = {
            "banks": {"active": 0, "total": 0},
            "products": {"credit": 0, "savings": 0, "insurance": 0, "total": 0},
            "simulations": {"credit": 0, "savings": 0, "total": 0},
            "admin_users": {"total": 3, "active": 3},  # Nos utilisateurs de test
            "last_updated": datetime.utcnow(),
            "available_modules": {
                "banks": banks_available,
                "bank_admin": bank_admin_available,
                "credits": credits_available,
                "savings": savings_available,
                "insurance": insurance_available,
                "simulations": simulations_available,
                "analytics": analytics_available,
                "auth": True,
                "admin_auth": True
            }
        }
        
        # Statistiques des banques si le modèle existe
        try:
            if hasattr(models, 'Bank'):
                total_banks = db.query(models.Bank).count()
                active_banks = db.query(models.Bank).filter(models.Bank.is_active == True).count()
                stats["banks"] = {"total": total_banks, "active": active_banks}
        except Exception as e:
            logger.warning(f"Error getting bank stats: {str(e)}")
        
        # Statistiques des produits de crédit
        try:
            if hasattr(models, 'CreditProduct'):
                total_credit_products = db.query(models.CreditProduct).filter(
                    models.CreditProduct.is_active == True
                ).count()
                stats["products"]["credit"] = total_credit_products
        except Exception as e:
            logger.warning(f"Error getting credit product stats: {str(e)}")
        
        # Statistiques des produits d'épargne
        try:
            if hasattr(models, 'SavingsProduct'):
                total_savings_products = db.query(models.SavingsProduct).filter(
                    models.SavingsProduct.is_active == True
                ).count()
                stats["products"]["savings"] = total_savings_products
        except Exception as e:
            logger.warning(f"Error getting savings product stats: {str(e)}")
        
        # Statistiques des produits d'assurance
        try:
            if hasattr(models, 'InsuranceProduct'):
                total_insurance_products = db.query(models.InsuranceProduct).filter(
                    models.InsuranceProduct.is_active == True
                ).count()
                stats["products"]["insurance"] = total_insurance_products
        except Exception as e:
            logger.warning(f"Error getting insurance product stats: {str(e)}")
        
        # Statistiques des simulations
        try:
            if hasattr(models, 'CreditSimulation'):
                total_credit_simulations = db.query(models.CreditSimulation).count()
                stats["simulations"]["credit"] = total_credit_simulations
        except Exception as e:
            logger.warning(f"Error getting credit simulation stats: {str(e)}")
        
        try:
            if hasattr(models, 'SavingsSimulation'):
                total_savings_simulations = db.query(models.SavingsSimulation).count()
                stats["simulations"]["savings"] = total_savings_simulations
        except Exception as e:
            logger.warning(f"Error getting savings simulation stats: {str(e)}")
        
        # Calcul des totaux
        stats["products"]["total"] = (
            stats["products"]["credit"] + 
            stats["products"]["savings"] + 
            stats["products"]["insurance"]
        )
        
        stats["simulations"]["total"] = (
            stats["simulations"]["credit"] + 
            stats["simulations"]["savings"]
        )
        
        return stats
        
    except Exception as e:
        logger.error(f"Error getting stats: {str(e)}")
        raise HTTPException(status_code=500, detail="Erreur lors de la récupération des statistiques")

@app.get("/api/search")
async def search_products(
    q: str,
    type: str = None,
    db: Session = Depends(get_db)
):
    """Recherche globale de produits financiers"""
    results = {"credit": [], "savings": [], "insurance": []}
    
    try:
        # Recherche dans les produits de crédit si disponible
        if hasattr(models, 'Bank') and hasattr(models, 'CreditProduct'):
            if not type or type == "credit":
                try:
                    credit_query = db.query(models.CreditProduct).join(models.Bank).filter(
                        models.CreditProduct.is_active == True,
                        models.Bank.is_active == True
                    )
                    
                    credit_products = credit_query.filter(
                        models.CreditProduct.name.ilike(f"%{q}%") |
                        models.CreditProduct.description.ilike(f"%{q}%") |
                        models.CreditProduct.type.ilike(f"%{q}%")
                    ).limit(10).all()
                    
                    results["credit"] = [
                        {
                            "id": p.id,
                            "name": p.name,
                            "type": p.type,
                            "bank_name": p.bank.name if p.bank else "N/A",
                            "average_rate": float(p.average_rate),
                            "min_amount": float(p.min_amount),
                            "max_amount": float(p.max_amount)
                        } for p in credit_products
                    ]
                except Exception as e:
                    logger.warning(f"Credit search failed: {str(e)}")
        
        # Recherche dans les produits d'épargne
        if hasattr(models, 'SavingsProduct'):
            if not type or type == "savings":
                try:
                    savings_products = db.query(models.SavingsProduct).join(models.Bank).filter(
                        models.SavingsProduct.is_active == True,
                        models.Bank.is_active == True,
                        models.SavingsProduct.name.ilike(f"%{q}%") |
                        models.SavingsProduct.description.ilike(f"%{q}%") |
                        models.SavingsProduct.type.ilike(f"%{q}%")
                    ).limit(10).all()
                    
                    results["savings"] = [
                        {
                            "id": p.id,
                            "name": p.name,
                            "type": p.type,
                            "bank_name": p.bank.name if p.bank else "N/A",
                            "interest_rate": float(p.interest_rate),
                            "minimum_deposit": float(p.minimum_deposit)
                        } for p in savings_products
                    ]
                except Exception as e:
                    logger.warning(f"Savings search failed: {str(e)}")
        
        # Recherche dans les produits d'assurance
        if hasattr(models, 'InsuranceProduct'):
            if not type or type == "insurance":
                try:
                    insurance_products = db.query(models.InsuranceProduct).filter(
                        models.InsuranceProduct.is_active == True,
                        models.InsuranceProduct.name.ilike(f"%{q}%") |
                        models.InsuranceProduct.description.ilike(f"%{q}%") |
                        models.InsuranceProduct.type.ilike(f"%{q}%")
                    ).limit(10).all()
                    
                    results["insurance"] = [
                        {
                            "id": p.id,
                            "name": p.name,
                            "type": p.type,
                            "company_name": p.insurance_company.name if hasattr(p, 'insurance_company') and p.insurance_company else "N/A",
                            "base_premium": float(p.base_premium) if p.base_premium else 0
                        } for p in insurance_products
                    ]
                except Exception as e:
                    logger.warning(f"Insurance search failed: {str(e)}")
        
        return {
            "query": q,
            "results": results,
            "total_found": len(results["credit"]) + len(results["savings"]) + len(results["insurance"]),
            "available_types": [
                "credit" if hasattr(models, 'CreditProduct') else None,
                "savings" if hasattr(models, 'SavingsProduct') else None,
                "insurance" if hasattr(models, 'InsuranceProduct') else None
            ]
        }
        
    except Exception as e:
        logger.error(f"Search error: {str(e)}")
        raise HTTPException(status_code=500, detail="Erreur lors de la recherche")

# ==================== GESTION D'ERREURS AMÉLIORÉE ====================

@app.exception_handler(HTTPException)
async def http_exception_handler(request: Request, exc: HTTPException):
    """Gestionnaire d'exceptions HTTP avec CORS"""
    response = JSONResponse(
        status_code=exc.status_code,
        content={
            "error": True,
            "message": exc.detail,
            "status_code": exc.status_code,
            "timestamp": datetime.utcnow().isoformat()
        }
    )
    
    # Ajouter les headers CORS même pour les erreurs
    origin = request.headers.get('origin')
    if origin and origin in origins:
        response.headers["Access-Control-Allow-Origin"] = origin
    
    return response

@app.exception_handler(Exception)
async def general_exception_handler(request: Request, exc: Exception):
    """Gestionnaire d'exceptions générales avec CORS"""
    logger.error(f"Unhandled exception: {str(exc)}", exc_info=True)
    
    response = JSONResponse(
        status_code=500,
        content={
            "error": True,
            "message": "Erreur interne du serveur",
            "status_code": 500,
            "timestamp": datetime.utcnow().isoformat()
        }
    )
    
    # Ajouter les headers CORS même pour les erreurs
    origin = request.headers.get('origin')
    if origin and origin in origins:
        response.headers["Access-Control-Allow-Origin"] = origin
    
    return response

# ==================== ÉVÉNEMENTS DE DÉMARRAGE/ARRÊT ====================

@app.on_event("startup")
async def startup_event():
    """Initialisation au démarrage"""
    logger.info("Démarrage de l'API Bamboo Financial")
    logger.info(f"Modules disponibles - Banks: {banks_available}, Bank Admin: {bank_admin_available}, Credits: {credits_available}, Insurance: {insurance_available}, Simulations: {simulations_available}, Savings: {savings_available}")
    logger.info("Routes d'authentification admin intégrées et disponibles")
    
    # Test de connexion à la base de données
    try:
        db = SessionLocal()
        db.execute(text("SELECT 1"))
        db.close()
        logger.info("Connexion à la base de données réussie")
        
        # Optionnel : Créer les tables si elles n'existent pas
        try:
            if hasattr(models, 'create_tables'):
                models.create_tables()
                logger.info("Tables vérifiées/créées")
        except Exception as e:
            logger.warning(f"Erreur création tables: {str(e)}")
            
    except Exception as e:
        logger.error(f"Erreur lors de la connexion à la base de données: {str(e)}")

@app.on_event("shutdown")
async def shutdown_event():
    """Nettoyage à l'arrêt"""
    logger.info("Arrêt de l'API Bamboo Financial")

# ==================== INFORMATIONS DE VERSION ====================

@app.get("/api/version")
async def get_version():
    """Informations de version de l'API"""
    return {
        "name": "Bamboo Financial API",
        "version": "1.0.0",
        "environment": os.getenv("ENVIRONMENT", "development"),
        "build_date": "2024-01-15",
        "description": "API de comparaison de produits financiers au Gabon",
        "cors_enabled": True,
        "authentication_enabled": True,  # Maintenant toujours True
        "available_modules": {
            "banks": banks_available,
            "bank_admin": bank_admin_available,
            "credits": credits_available,
            "savings": savings_available,
            "insurance": insurance_available,
            "simulations": simulations_available,
            "analytics": analytics_available,
            "auth": True,  # Maintenant intégré
            "admin_auth": True,
            "admin_management": admin_management_simple_available
        },
        "endpoints": {
            "public": {
                "banks": "/api/banks" if banks_available else "not_available",
                "credits": "/api/credits/products" if credits_available else "not_available",
                "savings": "/api/savings/products" if savings_available else "not_available",
                "insurance": "/api/insurance/products" if insurance_available else "not_available",
                "simulations": "/api/simulations" if simulations_available else "not_available",
                "analytics": "/api/analytics" if analytics_available else "not_available"
            },
            "admin": {
                "login": "/api/admin/login",  # Maintenant toujours disponible
                "profile": "/api/admin/profile",
                "logout": "/api/admin/logout",
                "validate_token": "/api/admin/validate-token",
                "test": "/api/admin/test",
                "dashboard": "/api/admin/dashboard/stats" if admin_dashboard_available else "not_available",
                "banks": "/api/admin/banks" if bank_admin_available else "not_available",
                "banks_stats": "/api/admin/banks/stats" if bank_admin_available else "not_available",
                "admins_list": "/api/admin/management/admins" if admin_management_simple_available else "not_available",
                "admins_create": "/api/admin/management/admins" if admin_management_simple_available else "not_available",
                "admins_stats": "/api/admin/management/stats" if admin_management_simple_available else "not_available",
                "institutions": "/api/admin/management/institutions" if admin_management_simple_available else "not_available"
            }
        }
    }

if __name__ == "__main__":
    import uvicorn
    
    # Configuration pour le développement
    uvicorn.run(
        "main:app",
        host="0.0.0.0",
        port=8000,
        reload=True,
        log_level="info"
    )