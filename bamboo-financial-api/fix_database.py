# fix_database.py - Script de correction de la base de données
import os
import sys
from sqlalchemy import create_engine, text, inspect
from sqlalchemy.orm import sessionmaker
from models import Base, Bank, InsuranceCompany, CreditProduct, SavingsProduct, InsuranceProduct
import logging

# Configuration du logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

def get_database_url():
    """Récupérer l'URL de la base de données"""
    return os.getenv("DATABASE_URL", "postgresql://postgres:admin@localhost:5432/bamboo_simulator")

def test_connection(engine):
    """Tester la connexion à la base de données"""
    try:
        with engine.connect() as connection:
            result = connection.execute(text("SELECT 1"))
            logger.info("✅ Connexion à la base de données réussie")
            return True
    except Exception as e:
        logger.error(f"❌ Erreur de connexion: {e}")
        return False

def check_table_structure(engine):
    """Vérifier la structure des tables"""
    inspector = inspect(engine)
    tables = inspector.get_table_names()
    
    logger.info("📋 Tables existantes:")
    for table in tables:
        logger.info(f"  - {table}")
    
    # Vérifier la table insurance_products spécifiquement
    if 'insurance_products' in tables:
        columns = inspector.get_columns('insurance_products')
        column_names = [col['name'] for col in columns]
        
        logger.info("\n🔍 Colonnes de insurance_products:")
        for col in column_names:
            logger.info(f"  - {col}")
        
        # Vérifier si bank_id existe (problème identifié)
        if 'bank_id' in column_names:
            logger.warning("⚠️  PROBLÈME DÉTECTÉ: colonne 'bank_id' trouvée dans insurance_products")
            logger.warning("    Cette colonne devrait être 'insurance_company_id'")
            return False
        elif 'insurance_company_id' in column_names:
            logger.info("✅ Structure correcte: insurance_company_id trouvée")
            return True
        else:
            logger.error("❌ Aucune colonne de référence trouvée dans insurance_products")
            return False
    else:
        logger.error("❌ Table insurance_products non trouvée")
        return False

def fix_insurance_products_table(engine):
    """Corriger la table insurance_products"""
    try:
        with engine.connect() as connection:
            # Vérifier d'abord si la correction est nécessaire
            result = connection.execute(text("""
                SELECT column_name 
                FROM information_schema.columns 
                WHERE table_name = 'insurance_products' 
                AND column_name IN ('bank_id', 'insurance_company_id')
            """))
            columns = [row[0] for row in result]
            
            if 'bank_id' in columns and 'insurance_company_id' not in columns:
                logger.info("🔧 Correction de la table insurance_products...")
                
                # Renommer la colonne bank_id en insurance_company_id
                connection.execute(text("""
                    ALTER TABLE insurance_products 
                    RENAME COLUMN bank_id TO insurance_company_id
                """))
                
                # Mettre à jour la contrainte de clé étrangère
                connection.execute(text("""
                    ALTER TABLE insurance_products 
                    DROP CONSTRAINT IF EXISTS insurance_products_bank_id_fkey
                """))
                
                connection.execute(text("""
                    ALTER TABLE insurance_products 
                    ADD CONSTRAINT insurance_products_insurance_company_id_fkey 
                    FOREIGN KEY (insurance_company_id) 
                    REFERENCES insurance_companies(id) 
                    ON DELETE CASCADE
                """))
                
                connection.commit()
                logger.info("✅ Table insurance_products corrigée avec succès")
                
            elif 'insurance_company_id' in columns:
                logger.info("✅ Table insurance_products déjà correcte")
            else:
                logger.error("❌ Structure de table inattendue")
                return False
                
    except Exception as e:
        logger.error(f"❌ Erreur lors de la correction: {e}")
        return False
    
    return True

def clean_invalid_data(engine):
    """Nettoyer les données invalides"""
    try:
        with engine.connect() as connection:
            # Supprimer les produits d'assurance avec des références invalides
            result = connection.execute(text("""
                DELETE FROM insurance_products 
                WHERE insurance_company_id NOT IN (
                    SELECT id FROM insurance_companies WHERE is_active = true
                )
            """))
            
            deleted_count = result.rowcount
            if deleted_count > 0:
                logger.info(f"🧹 {deleted_count} produits d'assurance avec références invalides supprimés")
            
            connection.commit()
            
    except Exception as e:
        logger.error(f"❌ Erreur lors du nettoyage: {e}")
        return False
    
    return True

