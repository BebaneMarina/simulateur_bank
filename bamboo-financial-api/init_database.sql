-- =========================================================
-- BAMBOO FINANCIAL SIMULATOR - BASE DE DONNÉES COMPLÈTE
-- Script SQL avec tables séparées banques/assurances et données de test
-- =========================================================

-- Suppression des tables existantes (dans l'ordre correct)
DROP TABLE IF EXISTS credit_simulations CASCADE;
DROP TABLE IF EXISTS savings_simulations CASCADE;
DROP TABLE IF EXISTS insurance_quotes CASCADE;
DROP TABLE IF EXISTS credit_applications CASCADE;
DROP TABLE IF EXISTS savings_applications CASCADE;
DROP TABLE IF EXISTS insurance_applications CASCADE;
DROP TABLE IF EXISTS admin_users CASCADE;
DROP TABLE IF EXISTS admin_sessions CASCADE;
DROP TABLE IF EXISTS audit_logs CASCADE;
DROP TABLE IF EXISTS credit_products CASCADE;
DROP TABLE IF EXISTS savings_products CASCADE;
DROP TABLE IF EXISTS insurance_products CASCADE;
DROP TABLE IF EXISTS banks CASCADE;
DROP TABLE IF EXISTS insurance_companies CASCADE;

-- =========================================================
-- 1. TABLE DES BANQUES
-- =========================================================
CREATE TABLE banks (
    id VARCHAR(50) PRIMARY KEY,
    name VARCHAR(200) NOT NULL,
    full_name VARCHAR(300),
    description TEXT,
    logo_url VARCHAR(500),
    website VARCHAR(200),
    contact_phone VARCHAR(20),
    contact_email VARCHAR(100),
    address TEXT,
    swift_code VARCHAR(11),
    license_number VARCHAR(50),
    established_year INTEGER,
    total_assets DECIMAL(15,2),
    rating VARCHAR(10),
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- =========================================================
-- 2. TABLE DES COMPAGNIES D'ASSURANCE
-- =========================================================
CREATE TABLE insurance_companies (
    id VARCHAR(50) PRIMARY KEY,
    name VARCHAR(200) NOT NULL,
    full_name VARCHAR(300),
    description TEXT,
    logo_url VARCHAR(500),
    website VARCHAR(200),
    contact_phone VARCHAR(20),
    contact_email VARCHAR(100),
    address TEXT,
    license_number VARCHAR(50),
    established_year INTEGER,
    solvency_ratio DECIMAL(5,2),
    rating VARCHAR(10),
    specialties TEXT[], -- Types d'assurance spécialisés
    coverage_areas TEXT[], -- Zones géographiques couvertes
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- =========================================================
-- 3. PRODUITS DE CRÉDIT
-- =========================================================
CREATE TABLE credit_products (
    id VARCHAR(50) PRIMARY KEY,
    bank_id VARCHAR(50) REFERENCES banks(id),
    name VARCHAR(200) NOT NULL,
    type VARCHAR(50) NOT NULL, -- immobilier, consommation, auto, professionnel, etc.
    description TEXT,
    min_amount DECIMAL(12,2) NOT NULL,
    max_amount DECIMAL(12,2) NOT NULL,
    min_duration_months INTEGER NOT NULL,
    max_duration_months INTEGER NOT NULL,
    average_rate DECIMAL(5,2) NOT NULL,
    min_rate DECIMAL(5,2),
    max_rate DECIMAL(5,2),
    processing_time_hours INTEGER DEFAULT 72,
    required_documents JSONB,
    eligibility_criteria JSONB,
    fees JSONB, -- Structure: {"application": 50000, "guarantee": "1%", "insurance": 0.36}
    features TEXT[],
    advantages TEXT[],
    special_conditions TEXT,
    is_featured BOOLEAN DEFAULT FALSE,
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- =========================================================
-- 4. PRODUITS D'ÉPARGNE
-- =========================================================
CREATE TABLE savings_products (
    id VARCHAR(50) PRIMARY KEY,
    bank_id VARCHAR(50) REFERENCES banks(id),
    name VARCHAR(200) NOT NULL,
    type VARCHAR(50) NOT NULL, -- livret, terme, plan_epargne, etc.
    description TEXT,
    interest_rate DECIMAL(5,2) NOT NULL,
    minimum_deposit DECIMAL(12,2) NOT NULL,
    maximum_deposit DECIMAL(12,2),
    minimum_balance DECIMAL(12,2) DEFAULT 0,
    liquidity VARCHAR(20) NOT NULL, -- immediate, notice, term
    notice_period_days INTEGER DEFAULT 0,
    term_months INTEGER, -- Pour les dépôts à terme
    compounding_frequency VARCHAR(20) DEFAULT 'monthly', -- daily, monthly, quarterly, annually
    fees JSONB, -- Structure: {"opening": 5000, "management": 0.5, "withdrawal": 1000}
    features TEXT[],
    advantages TEXT[],
    tax_benefits TEXT[],
    risk_level INTEGER DEFAULT 1, -- 1-5 (1=très sûr, 5=risqué)
    early_withdrawal_penalty DECIMAL(5,2),
    is_islamic_compliant BOOLEAN DEFAULT FALSE,
    is_featured BOOLEAN DEFAULT FALSE,
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- =========================================================
-- 5. PRODUITS D'ASSURANCE
-- =========================================================
CREATE TABLE insurance_products (
    id VARCHAR(50) PRIMARY KEY,
    insurance_company_id VARCHAR(50) REFERENCES insurance_companies(id),
    name VARCHAR(200) NOT NULL,
    type VARCHAR(50) NOT NULL, -- auto, habitation, vie, sante, voyage, responsabilite
    description TEXT,
    coverage_details JSONB, -- Détails des garanties
    premium_calculation JSONB, -- Formules de calcul des primes
    base_premium DECIMAL(10,2),
    min_coverage DECIMAL(12,2),
    max_coverage DECIMAL(12,2),
    deductible_options DECIMAL(10,2)[],
    age_limits JSONB, -- {"min": 18, "max": 75}
    exclusions TEXT[],
    features TEXT[],
    advantages TEXT[],
    claim_process TEXT,
    settlement_time_days INTEGER DEFAULT 15,
    renewable BOOLEAN DEFAULT TRUE,
    is_featured BOOLEAN DEFAULT FALSE,
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- =========================================================
-- 6. SIMULATIONS DE CRÉDIT
-- =========================================================
CREATE TABLE credit_simulations (
    id VARCHAR(50) PRIMARY KEY,
    session_id VARCHAR(100),
    credit_product_id VARCHAR(50) REFERENCES credit_products(id),
    requested_amount DECIMAL(12,2) NOT NULL,
    duration_months INTEGER NOT NULL,
    monthly_income DECIMAL(10,2) NOT NULL,
    current_debts DECIMAL(10,2) DEFAULT 0,
    down_payment DECIMAL(12,2) DEFAULT 0,
    applied_rate DECIMAL(5,2) NOT NULL,
    monthly_payment DECIMAL(10,2) NOT NULL,
    total_cost DECIMAL(12,2) NOT NULL,
    total_interest DECIMAL(12,2) NOT NULL,
    debt_ratio DECIMAL(5,2) NOT NULL,
    eligible BOOLEAN NOT NULL,
    risk_score INTEGER,
    recommendations TEXT[],
    amortization_schedule JSONB,
    client_ip VARCHAR(45),
    user_agent TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- =========================================================
-- 7. SIMULATIONS D'ÉPARGNE
-- =========================================================
CREATE TABLE savings_simulations (
    id VARCHAR(50) PRIMARY KEY,
    session_id VARCHAR(100),
    savings_product_id VARCHAR(50) REFERENCES savings_products(id),
    initial_amount DECIMAL(12,2) NOT NULL,
    monthly_contribution DECIMAL(10,2) NOT NULL,
    duration_months INTEGER NOT NULL,
    final_amount DECIMAL(12,2) NOT NULL,
    total_contributions DECIMAL(12,2) NOT NULL,
    total_interest DECIMAL(12,2) NOT NULL,
    effective_rate DECIMAL(5,2),
    monthly_breakdown JSONB,
    recommendations TEXT[],
    client_ip VARCHAR(45),
    user_agent TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- =========================================================
-- 8. DEVIS D'ASSURANCE
-- =========================================================
CREATE TABLE insurance_quotes (
    id VARCHAR(50) PRIMARY KEY,
    session_id VARCHAR(100),
    insurance_product_id VARCHAR(50) REFERENCES insurance_products(id),
    insurance_type VARCHAR(50) NOT NULL,
    age INTEGER NOT NULL,
    risk_factors JSONB NOT NULL, -- Facteurs de risque spécifiques au type
    coverage_amount DECIMAL(12,2),
    monthly_premium DECIMAL(10,2) NOT NULL,
    annual_premium DECIMAL(10,2) NOT NULL,
    deductible DECIMAL(10,2),
    coverage_details JSONB,
    exclusions TEXT[],
    valid_until DATE,
    client_ip VARCHAR(45),
    user_agent TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- =========================================================
-- 9. DEMANDES DE CRÉDIT
-- =========================================================
CREATE TABLE credit_applications (
    id VARCHAR(50) PRIMARY KEY,
    simulation_id VARCHAR(50) REFERENCES credit_simulations(id),
    credit_product_id VARCHAR(50) REFERENCES credit_products(id),
    applicant_name VARCHAR(200) NOT NULL,
    applicant_email VARCHAR(100),
    applicant_phone VARCHAR(20),
    requested_amount DECIMAL(12,2) NOT NULL,
    status VARCHAR(50) DEFAULT 'pending', -- pending, processing, approved, rejected, completed
    application_data JSONB,
    documents_uploaded TEXT[],
    bank_response JSONB,
    processing_notes TEXT,
    assigned_to VARCHAR(100),
    submitted_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- =========================================================
-- 10. DEMANDES D'ÉPARGNE
-- =========================================================
CREATE TABLE savings_applications (
    id VARCHAR(50) PRIMARY KEY,
    simulation_id VARCHAR(50) REFERENCES savings_simulations(id),
    savings_product_id VARCHAR(50) REFERENCES savings_products(id),
    applicant_name VARCHAR(200) NOT NULL,
    applicant_email VARCHAR(100),
    applicant_phone VARCHAR(20),
    initial_deposit DECIMAL(12,2) NOT NULL,
    monthly_contribution DECIMAL(10,2),
    status VARCHAR(50) DEFAULT 'pending',
    application_data JSONB,
    bank_response JSONB,
    processing_notes TEXT,
    assigned_to VARCHAR(100),
    submitted_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- =========================================================
-- 11. DEMANDES D'ASSURANCE
-- =========================================================
CREATE TABLE insurance_applications (
    id VARCHAR(50) PRIMARY KEY,
    quote_id VARCHAR(50) REFERENCES insurance_quotes(id),
    insurance_product_id VARCHAR(50) REFERENCES insurance_products(id),
    applicant_name VARCHAR(200) NOT NULL,
    applicant_email VARCHAR(100),
    applicant_phone VARCHAR(20),
    coverage_amount DECIMAL(12,2),
    status VARCHAR(50) DEFAULT 'pending',
    application_data JSONB,
    medical_exam_required BOOLEAN DEFAULT FALSE,
    documents_uploaded TEXT[],
    insurance_response JSONB,
    processing_notes TEXT,
    assigned_to VARCHAR(100),
    submitted_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- =========================================================
-- 12. UTILISATEURS ADMIN
-- =========================================================
CREATE TABLE admin_users (
    id VARCHAR(50) PRIMARY KEY,
    username VARCHAR(50) UNIQUE NOT NULL,
    email VARCHAR(100) UNIQUE NOT NULL,
    password_hash VARCHAR(255) NOT NULL,
    first_name VARCHAR(100),
    last_name VARCHAR(100),
    role VARCHAR(50) NOT NULL, -- super_admin, admin, moderator, readonly
    permissions JSONB, -- Permissions spécifiques
    is_active BOOLEAN DEFAULT TRUE,
    last_login TIMESTAMP,
    created_by UUID REFERENCES admin_users(id),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- =========================================================
-- 13. SESSIONS ADMIN
-- =========================================================
CREATE TABLE admin_sessions (
    id VARCHAR(50) PRIMARY KEY,
    admin_user_id VARCHAR(50) REFERENCES admin_users(id),
    token VARCHAR(500) NOT NULL,
    expires_at TIMESTAMP NOT NULL,
    ip_address VARCHAR(45),
    user_agent TEXT,
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- =========================================================
-- 14. JOURNAL D'AUDIT
-- =========================================================
CREATE TABLE audit_logs (
    id VARCHAR(50) PRIMARY KEY,
    admin_user_id VARCHAR(50) REFERENCES admin_users(id),
    action VARCHAR(100) NOT NULL, -- CREATE, UPDATE, DELETE, LOGIN, LOGOUT
    entity_type VARCHAR(50) NOT NULL, -- bank, insurance_company, credit_product, etc.
    entity_id VARCHAR(100),
    old_values JSONB,
    new_values JSONB,
    ip_address VARCHAR(45),
    user_agent TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- =========================================================
-- INDEX POUR OPTIMISATION
-- =========================================================
CREATE INDEX idx_credit_products_bank ON credit_products(bank_id);
CREATE INDEX idx_credit_products_type ON credit_products(type);
CREATE INDEX idx_credit_products_active ON credit_products(is_active);
CREATE INDEX idx_savings_products_bank ON savings_products(bank_id);
CREATE INDEX idx_savings_products_type ON savings_products(type);
CREATE INDEX idx_insurance_products_company ON insurance_products(insurance_company_id);
CREATE INDEX idx_insurance_products_type ON insurance_products(type);
CREATE INDEX idx_credit_simulations_product ON credit_simulations(credit_product_id);
CREATE INDEX idx_credit_simulations_session ON credit_simulations(session_id);
CREATE INDEX idx_savings_simulations_product ON savings_simulations(savings_product_id);
CREATE INDEX idx_insurance_quotes_product ON insurance_quotes(insurance_product_id);
CREATE INDEX idx_audit_logs_user ON audit_logs(admin_user_id);
CREATE INDEX idx_audit_logs_entity ON audit_logs(entity_type, entity_id);
CREATE INDEX idx_audit_logs_created ON audit_logs(created_at);

-- =========================================================
-- DONNÉES DE TEST - BANQUES
-- =========================================================
INSERT INTO banks (id, name, full_name, description, logo_url, website, contact_phone, contact_email, address, swift_code, license_number, established_year, total_assets, rating) VALUES
('bgfi', 'BGFI Bank', 'Banque Gabonaise et Française Internationale', 'Leader bancaire au Gabon avec une forte présence en Afrique Centrale', '/assets/banks/bgfi-logo.png', 'https://www.bgfibank.ga', '+241 01 76 24 24', 'info@bgfibank.ga', 'Boulevard Triomphal Omar Bongo, BP 2253, Libreville', 'BGFIGALI', 'BG2021001', 1971, 1250000000000, 'A-'),
('ugb', 'UGB', 'Union Gabonaise de Banque', 'Banque de référence au Gabon, filiale du groupe Attijariwafa Bank', '/assets/banks/ugb-logo.png', 'https://www.ugb.ga', '+241 01 76 10 10', 'contact@ugb.ga', 'Avenue du Colonel Parant, BP 315, Libreville', 'UGBAGALI', 'UG2021002', 1962, 890000000000, 'BBB+'),
('bicig', 'BICIG', 'Banque Internationale pour le Commerce et l''Industrie du Gabon', 'Filiale de BNP Paribas, spécialisée dans le financement des entreprises', '/assets/banks/bicig-logo.png', 'https://www.bicig.com', '+241 01 77 20 00', 'info@bicig.com', 'Avenue du Gouverneur Ballay, BP 2241, Libreville', 'BICGGALI', 'BI2021003', 1973, 780000000000, 'BBB'),
('ecobank', 'Ecobank Gabon', 'Ecobank Gabon S.A.', 'Banque panafricaine avec une forte expertise en commerce international', '/assets/banks/ecobank-logo.png', 'https://www.ecobank.com/ga', '+241 01 44 30 30', 'gabon@ecobank.com', 'Boulevard de l''Indépendance, BP 2252, Libreville', 'ECBGGALI', 'EC2021004', 1986, 650000000000, 'B+'),
('cbao', 'CBAO Gabon', 'Compagnie Bancaire de l''Afrique de l''Ouest Gabon', 'Filiale du groupe Attijariwafa Bank, spécialisée dans la banque de détail', '/assets/banks/cbao-logo.png', 'https://www.cbao.ga', '+241 01 72 35 00', 'info@cbao.ga', 'Avenue Hassan II, BP 540, Libreville', 'CBAGGALI', 'CB2021005', 1999, 420000000000, 'B'),
('societe_generale', 'Société Générale Gabon', 'Société Générale de Banques au Gabon', 'Filiale du groupe français, expertise en banque privée et corporate', '/assets/banks/sg-logo.png', 'https://www.societegenerale.ga', '+241 01 79 30 00', 'contact@societegenerale.ga', 'Immeuble SG, Boulevard Triomphal, Libreville', 'SOGEGGALI', 'SG2021006', 1978, 580000000000, 'BBB');

-- =========================================================
-- DONNÉES DE TEST - COMPAGNIES D'ASSURANCE
-- =========================================================
INSERT INTO insurance_companies (id, name, full_name, description, logo_url, website, contact_phone, contact_email, address, license_number, established_year, solvency_ratio, rating, specialties, coverage_areas) VALUES
('ogar', 'OGAR Assurances', 'Office Gabonais d''Assurance et de Réassurance', 'Leader de l''assurance au Gabon, toutes branches confondues', '/assets/insurers/ogar-logo.png', 'https://www.ogar-gabon.com', '+241 01 72 35 00', 'info@ogar-gabon.com', 'Avenue du Colonel Parant, Libreville', 'AS2021001', 1974, 156.8, 'A-', ARRAY['auto', 'habitation', 'vie', 'sante', 'transport'], ARRAY['Gabon', 'Cameroun', 'Guinée Équatoriale']),
('nsia', 'NSIA Assurances', 'Nouvelle Société Interafricaine d''Assurance Gabon', 'Assureur panafricain avec une forte présence en Afrique de l''Ouest et Centrale', '/assets/insurers/nsia-logo.png', 'https://www.nsia-gabon.com', '+241 01 44 35 55', 'contact@nsia-gabon.com', 'Immeuble NSIA, Quartier Batterie IV, Libreville', 'AS2021002', 1995, 142.3, 'BBB+', ARRAY['vie', 'sante', 'auto', 'habitation'], ARRAY['Gabon', 'Côte d''Ivoire', 'Burkina Faso', 'Mali']),
('axa_gabon', 'AXA Gabon', 'AXA Assurances Gabon', 'Filiale du groupe AXA, spécialisée en assurance vie et santé', '/assets/insurers/axa-logo.png', 'https://www.axa.ga', '+241 01 73 45 67', 'gabon@axa.com', 'Immeuble AXA, Boulevard de l''Indépendance, Libreville', 'AS2021003', 2001, 178.9, 'A', ARRAY['vie', 'sante', 'epargne'], ARRAY['Gabon']),
('colina', 'Colina Assurances', 'Compagnie d''Assurance Colina Gabon', 'Assureur spécialisé dans l''assurance dommages et responsabilité', '/assets/insurers/colina-logo.png', 'https://www.colina.ga', '+241 01 76 22 33', 'info@colina.ga', 'Quartier Glass, Libreville', 'AS2021004', 1988, 134.6, 'B+', ARRAY['auto', 'habitation', 'responsabilite', 'transport'], ARRAY['Gabon']),
('saham', 'Saham Assurance', 'Saham Assurance Gabon', 'Assureur panafricain du groupe Sanlam, tous risques', '/assets/insurers/saham-logo.png', 'https://www.saham.ga', '+241 01 77 88 99', 'gabon@saham.com', 'Immeuble le Cristal, Libreville', 'AS2021005', 2005, 145.7, 'BBB', ARRAY['auto', 'habitation', 'vie', 'sante', 'voyage'], ARRAY['Gabon', 'Maroc', 'Sénégal']);

-- =========================================================
-- DONNÉES DE TEST - PRODUITS DE CRÉDIT
-- =========================================================
INSERT INTO credit_products (bank_id, name, type, description, min_amount, max_amount, min_duration_months, max_duration_months, average_rate, min_rate, max_rate, processing_time_hours, required_documents, eligibility_criteria, fees, features, advantages, special_conditions, is_featured) VALUES

-- BGFI Bank - Crédits
('bgfi', 'BGFI Habitat Plus', 'immobilier', 'Crédit immobilier avec conditions préférentielles pour l''acquisition, construction ou rénovation', 5000000, 200000000, 60, 300, 6.5, 5.8, 8.2, 72, 
'{"documents": ["Pièce d''identité", "Justificatifs de revenus 3 mois", "Compromis de vente", "Acte de propriété", "Devis travaux"]}',
'{"criteria": ["Revenus minimum 400,000 FCFA", "CDI ou fonctionnaire", "Apport personnel 10%", "Âge maximum 60 ans"]}',
'{"application": 75000, "guarantee": "1.5%", "insurance": 0.36, "notary": "variable"}',
ARRAY['Taux préférentiel', 'Assurance groupe incluse', 'Report d''échéances', 'Modulation des mensualités'],
ARRAY['Expertise gratuite', 'Accompagnement personnalisé', 'Déblocage progressif', 'Renégociation possible'],
'Conditions spéciales pour les primo-accédants et fonctionnaires', true),

('bgfi', 'BGFI Auto Premium', 'auto', 'Financement véhicule neuf ou occasion avec assurance intégrée', 2000000, 50000000, 12, 84, 8.9, 7.5, 11.2, 48,
'{"documents": ["Pièce d''identité", "Justificatifs de revenus", "Facture pro-forma", "Permis de conduire"]}',
'{"criteria": ["Revenus minimum 300,000 FCFA", "Permis valide depuis 2 ans", "Âge 21-65 ans"]}',
'{"application": 50000, "guarantee": "0%", "insurance": 0.24}',
ARRAY['Assurance auto incluse', 'Carte carburant', 'Assistance dépannage', 'Financement accessoires'],
ARRAY['Livraison chez le concessionnaire', 'Garantie constructeur', 'Service après-vente'],
'Partenariats avec tous les concessionnaires du Gabon', true),

('bgfi', 'BGFI Conso Liberté', 'consommation', 'Crédit personnel pour tous vos projets sans justificatif d''utilisation', 500000, 15000000, 6, 60, 14.5, 12.8, 18.5, 24,
'{"documents": ["Pièce d''identité", "Justificatifs de revenus 2 mois", "RIB"]}',
'{"criteria": ["Revenus minimum 200,000 FCFA", "Ancienneté emploi 6 mois"]}',
'{"application": 25000, "guarantee": "0%"}',
ARRAY['Déblocage immédiat', 'Remboursement anticipé', 'Assurance facultative'],
ARRAY['Procédure simplifiée', 'Réponse rapide', 'Montant disponible 24h'],
'Sans frais de dossier pour les clients BGFI', false),

-- UGB - Crédits
('ugb', 'UGB Logement Secure', 'immobilier', 'Solution immobilière complète avec taux attractif et accompagnement', 3000000, 150000000, 48, 360, 6.8, 6.2, 8.5, 96,
'{"documents": ["CNI", "Bulletins de salaire", "Compromis vente", "Plans construction"]}',
'{"criteria": ["Salaire net 350,000 FCFA", "CDI confirmé", "Apport 15%"]}',
'{"application": 60000, "guarantee": "1.2%", "insurance": 0.30}',
ARRAY['Taux fixe garanti', 'Déblocage par étapes', 'Assurance décès invalidité'],
ARRAY['Étude gratuite', 'Suivi personnalisé', 'Négociation notaire'],
'Conditions préférentielles Attijariwafa Bank', true),

('ugb', 'UGB Express Auto', 'auto', 'Crédit auto express avec réponse sous 48h', 1500000, 40000000, 12, 72, 9.2, 8.1, 11.8, 48,
'{"documents": ["CNI", "Fiches de paie", "Facture véhicule"]}',
'{"criteria": ["Revenus 250,000 FCFA", "Permis valide"]}',
'{"application": 35000, "insurance": 0.20}',
ARRAY['Réponse 48h', 'Financement 100%', 'Assurance tous risques'],
ARRAY['Partenaire concessionnaires', 'Procédure rapide'],
'Financement véhicules neufs et occasions moins de 5 ans', false),

-- BICIG - Crédits
('bicig', 'BICIG Immobilier Pro', 'professionnel', 'Crédit immobilier professionnel pour locaux commerciaux et bureaux', 10000000, 500000000, 60, 240, 7.2, 6.5, 9.0, 120,
'{"documents": ["Statuts société", "Bilans 3 ans", "Business plan", "Compromis achat"]}',
'{"criteria": ["CA minimum 50M FCFA", "Société constituée 3 ans", "Garanties réelles"]}',
'{"application": 100000, "guarantee": "2%", "expertise": 200000}',
ARRAY['Financement 80%', 'Différé remboursement', 'Taux modulable'],
ARRAY['Expertise BNP Paribas', 'Conseil investissement', 'Suivi dédié'],
'Conditions corporate BNP Paribas International', true),

('bicig', 'BICIG Équipement', 'equipement', 'Financement matériel et équipement professionnel', 2000000, 100000000, 12, 84, 9.8, 8.5, 12.0, 72,
'{"documents": ["Kbis", "Bilans", "Devis fournisseur", "Garanties"]}',
'{"criteria": ["Société active 2 ans", "Garanties suffisantes"]}',
'{"application": 75000, "guarantee": "1%"}',
ARRAY['Financement intégral', 'Livraison surveillée', 'Assurance matériel'],
ARRAY['Réseau fournisseurs', 'Maintenance incluse'],
'Partenariats fabricants internationaux', false);

-- =========================================================
-- DONNÉES DE TEST - PRODUITS D'ÉPARGNE
-- =========================================================
INSERT INTO savings_products (bank_id, name, type, description, interest_rate, minimum_deposit, maximum_deposit, minimum_balance, liquidity, notice_period_days, term_months, compounding_frequency, fees, features, advantages, tax_benefits, risk_level, early_withdrawal_penalty, is_featured) VALUES

-- BGFI Bank - Épargne
('bgfi', 'BGFI Livret Croissance', 'livret', 'Livret d''épargne rémunéré avec disponibilité immédiate', 3.25, 100000, 50000000, 100000, 'immediate', 0, NULL, 'monthly',
'{"opening": 5000, "management": 0, "withdrawal": 0}',
ARRAY['Carte de retrait', 'Virements automatiques', 'Relevés trimestriels', 'App mobile'],
ARRAY['Rémunération attractive', 'Pas de frais de tenue', 'Disponibilité totale'],
ARRAY['Exonération fiscale jusqu''à 5M FCFA'], 1, 0, true),

('bgfi', 'BGFI Placement Terme', 'terme', 'Dépôt à terme avec taux progressif selon la durée', 4.50, 1000000, NULL, 1000000, 'term', 0, 12, 'quarterly',
'{"opening": 10000, "early_withdrawal": 1.0}',
ARRAY['Taux progressif', 'Capitalisation trimestrielle', 'Renouvellement auto'],
ARRAY['Rendement garanti', 'Capital protégé', 'Fiscalité avantageuse'],
ARRAY['Pas d''imposition sur les intérêts'], 1, 1.0, true),

('bgfi', 'BGFI Plan Avenir', 'plan_epargne', 'Plan d''épargne long terme pour vos projets de vie', 3.80, 50000, 25000000, 50000, 'notice', 30, NULL, 'monthly',
'{"opening": 0, "management": 0.25, "withdrawal": 2000}',
ARRAY['Versements programmés', 'Objectif personnalisé', 'Assurance vie optionnelle'],
ARRAY['Taux bonifié', 'Souplesse versements', 'Accompagnement conseil'],
ARRAY['Réduction d''impôt possible'], 2, 0.5, false),

-- UGB - Épargne
('ugb', 'UGB Épargne Plus', 'livret', 'Compte épargne rémunéré avec carte de retrait', 3.00, 50000, 30000000, 50000, 'immediate', 0, NULL, 'monthly',
'{"opening": 3000, "management": 0, "withdrawal": 500}',
ARRAY['Carte retrait gratuite', 'Virements gratuits', 'SMS alertes'],
ARRAY['Rémunération mensuelle', 'Pas de plafond', 'Accès 24h/24'],
ARRAY['Exonération partielle'], 1, 0, true),

('ugb', 'UGB Épargne Projet', 'plan_epargne', 'Épargne programmée pour financer vos projets', 4.20, 25000, 15000000, 25000, 'notice', 60, NULL, 'quarterly',
'{"opening": 5000, "management": 0.3, "early_withdrawal": 0.5}',
ARRAY['Objectif programmable', 'Versements flexibles', 'Suivi en ligne'],
ARRAY['Taux majoré', 'Conseil gratuit', 'Épargne sécurisée'],
ARRAY['Avantages fiscaux selon projet'], 2, 0.5, false),

-- BICIG - Épargne
('bicig', 'BICIG Épargne Entreprise', 'professionnel', 'Compte épargne dédié aux entreprises et professionnels', 2.75, 500000, NULL, 500000, 'immediate', 0, NULL, 'monthly',
'{"opening": 15000, "management": 0.1, "withdrawal": 0}',
ARRAY['Gestion multi-utilisateurs', 'Virements SEPA', 'Interface corporate'],
ARRAY['Rémunération pro', 'Plafonds élevés', 'Service dédié'],
ARRAY['Optimisation fiscale entreprise'], 1, 0, true),

('bicig', 'BICIG Placement Sécurisé', 'terme', 'Placement à terme garantie capital avec rendement attractif', 5.20, 2000000, NULL, 2000000, 'term', 0, 24, 'quarterly',
'{"opening": 20000, "management": 0.2, "early_withdrawal": 2.0}',
ARRAY['Capital garanti', 'Intérêts trimestriels', 'Renouvellement automatique'],
ARRAY['Rendement élevé', 'Sécurité BNP', 'Gestion patrimoniale'],
ARRAY['Régime fiscal avantageux'], 1, 2.0, true),

-- Ecobank - Épargne
('ecobank', 'Ecobank Smart Savings', 'livret', 'Épargne intelligente avec taux progressif', 3.40, 75000, 40000000, 75000, 'immediate', 0, NULL, 'monthly',
'{"opening": 2500, "management": 0, "withdrawal": 1000}',
ARRAY['Taux progressif', 'Mobile banking', 'Alertes SMS gratuites'],
ARRAY['Plus vous épargnez, plus ça rapporte', 'Technologie avancée'],
ARRAY['Exonération jusqu''à 3M FCFA'], 1, 0, false),

-- CBAO - Épargne
('cbao', 'CBAO Épargne Logement', 'plan_epargne', 'Plan épargne logement pour financer votre résidence', 3.60, 100000, 20000000, 100000, 'notice', 90, NULL, 'quarterly',
'{"opening": 10000, "management": 0.4, "early_withdrawal": 1.0}',
ARRAY['Prime État possible', 'Crédit privilégié', 'Taux bonifiés'],
ARRAY['Aide acquisition logement', 'Conditions crédit préférentielles'],
ARRAY['Prime État 25%', 'Crédit taux réduit'], 2, 1.0, true);

-- =========================================================
-- DONNÉES DE TEST - PRODUITS D'ASSURANCE
-- =========================================================
INSERT INTO insurance_products (insurance_company_id, name, type, description, coverage_details, premium_calculation, base_premium, min_coverage, max_coverage, deductible_options, age_limits, exclusions, features, advantages, claim_process, settlement_time_days, is_featured) VALUES

-- OGAR - Assurances Auto
('ogar', 'OGAR Auto Tous Risques', 'auto', 'Assurance automobile tous risques avec garanties étendues', 
'{"responsabilite_civile": 1000000000, "dommages_collision": 25000000, "vol": 25000000, "incendie": 25000000, "bris_glace": 2000000, "assistance": true}',
'{"base_rate": 0.035, "vehicle_age_factor": 0.1, "driver_experience_factor": 0.15, "location_factor": 0.05}',
875000, 5000000, 50000000, ARRAY[50000, 100000, 200000, 500000],
'{"min_age": 18, "max_age": 75}',
ARRAY['Conduite en état d''ivresse', 'Usage commercial non déclaré', 'Guerre et émeutes'],
ARRAY['Assistance 24h/24', 'Véhicule de remplacement', 'Protection juridique', 'Garantie accessoires'],
ARRAY['Leader assurance auto Gabon', 'Réseau réparateurs agréés', 'Indemnisation rapide'],
'Déclaration en ligne ou par téléphone, expertise sous 48h, règlement sous 15 jours', 15, true),

('ogar', 'OGAR Auto Tiers Plus', 'auto', 'Assurance responsabilité civile avec garanties complémentaires',
'{"responsabilite_civile": 1000000000, "vol": 15000000, "incendie": 15000000, "bris_glace": 1000000}',
'{"base_rate": 0.020, "vehicle_age_factor": 0.05, "driver_experience_factor": 0.10}',
420000, 3000000, 30000000, ARRAY[25000, 50000, 100000],
'{"min_age": 18, "max_age": 75}',
ARRAY['Conduite sans permis', 'Véhicule non conforme'],
ARRAY['Protection vol/incendie', 'Assistance dépannage', 'Défense recours'],
ARRAY['Tarif compétitif', 'Couverture étendue', 'Service client'],
'Déclaration téléphonique, traitement prioritaire', 10, false),

-- OGAR - Assurances Habitation
('ogar', 'OGAR Habitation Confort', 'habitation', 'Assurance multirisque habitation pour résidence principale',
'{"incendie": 50000000, "degats_eaux": 30000000, "vol": 15000000, "responsabilite_civile": 500000000, "bris_glace": 3000000}',
'{"base_rate": 0.002, "property_type_factor": 0.3, "location_factor": 0.2, "security_factor": 0.15}',
120000, 10000000, 100000000, ARRAY[25000, 50000, 100000, 200000],
'{"min_age": 18, "max_age": 99}',
ARRAY['Négligence grave', 'Dommages antérieurs à la souscription', 'Guerre'],
ARRAY['Garantie mobilier', 'Frais de relogement', 'Assistance serrurerie', 'Protection juridique'],
ARRAY['Expertise gratuite', 'Indemnisation à neuf', 'Assistance 24h/24'],
'Déclaration sous 5 jours, expertise gratuite, règlement rapide', 20, true),

-- NSIA - Assurances Vie
('nsia', 'NSIA Vie Protection Famille', 'vie', 'Assurance vie temporaire avec capital décès et invalidité',
'{"capital_deces": 50000000, "invalidite_permanente": 50000000, "incapacite_temporaire": {"taux": 80, "duree_max": 1095}, "maladies_graves": 25000000}',
'{"age_factor": 0.02, "profession_factor": 0.25, "health_factor": 0.30, "smoking_factor": 0.40}',
45000, 5000000, 200000000, ARRAY[0],
'{"min_age": 18, "max_age": 65}',
ARRAY['Suicide première année', 'Sports extrêmes', 'Maladies antérieures non déclarées'],
ARRAY['Prime fixe', 'Capital garanti', 'Avance sur police', 'Exonération primes invalidité'],
ARRAY['Groupe panafricain', 'Solidité financière', 'Service client expert'],
'Déclaration sous 48h, instruction médicale si nécessaire, règlement 30 jours', 30, true),

('nsia', 'NSIA Santé Plus', 'sante', 'Complémentaire santé familiale avec couverture étendue',
'{"hospitalisation": 15000000, "consultations": 2000000, "pharmacie": 1500000, "dentaire": 800000, "optique": 600000, "maternite": 3000000}',
'{"age_factor": 0.15, "family_size_factor": 0.20, "coverage_level_factor": 0.35}',
85000, 1000000, 50000000, ARRAY[10000, 25000, 50000],
'{"min_age": 0, "max_age": 70}',
ARRAY['Affections antérieures non déclarées', 'Cures thermales', 'Médecines douces'],
ARRAY['Tiers-payant', 'Téléconsultation', 'Assistance rapatriement', 'Seconde opinion médicale'],
ARRAY['Réseau médical étendu', 'Remboursements rapides', 'Application mobile'],
'Paiement direct ou remboursement sous 15 jours', 15, true),

-- AXA - Assurances
('axa_gabon', 'AXA Vie Épargne', 'vie', 'Assurance vie avec support épargne et investissement',
'{"capital_deces": 25000000, "epargne_garantie": true, "participations_benefices": true, "avances": true, "rachats_partiels": true}',
'{"age_factor": 0.018, "capital_factor": 0.001, "support_factor": 0.12}',
125000, 2000000, 500000000, ARRAY[0],
'{"min_age": 18, "max_age": 70}',
ARRAY['Fausse déclaration', 'Suicide première année'],
ARRAY['Épargne garantie', 'Fiscalité avantageuse', 'Transmission patrimoine', 'Souplesse gestion'],
ARRAY['Groupe AXA international', 'Gestion financière experte', 'Performance attractive'],
'Procédure simplifiée, versement sous 30 jours', 30, true),

-- Colina - Assurances
('colina', 'Colina Transport Marchandises', 'transport', 'Assurance transport de marchandises tous risques',
'{"tous_risques": true, "vol": 100000000, "avarie": 100000000, "mouille": 100000000, "casse": 50000000}',
'{"value_factor": 0.008, "distance_factor": 0.002, "goods_type_factor": 0.15}',
800000, 10000000, 2000000000, ARRAY[100000, 500000, 1000000],
'{"min_age": 18, "max_age": 99}',
ARRAY['Emballage défectueux', 'Retard de livraison', 'Vice propre marchandise'],
ARRAY['Couverture mondiale', 'Expertise rapide', 'Indemnisation juste valeur'],
ARRAY['Spécialiste transport', 'Réseau international', 'Tarifs compétitifs'],
'Déclaration immédiate, expertise sur site, règlement 21 jours', 21, false),

-- Saham - Assurances
('saham', 'Saham Voyage Monde', 'voyage', 'Assurance voyage internationale avec assistance complète',
'{"frais_medicaux": 100000000, "rapatriement": 500000000, "annulation": 15000000, "bagages": 3000000, "responsabilite_civile": 150000000}',
'{"destination_factor": 0.25, "duration_factor": 0.1, "age_factor": 0.15, "activities_factor": 0.20}',
25000, 50000, 200000000, ARRAY[0, 50000, 100000],
'{"min_age": 0, "max_age": 75}',
ARRAY['Sports à risque', 'Pays en guerre', 'Maladies chroniques non déclarées'],
ARRAY['Assistance 24h/24', 'Rapatriement médical', 'Avance frais hospitaliers', 'Perte bagages'],
ARRAY['Couverture mondiale', 'Réseau Sanlam', 'Application mobile'],
'Assistance téléphonique immédiate, remboursement 14 jours', 14, true);

-- =========================================================
-- DONNÉES DE TEST - ADMINISTRATEURS
-- =========================================================
INSERT INTO admin_users (username, email, password_hash, first_name, last_name, role, permissions) VALUES
('superadmin', 'admin@bamboo-credit.ga', '$2b$12$LQv3c1yqBwlVHpPp2LKvbe.6JgqzqQ4Q8hxLl3iC9vF.lQQ1h3WqG', 'Super', 'Admin', 'super_admin', 
'{"banks": ["create", "read", "update", "delete"], "insurance_companies": ["create", "read", "update", "delete"], "credit_products": ["create", "read", "update", "delete"], "savings_products": ["create", "read", "update", "delete"], "insurance_products": ["create", "read", "update", "delete"], "simulations": ["read", "delete"], "applications": ["read", "update", "delete"], "users": ["create", "read", "update", "delete"], "audit": ["read"]}'),

('admin_credit', 'credit.admin@bamboo-credit.ga', '$2b$12$LQv3c1yqBwlVHpPp2LKvbe.6JgqzqQ4Q8hxLl3iC9vF.lQQ1h3WqG', 'Admin', 'Crédit', 'admin',
'{"banks": ["read"], "credit_products": ["create", "read", "update", "delete"], "simulations": ["read"], "applications": ["read", "update"]}'),

('admin_epargne', 'epargne.admin@bamboo-credit.ga', '$2b$12$LQv3c1yqBwlVHpPp2LKvbe.6JgqzqQ4Q8hxLl3iC9vF.lQQ1h3WqG', 'Admin', 'Épargne', 'admin',
'{"banks": ["read"], "savings_products": ["create", "read", "update", "delete"], "simulations": ["read"], "applications": ["read", "update"]}'),

('admin_assurance', 'assurance.admin@bamboo-credit.ga', '$2b$12$LQv3c1yqBwlVHpPp2LKvbe.6JgqzqQ4Q8hxLl3iC9vF.lQQ1h3WqG', 'Admin', 'Assurance', 'admin',
'{"insurance_companies": ["read"], "insurance_products": ["create", "read", "update", "delete"], "quotes": ["read"], "applications": ["read", "update"]}'),

('moderator', 'moderator@bamboo-credit.ga', '$2b$12$LQv3c1yqBwlVHpPp2LKvbe.6JgqzqQ4Q8hxLl3iC9vF.lQQ1h3WqG', 'Modérateur', 'Principal', 'moderator',
'{"credit_products": ["read", "update"], "savings_products": ["read", "update"], "insurance_products": ["read", "update"], "applications": ["read", "update"]}'),

('readonly', 'readonly@bamboo-credit.ga', '$2b$12$LQv3c1yqBwlVHpPp2LKvbe.6JgqzqQ4Q8hxLl3iC9vF.lQQ1h3WqG', 'Utilisateur', 'Lecture', 'readonly',
'{"banks": ["read"], "insurance_companies": ["read"], "credit_products": ["read"], "savings_products": ["read"], "insurance_products": ["read"], "simulations": ["read"], "applications": ["read"]}');

-- =========================================================
-- DONNÉES DE TEST - SIMULATIONS
-- =========================================================
INSERT INTO credit_simulations (session_id, credit_product_id, requested_amount, duration_months, monthly_income, current_debts, down_payment, applied_rate, monthly_payment, total_cost, total_interest, debt_ratio, eligible, risk_score, recommendations, client_ip) VALUES
('session_001', (SELECT id FROM credit_products WHERE name = 'BGFI Habitat Plus' LIMIT 1), 25000000, 240, 1200000, 150000, 5000000, 6.5, 187500, 45000000, 20000000, 28.13, true, 75, ARRAY['Excellent dossier', 'Taux préférentiel possible'], '192.168.1.1'),
('session_002', (SELECT id FROM credit_products WHERE name = 'UGB Express Auto' LIMIT 1), 8000000, 60, 800000, 80000, 2000000, 9.2, 166200, 9972000, 1972000, 30.78, true, 68, ARRAY['Profil solide', 'Assurance recommandée'], '192.168.1.2'),
('session_003', (SELECT id FROM credit_products WHERE name = 'BGFI Conso Liberté' LIMIT 1), 3000000, 36, 600000, 100000, 0, 14.5, 108000, 3888000, 888000, 34.67, false, 45, ARRAY['Taux endettement limite', 'Réduire charges'], '192.168.1.3');

INSERT INTO savings_simulations (session_id, savings_product_id, initial_amount, monthly_contribution, duration_months, final_amount, total_contributions, total_interest, effective_rate, client_ip) VALUES
('session_004', (SELECT id FROM savings_products WHERE name = 'BGFI Livret Croissance' LIMIT 1), 1000000, 200000, 120, 26400000, 25000000, 1400000, 3.25, '192.168.1.4'),
('session_005', (SELECT id FROM savings_products WHERE name = 'UGB Épargne Plus' LIMIT 1), 500000, 150000, 60, 9650000, 9500000, 150000, 3.00, '192.168.1.5');

-- =========================================================
-- FONCTIONS UTILITAIRES
-- =========================================================

-- Fonction de calcul mensualité
CREATE OR REPLACE FUNCTION calculate_monthly_payment(
    principal DECIMAL(12,2),
    annual_rate DECIMAL(5,2),
    months INTEGER
) RETURNS DECIMAL(10,2) AS 
$
DECLARE
    monthly_rate DECIMAL(10,8);
    payment DECIMAL(10,2);
BEGIN
    IF annual_rate = 0 THEN
        RETURN principal / months;
    END IF;
    
    monthly_rate := annual_rate / 100.0 / 12.0;
    payment := principal * (monthly_rate * POWER(1 + monthly_rate, months)) / (POWER(1 + monthly_rate, months) - 1);
    
    RETURN ROUND(payment, 2);
END;
$ LANGUAGE plpgsql;

-- Fonction de calcul épargne future
CREATE OR REPLACE FUNCTION calculate_future_savings(
    initial_amount DECIMAL(12,2),
    monthly_contribution DECIMAL(10,2),
    annual_rate DECIMAL(5,2),
    months INTEGER
) RETURNS DECIMAL(12,2) AS 
$
DECLARE
    monthly_rate DECIMAL(10,8);
    current_balance DECIMAL(12,2);
    i INTEGER;
BEGIN
    monthly_rate := annual_rate / 100.0 / 12.0;
    current_balance := initial_amount;
    
    FOR i IN 1..months LOOP
        current_balance := current_balance * (1 + monthly_rate) + monthly_contribution;
    END LOOP;
    
    RETURN ROUND(current_balance, 2);
END;
$ LANGUAGE plpgsql;

-- Fonction trigger pour updated_at
CREATE OR REPLACE FUNCTION update_modified_column()
RETURNS TRIGGER AS 
$
BEGIN
    NEW.updated_at = CURRENT_TIMESTAMP;
    RETURN NEW;
END;
$ LANGUAGE plpgsql;

-- Création des triggers
CREATE TRIGGER update_banks_modtime BEFORE UPDATE ON banks FOR EACH ROW EXECUTE FUNCTION update_modified_column();
CREATE TRIGGER update_insurance_companies_modtime BEFORE UPDATE ON insurance_companies FOR EACH ROW EXECUTE FUNCTION update_modified_column();
CREATE TRIGGER update_credit_products_modtime BEFORE UPDATE ON credit_products FOR EACH ROW EXECUTE FUNCTION update_modified_column();
CREATE TRIGGER update_savings_products_modtime BEFORE UPDATE ON savings_products FOR EACH ROW EXECUTE FUNCTION update_modified_column();
CREATE TRIGGER update_insurance_products_modtime BEFORE UPDATE ON insurance_products FOR EACH ROW EXECUTE FUNCTION update_modified_column();

-- =========================================================
-- VUES UTILES POUR LE BACK-OFFICE
-- =========================================================

-- Vue statistiques globales
CREATE VIEW admin_dashboard_stats AS
SELECT 
    'banks' as entity,
    COUNT(*) as total,
    COUNT(*) FILTER (WHERE is_active = true) as active,
    COUNT(*) FILTER (WHERE created_at >= CURRENT_DATE - INTERVAL '30 days') as recent
FROM banks
UNION ALL
SELECT 
    'insurance_companies' as entity,
    COUNT(*) as total,
    COUNT(*) FILTER (WHERE is_active = true) as active,
    COUNT(*) FILTER (WHERE created_at >= CURRENT_DATE - INTERVAL '30 days') as recent
FROM insurance_companies
UNION ALL
SELECT 
    'credit_products' as entity,
    COUNT(*) as total,
    COUNT(*) FILTER (WHERE is_active = true) as active,
    COUNT(*) FILTER (WHERE created_at >= CURRENT_DATE - INTERVAL '30 days') as recent
FROM credit_products
UNION ALL
SELECT 
    'savings_products' as entity,
    COUNT(*) as total,
    COUNT(*) FILTER (WHERE is_active = true) as active,
    COUNT(*) FILTER (WHERE created_at >= CURRENT_DATE - INTERVAL '30 days') as recent
FROM savings_products
UNION ALL
SELECT 
    'insurance_products' as entity,
    COUNT(*) as total,
    COUNT(*) FILTER (WHERE is_active = true) as active,
    COUNT(*) FILTER (WHERE created_at >= CURRENT_DATE - INTERVAL '30 days') as recent
FROM insurance_products;

-- Vue produits avec banques
CREATE VIEW products_with_banks AS
SELECT 
    cp.id,
    cp.name,
    cp.type,
    cp.average_rate,
    cp.min_amount,
    cp.max_amount,
    cp.is_active,
    cp.is_featured,
    b.name as bank_name,
    b.id as bank_id,
    'credit' as product_category,
    cp.created_at,
    cp.updated_at
FROM credit_products cp
JOIN banks b ON cp.bank_id = b.id
UNION ALL
SELECT 
    sp.id,
    sp.name,
    sp.type,
    sp.interest_rate as average_rate,
    sp.minimum_deposit as min_amount,
    sp.maximum_deposit as max_amount,
    sp.is_active,
    sp.is_featured,
    b.name as bank_name,
    b.id as bank_id,
    'savings' as product_category,
    sp.created_at,
    sp.updated_at
FROM savings_products sp
JOIN banks b ON sp.bank_id = b.id;

-- Vue produits assurance avec compagnies
CREATE VIEW insurance_products_with_companies AS
SELECT 
    ip.id,
    ip.name,
    ip.type,
    ip.base_premium,
    ip.min_coverage,
    ip.max_coverage,
    ip.is_active,
    ip.is_featured,
    ic.name as company_name,
    ic.id as company_id,
    ip.created_at,
    ip.updated_at
FROM insurance_products ip
JOIN insurance_companies ic ON ip.insurance_company_id = ic.id;

-- Message de confirmation
SELECT 'Base de données Bamboo Financial créée avec succès!' as status,
       'Tables: ' || COUNT(*) || ' créées' as tables_count
FROM information_schema.tables 
WHERE table_schema = 'public' 
AND table_name IN ('banks', 'insurance_companies', 'credit_products', 'savings_products', 'insurance_products', 'credit_simulations', 'savings_simulations', 'insurance_quotes', 'admin_users', 'audit_logs');