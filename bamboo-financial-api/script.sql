-- Script de mise à jour de la base de données pour la gestion des administrateurs
-- Version: 1.1.0 - Ajout de la gestion des administrateurs par institution

-- =========================================================
-- 1. MISE À JOUR DE LA TABLE admin_users
-- =========================================================

-- Ajouter les nouvelles colonnes pour l'assignation d'institutions
ALTER TABLE admin_users 
ADD COLUMN IF NOT EXISTS assigned_bank_id VARCHAR(50) REFERENCES banks(id),
ADD COLUMN IF NOT EXISTS assigned_insurance_company_id VARCHAR(50) REFERENCES insurance_companies(id);

-- Ajouter des index pour les performances
CREATE INDEX IF NOT EXISTS idx_admin_users_assigned_bank ON admin_users(assigned_bank_id);
CREATE INDEX IF NOT EXISTS idx_admin_users_assigned_insurance ON admin_users(assigned_insurance_company_id);

-- =========================================================
-- 2. MISE À JOUR DES TABLES DE PRODUITS
-- =========================================================

-- Ajouter la traçabilité sur les produits de crédit
ALTER TABLE credit_products 
ADD COLUMN IF NOT EXISTS created_by_admin VARCHAR(50) REFERENCES admin_users(id),
ADD COLUMN IF NOT EXISTS updated_by_admin VARCHAR(50) REFERENCES admin_users(id);

-- Ajouter la traçabilité sur les produits d'épargne
ALTER TABLE savings_products 
ADD COLUMN IF NOT EXISTS created_by_admin VARCHAR(50) REFERENCES admin_users(id),
ADD COLUMN IF NOT EXISTS updated_by_admin VARCHAR(50) REFERENCES admin_users(id);

-- Ajouter la traçabilité sur les produits d'assurance
ALTER TABLE insurance_products 
ADD COLUMN IF NOT EXISTS created_by_admin VARCHAR(50) REFERENCES admin_users(id),
ADD COLUMN IF NOT EXISTS updated_by_admin VARCHAR(50) REFERENCES admin_users(id);

-- Ajouter des index pour les performances
CREATE INDEX IF NOT EXISTS idx_credit_products_created_by ON credit_products(created_by_admin);
CREATE INDEX IF NOT EXISTS idx_credit_products_updated_by ON credit_products(updated_by_admin);
CREATE INDEX IF NOT EXISTS idx_savings_products_created_by ON savings_products(created_by_admin);
CREATE INDEX IF NOT EXISTS idx_savings_products_updated_by ON savings_products(updated_by_admin);
CREATE INDEX IF NOT EXISTS idx_insurance_products_created_by ON insurance_products(created_by_admin);
CREATE INDEX IF NOT EXISTS idx_insurance_products_updated_by ON insurance_products(updated_by_admin);

-- =========================================================
-- 3. MISE À JOUR DE LA TABLE audit_logs
-- =========================================================

-- Ajouter une relation avec l'utilisateur concerné si nécessaire
ALTER TABLE audit_logs 
ADD COLUMN IF NOT EXISTS target_user_id VARCHAR(50);

CREATE INDEX IF NOT EXISTS idx_audit_logs_target_user ON audit_logs(target_user_id);

-- =========================================================
-- 4. CRÉATION DE VUES POUR L'ADMINISTRATION
-- =========================================================

-- Vue des administrateurs avec leurs institutions
CREATE OR REPLACE VIEW admin_users_with_institutions AS
SELECT 
    au.id,
    au.username,
    au.email,
    au.first_name,
    au.last_name,
    au.role,
    au.is_active,
    au.last_login,
    au.created_at,
    au.updated_at,
    au.permissions,
    -- Informations banque assignée
    b.id as bank_id,
    b.name as bank_name,
    b.full_name as bank_full_name,
    -- Informations compagnie d'assurance assignée
    ic.id as insurance_company_id,
    ic.name as insurance_company_name,
    ic.full_name as insurance_company_full_name,
    -- Utilisateur créateur
    creator.username as created_by_username
FROM admin_users au
LEFT JOIN banks b ON au.assigned_bank_id = b.id
LEFT JOIN insurance_companies ic ON au.assigned_insurance_company_id = ic.id
LEFT JOIN admin_users creator ON au.created_by = creator.id
WHERE au.role != 'super_admin'
ORDER BY au.created_at DESC;