def verify_fix(engine):
    """Vérifier que la correction a fonctionné"""
    try:
        with engine.connect() as connection:
            # Tester une requête qui causait l'erreur
            result = connection.execute(text("""
                SELECT ip.id, ip.name, ip.type, ic.name as company_name
                FROM insurance_products ip
                JOIN insurance_companies ic ON ip.insurance_company_id = ic.id
                WHERE ip.is_active = true AND ip.type = 'auto'
                LIMIT 5
            """))
            
            products = result.fetchall()
            logger.info(f"✅ Test réussi: {len(products)} produits d'assurance auto trouvés")
            
            for product in products:
                logger.info(f"  - {product[1]} ({product[3]})")
            
            return True
            
    except Exception as e:
        logger.error(f"❌ Échec du test de vérification: {e}")
        return False

def run_test_data_script(engine):
    """Exécuter le script de données de test si nécessaire"""
    try:
        with engine.connect() as connection:
            # Vérifier si nous avons des données
            result = connection.execute(text("SELECT COUNT(*) FROM banks"))
            bank_count = result.scalar()
            
            result = connection.execute(text("SELECT COUNT(*) FROM insurance_companies"))
            insurance_count = result.scalar()
            
            if bank_count == 0 or insurance_count == 0:
                logger.info("📊 Peu de données trouvées, insertion des données de test recommandée")
                logger.info("   Exécutez le script SQL des données de test pour avoir un environnement complet")
            else:
                logger.info(f"📊 Données existantes: {bank_count} banques, {insurance_count} compagnies d'assurance")
                
    except Exception as e:
        logger.error(f"❌ Erreur lors de la vérification des données: {e}")

def main():
    """Fonction principale"""
    logger.info("🚀 Démarrage du script de correction de la base de données Bamboo Financial")
    
    # Configuration de la base de données
    database_url = get_database_url()
    logger.info(f"🔗 Connexion à: {database_url.split('@')[1] if '@' in database_url else 'base locale'}")
    
    engine = create_engine(
        database_url,
        echo=False,
        pool_pre_ping=True,
        connect_args={
            "client_encoding": "utf8",
            "application_name": "bamboo_fix_script"
        }
    )
    
    # Étapes de correction
    steps = [
        ("Test de connexion", lambda: test_connection(engine)),
        ("Vérification structure", lambda: check_table_structure(engine)),
        ("Correction table insurance_products", lambda: fix_insurance_products_table(engine)),
        ("Nettoyage données invalides", lambda: clean_invalid_data(engine)),
        ("Vérification correction", lambda: verify_fix(engine)),
        ("Vérification données test", lambda: run_test_data_script(engine))
    ]
    
    success_count = 0
    for step_name, step_func in steps:
        logger.info(f"\n📝 {step_name}...")
        try:
            if step_func():
                success_count += 1
                logger.info(f"✅ {step_name} - Réussi")
            else:
                logger.error(f"❌ {step_name} - Échec")
        except Exception as e:
            logger.error(f"❌ {step_name} - Erreur: {e}")
    
    # Résumé final
    logger.info(f"\n📋 RÉSUMÉ FINAL:")
    logger.info(f"   ✅ Étapes réussies: {success_count}/{len(steps)}")
    
    if success_count == len(steps):
        logger.info("🎉 CORRECTION TERMINÉE AVEC SUCCÈS!")
        logger.info("   Votre base de données est maintenant prête à fonctionner.")
    elif success_count >= len(steps) - 1:
        logger.info("⚠️  CORRECTION MAJORITAIREMENT RÉUSSIE")
        logger.info("   La base est fonctionnelle, mais vérifiez les avertissements ci-dessus.")
    else:
        logger.error("❌ CORRECTION INCOMPLÈTE")
        logger.error("   Des problèmes subsistent. Vérifiez les erreurs ci-dessus.")
        sys.exit(1)

if __name__ == "__main__":
    main()