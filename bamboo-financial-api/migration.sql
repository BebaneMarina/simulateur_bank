-- Script SQL pour insérer les produits d'assurance Bamboo Assur
-- Basé sur les recherches effectuées sur leurs offres réelles

-- D'abord, insérer la compagnie Bamboo Assur si elle n'existe pas
INSERT INTO public.insurance_companies (
    id, name, full_name, logo_url, rating, solvency_ratio, 
    contact_phone, contact_email, specialties, is_active, created_at
) VALUES (
    'bamboo-assur',
    'Bamboo Assur', 
    'Bamboo Assur - Cabinet de Courtage en Assurances',
    '/assets/images/logos/bamboo-assur-logo.png',
    4.2,
    1.15,
    '+241 74 00 92 12',
    'contact@bambooassur.com',
    ARRAY['micro-assurance', 'assurance-digitale', 'assurance-inclusive'],
    true,
    CURRENT_TIMESTAMP
) ON CONFLICT (id) DO UPDATE SET
    name = EXCLUDED.name,
    full_name = EXCLUDED.full_name,
    contact_phone = EXCLUDED.contact_phone,
    contact_email = EXCLUDED.contact_email,
    updated_at = CURRENT_TIMESTAMP;

-- 1. ASSURANCE AUTOMOBILE BAMBOO
INSERT INTO public.insurance_products (
    id, insurance_company_id, name, type, description,
    coverage_details, premium_calculation, base_premium,
    min_coverage, max_coverage, deductible_options,
    age_limits, exclusions, features, advantages,
    claim_process, settlement_time_days, renewable,
    is_featured, is_active, created_at
) VALUES (
    'bamboo-auto-essential',
    'bamboo-assur',
    'Bamboo Auto Essential',
    'auto',
    'Assurance automobile complète couvrant les dommages matériels et immatériels causés aux tiers et les dommages subis par le véhicule',
    '{
        "responsabilite_civile": "Illimitée pour dommages corporels, 500M FCFA pour dommages matériels",
        "dommages_collision": "Selon valeur du véhicule",
        "vol_incendie": "Valeur de remplacement à neuf pendant 2 ans",
        "assistance": "24h/24 sur tout le territoire gabonais",
        "protection_juridique": "Jusqu''à 5M FCFA"
    }',
    '{
        "base_rate": 0.035,
        "age_multiplier": {"18-25": 1.5, "26-35": 1.0, "36-50": 0.9, "51+": 1.1},
        "location_multiplier": {"libreville": 1.2, "port-gentil": 1.1, "autres": 1.0},
        "vehicle_type_multiplier": {"particulier": 1.0, "utilitaire": 1.3, "moto": 0.8}
    }',
    25000.00,
    15000000.00,
    100000000.00,
    ARRAY[50000, 100000, 250000],
    '{
        "min_age": 18,
        "max_age": 75,
        "permis_min_duration": 1
    }',
    ARRAY[
        'Conduite en état d''ivresse ou sous l''influence de stupéfiants',
        'Conduite sans permis valide',
        'Usage commercial non déclaré',
        'Dommages intentionnels',
        'Guerre, émeutes, mouvements populaires',
        'Catastrophes nucléaires'
    ],
    ARRAY[
        'Souscription 100% digitale',
        'Gestion des sinistres en ligne',
        'Assistance 24h/24',
        'Protection juridique incluse',
        'Véhicule de remplacement',
        'Remorquage gratuit'
    ],
    ARRAY[
        'Tarifs compétitifs et transparents',
        'Processus de souscription simplifié',
        'Indemnisation rapide sous 10 jours',
        'Paiement flexible par mobile money',
        'Service client réactif',
        'Couverture adaptée au contexte gabonais'
    ],
    'Déclaration de sinistre via application mobile ou site web. Expertise sous 48h. Règlement sous 10 jours après acceptation du dossier.',
    10,
    true,
    true,
    true,
    CURRENT_TIMESTAMP
);

