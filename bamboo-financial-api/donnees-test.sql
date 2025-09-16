-- Script SQL minimal pour tester Bamboo Financial
-- Suppression et insertion des données essentielles

TRUNCATE TABLE credit_simulations, savings_simulations, insurance_quotes CASCADE;
TRUNCATE TABLE credit_products, savings_products, insurance_products CASCADE;
TRUNCATE TABLE banks, insurance_companies CASCADE;

-- BANQUES (5 principales)
INSERT INTO banks (id, name, full_name, description, contact_phone, contact_email, is_active) VALUES
('bgfi', 'BGFI Bank', 'Banque Gabonaise et Française Internationale', 'Leader bancaire au Gabon', '+241 01 76 24 24', 'info@bgfibank.ga', true),
('ugb', 'UGB', 'Union Gabonaise de Banque', 'Banque de référence au Gabon', '+241 01 76 10 10', 'contact@ugb.ga', true),
('bicig', 'BICIG', 'Banque Internationale pour le Commerce et l''Industrie', 'Filiale BNP Paribas', '+241 01 77 20 00', 'info@bicig.com', true),
('ecobank', 'Ecobank Gabon', 'Ecobank Gabon S.A.', 'Banque panafricaine', '+241 01 44 30 30', 'gabon@ecobank.com', true),
('cbao', 'CBAO Gabon', 'Compagnie Bancaire de l''Afrique de l''Ouest', 'Banque de détail', '+241 01 72 35 00', 'info@cbao.ga', true);

-- COMPAGNIES D'ASSURANCE (5 principales)
INSERT INTO insurance_companies (id, name, full_name, description, contact_phone, contact_email, specialties, is_active) VALUES
('ogar', 'OGAR Assurances', 'Office Gabonais d''Assurance et de Réassurance', 'Leader assurance Gabon', '+241 01 72 35 00', 'info@ogar-gabon.com', ARRAY['auto', 'habitation', 'vie'], true),
('nsia', 'NSIA Assurances', 'Nouvelle Société Interafricaine d''Assurance', 'Assureur panafricain', '+241 01 44 35 55', 'contact@nsia-gabon.com', ARRAY['vie', 'sante', 'auto'], true),
('axa_gabon', 'AXA Gabon', 'AXA Assurances Gabon', 'Groupe AXA', '+241 01 73 45 67', 'gabon@axa.com', ARRAY['vie', 'sante'], true),
('colina', 'Colina Assurances', 'Compagnie Colina Gabon', 'Assurance dommages', '+241 01 76 22 33', 'info@colina.ga', ARRAY['auto', 'habitation'], true),
('saham', 'Saham Assurance', 'Saham Assurance Gabon', 'Groupe Sanlam', '+241 01 77 88 99', 'gabon@saham.com', ARRAY['auto', 'voyage'], true);

-- PRODUITS DE CRÉDIT (10 produits)
INSERT INTO credit_products (id, bank_id, name, type, description, min_amount, max_amount, min_duration_months, max_duration_months, average_rate, min_rate, max_rate, is_active) VALUES
('bgfi_habitat', 'bgfi', 'BGFI Habitat', 'immobilier', 'Crédit immobilier', 5000000, 200000000, 60, 300, 6.5, 5.8, 8.2, true),
('bgfi_auto', 'bgfi', 'BGFI Auto', 'auto', 'Crédit automobile', 2000000, 50000000, 12, 84, 8.9, 7.5, 11.2, true),
('ugb_logement', 'ugb', 'UGB Logement', 'immobilier', 'Solution immobilière', 3000000, 150000000, 48, 360, 6.8, 6.2, 8.5, true),
('ugb_auto', 'ugb', 'UGB Auto Express', 'auto', 'Crédit auto rapide', 1500000, 40000000, 12, 72, 9.2, 8.1, 11.8, true),
('bicig_pro', 'bicig', 'BICIG Pro', 'professionnel', 'Crédit professionnel', 10000000, 500000000, 60, 240, 7.2, 6.5, 9.0, true),
('ecobank_habitat', 'ecobank', 'Ecobank Habitat', 'immobilier', 'Crédit immobilier familial', 4000000, 180000000, 60, 300, 7.0, 6.3, 8.8, true),
('ecobank_auto', 'ecobank', 'Ecobank Auto', 'auto', 'Crédit auto flexible', 1800000, 45000000, 12, 84, 9.5, 8.2, 12.0, true),
('cbao_primo', 'cbao', 'CBAO Primo', 'immobilier', 'Premier crédit immobilier', 3500000, 120000000, 60, 300, 6.9, 6.1, 8.7, true),
('cbao_conso', 'cbao', 'CBAO Conso', 'consommation', 'Crédit personnel', 500000, 15000000, 6, 60, 14.5, 12.8, 18.5, true),
('bicig_tresorerie', 'bicig', 'BICIG Trésorerie', 'tresorerie', 'Solution trésorerie', 1000000, 50000000, 3, 36, 11.5, 10.0, 14.0, true);