-- Vue statistiques des administrateurs
CREATE OR REPLACE VIEW admin_stats_view AS
SELECT 
    'total_admins' as metric,
    COUNT(*) as value
FROM admin_users 
WHERE role != 'super_admin'
UNION ALL
SELECT 
    'active_admins' as metric,
    COUNT(*) as value
FROM admin_users 
WHERE role != 'super_admin' AND is_active = true
UNION ALL
SELECT 
    'bank_admins' as metric,
    COUNT(*) as value
FROM admin_users 
WHERE role = 'bank_admin'
UNION ALL
SELECT 
    'insurance_admins' as metric,
    COUNT(*) as value
FROM admin_users 
WHERE role = 'insurance_admin'
UNION ALL
SELECT 
    'moderators' as metric,
    COUNT(*) as value
FROM admin_users 
WHERE role = 'moderator'
UNION ALL
SELECT 
    'recent_admins' as metric,
    COUNT(*) as value
FROM admin_users 
WHERE role != 'super_admin' 
AND created_at >= DATE_TRUNC('month', CURRENT_DATE);

-- Vue des produits avec leurs créateurs
CREATE OR REPLACE VIEW products_with_creators AS
SELECT 
    'credit' as product_type,
    cp.id,
    cp.name,
    cp.type,
    cp.is_active,
    cp.created_at,
    cp.updated_at,
    b.name as institution_name,
    b.id as institution_id,
    creator.username as created_by_username,
    updater.username as updated_by_username
FROM credit_products cp
JOIN banks b ON cp.bank_id = b.id
LEFT JOIN admin_users creator ON cp.created_by_admin = creator.id
LEFT JOIN admin_users updater ON cp.updated_by_admin = updater.id
UNION ALL
SELECT 
    'savings' as product_type,
    sp.id,
    sp.name,
    sp.type,
    sp.is_active,
    sp.created_at,
    sp.updated_at,
    b.name as institution_name,
    b.id as institution_id,
    creator.username as created_by_username,
    updater.username as updated_by_username
FROM savings_products sp
JOIN banks b ON sp.bank_id = b.id
LEFT JOIN admin_users creator ON sp.created_by_admin = creator.id
LEFT JOIN admin_users updater ON sp.updated_by_admin = updater.id
UNION ALL
SELECT 
    'insurance' as product_type,
    ip.id,
    ip.name,
    ip.type,
    ip.is_active,
    ip.created_at,
    ip.updated_at,
    ic.name as institution_name,
    ic.id as institution_id,
    creator.username as created_by_username,
    updater.username as updated_by_username
FROM insurance_products ip
JOIN insurance_companies ic ON ip.insurance_company_id = ic.id
LEFT JOIN admin_users creator ON ip.created_by_admin = creator.id
LEFT JOIN admin_users updater ON ip.updated_by_admin = updater.id;

-- =========================================================
-- 5. FONCTIONS UTILITAIRES
-- =========================================================

-- Fonction pour assigner un administrateur à une banque
CREATE OR REPLACE FUNCTION assign_admin_to_bank(
    admin_id_param VARCHAR(50),
    bank_id_param VARCHAR(50)
) RETURNS BOOLEAN AS $$
BEGIN
    -- Vérifier que l'admin et la banque existent
    IF NOT EXISTS (SELECT 1 FROM admin_users WHERE id = admin_id_param) THEN
        RAISE EXCEPTION 'Administrateur non trouvé: %', admin_id_param;
    END IF;
    
    IF NOT EXISTS (SELECT 1 FROM banks WHERE id = bank_id_param) THEN
        RAISE EXCEPTION 'Banque non trouvée: %', bank_id_param;
    END IF;
    
    -- Mettre à jour l'assignation
    UPDATE admin_users 
    SET 
        assigned_bank_id = bank_id_param,
        assigned_insurance_company_id = NULL,
        role = 'bank_admin',
        updated_at = CURRENT_TIMESTAMP
    WHERE id = admin_id_param;
    
    RETURN TRUE;
END;
$$ LANGUAGE plpgsql;