-- 2. ASSURANCE SANTÉ BAMBOO
INSERT INTO public.insurance_products (
    id, insurance_company_id, name, type, description,
    coverage_details, premium_calculation, base_premium,
    min_coverage, max_coverage, deductible_options,
    age_limits, exclusions, features, advantages,
    claim_process, settlement_time_days, renewable,
    is_featured, is_active, created_at
) VALUES (
    'bamboo-sante-famille',
    'bamboo-assur',
    'Bamboo Santé Famille',
    'sante',
    'Assurance santé familiale permettant l''accès à une couverture maladie adaptée avec des moyens de règlement flexibles',
    '{
        "hospitalisation": "100% des frais réels",
        "consultations": "80% des consultations médicales",
        "pharmacie": "70% des médicaments prescrits",
        "dentaire": "60% des soins dentaires",
        "optique": "200000 FCFA par an et par bénéficiaire",
        "maternite": "100% des frais d''accouchement",
        "analyses": "85% des examens de laboratoire"
    }',
    '{
        "base_rate_individual": 15000,
        "family_multiplier": {"couple": 1.8, "famille_3": 2.5, "famille_4": 3.0, "famille_5+": 3.5},
        "age_multiplier": {"0-18": 0.7, "19-35": 1.0, "36-50": 1.3, "51-65": 1.8, "65+": 2.5},
        "coverage_level": {"essentiel": 1.0, "confort": 1.4, "premium": 1.8}
    }',
    15000.00,
    500000.00,
    50000000.00,
    ARRAY[25000, 50000, 100000],
    '{
        "min_age": 0,
        "max_age": 70,
        "waiting_period_days": 30
    }',
    ARRAY[
        'Maladies préexistantes non déclarées',
        'Chirurgie esthétique non médicale',
        'Cures thermales et de repos',
        'Médecines alternatives non conventionnées',
        'Soins à l''étranger non urgents',
        'Traitements expérimentaux'
    ],
    ARRAY[
        'Couverture familiale étendue',
        'Réseau de soins partenaires au Gabon',
        'Téléconsultation incluse',
        'Pharmacies partenaires avec tiers payant',
        'Carnet de santé numérique',
        'Assistance médicale d''urgence'
    ],
    ARRAY[
        'Tarification transparente et abordable',
        'Pas de questionnaire médical pour les moins de 40 ans',
        'Remboursements rapides sous 7 jours',
        'Paiement par mobile money accepté',
        'Service client multilingue',
        'Prévention et conseils santé inclus'
    ],
    'Envoi des justificatifs par photo via l''application mobile. Remboursement automatique sur compte mobile money ou bancaire.',
    7,
    true,
    true,
    true,
    CURRENT_TIMESTAMP
);

-- 3. ASSURANCE ÉPARGNE AVENIR BAMBOO
INSERT INTO public.insurance_products (
    id, insurance_company_id, name, type, description,
    coverage_details, premium_calculation, base_premium,
    min_coverage, max_coverage, deductible_options,
    age_limits, exclusions, features, advantages,
    claim_process, settlement_time_days, renewable,
    is_featured, is_active, created_at
) VALUES (
    'bamboo-epargne-avenir',
    'bamboo-assur',
    'Bamboo Épargne Avenir',
    'vie',
    'Assurance vie permettant de constituer une épargne capitalisée pour le financement des études de vos enfants ou tout autre projet',
    '{
        "capital_garanti": "Capital versé + intérêts garantis",
        "rendement_minimum": "4% par an garanti",
        "bonus_fidelite": "0.5% supplémentaire après 5 ans",
        "avance_sur_police": "Jusqu''à 80% de la valeur de rachat",
        "exoneration_primes": "En cas d''invalidité permanente",
        "rente_education": "Option de transformation en rente"
    }',
    '{
        "minimum_premium": 25000,
        "premium_frequency": "mensuelle, trimestrielle, semestrielle, annuelle",
        "management_fees": 0.015,
        "surrender_fees": {"year_1": 0.05, "year_2": 0.03, "year_3+": 0.01}
    }',
    25000.00,
    1000000.00,
    500000000.00,
    ARRAY[0],
    '{
        "min_age_subscriber": 18,
        "max_age_subscriber": 65,
        "min_duration_years": 5,
        "max_duration_years": 30
    }',
    ARRAY[
        'Suicide dans la première année du contrat',
        'Non-paiement des primes après délai de grâce',
        'Fausse déclaration lors de la souscription',
        'Activités à risque non déclarées',
        'Résidence permanente hors du Gabon'
    ],
    ARRAY[
        'Versements libres à partir de 25000 FCFA',
        'Rachat partiel autorisé après 2 ans',
        'Avances sur contrat disponibles',
        'Gestion en ligne 24h/24',
        'Transformation en rente possible',
        'Exonération fiscale des plus-values'
    ],
    ARRAY[
        'Rendement attractif et garanti',
        'Souplesse des versements',
        'Transmission facilitée aux bénéficiaires',
        'Fiscalité avantageuse',
        'Possibilité de rachat anticipé',
        'Accompagnement personnalisé'
    ],
    'Demande de rachat ou d''avance via l''espace client en ligne. Versement sous 15 jours ouvrés.',
    15,
    true,
    false,
    true,
    CURRENT_TIMESTAMP
);

