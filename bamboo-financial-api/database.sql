-- =========================================================
-- DONNEES DE TEST - ADMINISTRATEURS
-- Note: Tous les mots de passe sont "BambooAdmin2024!" hashés avec bcrypt
-- =========================================================

-- Générer des IDs uniques avec uuid_generate_v4() ou utiliser des IDs fixes
-- Si uuid_generate_v4() n'est pas disponible, utilisez des IDs fixes comme ci-dessous

INSERT INTO admin_users (id, username, email, password_hash, first_name, last_name, role, permissions, is_active, created_at, updated_at) VALUES

-- Super Administrateur (accès complet)
('admin_001', 'superadmin', 'admin@bamboo-credit.ga', '$2b$12$LQv3c1yqBwlVHpPp2LKvbe.6JgqzqQ4Q8hxLl3iC9vF.lQQ1h3WqG', 'Super', 'Admin', 'super_admin', 
'{"banks": ["create", "read", "update", "delete"], "insurance_companies": ["create", "read", "update", "delete"], "credit_products": ["create", "read", "update", "delete"], "savings_products": ["create", "read", "update", "delete"], "insurance_products": ["create", "read", "update", "delete"], "simulations": ["read", "delete"], "applications": ["read", "update", "delete"], "users": ["create", "read", "update", "delete"], "audit": ["read"], "system_settings": ["read", "update"]}', 
true, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),

-- Administrateur Crédit
('admin_002', 'admin_credit', 'credit.admin@bamboo-credit.ga', '$2b$12$LQv3c1yqBwlVHpPp2LKvbe.6JgqzqQ4Q8hxLl3iC9vF.lQQ1h3WqG', 'Admin', 'Crédit', 'admin',
'{"banks": ["read"], "credit_products": ["create", "read", "update", "delete"], "simulations": ["read"], "applications": ["read", "update"]}', 
true, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),

-- Administrateur Épargne
('admin_003', 'admin_epargne', 'epargne.admin@bamboo-credit.ga', '$2b$12$LQv3c1yqBwlVHpPp2LKvbe.6JgqzqQ4Q8hxLl3iC9vF.lQQ1h3WqG', 'Admin', 'Épargne', 'admin',
'{"banks": ["read"], "savings_products": ["create", "read", "update", "delete"], "simulations": ["read"], "applications": ["read", "update"]}', 
true, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),

-- Administrateur Assurance
('admin_004', 'admin_assurance', 'assurance.admin@bamboo-credit.ga', '$2b$12$LQv3c1yqBwlVHpPp2LKvbe.6JgqzqQ4Q8hxLl3iC9vF.lQQ1h3WqG', 'Admin', 'Assurance', 'admin',
'{"insurance_companies": ["read"], "insurance_products": ["create", "read", "update", "delete"], "quotes": ["read"], "applications": ["read", "update"]}', 
true, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),

-- Modérateur Principal
('admin_005', 'moderator', 'moderator@bamboo-credit.ga', '$2b$12$LQv3c1yqBwlVHpPp2LKvbe.6JgqzqQ4Q8hxLl3iC9vF.lQQ1h3WqG', 'Modérateur', 'Principal', 'moderator',
'{"banks": ["read"], "credit_products": ["read", "update"], "savings_products": ["read", "update"], "insurance_products": ["read", "update"], "applications": ["read", "update"]}', 
true, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),

-- Utilisateur en lecture seule
('admin_006', 'readonly', 'readonly@bamboo-credit.ga', '$2b$12$LQv3c1yqBwlVHpPp2LKvbe.6JgqzqQ4Q8hxLl3iC9vF.lQQ1h3WqG', 'Utilisateur', 'Lecture', 'readonly',
'{"banks": ["read"], "insurance_companies": ["read"], "credit_products": ["read"], "savings_products": ["read"], "insurance_products": ["read"], "simulations": ["read"], "applications": ["read"]}', 
true, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),

-- Gestionnaire Commercial
('admin_007', 'commercial', 'commercial@bamboo-credit.ga', '$2b$12$LQv3c1yqBwlVHpPp2LKvbe.6JgqzqQ4Q8hxLl3iC9vF.lQQ1h3WqG', 'Gestionnaire', 'Commercial', 'manager',
'{"banks": ["read"], "credit_products": ["read"], "savings_products": ["read"], "insurance_products": ["read"], "simulations": ["read"], "applications": ["read", "update"], "audit": ["read"]}', 
true, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),