-- Fonction pour assigner un administrateur à une compagnie d'assurance
CREATE OR REPLACE FUNCTION assign_admin_to_insurance(
    admin_id_param VARCHAR(50),
    insurance_id_param VARCHAR(50)
) RETURNS BOOLEAN AS $$
BEGIN
    -- Vérifier que l'admin et la compagnie existent
    IF NOT EXISTS (SELECT 1 FROM admin_users WHERE id = admin_id_param) THEN
        RAISE EXCEPTION 'Administrateur non trouvé: %', admin_id_param;
    END IF;
    
    IF NOT EXISTS (SELECT 1 FROM insurance_companies WHERE id = insurance_id_param) THEN
        RAISE EXCEPTION 'Compagnie d''assurance non trouvée: %', insurance_id_param;
    END IF;
    
    -- Mettre à jour l'assignation
    UPDATE admin_users 
    SET 
        assigned_insurance_company_id = insurance_id_param,
        assigned_bank_id = NULL,
        role = 'insurance_admin',
        updated_at = CURRENT_TIMESTAMP
    WHERE id = admin_id_param;
    
    RETURN TRUE;
END;
$$ LANGUAGE plpgsql;

-- Fonction pour obtenir les statistiques d'un administrateur
CREATE OR REPLACE FUNCTION get_admin_stats(admin_id_param VARCHAR(50))
RETURNS TABLE(
    metric VARCHAR(50),
    value INTEGER
) AS $$
BEGIN
    -- Vérifier que l'admin existe
    IF NOT EXISTS (SELECT 1 FROM admin_users WHERE id = admin_id_param) THEN
        RAISE EXCEPTION 'Administrateur non trouvé: %', admin_id_param;
    END IF;
    
    RETURN QUERY
    SELECT 'products_created'::VARCHAR(50), COUNT(*)::INTEGER
    FROM (
        SELECT 1 FROM credit_products WHERE created_by_admin = admin_id_param
        UNION ALL
        SELECT 1 FROM savings_products WHERE created_by_admin = admin_id_param
        UNION ALL
        SELECT 1 FROM insurance_products WHERE created_by_admin = admin_id_param
    ) subq
    UNION ALL
    SELECT 'products_updated'::VARCHAR(50), COUNT(*)::INTEGER
    FROM (
        SELECT 1 FROM credit_products WHERE updated_by_admin = admin_id_param
        UNION ALL
        SELECT 1 FROM savings_products WHERE updated_by_admin = admin_id_param
        UNION ALL
        SELECT 1 FROM insurance_products WHERE updated_by_admin = admin_id_param
    ) subq;
END;
$ LANGUAGE plpgsql;

-- =========================================================
-- 6. TRIGGERS POUR L'AUDIT AUTOMATIQUE
-- =========================================================

-- Fonction trigger pour l'audit des produits
CREATE OR REPLACE FUNCTION audit_product_changes()
RETURNS TRIGGER AS $
DECLARE
    entity_type_name VARCHAR(50);
    admin_id VARCHAR(50);
BEGIN
    -- Déterminer le type d'entité
    entity_type_name := TG_TABLE_NAME;
    
    IF TG_OP = 'INSERT' THEN
        -- Récupérer l'admin qui a créé
        admin_id := COALESCE(NEW.created_by_admin, 'system');
        
        INSERT INTO audit_logs (
            id, admin_user_id, action, entity_type, entity_id, 
            new_values, created_at
        ) VALUES (
            gen_random_uuid()::VARCHAR(50),
            admin_id,
            'CREATE',
            entity_type_name,
            NEW.id,
            row_to_json(NEW),
            CURRENT_TIMESTAMP
        );
        
        RETURN NEW;
        
    ELSIF TG_OP = 'UPDATE' THEN
        -- Récupérer l'admin qui a modifié
        admin_id := COALESCE(NEW.updated_by_admin, OLD.created_by_admin, 'system');
        
        INSERT INTO audit_logs (
            id, admin_user_id, action, entity_type, entity_id,
            old_values, new_values, created_at
        ) VALUES (
            gen_random_uuid()::VARCHAR(50),
            admin_id,
            'UPDATE',
            entity_type_name,
            NEW.id,
            row_to_json(OLD),
            row_to_json(NEW),
            CURRENT_TIMESTAMP
        );
        
        RETURN NEW;
        
    ELSIF TG_OP = 'DELETE' THEN
        -- Récupérer l'admin (on ne peut pas savoir qui supprime, donc on met 'system')
        admin_id := COALESCE(OLD.updated_by_admin, OLD.created_by_admin, 'system');
        
        INSERT INTO audit_logs (
            id, admin_user_id, action, entity_type, entity_id,
            old_values, created_at
        ) VALUES (
            gen_random_uuid()::VARCHAR(50),
            admin_id,
            'DELETE',
            entity_type_name,
            OLD.id,
            row_to_json(OLD),
            CURRENT_TIMESTAMP
        );
        
        RETURN OLD;
    END IF;
    
    RETURN NULL;