-- 4. ASSURANCE CRÉDIT BAMBOO
INSERT INTO public.insurance_products (
    id, insurance_company_id, name, type, description,
    coverage_details, premium_calculation, base_premium,
    min_coverage, max_coverage, deductible_options,
    age_limits, exclusions, features, advantages,
    claim_process, settlement_time_days, renewable,
    is_featured, is_active, created_at
) VALUES (
    'bamboo-assurance-credit',
    'bamboo-assur',
    'Bamboo Assurance Crédit',
    'credit',
    'Protection de votre crédit en cas d''incapacité de remboursement due au décès, à l''invalidité ou à l''incapacité temporaire',
    '{
        "deces": "Remboursement intégral du capital restant dû",
        "invalidite_permanente": "Remboursement selon taux d''invalidité",
        "incapacite_temporaire": "Prise en charge des échéances jusqu''à reprise d''activité",
        "perte_emploi": "6 mois de prise en charge maximum par sinistre",
        "hospitalisation": "Échéances suspendues pendant l''hospitalisation"
    }',
    '{
        "rate_by_coverage": {
            "deces_seul": 0.003,
            "deces_invalidite": 0.0045,
            "couverture_complete": 0.0065
        },
        "age_coefficient": {"18-40": 1.0, "41-50": 1.3, "51-60": 1.8, "61-65": 2.5}
    }',
    5000.00,
    1000000.00,
    200000000.00,
    ARRAY[0],
    '{
        "min_age": 18,
        "max_age": 65,
        "max_loan_duration": 25
    }',
    ARRAY[
        'Maladies préexistantes non déclarées',
        'Suicide dans la première année',
        'Sports extrêmes et activités dangereuses',
        'Licenciement pour faute grave',
        'Travail dans les mines ou secteur pétrolier'
    ],
    ARRAY[
        'Couverture adaptée au montant du crédit',
        'Questionnaire de santé simplifié',
        'Prise en charge immédiate',
        'Compatible avec tous types de crédits',
        'Démarches simplifiées en ligne',
        'Partenariat avec institutions financières'
    ],
    ARRAY[
        'Protection complète de votre famille',
        'Préservation du patrimoine familial',
        'Tarifs négociés avec les banques',
        'Souscription rapide et simple',
        'Aucun reste à charge en cas de sinistre',
        'Service dédié aux professionnels'
    ],
    'Déclaration du sinistre avec justificatifs médicaux. Prise en charge immédiate après validation.',
    15,
    false,
    false,
    true,
    CURRENT_TIMESTAMP
);

