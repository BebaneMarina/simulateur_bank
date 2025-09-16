-- Script SQL pour corriger les permissions des administrateurs existants
-- À exécuter pour mettre à jour la structure des permissions

-- 1. Corriger les permissions pour les bank_admin
UPDATE admin_users 
SET permissions = '{
  "banks": ["read"],
  "credit_products": ["create", "read", "update", "delete"],
  "savings_products": ["create", "read", "update", "delete"],
  "simulations": ["read"],
  "applications": ["read", "update"]
}'::json
WHERE role = 'bank_admin' AND assigned_bank_id IS NOT NULL;

-- 2. Corriger les permissions pour les insurance_admin
UPDATE admin_users 
SET permissions = '{
  "insurance_companies": ["read"],
  "insurance_products": ["create", "read", "update", "delete"],
  "quotes": ["read"],
  "applications": ["read", "update"]
}'::json
WHERE role = 'insurance_admin' AND assigned_insurance_company_id IS NOT NULL;

-- 3. Corriger les permissions pour les moderator
UPDATE admin_users 
SET permissions = '{
  "banks": ["read"],
  "insurance_companies": ["read"],
  "credit_products": ["read", "update"],
  "savings_products": ["read", "update"],
  "insurance_products": ["read", "update"],
  "applications": ["read", "update"]
}'::json
WHERE role = 'moderator';

-- 4. Corriger les permissions pour les admin généraux
UPDATE admin_users 
SET permissions = '{
  "banks": ["read"],
  "insurance_companies": ["read"],
  "credit_products": ["create", "read", "update", "delete"],
  "savings_products": ["create", "read", "update", "delete"],
  "insurance_products": ["create", "read", "update", "delete"],
  "simulations": ["read"],
  "applications": ["read", "update"]
}'::json
WHERE role = 'admin';

-- 5. Corriger les permissions pour les readonly
UPDATE admin_users 
SET permissions = '{
  "banks": ["read"],
  "insurance_companies": ["read"],
  "credit_products": ["read"],
  "savings_products": ["read"],
  "insurance_products": ["read"],
  "simulations": ["read"],
  "applications": ["read"]
}'::json
WHERE role = 'readonly';

-- 6. Vérifier les résultats
SELECT 
    username,
    role,
    assigned_bank_id,
    assigned_insurance_company_id,
    permissions,
    is_active,
    created_at
FROM admin_users 
WHERE role != 'super_admin'
ORDER BY role, username;

-- 7. Optionnel : Créer un index pour améliorer les performances des requêtes sur les permissions
CREATE INDEX IF NOT EXISTS idx_admin_users_permissions 
ON admin_users USING gin (permissions);

-- 8. Vérifier l'intégrité des données
SELECT 
    role,
    COUNT(*) as count,
    COUNT(CASE WHEN permissions IS NOT NULL THEN 1 END) as with_permissions,
    COUNT(CASE WHEN is_active = true THEN 1 END) as active_count
FROM admin_users 
WHERE role != 'super_admin'
GROUP BY role;

-- 9. Exemple de requête pour tester les permissions d'un utilisateur spécifique
-- Remplacer 'nom_utilisateur' par le vrai nom d'utilisateur
/*
SELECT 
    username,
    role,
    permissions,
    permissions->'banks' as bank_permissions,
    permissions->'credit_products' as credit_permissions,
    permissions->'applications' as application_permissions
FROM admin_users 
WHERE username = 'nom_utilisateur';
*/