END;
$ LANGUAGE plpgsql;

-- Créer les triggers pour chaque table de produits
DROP TRIGGER IF EXISTS audit_credit_products ON credit_products;
CREATE TRIGGER audit_credit_products
    AFTER INSERT OR UPDATE OR DELETE ON credit_products
    FOR EACH ROW EXECUTE FUNCTION audit_product_changes();

DROP TRIGGER IF EXISTS audit_savings_products ON savings_products;
CREATE TRIGGER audit_savings_products
    AFTER INSERT OR UPDATE OR DELETE ON savings_products
    FOR EACH ROW EXECUTE FUNCTION audit_product_changes();

DROP TRIGGER IF EXISTS audit_insurance_products ON insurance_products;
CREATE TRIGGER audit_insurance_products
    AFTER INSERT OR UPDATE OR DELETE ON insurance_products
    FOR EACH ROW EXECUTE FUNCTION audit_product_changes();

-- =========================================================
-- 7. DONNÉES D'EXEMPLE POUR LES ADMINISTRATEURS
-- =========================================================

-- Créer des administrateurs de test pour chaque banque
DO $
DECLARE
    bank_record RECORD;
    insurance_record RECORD;
    admin_id VARCHAR(50);
BEGIN
    -- Administrateurs pour les banques
    FOR bank_record IN 
        SELECT id, name FROM banks WHERE is_active = true
    LOOP
        admin_id := gen_random_uuid()::VARCHAR(50);
        
        INSERT INTO admin_users (
            id, username, email, password_hash, first_name, last_name, 
            role, assigned_bank_id, permissions, is_active, created_by
        ) VALUES (
            admin_id,
            'admin_' || LOWER(REPLACE(bank_record.name, ' ', '_')),
            'admin.' || LOWER(REPLACE(bank_record.name, ' ', '.')) || '@bamboo-credit.ga',
            '$2b$12$LQv3c1yqBwlVHpPp2LKvbe.6JgqzqQ4Q8hxLl3iC9vF.lQQ1h3WqG', -- password: bamboo123
            'Admin',
            bank_record.name,
            'bank_admin',
            bank_record.id,
            '{"products": {"create": true, "read": true, "update": true, "delete": true}, "simulations": {"read": true}, "applications": {"manage": true}}'::json,
            true,
            (SELECT id FROM admin_users WHERE role = 'super_admin' LIMIT 1)
        );
        
        RAISE NOTICE 'Admin créé pour banque %: %', bank_record.name, admin_id;
    END LOOP;
    
    -- Administrateurs pour les compagnies d'assurance
    FOR insurance_record IN 
        SELECT id, name FROM insurance_companies WHERE is_active = true
    LOOP
        admin_id := gen_random_uuid()::VARCHAR(50);
        
        INSERT INTO admin_users (
            id, username, email, password_hash, first_name, last_name, 
            role, assigned_insurance_company_id, permissions, is_active, created_by
        ) VALUES (
            admin_id,
            'admin_' || LOWER(REPLACE(insurance_record.name, ' ', '_')),
            'admin.' || LOWER(REPLACE(insurance_record.name, ' ', '.')) || '@bamboo-credit.ga',
            '$2b$12$LQv3c1yqBwlVHpPp2LKvbe.6JgqzqQ4Q8hxLl3iC9vF.lQQ1h3WqG', -- password: bamboo123
            'Admin',
            insurance_record.name,
            'insurance_admin',
            insurance_record.id,
            '{"products": {"create": true, "read": true, "update": true, "delete": true}, "quotes": {"read": true}, "applications": {"manage": true}}'::json,
            true,
            (SELECT id FROM admin_users WHERE role = 'super_admin' LIMIT 1)
        );
        
        RAISE NOTICE 'Admin créé pour assurance %: %', insurance_record.name, admin_id;
    END LOOP;
    
