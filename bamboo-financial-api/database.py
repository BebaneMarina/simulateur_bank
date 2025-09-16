# database.py - Configuration de la base de données corrigée pour SQLAlchemy 2.0
from sqlalchemy import create_engine, text
from sqlalchemy.ext.declarative import declarative_base
from sqlalchemy.orm import sessionmaker
from sqlalchemy.pool import StaticPool
import os
from dotenv import load_dotenv

load_dotenv()

# Configuration de la base de données
DATABASE_URL = os.getenv(
    "DATABASE_URL", 
    "postgresql://postgres:password@localhost:5432/bamboo_simulator"
)

# Pour SQLite en développement (optionnel)
if DATABASE_URL.startswith("sqlite"):
    engine = create_engine(
        DATABASE_URL,
        connect_args={"check_same_thread": False},
        poolclass=StaticPool,
        echo=True
    )
else:
    # Configuration PostgreSQL
    engine = create_engine(
        DATABASE_URL,
        pool_pre_ping=True,
        pool_recycle=300,
        echo=True
    )

SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)

Base = declarative_base()

def get_db():
    """Générateur de session de base de données"""
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()

def test_connection():
    """Test de connexion à la base de données"""
    try:
        db = SessionLocal()
        # Correction pour SQLAlchemy 2.0 : utilisation de text()
        result = db.execute(text("SELECT 1"))
        db.close()
        return True
    except Exception as e:
        print(f"Erreur de connexion à la base de données: {e}")
        return False

def create_tables():
    """Crée les tables si elles n'existent pas"""
    try:
        # Import des modèles pour créer les tables
        import models
        Base.metadata.create_all(bind=engine)
        print("Tables créées avec succès")
        return True
    except Exception as e:
        print(f"Erreur lors de la création des tables: {e}")
        return False