-- 5. ASSURANCE ASSISTANCE OBSÈQUES BAMBOO
INSERT INTO public.insurance_products (
    id, insurance_company_id, name, type, description,
    coverage_details, premium_calculation, base_premium,
    min_coverage, max_coverage, deductible_options,
    age_limits, exclusions, features, advantages,
    claim_process, settlement_time_days, renewable,
    is_featured, is_active, created_at
) VALUES (
    'bamboo-assistance-obseques',
    'bamboo-assur',
    'Bamboo Assistance Obsèques',
    'obseques',
    'Assurance obsèques permettant de préparer et financer ses obsèques tout en soulageant sa famille des démarches administratives',
    '{
        "capital_deces": "Capital garanti pour financer les obsèques",
        "assistance_administrative": "Aide aux démarches administratives",
        "transport_corps": "Rapatriement du corps au Gabon",
        "ceremonie": "Organisation des cérémonies religieuses ou civiles",
        "inhumation": "Frais de concession et d''inhumation",
        "plaques_fleurs": "Budget alloué pour plaques et fleurs"
    }',
    '{
        "formules": {
            "essentielle": 5000,
            "confort": 8000,
            "prestige": 12000
        },
        "age_entry": {"18-50": 1.0, "51-60": 1.2, "61-70": 1.5, "71-80": 2.0}
    }',
    5000.00,
    2000000.00,
    10000000.00,
    ARRAY[0],
    '{
        "min_age": 18,
        "max_age": 80,
        "waiting_period_months": 12
    }',
    ARRAY[
        'Suicide dans les deux premières années',
        'Décès résultant d''activités criminelles',
        'Décès pendant un conflit armé',
        'Maladies préexistantes non déclarées',
        'Décès à l''étranger sans rapatriement'
    ],
    ARRAY[
        'Capital garanti indexé sur l''inflation',
        'Assistance 24h/24 en cas de décès',
        'Réseau de pompes funèbres partenaires',
        'Préfinancement des obsèques possible',
        'Conseil et accompagnement des familles',
        'Gestion complète des formalités'
    ],
    ARRAY[
        'Soulagement financier pour la famille',
        'Obsèques conformes aux volontés du défunt',
        'Tarifs négociés avec les prestataires',
        'Pas d''avance de frais pour la famille',
        'Service d''assistance dédié',
        'Couverture nationale et internationale'
    ],
    'Appel immédiat au service assistance. Prise en charge sous 2h et versement du capital sous 48h.',
    2,
    true,
    false,
    true,
    CURRENT_TIMESTAMP
);

-- 6. ASSURANCE COMPLÉMENTAIRE RETRAITE BAMBOO
INSERT INTO public.insurance_products (
    id, insurance_company_id, name, type, description,
    coverage_details, premium_calculation, base_premium,
    min_coverage, max_coverage, deductible_options,
    age_limits, exclusions, features, advantages,
    claim_process, settlement_time_days, renewable,
    is_featured, is_active, created_at
) VALUES (
    'bamboo-complementaire-retraite',
    'bamboo-assur',
    'Bamboo Complémentaire Retraite',
    'retraite',
    'Solution d''épargne retraite pour compléter votre pension et maintenir votre niveau de vie après la cessation d''activité',
    '{
        "rente_viagere": "Rente mensuelle garantie à vie",
        "capital_constitue": "Capital disponible à la retraite",
        "rente_conjoint": "60% de la rente pour le conjoint survivant",
        "rente_temporaire": "Option de rente sur période déterminée",
        "sortie_capital": "Possibilité de sortie en capital partielle",
        "revalorisation": "Revalorisation annuelle selon résultats"
    }',
    '{
        "cotisation_minimum": 20000,
        "taux_technique": 0.025,
        "frais_entree": 0.05,
        "frais_gestion": 0.015,
        "bonus_anciennete": {"10_ans": 0.005, "20_ans": 0.01}
    }',
    20000.00,
    5000000.00,
    200000000.00,
    ARRAY[0],
    '{
        "min_age_entry": 25,
        "max_age_entry": 55,
        "min_retirement_age": 55,
        "max_retirement_age": 70
    }',
    ARRAY[
        'Sortie avant l''âge de la retraite sauf cas exceptionnels',
        'Transfert du contrat à l''étranger',
        'Non-paiement des cotisations après mise en demeure',
        'Fausse déclaration sur l''âge ou l''état de santé'
    ],
    ARRAY[
        'Déduction fiscale des cotisations',
        'Versements programmés ou libres',
        'Choix du mode de sortie à la retraite',
        'Garantie de taux minimum',
        'Participation aux bénéfices',
        'Portabilité en cas de changement d''employeur'
    ],
    ARRAY[
        'Complément de revenus substantiel à la retraite',
        'Optimisation fiscale pendant l''épargne',
        'Sécurisation du capital constitué',
        'Flexibilité des versements',
        'Protection du conjoint survivant',
        'Gestion professionnelle des fonds'
    ],
    'Demande de liquidation 6 mois avant la retraite. Premier versement de rente le mois suivant.',
    30,
    true,
    false,
    true,
    CURRENT_TIMESTAMP
);