END $;

-- =========================================================
-- 8. CONTRAINTES ET VALIDATIONS
-- =========================================================

-- Contrainte pour s'assurer qu'un admin bancaire a bien une banque assignée
ALTER TABLE admin_users 
ADD CONSTRAINT check_bank_admin_assignment 
CHECK (
    (role = 'bank_admin' AND assigned_bank_id IS NOT NULL AND assigned_insurance_company_id IS NULL) OR
    (role = 'insurance_admin' AND assigned_insurance_company_id IS NOT NULL AND assigned_bank_id IS NULL) OR
    (role IN ('super_admin', 'moderator') AND assigned_bank_id IS NULL AND assigned_insurance_company_id IS NULL)
);

-- Contrainte pour éviter qu'un admin soit assigné aux deux types d'institutions
ALTER TABLE admin_users 
ADD CONSTRAINT check_single_institution_assignment 
CHECK (
    NOT (assigned_bank_id IS NOT NULL AND assigned_insurance_company_id IS NOT NULL)
);

-- =========================================================
-- 9. PERMISSIONS PAR DÉFAUT
-- =========================================================

-- Fonction pour créer les permissions par défaut selon le rôle
CREATE OR REPLACE FUNCTION get_default_permissions(role_name VARCHAR(50))
RETURNS JSON AS $
BEGIN
    RETURN CASE role_name
        WHEN 'super_admin' THEN 
            '{"banks": ["create", "read", "update", "delete"], "insurance_companies": ["create", "read", "update", "delete"], "credit_products": ["create", "read", "update", "delete"], "savings_products": ["create", "read", "update", "delete"], "insurance_products": ["create", "read", "update", "delete"], "simulations": ["read", "delete"], "applications": ["read", "update", "delete"], "users": ["create", "read", "update", "delete"], "audit": ["read"]}'::json
        WHEN 'bank_admin' THEN 
            '{"products": {"create": true, "read": true, "update": true, "delete": true}, "simulations": {"read": true}, "applications": {"manage": true}, "bank": {"read": true, "update": false}}'::json
        WHEN 'insurance_admin' THEN 
            '{"products": {"create": true, "read": true, "update": true, "delete": true}, "quotes": {"read": true}, "applications": {"manage": true}, "insurance_company": {"read": true, "update": false}}'::json
        WHEN 'moderator' THEN 
            '{"products": {"create": false, "read": true, "update": true, "delete": false}, "simulations": {"read": true}, "applications": {"read": true, "update": true}}'::json
        ELSE 
            '{"products": {"create": false, "read": true, "update": false, "delete": false}, "simulations": {"read": true}}'::json
    END;
END;
$ LANGUAGE plpgsql;

-- Mettre à jour les permissions des admins existants si elles sont nulles
UPDATE admin_users 
SET permissions = get_default_permissions(role)
WHERE permissions IS NULL OR permissions = '{}';

-- =========================================================
-- 10. VÉRIFICATIONS FINALES
-- =========================================================

-- Vérifier que toutes les modifications ont été appliquées
DO $
BEGIN
    -- Vérifier les nouvelles colonnes
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'admin_users' AND column_name = 'assigned_bank_id'
    ) THEN
        RAISE EXCEPTION 'Colonne assigned_bank_id non créée dans admin_users';
    END IF;
    
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'credit_products' AND column_name = 'created_by_admin'
    ) THEN
        RAISE EXCEPTION 'Colonne created_by_admin non créée dans credit_products';
    END IF;
    
    RAISE NOTICE 'Toutes les modifications ont été appliquées avec succès';
    
    -- Statistiques après mise à jour
    RAISE NOTICE 'Statistiques après mise à jour:';
    RAISE NOTICE '- Admins bancaires: %', (SELECT COUNT(*) FROM admin_users WHERE role = 'bank_admin');
    RAISE NOTICE '- Admins assurance: %', (SELECT COUNT(*) FROM admin_users WHERE role = 'insurance_admin');
    RAISE NOTICE '- Total administrateurs (hors super admins): %', (SELECT COUNT(*) FROM admin_users WHERE role != 'super_admin');
    
END $;

-- Message de confirmation
SELECT 'Migration vers la gestion des administrateurs par institution terminée avec succès!' as status;