-- PRODUITS D'ÉPARGNE (10 produits)
INSERT INTO savings_products (id, bank_id, name, type, description, interest_rate, minimum_deposit, liquidity, is_active) VALUES
('bgfi_livret', 'bgfi', 'BGFI Livret', 'livret', 'Livret d''épargne rémunéré', 3.25, 100000, 'immediate', true),
('bgfi_terme', 'bgfi', 'BGFI Terme', 'terme', 'Dépôt à terme', 4.50, 1000000, 'term', true),
('ugb_epargne', 'ugb', 'UGB Épargne Plus', 'livret', 'Compte épargne rémunéré', 3.00, 50000, 'immediate', true),
('ugb_plan', 'ugb', 'UGB Plan Projet', 'plan_epargne', 'Épargne programmée', 4.20, 25000, 'notice', true),
('bicig_entreprise', 'bicig', 'BICIG Entreprise', 'professionnel', 'Épargne entreprise', 2.75, 500000, 'immediate', true),
('ecobank_smart', 'ecobank', 'Ecobank Smart', 'livret', 'Épargne intelligente', 3.40, 75000, 'immediate', true),
('cbao_logement', 'cbao', 'CBAO Logement', 'plan_epargne', 'Plan épargne logement', 3.60, 100000, 'notice', true),
('cbao_jeune', 'cbao', 'CBAO Jeune', 'livret', 'Livret jeune', 4.5, 10000, 'immediate', true),
('bicig_placement', 'bicig', 'BICIG Placement', 'terme', 'Placement sécurisé', 5.20, 2000000, 'term', true),
('ecobank_diaspora', 'ecobank', 'Ecobank Diaspora', 'plan_epargne', 'Épargne diaspora', 4.8, 100000, 'notice', true);

-- PRODUITS D'ASSURANCE (15 produits)
INSERT INTO insurance_products (id, insurance_company_id, name, type, description, base_premium, is_active) VALUES
('ogar_auto_tr', 'ogar', 'OGAR Auto Tous Risques', 'auto', 'Assurance auto tous risques', 875000, true),
('ogar_auto_tiers', 'ogar', 'OGAR Auto Tiers', 'auto', 'Assurance responsabilité civile', 420000, true),
('ogar_habitation', 'ogar', 'OGAR Habitation', 'habitation', 'Assurance habitation', 120000, true),
('nsia_vie', 'nsia', 'NSIA Vie Protection', 'vie', 'Assurance vie temporaire', 45000, true),
('nsia_sante', 'nsia', 'NSIA Santé Plus', 'sante', 'Complémentaire santé', 85000, true),
('axa_vie', 'axa_gabon', 'AXA Vie Épargne', 'vie', 'Assurance vie épargne', 125000, true),
('axa_sante', 'axa_gabon', 'AXA Santé Premium', 'sante', 'Assurance santé premium', 175000, true),
('colina_auto', 'colina', 'Colina Auto Économique', 'auto', 'Assurance auto économique', 315000, true),
('colina_habitation', 'colina', 'Colina Habitation', 'habitation', 'Assurance habitation sociale', 65000, true),
('colina_transport', 'colina', 'Colina Transport', 'transport', 'Assurance transport', 800000, true),
('saham_auto', 'saham', 'Saham Auto Famille', 'auto', 'Assurance auto familiale', 485000, true),
('saham_voyage', 'saham', 'Saham Voyage', 'voyage', 'Assurance voyage internationale', 25000, true),
('saham_habitation', 'saham', 'Saham Habitation', 'habitation', 'Assurance habitation familiale', 155000, true),
('nsia_auto', 'nsia', 'NSIA Auto', 'auto', 'Assurance automobile NSIA', 520000, true),
('axa_retraite', 'axa_gabon', 'AXA Retraite', 'retraite', 'Plan retraite complémentaire', 95000, true);

-- SIMULATIONS DE TEST (quelques exemples)
INSERT INTO credit_simulations (id, session_id, credit_product_id, requested_amount, duration_months, monthly_income, current_debts, applied_rate, monthly_payment, total_cost, total_interest, debt_ratio, eligible, risk_score) VALUES
('sim_001', 'sess_001', 'bgfi_habitat', 25000000, 240, 1200000, 150000, 6.5, 187500, 45000000, 20000000, 28.13, true, 75),
('sim_002', 'sess_002', 'ugb_auto', 8000000, 60, 800000, 80000, 9.2, 166200, 9972000, 1972000, 30.78, true, 68),
('sim_003', 'sess_003', 'cbao_conso', 3000000, 36, 600000, 100000, 14.5, 108000, 3888000, 888000, 34.67, false, 45);

INSERT INTO savings_simulations (id, session_id, savings_product_id, initial_amount, monthly_contribution, duration_months, final_amount, total_contributions, total_interest, effective_rate) VALUES
('sav_001', 'sess_004', 'bgfi_livret', 1000000, 200000, 120, 26400000, 25000000, 1400000, 3.25),
('sav_002', 'sess_005', 'ugb_epargne', 500000, 150000, 60, 9650000, 9500000, 150000, 3.00);

INSERT INTO insurance_quotes (id, session_id, insurance_product_id, insurance_type, age, risk_factors, coverage_amount, monthly_premium, annual_premium, deductible) VALUES
('quo_001', 'sess_006', 'ogar_auto_tr', 'auto', 35, '{"vehicle_value": 15000000, "experience": 10}', 15000000, 131250, 1575000, 100000),
('quo_002', 'sess_007', 'nsia_sante', 'sante', 42, '{"family_size": 4}', 20000000, 145000, 1740000, 25000);

-- Message de confirmation
SELECT 'Données de test minimales insérées avec succès!' as status;