-- Analyste Risques
('admin_008', 'analyste_risque', 'risque@bamboo-credit.ga', '$2b$12$LQv3c1yqBwlVHpPp2LKvbe.6JgqzqQ4Q8hxLl3iC9vF.lQQ1h3WqG', 'Analyste', 'Risques', 'analyst',
'{"credit_products": ["read"], "savings_products": ["read"], "simulations": ["read"], "applications": ["read"], "audit": ["read"]}', 
true, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),

-- Responsable IT
('admin_009', 'admin_it', 'it@bamboo-credit.ga', '$2b$12$LQv3c1yqBwlVHpPp2LKvbe.6JgqzqQ4Q8hxLl3iC9vF.lQQ1h3WqG', 'Responsable', 'IT', 'admin',
'{"banks": ["read", "update"], "insurance_companies": ["read", "update"], "credit_products": ["read", "update"], "savings_products": ["read", "update"], "insurance_products": ["read", "update"], "users": ["read"], "audit": ["read"], "system_settings": ["read", "update"]}', 
true, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),

-- Directeur Général
('admin_010', 'directeur', 'directeur@bamboo-credit.ga', '$2b$12$LQv3c1yqBwlVHpPp2LKvbe.6JgqzqQ4Q8hxLl3iC9vF.lQQ1h3WqG', 'Directeur', 'Général', 'director',
'{"banks": ["read"], "insurance_companies": ["read"], "credit_products": ["read"], "savings_products": ["read"], "insurance_products": ["read"], "simulations": ["read"], "applications": ["read"], "users": ["read"], "audit": ["read"], "system_settings": ["read"]}', 
true, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP);

-- =========================================================
-- SESSIONS ADMIN DE TEST (optionnel)
-- =========================================================

-- Quelques sessions de test pour les utilisateurs admin
INSERT INTO admin_sessions (id, admin_user_id, token, expires_at, ip_address, user_agent, is_active, created_at) VALUES
('session_001', 'admin_001', 'test_token_superadmin_001', CURRENT_TIMESTAMP + INTERVAL '7 days', '192.168.1.100', 'Mozilla/5.0 (Test Browser)', true, CURRENT_TIMESTAMP),
('session_002', 'admin_002', 'test_token_credit_001', CURRENT_TIMESTAMP + INTERVAL '7 days', '192.168.1.101', 'Mozilla/5.0 (Test Browser)', true, CURRENT_TIMESTAMP);

-- =========================================================
-- LOGS D'AUDIT DE TEST (optionnel)
-- =========================================================

-- Quelques logs d'audit pour montrer l'activité
INSERT INTO audit_logs (id, admin_user_id, action, entity_type, entity_id, old_values, new_values, ip_address, user_agent, created_at) VALUES
('audit_001', 'admin_001', 'LOGIN', 'admin_session', 'session_001', NULL, '{"login_time": "2024-01-15T10:00:00Z"}', '192.168.1.100', 'Mozilla/5.0 (Test Browser)', CURRENT_TIMESTAMP - INTERVAL '1 hour'),
('audit_002', 'admin_002', 'CREATE', 'credit_product', 'bgfi_habitat', NULL, '{"name": "BGFI Habitat Plus", "rate": 6.5}', '192.168.1.101', 'Mozilla/5.0 (Test Browser)', CURRENT_TIMESTAMP - INTERVAL '30 minutes'),
('audit_003', 'admin_001', 'UPDATE', 'bank', 'bgfi', '{"is_active": false}', '{"is_active": true}', '192.168.1.100', 'Mozilla/5.0 (Test Browser)', CURRENT_TIMESTAMP - INTERVAL '15 minutes'),
('audit_004', 'admin_003', 'LOGIN', 'admin_session', 'session_003', NULL, '{"login_time": "2024-01-15T11:30:00Z"}', '192.168.1.102', 'Mozilla/5.0 (Test Browser)', CURRENT_TIMESTAMP - INTERVAL '10 minutes');

-- Message de confirmation pour les utilisateurs admin
SELECT 'Utilisateurs administrateurs créés avec succès!' as status,
       COUNT(*) || ' utilisateurs admin ajoutés' as admin_count
FROM admin_users;