-- 7. ASSURANCE VOYAGE BAMBOO
INSERT INTO public.insurance_products (
    id, insurance_company_id, name, type, description,
    coverage_details, premium_calculation, base_premium,
    min_coverage, max_coverage, deductible_options,
    age_limits, exclusions, features, advantages,
    claim_process, settlement_time_days, renewable,
    is_featured, is_active, created_at
) VALUES (
    'bamboo-voyage-international',
    'bamboo-assur',
    'Bamboo Voyage International',
    'voyage',
    'Assurance voyage complète pour vos déplacements à l''étranger avec assistance médicale et rapatriement',
    '{
        "frais_medicaux": "Jusqu''à 50M FCFA par sinistre",
        "rapatriement_medical": "Frais illimités de rapatriement",
        "assistance_24h": "Centrale d''assistance multilingue",
        "bagages": "Jusqu''à 2M FCFA pour vol ou perte",
        "annulation_voyage": "Remboursement jusqu''à 10M FCFA",
        "retard_transport": "Indemnisation retard > 4h",
        "responsabilite_civile": "Jusqu''à 5M FCFA"
    }',
    '{
        "tarif_par_jour": {
            "afrique": 2500,
            "europe": 4500,
            "amerique": 6000,
            "asie": 5000,
            "oceanie": 7000,
            "mondial": 8000
        },
        "age_majoration": {"65-75": 1.5, "75+": 2.0},
        "activites_risque": 1.3
    }',
    2500.00,
    1000000.00,
    50000000.00,
    ARRAY[100000, 250000],
    '{
        "min_age": 0,
        "max_age": 80,
        "max_duration_days": 180
    }',
    ARRAY[
        'Voyages dans les pays en guerre ou sous embargo',
        'Maladies préexistantes connues',
        'Sports extrêmes non déclarés',
        'Consommation d''alcool ou stupéfiants',
        'Voyage contre avis médical',
        'Grossesse pathologique connue avant le départ'
    ],
    ARRAY[
        'Couverture mondiale 24h/24',
        'Application mobile avec géolocalisation',
        'Avance de frais par la centrale d''assistance',
        'Médecin référent francophone',
        'Téléconsultation incluse',
        'Extension famille nombreuse'
    ],
    ARRAY[
        'Tarifs compétitifs par rapport aux concurrents',
        'Souscription jusqu''à la veille du départ',
        'Couverture adaptée aux voyageurs gabonais',
        'Partenariat avec Air France et autres compagnies',
        'Remboursement rapide des frais avancés',
        'Service client en français'
    ],
    'Appel immédiat à la centrale d''assistance. Prise en charge directe avec les prestataires médicaux.',
    5,
    false,
    true,
    true,
    CURRENT_TIMESTAMP
);

-- Mise à jour des timestamps de la compagnie
UPDATE public.insurance_companies 
SET updated_at = CURRENT_TIMESTAMP 
WHERE id = 'bamboo-assur';

-- Vérification des insertions
SELECT 
    ip.id,
    ip.name,
    ip.type,
    ic.name as company_name,
    ip.base_premium,
    ip.is_active
FROM public.insurance_products ip
JOIN public.insurance_companies ic ON ip.insurance_company_id = ic.id
WHERE ic.id = 'bamboo-assur'
ORDER BY ip.type, ip.name;