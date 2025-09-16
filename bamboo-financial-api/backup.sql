--
-- PostgreSQL database dump
--

-- Dumped from database version 17.5
-- Dumped by pg_dump version 17.5

SET statement_timeout = 0;
SET lock_timeout = 0;
SET idle_in_transaction_session_timeout = 0;
SET transaction_timeout = 0;
SET client_encoding = 'UTF8';
SET standard_conforming_strings = on;
SELECT pg_catalog.set_config('search_path', '', false);
SET check_function_bodies = false;
SET xmloption = content;
SET client_min_messages = warning;
SET row_security = off;

--
-- Name: calculate_debt_ratio(numeric, numeric, numeric); Type: FUNCTION; Schema: public; Owner: postgres
--

CREATE FUNCTION public.calculate_debt_ratio(monthly_payment numeric, current_debts numeric, monthly_income numeric) RETURNS numeric
    LANGUAGE plpgsql
    AS $$
BEGIN
    IF monthly_income = 0 THEN
        RETURN 999.99;
    END IF;
    
    RETURN ROUND(((monthly_payment + current_debts) / monthly_income) * 100, 2);
END;
$$;


ALTER FUNCTION public.calculate_debt_ratio(monthly_payment numeric, current_debts numeric, monthly_income numeric) OWNER TO postgres;

--
-- Name: calculate_future_savings(numeric, numeric, numeric, integer); Type: FUNCTION; Schema: public; Owner: postgres
--

CREATE FUNCTION public.calculate_future_savings(initial_amount numeric, monthly_contribution numeric, annual_rate numeric, months integer) RETURNS numeric
    LANGUAGE plpgsql
    AS $$
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
$$;


ALTER FUNCTION public.calculate_future_savings(initial_amount numeric, monthly_contribution numeric, annual_rate numeric, months integer) OWNER TO postgres;

--
-- Name: calculate_monthly_payment(numeric, numeric, integer); Type: FUNCTION; Schema: public; Owner: postgres
--

CREATE FUNCTION public.calculate_monthly_payment(principal numeric, annual_rate numeric, months integer) RETURNS numeric
    LANGUAGE plpgsql
    AS $$
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
$$;


ALTER FUNCTION public.calculate_monthly_payment(principal numeric, annual_rate numeric, months integer) OWNER TO postgres;

--
-- Name: generate_market_report(date); Type: FUNCTION; Schema: public; Owner: postgres
--

CREATE FUNCTION public.generate_market_report(report_date date DEFAULT CURRENT_DATE) RETURNS TABLE(product_type character varying, bank_count integer, avg_rate numeric, min_rate numeric, max_rate numeric, total_simulations integer)
    LANGUAGE plpgsql
    AS $$
BEGIN
    RETURN QUERY
    SELECT 
        cp.type as product_type,
        COUNT(DISTINCT cp.bank_id)::INTEGER as bank_count,
        ROUND(AVG(cp.average_rate), 2) as avg_rate,
        MIN(cp.average_rate) as min_rate,
        MAX(cp.average_rate) as max_rate,
        COUNT(cs.id)::INTEGER as total_simulations
    FROM credit_products cp
    LEFT JOIN credit_simulations cs ON cp.id = cs.credit_product_id 
        AND cs.created_at >= report_date - INTERVAL '30 days'
    WHERE cp.is_active = TRUE
    GROUP BY cp.type
    ORDER BY cp.type;
END;
$$;


ALTER FUNCTION public.generate_market_report(report_date date) OWNER TO postgres;

--
-- Name: update_modified_column(); Type: FUNCTION; Schema: public; Owner: postgres
--

CREATE FUNCTION public.update_modified_column() RETURNS trigger
    LANGUAGE plpgsql
    AS $$
BEGIN
    NEW.updated_at = CURRENT_TIMESTAMP;
    RETURN NEW;
END;
$$;


ALTER FUNCTION public.update_modified_column() OWNER TO postgres;

SET default_tablespace = '';

SET default_table_access_method = heap;

--
-- Name: banks; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.banks (
    id character varying(50) NOT NULL,
    name character varying(200) NOT NULL,
    full_name character varying(300),
    description text,
    logo_url character varying(500),
    website character varying(200),
    contact_phone character varying(20),
    contact_email character varying(100),
    address text,
    swift_code character varying(11),
    license_number character varying(50),
    established_year integer,
    total_assets numeric(15,2),
    rating character varying(10),
    is_active boolean DEFAULT true,
    created_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP,
    updated_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP
);


ALTER TABLE public.banks OWNER TO postgres;

--
-- Name: credit_products; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.credit_products (
    id character varying(50) NOT NULL,
    bank_id character varying(50),
    name character varying(200) NOT NULL,
    type character varying(50) NOT NULL,
    description text,
    min_amount numeric(12,2) NOT NULL,
    max_amount numeric(12,2) NOT NULL,
    min_duration_months integer NOT NULL,
    max_duration_months integer NOT NULL,
    average_rate numeric(5,2) NOT NULL,
    min_rate numeric(5,2),
    max_rate numeric(5,2),
    processing_time_hours integer DEFAULT 72,
    required_documents jsonb,
    eligibility_criteria jsonb,
    fees jsonb,
    features text[],
    advantages text[],
    special_conditions text,
    is_featured boolean DEFAULT false,
    is_active boolean DEFAULT true,
    created_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP,
    updated_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP
);


ALTER TABLE public.credit_products OWNER TO postgres;

--
-- Name: insurance_companies; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.insurance_companies (
    id character varying(50) NOT NULL,
    name character varying(200) NOT NULL,
    full_name character varying(300),
    description text,
    logo_url character varying(500),
    website character varying(200),
    contact_phone character varying(20),
    contact_email character varying(100),
    address text,
    license_number character varying(50),
    established_year integer,
    solvency_ratio numeric(5,2),
    rating character varying(10),
    specialties text[],
    coverage_areas text[],
    is_active boolean DEFAULT true,
    created_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP,
    updated_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP
);


ALTER TABLE public.insurance_companies OWNER TO postgres;

--
-- Name: insurance_products; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.insurance_products (
    id character varying(50) NOT NULL,
    insurance_company_id character varying(50),
    name character varying(200) NOT NULL,
    type character varying(50) NOT NULL,
    description text,
    coverage_details jsonb,
    premium_calculation jsonb,
    base_premium numeric(10,2),
    min_coverage numeric(12,2),
    max_coverage numeric(12,2),
    deductible_options numeric(10,2)[],
    age_limits jsonb,
    exclusions text[],
    features text[],
    advantages text[],
    claim_process text,
    settlement_time_days integer DEFAULT 15,
    renewable boolean DEFAULT true,
    is_featured boolean DEFAULT false,
    is_active boolean DEFAULT true,
    created_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP,
    updated_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP
);


ALTER TABLE public.insurance_products OWNER TO postgres;

--
-- Name: savings_products; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.savings_products (
    id character varying(50) NOT NULL,
    bank_id character varying(50),
    name character varying(200) NOT NULL,
    type character varying(50) NOT NULL,
    description text,
    interest_rate numeric(5,2) NOT NULL,
    minimum_deposit numeric(12,2) NOT NULL,
    maximum_deposit numeric(12,2),
    minimum_balance numeric(12,2) DEFAULT 0,
    liquidity character varying(20) NOT NULL,
    notice_period_days integer DEFAULT 0,
    term_months integer,
    compounding_frequency character varying(20) DEFAULT 'monthly'::character varying,
    fees jsonb,
    features text[],
    advantages text[],
    tax_benefits text[],
    risk_level integer DEFAULT 1,
    early_withdrawal_penalty numeric(5,2),
    is_islamic_compliant boolean DEFAULT false,
    is_featured boolean DEFAULT false,
    is_active boolean DEFAULT true,
    created_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP,
    updated_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP,
    terms_conditions text
);


ALTER TABLE public.savings_products OWNER TO postgres;

--
-- Name: admin_dashboard_stats; Type: VIEW; Schema: public; Owner: postgres
--

CREATE VIEW public.admin_dashboard_stats AS
 SELECT 'banks'::text AS entity,
    count(*) AS total,
    count(*) FILTER (WHERE (banks.is_active = true)) AS active,
    count(*) FILTER (WHERE (banks.created_at >= (CURRENT_DATE - '30 days'::interval))) AS recent
   FROM public.banks
UNION ALL
 SELECT 'insurance_companies'::text AS entity,
    count(*) AS total,
    count(*) FILTER (WHERE (insurance_companies.is_active = true)) AS active,
    count(*) FILTER (WHERE (insurance_companies.created_at >= (CURRENT_DATE - '30 days'::interval))) AS recent
   FROM public.insurance_companies
UNION ALL
 SELECT 'credit_products'::text AS entity,
    count(*) AS total,
    count(*) FILTER (WHERE (credit_products.is_active = true)) AS active,
    count(*) FILTER (WHERE (credit_products.created_at >= (CURRENT_DATE - '30 days'::interval))) AS recent
   FROM public.credit_products
UNION ALL
 SELECT 'savings_products'::text AS entity,
    count(*) AS total,
    count(*) FILTER (WHERE (savings_products.is_active = true)) AS active,
    count(*) FILTER (WHERE (savings_products.created_at >= (CURRENT_DATE - '30 days'::interval))) AS recent
   FROM public.savings_products
UNION ALL
 SELECT 'insurance_products'::text AS entity,
    count(*) AS total,
    count(*) FILTER (WHERE (insurance_products.is_active = true)) AS active,
    count(*) FILTER (WHERE (insurance_products.created_at >= (CURRENT_DATE - '30 days'::interval))) AS recent
   FROM public.insurance_products;


ALTER VIEW public.admin_dashboard_stats OWNER TO postgres;

--
-- Name: admin_sessions; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.admin_sessions (
    id character varying NOT NULL,
    admin_user_id character varying(50),
    token character varying(500) NOT NULL,
    expires_at timestamp without time zone NOT NULL,
    ip_address character varying(45),
    user_agent text,
    is_active boolean,
    created_at timestamp without time zone
);


ALTER TABLE public.admin_sessions OWNER TO postgres;

--
-- Name: admin_users; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.admin_users (
    id character varying NOT NULL,
    username character varying(50) NOT NULL,
    email character varying(100) NOT NULL,
    password_hash character varying(255) NOT NULL,
    first_name character varying(100),
    last_name character varying(100),
    role character varying(50) NOT NULL,
    permissions json,
    is_active boolean,
    last_login timestamp without time zone,
    created_by character varying(50),
    created_at timestamp without time zone,
    updated_at timestamp without time zone
);


ALTER TABLE public.admin_users OWNER TO postgres;

--
-- Name: app_config; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.app_config (
    key character varying(100) NOT NULL,
    value text NOT NULL,
    description text,
    created_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP,
    updated_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP
);


ALTER TABLE public.app_config OWNER TO postgres;

--
-- Name: audit_logs; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.audit_logs (
    id character varying NOT NULL,
    admin_user_id character varying(50),
    action character varying(100) NOT NULL,
    entity_type character varying(50) NOT NULL,
    entity_id character varying(100),
    old_values json,
    new_values json,
    ip_address character varying(45),
    user_agent text,
    created_at timestamp without time zone
);


ALTER TABLE public.audit_logs OWNER TO postgres;

--
-- Name: credit_applications; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.credit_applications (
    id character varying(50) NOT NULL,
    simulation_id character varying(50),
    credit_product_id character varying(50),
    applicant_name character varying(200) NOT NULL,
    applicant_email character varying(100),
    applicant_phone character varying(20),
    requested_amount numeric(12,2) NOT NULL,
    status character varying(50) DEFAULT 'pending'::character varying,
    application_data jsonb,
    documents_uploaded text[],
    bank_response jsonb,
    processing_notes text,
    assigned_to character varying(100),
    submitted_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP,
    updated_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP
);


ALTER TABLE public.credit_applications OWNER TO postgres;

--
-- Name: credit_simulations; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.credit_simulations (
    id character varying(50) NOT NULL,
    session_id character varying(100),
    credit_product_id character varying(50),
    requested_amount numeric(12,2) NOT NULL,
    duration_months integer NOT NULL,
    monthly_income numeric(10,2) NOT NULL,
    current_debts numeric(10,2) DEFAULT 0,
    down_payment numeric(12,2) DEFAULT 0,
    applied_rate numeric(5,2) NOT NULL,
    monthly_payment numeric(10,2) NOT NULL,
    total_cost numeric(12,2) NOT NULL,
    total_interest numeric(12,2) NOT NULL,
    debt_ratio numeric(5,2) NOT NULL,
    eligible boolean NOT NULL,
    risk_score integer,
    recommendations text[],
    amortization_schedule jsonb,
    client_ip character varying(45),
    user_agent text,
    created_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP
);


ALTER TABLE public.credit_simulations OWNER TO postgres;

--
-- Name: insurance_applications; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.insurance_applications (
    id character varying(50) NOT NULL,
    quote_id character varying(50),
    insurance_product_id character varying(50),
    applicant_name character varying(200) NOT NULL,
    applicant_email character varying(100),
    applicant_phone character varying(20),
    coverage_amount numeric(12,2),
    status character varying(50) DEFAULT 'pending'::character varying,
    application_data jsonb,
    medical_exam_required boolean DEFAULT false,
    documents_uploaded text[],
    insurance_response jsonb,
    processing_notes text,
    assigned_to character varying(100),
    submitted_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP,
    updated_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP
);


ALTER TABLE public.insurance_applications OWNER TO postgres;

--
-- Name: insurance_products_with_companies; Type: VIEW; Schema: public; Owner: postgres
--

CREATE VIEW public.insurance_products_with_companies AS
 SELECT ip.id,
    ip.name,
    ip.type,
    ip.base_premium,
    ip.min_coverage,
    ip.max_coverage,
    ip.is_active,
    ip.is_featured,
    ic.name AS company_name,
    ic.id AS company_id,
    ip.created_at,
    ip.updated_at
   FROM (public.insurance_products ip
     JOIN public.insurance_companies ic ON (((ip.insurance_company_id)::text = (ic.id)::text)));


ALTER VIEW public.insurance_products_with_companies OWNER TO postgres;

--
-- Name: insurance_quotes; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.insurance_quotes (
    id character varying(50) NOT NULL,
    session_id character varying(100),
    insurance_product_id character varying(50),
    insurance_type character varying(50) NOT NULL,
    age integer NOT NULL,
    risk_factors jsonb NOT NULL,
    coverage_amount numeric(12,2),
    monthly_premium numeric(10,2) NOT NULL,
    annual_premium numeric(10,2) NOT NULL,
    deductible numeric(10,2),
    coverage_details jsonb,
    exclusions text[],
    valid_until date,
    client_ip character varying(45),
    user_agent text,
    created_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP
);


ALTER TABLE public.insurance_quotes OWNER TO postgres;

--
-- Name: products_with_banks; Type: VIEW; Schema: public; Owner: postgres
--

CREATE VIEW public.products_with_banks AS
 SELECT cp.id,
    cp.name,
    cp.type,
    cp.average_rate,
    cp.min_amount,
    cp.max_amount,
    cp.is_active,
    cp.is_featured,
    b.name AS bank_name,
    b.id AS bank_id,
    'credit'::text AS product_category,
    cp.created_at,
    cp.updated_at
   FROM (public.credit_products cp
     JOIN public.banks b ON (((cp.bank_id)::text = (b.id)::text)))
UNION ALL
 SELECT sp.id,
    sp.name,
    sp.type,
    sp.interest_rate AS average_rate,
    sp.minimum_deposit AS min_amount,
    sp.maximum_deposit AS max_amount,
    sp.is_active,
    sp.is_featured,
    b.name AS bank_name,
    b.id AS bank_id,
    'savings'::text AS product_category,
    sp.created_at,
    sp.updated_at
   FROM (public.savings_products sp
     JOIN public.banks b ON (((sp.bank_id)::text = (b.id)::text)));


ALTER VIEW public.products_with_banks OWNER TO postgres;

--
-- Name: savings_applications; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.savings_applications (
    id character varying(50) NOT NULL,
    simulation_id character varying(50),
    savings_product_id character varying(50),
    applicant_name character varying(200) NOT NULL,
    applicant_email character varying(100),
    applicant_phone character varying(20),
    initial_deposit numeric(12,2) NOT NULL,
    monthly_contribution numeric(10,2),
    status character varying(50) DEFAULT 'pending'::character varying,
    application_data jsonb,
    bank_response jsonb,
    processing_notes text,
    assigned_to character varying(100),
    submitted_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP,
    updated_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP
);


ALTER TABLE public.savings_applications OWNER TO postgres;

--
-- Name: savings_simulations; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.savings_simulations (
    id character varying(50) NOT NULL,
    session_id character varying(100),
    savings_product_id character varying(50),
    initial_amount numeric(12,2) NOT NULL,
    monthly_contribution numeric(10,2) NOT NULL,
    duration_months integer NOT NULL,
    final_amount numeric(12,2) NOT NULL,
    total_contributions numeric(12,2) NOT NULL,
    total_interest numeric(12,2) NOT NULL,
    effective_rate numeric(5,2),
    monthly_breakdown jsonb,
    recommendations text[],
    client_ip character varying(45),
    user_agent text,
    created_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP
);


ALTER TABLE public.savings_simulations OWNER TO postgres;

--
-- Data for Name: admin_sessions; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.admin_sessions (id, admin_user_id, token, expires_at, ip_address, user_agent, is_active, created_at) FROM stdin;
session_001	admin_001	test_token_superadmin_001	2025-08-29 08:23:34.672465	192.168.1.100	Mozilla/5.0 (Test Browser)	t	2025-08-22 08:23:34.672465
session_002	admin_002	test_token_credit_001	2025-08-29 08:23:34.672465	192.168.1.101	Mozilla/5.0 (Test Browser)	t	2025-08-22 08:23:34.672465
\.


--
-- Data for Name: admin_users; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.admin_users (id, username, email, password_hash, first_name, last_name, role, permissions, is_active, last_login, created_by, created_at, updated_at) FROM stdin;
admin_002	admin_credit	credit.admin@bamboo-credit.ga	$2b$12$5cmRIyulahtry7YpV1/kvuY2plogEadjdE3a2JfnVZHjpzblUw4h.	Admin	CrÃ©dit	admin	{"banks": ["read"], "credit_products": ["create", "read", "update", "delete"], "simulations": ["read"], "applications": ["read", "update"]}	t	\N	\N	2025-08-22 08:23:34.649846	2025-08-22 08:38:26.685681
admin_003	admin_epargne	epargne.admin@bamboo-credit.ga	$2b$12$5cmRIyulahtry7YpV1/kvuY2plogEadjdE3a2JfnVZHjpzblUw4h.	Admin	Ã‰pargne	admin	{"banks": ["read"], "savings_products": ["create", "read", "update", "delete"], "simulations": ["read"], "applications": ["read", "update"]}	t	\N	\N	2025-08-22 08:23:34.649846	2025-08-22 08:38:26.685681
admin_004	admin_assurance	assurance.admin@bamboo-credit.ga	$2b$12$5cmRIyulahtry7YpV1/kvuY2plogEadjdE3a2JfnVZHjpzblUw4h.	Admin	Assurance	admin	{"insurance_companies": ["read"], "insurance_products": ["create", "read", "update", "delete"], "quotes": ["read"], "applications": ["read", "update"]}	t	\N	\N	2025-08-22 08:23:34.649846	2025-08-22 08:38:26.685681
admin_005	moderator	moderator@bamboo-credit.ga	$2b$12$5cmRIyulahtry7YpV1/kvuY2plogEadjdE3a2JfnVZHjpzblUw4h.	ModÃ©rateur	Principal	moderator	{"banks": ["read"], "credit_products": ["read", "update"], "savings_products": ["read", "update"], "insurance_products": ["read", "update"], "applications": ["read", "update"]}	t	\N	\N	2025-08-22 08:23:34.649846	2025-08-22 08:38:26.685681
admin_006	readonly	readonly@bamboo-credit.ga	$2b$12$5cmRIyulahtry7YpV1/kvuY2plogEadjdE3a2JfnVZHjpzblUw4h.	Utilisateur	Lecture	readonly	{"banks": ["read"], "insurance_companies": ["read"], "credit_products": ["read"], "savings_products": ["read"], "insurance_products": ["read"], "simulations": ["read"], "applications": ["read"]}	t	\N	\N	2025-08-22 08:23:34.649846	2025-08-22 08:38:26.685681
admin_007	commercial	commercial@bamboo-credit.ga	$2b$12$5cmRIyulahtry7YpV1/kvuY2plogEadjdE3a2JfnVZHjpzblUw4h.	Gestionnaire	Commercial	manager	{"banks": ["read"], "credit_products": ["read"], "savings_products": ["read"], "insurance_products": ["read"], "simulations": ["read"], "applications": ["read", "update"], "audit": ["read"]}	t	\N	\N	2025-08-22 08:23:34.649846	2025-08-22 08:38:26.685681
admin_008	analyste_risque	risque@bamboo-credit.ga	$2b$12$5cmRIyulahtry7YpV1/kvuY2plogEadjdE3a2JfnVZHjpzblUw4h.	Analyste	Risques	analyst	{"credit_products": ["read"], "savings_products": ["read"], "simulations": ["read"], "applications": ["read"], "audit": ["read"]}	t	\N	\N	2025-08-22 08:23:34.649846	2025-08-22 08:38:26.685681
admin_009	admin_it	it@bamboo-credit.ga	$2b$12$5cmRIyulahtry7YpV1/kvuY2plogEadjdE3a2JfnVZHjpzblUw4h.	Responsable	IT	admin	{"banks": ["read", "update"], "insurance_companies": ["read", "update"], "credit_products": ["read", "update"], "savings_products": ["read", "update"], "insurance_products": ["read", "update"], "users": ["read"], "audit": ["read"], "system_settings": ["read", "update"]}	t	\N	\N	2025-08-22 08:23:34.649846	2025-08-22 08:38:26.685681
admin_001	superadmin	admin@bamboo-credit.ga	$2b$12$5cmRIyulahtry7YpV1/kvuY2plogEadjdE3a2JfnVZHjpzblUw4h.	Super	Admin	super_admin	{"banks": ["create", "read", "update", "delete"], "insurance_companies": ["create", "read", "update", "delete"], "credit_products": ["create", "read", "update", "delete"], "savings_products": ["create", "read", "update", "delete"], "insurance_products": ["create", "read", "update", "delete"], "simulations": ["read", "delete"], "applications": ["read", "update", "delete"], "users": ["create", "read", "update", "delete"], "audit": ["read"], "system_settings": ["read", "update"]}	t	2025-08-22 06:47:16.965393	\N	2025-08-22 08:23:34.649846	2025-08-22 08:38:26.685681
admin_010	directeur	directeur@bamboo-credit.ga	$2b$12$5cmRIyulahtry7YpV1/kvuY2plogEadjdE3a2JfnVZHjpzblUw4h.	Directeur	GÃ©nÃ©ral	director	{"banks": ["read"], "insurance_companies": ["read"], "credit_products": ["read"], "savings_products": ["read"], "insurance_products": ["read"], "simulations": ["read"], "applications": ["read"], "users": ["read"], "audit": ["read"], "system_settings": ["read"]}	t	\N	\N	2025-08-22 08:23:34.649846	2025-08-22 08:38:26.685681
\.


--
-- Data for Name: app_config; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.app_config (key, value, description, created_at, updated_at) FROM stdin;
country_code	GA	Code pays Gabon	2025-08-20 14:07:06.96663	2025-08-20 14:07:06.96663
currency	XAF	Devise Franc CFA	2025-08-20 14:07:06.96663	2025-08-20 14:07:06.96663
beac_rate	3.0	Taux directeur BEAC	2025-08-20 14:07:06.96663	2025-08-20 14:07:06.96663
max_debt_ratio_standard	33.0	Taux d'endettement maximum standard	2025-08-20 14:07:06.96663	2025-08-20 14:07:06.96663
max_debt_ratio_immobilier	35.0	Taux d'endettement maximum pour l'immobilier	2025-08-20 14:07:06.96663	2025-08-20 14:07:06.96663
minimum_wage	150000	SMIG Gabon en FCFA	2025-08-20 14:07:06.96663	2025-08-20 14:07:06.96663
vat_rate	18.0	Taux de TVA au Gabon	2025-08-20 14:07:06.96663	2025-08-20 14:07:06.96663
insurance_tax_rate	14.0	Taxe sur les primes d'assurance	2025-08-20 14:07:06.96663	2025-08-20 14:07:06.96663
bank_supervision_entity	COBAC	Entité de supervision bancaire	2025-08-20 14:07:06.96663	2025-08-20 14:07:06.96663
fiscal_year_end	12-31	Fin année fiscale	2025-08-20 14:07:06.96663	2025-08-20 14:07:06.96663
fiscal_year_start	01-01	Début année fiscale	2025-08-20 14:07:06.96663	2025-08-20 14:07:06.96663
inflation_rate	2.5	Taux d'inflation prévisionnel	2025-08-20 14:07:06.96663	2025-08-20 14:07:06.96663
withholding_tax_interest	15.0	Retenue a  la source sur intérets	2025-08-20 14:07:06.96663	2025-08-20 14:07:06.96663
\.


--
-- Data for Name: audit_logs; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.audit_logs (id, admin_user_id, action, entity_type, entity_id, old_values, new_values, ip_address, user_agent, created_at) FROM stdin;
audit_001	admin_001	LOGIN	admin_session	session_001	\N	{"login_time": "2024-01-15T10:00:00Z"}	192.168.1.100	Mozilla/5.0 (Test Browser)	2025-08-22 07:23:34.684277
audit_002	admin_002	CREATE	credit_product	bgfi_habitat	\N	{"name": "BGFI Habitat Plus", "rate": 6.5}	192.168.1.101	Mozilla/5.0 (Test Browser)	2025-08-22 07:53:34.684277
audit_003	admin_001	UPDATE	bank	bgfi	{"is_active": false}	{"is_active": true}	192.168.1.100	Mozilla/5.0 (Test Browser)	2025-08-22 08:08:34.684277
audit_004	admin_003	LOGIN	admin_session	session_003	\N	{"login_time": "2024-01-15T11:30:00Z"}	192.168.1.102	Mozilla/5.0 (Test Browser)	2025-08-22 08:13:34.684277
\.


--
-- Data for Name: banks; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.banks (id, name, full_name, description, logo_url, website, contact_phone, contact_email, address, swift_code, license_number, established_year, total_assets, rating, is_active, created_at, updated_at) FROM stdin;
bgfi	BGFI Bank	Banque Gabonaise et FranÃ§aise Internationale	Leader bancaire au Gabon	\N	\N	+241 01 76 24 24	info@bgfibank.ga	\N	\N	\N	\N	\N	\N	t	2025-08-21 22:40:27.518299	2025-08-21 22:40:27.518299
ugb	UGB	Union Gabonaise de Banque	Banque de rÃ©fÃ©rence au Gabon	\N	\N	+241 01 76 10 10	contact@ugb.ga	\N	\N	\N	\N	\N	\N	t	2025-08-21 22:40:27.518299	2025-08-21 22:40:27.518299
bicig	BICIG	Banque Internationale pour le Commerce et l'Industrie	Filiale BNP Paribas	\N	\N	+241 01 77 20 00	info@bicig.com	\N	\N	\N	\N	\N	\N	t	2025-08-21 22:40:27.518299	2025-08-21 22:40:27.518299
ecobank	Ecobank Gabon	Ecobank Gabon S.A.	Banque panafricaine	\N	\N	+241 01 44 30 30	gabon@ecobank.com	\N	\N	\N	\N	\N	\N	t	2025-08-21 22:40:27.518299	2025-08-21 22:40:27.518299
cbao	CBAO Gabon	Compagnie Bancaire de l'Afrique de l'Ouest	Banque de dÃ©tail	\N	\N	+241 01 72 35 00	info@cbao.ga	\N	\N	\N	\N	\N	\N	t	2025-08-21 22:40:27.518299	2025-08-21 22:40:27.518299
uba	UBA	UBA	hrjjjjjtnnnnnnnnnnnnnnn,,	https://uba.com	https://www.banque.ga	+24177861364	bebanemb@gmail.com	quartier IAI	UBAAGLI	BG2090333	2003	1200000000.00		t	2025-08-22 11:03:48.386445	2025-08-22 11:03:48.386445
\.


--
-- Data for Name: credit_applications; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.credit_applications (id, simulation_id, credit_product_id, applicant_name, applicant_email, applicant_phone, requested_amount, status, application_data, documents_uploaded, bank_response, processing_notes, assigned_to, submitted_at, updated_at) FROM stdin;
\.


--
-- Data for Name: credit_products; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.credit_products (id, bank_id, name, type, description, min_amount, max_amount, min_duration_months, max_duration_months, average_rate, min_rate, max_rate, processing_time_hours, required_documents, eligibility_criteria, fees, features, advantages, special_conditions, is_featured, is_active, created_at, updated_at) FROM stdin;
bgfi_habitat	bgfi	BGFI Habitat	immobilier	CrÃ©dit immobilier	5000000.00	200000000.00	60	300	6.50	5.80	8.20	72	\N	\N	\N	\N	\N	\N	f	t	2025-08-21 22:40:27.525168	2025-08-21 22:40:27.525168
bgfi_auto	bgfi	BGFI Auto	auto	CrÃ©dit automobile	2000000.00	50000000.00	12	84	8.90	7.50	11.20	72	\N	\N	\N	\N	\N	\N	f	t	2025-08-21 22:40:27.525168	2025-08-21 22:40:27.525168
ugb_logement	ugb	UGB Logement	immobilier	Solution immobiliÃ¨re	3000000.00	150000000.00	48	360	6.80	6.20	8.50	72	\N	\N	\N	\N	\N	\N	f	t	2025-08-21 22:40:27.525168	2025-08-21 22:40:27.525168
ugb_auto	ugb	UGB Auto Express	auto	CrÃ©dit auto rapide	1500000.00	40000000.00	12	72	9.20	8.10	11.80	72	\N	\N	\N	\N	\N	\N	f	t	2025-08-21 22:40:27.525168	2025-08-21 22:40:27.525168
bicig_pro	bicig	BICIG Pro	professionnel	CrÃ©dit professionnel	10000000.00	500000000.00	60	240	7.20	6.50	9.00	72	\N	\N	\N	\N	\N	\N	f	t	2025-08-21 22:40:27.525168	2025-08-21 22:40:27.525168
ecobank_habitat	ecobank	Ecobank Habitat	immobilier	CrÃ©dit immobilier familial	4000000.00	180000000.00	60	300	7.00	6.30	8.80	72	\N	\N	\N	\N	\N	\N	f	t	2025-08-21 22:40:27.525168	2025-08-21 22:40:27.525168
ecobank_auto	ecobank	Ecobank Auto	auto	CrÃ©dit auto flexible	1800000.00	45000000.00	12	84	9.50	8.20	12.00	72	\N	\N	\N	\N	\N	\N	f	t	2025-08-21 22:40:27.525168	2025-08-21 22:40:27.525168
cbao_primo	cbao	CBAO Primo	immobilier	Premier crÃ©dit immobilier	3500000.00	120000000.00	60	300	6.90	6.10	8.70	72	\N	\N	\N	\N	\N	\N	f	t	2025-08-21 22:40:27.525168	2025-08-21 22:40:27.525168
cbao_conso	cbao	CBAO Conso	consommation	CrÃ©dit personnel	500000.00	15000000.00	6	60	14.50	12.80	18.50	72	\N	\N	\N	\N	\N	\N	f	t	2025-08-21 22:40:27.525168	2025-08-21 22:40:27.525168
bicig_tresorerie	bicig	BICIG TrÃ©sorerie	tresorerie	Solution trÃ©sorerie	1000000.00	50000000.00	3	36	11.50	10.00	14.00	72	\N	\N	\N	\N	\N	\N	f	t	2025-08-21 22:40:27.525168	2025-08-21 22:40:27.525168
\.


--
-- Data for Name: credit_simulations; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.credit_simulations (id, session_id, credit_product_id, requested_amount, duration_months, monthly_income, current_debts, down_payment, applied_rate, monthly_payment, total_cost, total_interest, debt_ratio, eligible, risk_score, recommendations, amortization_schedule, client_ip, user_agent, created_at) FROM stdin;
sim_001	sess_001	bgfi_habitat	25000000.00	240	1200000.00	150000.00	0.00	6.50	187500.00	45000000.00	20000000.00	28.13	t	75	\N	\N	\N	\N	2025-08-21 22:40:27.544448
sim_002	sess_002	ugb_auto	8000000.00	60	800000.00	80000.00	0.00	9.20	166200.00	9972000.00	1972000.00	30.78	t	68	\N	\N	\N	\N	2025-08-21 22:40:27.544448
sim_003	sess_003	cbao_conso	3000000.00	36	600000.00	100000.00	0.00	14.50	108000.00	3888000.00	888000.00	34.67	f	45	\N	\N	\N	\N	2025-08-21 22:40:27.544448
\.


--
-- Data for Name: insurance_applications; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.insurance_applications (id, quote_id, insurance_product_id, applicant_name, applicant_email, applicant_phone, coverage_amount, status, application_data, medical_exam_required, documents_uploaded, insurance_response, processing_notes, assigned_to, submitted_at, updated_at) FROM stdin;
\.


--
-- Data for Name: insurance_companies; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.insurance_companies (id, name, full_name, description, logo_url, website, contact_phone, contact_email, address, license_number, established_year, solvency_ratio, rating, specialties, coverage_areas, is_active, created_at, updated_at) FROM stdin;
ogar	OGAR Assurances	Office Gabonais d'Assurance et de RÃ©assurance	Leader assurance Gabon	\N	\N	+241 01 72 35 00	info@ogar-gabon.com	\N	\N	\N	\N	\N	{auto,habitation,vie}	\N	t	2025-08-21 22:40:27.523224	2025-08-21 22:40:27.523224
nsia	NSIA Assurances	Nouvelle SociÃ©tÃ© Interafricaine d'Assurance	Assureur panafricain	\N	\N	+241 01 44 35 55	contact@nsia-gabon.com	\N	\N	\N	\N	\N	{vie,sante,auto}	\N	t	2025-08-21 22:40:27.523224	2025-08-21 22:40:27.523224
axa_gabon	AXA Gabon	AXA Assurances Gabon	Groupe AXA	\N	\N	+241 01 73 45 67	gabon@axa.com	\N	\N	\N	\N	\N	{vie,sante}	\N	t	2025-08-21 22:40:27.523224	2025-08-21 22:40:27.523224
colina	Colina Assurances	Compagnie Colina Gabon	Assurance dommages	\N	\N	+241 01 76 22 33	info@colina.ga	\N	\N	\N	\N	\N	{auto,habitation}	\N	t	2025-08-21 22:40:27.523224	2025-08-21 22:40:27.523224
saham	Saham Assurance	Saham Assurance Gabon	Groupe Sanlam	\N	\N	+241 01 77 88 99	gabon@saham.com	\N	\N	\N	\N	\N	{auto,voyage}	\N	t	2025-08-21 22:40:27.523224	2025-08-21 22:40:27.523224
\.


--
-- Data for Name: insurance_products; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.insurance_products (id, insurance_company_id, name, type, description, coverage_details, premium_calculation, base_premium, min_coverage, max_coverage, deductible_options, age_limits, exclusions, features, advantages, claim_process, settlement_time_days, renewable, is_featured, is_active, created_at, updated_at) FROM stdin;
ogar_auto_tr	ogar	OGAR Auto Tous Risques	auto	Assurance auto tous risques	\N	\N	875000.00	\N	\N	\N	\N	\N	\N	\N	\N	15	t	f	t	2025-08-21 22:40:27.541302	2025-08-21 22:40:27.541302
ogar_auto_tiers	ogar	OGAR Auto Tiers	auto	Assurance responsabilitÃ© civile	\N	\N	420000.00	\N	\N	\N	\N	\N	\N	\N	\N	15	t	f	t	2025-08-21 22:40:27.541302	2025-08-21 22:40:27.541302
ogar_habitation	ogar	OGAR Habitation	habitation	Assurance habitation	\N	\N	120000.00	\N	\N	\N	\N	\N	\N	\N	\N	15	t	f	t	2025-08-21 22:40:27.541302	2025-08-21 22:40:27.541302
nsia_vie	nsia	NSIA Vie Protection	vie	Assurance vie temporaire	\N	\N	45000.00	\N	\N	\N	\N	\N	\N	\N	\N	15	t	f	t	2025-08-21 22:40:27.541302	2025-08-21 22:40:27.541302
nsia_sante	nsia	NSIA SantÃ© Plus	sante	ComplÃ©mentaire santÃ©	\N	\N	85000.00	\N	\N	\N	\N	\N	\N	\N	\N	15	t	f	t	2025-08-21 22:40:27.541302	2025-08-21 22:40:27.541302
axa_vie	axa_gabon	AXA Vie Ã‰pargne	vie	Assurance vie Ã©pargne	\N	\N	125000.00	\N	\N	\N	\N	\N	\N	\N	\N	15	t	f	t	2025-08-21 22:40:27.541302	2025-08-21 22:40:27.541302
axa_sante	axa_gabon	AXA SantÃ© Premium	sante	Assurance santÃ© premium	\N	\N	175000.00	\N	\N	\N	\N	\N	\N	\N	\N	15	t	f	t	2025-08-21 22:40:27.541302	2025-08-21 22:40:27.541302
colina_auto	colina	Colina Auto Ã‰conomique	auto	Assurance auto Ã©conomique	\N	\N	315000.00	\N	\N	\N	\N	\N	\N	\N	\N	15	t	f	t	2025-08-21 22:40:27.541302	2025-08-21 22:40:27.541302
colina_habitation	colina	Colina Habitation	habitation	Assurance habitation sociale	\N	\N	65000.00	\N	\N	\N	\N	\N	\N	\N	\N	15	t	f	t	2025-08-21 22:40:27.541302	2025-08-21 22:40:27.541302
colina_transport	colina	Colina Transport	transport	Assurance transport	\N	\N	800000.00	\N	\N	\N	\N	\N	\N	\N	\N	15	t	f	t	2025-08-21 22:40:27.541302	2025-08-21 22:40:27.541302
saham_auto	saham	Saham Auto Famille	auto	Assurance auto familiale	\N	\N	485000.00	\N	\N	\N	\N	\N	\N	\N	\N	15	t	f	t	2025-08-21 22:40:27.541302	2025-08-21 22:40:27.541302
saham_voyage	saham	Saham Voyage	voyage	Assurance voyage internationale	\N	\N	25000.00	\N	\N	\N	\N	\N	\N	\N	\N	15	t	f	t	2025-08-21 22:40:27.541302	2025-08-21 22:40:27.541302
saham_habitation	saham	Saham Habitation	habitation	Assurance habitation familiale	\N	\N	155000.00	\N	\N	\N	\N	\N	\N	\N	\N	15	t	f	t	2025-08-21 22:40:27.541302	2025-08-21 22:40:27.541302
nsia_auto	nsia	NSIA Auto	auto	Assurance automobile NSIA	\N	\N	520000.00	\N	\N	\N	\N	\N	\N	\N	\N	15	t	f	t	2025-08-21 22:40:27.541302	2025-08-21 22:40:27.541302
axa_retraite	axa_gabon	AXA Retraite	retraite	Plan retraite complÃ©mentaire	\N	\N	95000.00	\N	\N	\N	\N	\N	\N	\N	\N	15	t	f	t	2025-08-21 22:40:27.541302	2025-08-21 22:40:27.541302
\.


--
-- Data for Name: insurance_quotes; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.insurance_quotes (id, session_id, insurance_product_id, insurance_type, age, risk_factors, coverage_amount, monthly_premium, annual_premium, deductible, coverage_details, exclusions, valid_until, client_ip, user_agent, created_at) FROM stdin;
quo_001	sess_006	ogar_auto_tr	auto	35	{"experience": 10, "vehicle_value": 15000000}	15000000.00	131250.00	1575000.00	100000.00	\N	\N	\N	\N	\N	2025-08-21 22:40:27.549169
quo_002	sess_007	nsia_sante	sante	42	{"family_size": 4}	20000000.00	145000.00	1740000.00	25000.00	\N	\N	\N	\N	\N	2025-08-21 22:40:27.549169
\.


--
-- Data for Name: savings_applications; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.savings_applications (id, simulation_id, savings_product_id, applicant_name, applicant_email, applicant_phone, initial_deposit, monthly_contribution, status, application_data, bank_response, processing_notes, assigned_to, submitted_at, updated_at) FROM stdin;
\.


--
-- Data for Name: savings_products; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.savings_products (id, bank_id, name, type, description, interest_rate, minimum_deposit, maximum_deposit, minimum_balance, liquidity, notice_period_days, term_months, compounding_frequency, fees, features, advantages, tax_benefits, risk_level, early_withdrawal_penalty, is_islamic_compliant, is_featured, is_active, created_at, updated_at, terms_conditions) FROM stdin;
bgfi_livret	bgfi	BGFI Livret	livret	Livret d'Ã©pargne rÃ©munÃ©rÃ©	3.25	100000.00	\N	0.00	immediate	0	\N	monthly	\N	\N	\N	\N	1	\N	f	f	t	2025-08-21 22:40:27.538045	2025-08-21 22:40:27.538045	\N
bgfi_terme	bgfi	BGFI Terme	terme	DÃ©pÃ´t Ã  terme	4.50	1000000.00	\N	0.00	term	0	\N	monthly	\N	\N	\N	\N	1	\N	f	f	t	2025-08-21 22:40:27.538045	2025-08-21 22:40:27.538045	\N
ugb_epargne	ugb	UGB Ã‰pargne Plus	livret	Compte Ã©pargne rÃ©munÃ©rÃ©	3.00	50000.00	\N	0.00	immediate	0	\N	monthly	\N	\N	\N	\N	1	\N	f	f	t	2025-08-21 22:40:27.538045	2025-08-21 22:40:27.538045	\N
ugb_plan	ugb	UGB Plan Projet	plan_epargne	Ã‰pargne programmÃ©e	4.20	25000.00	\N	0.00	notice	0	\N	monthly	\N	\N	\N	\N	1	\N	f	f	t	2025-08-21 22:40:27.538045	2025-08-21 22:40:27.538045	\N
bicig_entreprise	bicig	BICIG Entreprise	professionnel	Ã‰pargne entreprise	2.75	500000.00	\N	0.00	immediate	0	\N	monthly	\N	\N	\N	\N	1	\N	f	f	t	2025-08-21 22:40:27.538045	2025-08-21 22:40:27.538045	\N
ecobank_smart	ecobank	Ecobank Smart	livret	Ã‰pargne intelligente	3.40	75000.00	\N	0.00	immediate	0	\N	monthly	\N	\N	\N	\N	1	\N	f	f	t	2025-08-21 22:40:27.538045	2025-08-21 22:40:27.538045	\N
cbao_logement	cbao	CBAO Logement	plan_epargne	Plan Ã©pargne logement	3.60	100000.00	\N	0.00	notice	0	\N	monthly	\N	\N	\N	\N	1	\N	f	f	t	2025-08-21 22:40:27.538045	2025-08-21 22:40:27.538045	\N
cbao_jeune	cbao	CBAO Jeune	livret	Livret jeune	4.50	10000.00	\N	0.00	immediate	0	\N	monthly	\N	\N	\N	\N	1	\N	f	f	t	2025-08-21 22:40:27.538045	2025-08-21 22:40:27.538045	\N
bicig_placement	bicig	BICIG Placement	terme	Placement sÃ©curisÃ©	5.20	2000000.00	\N	0.00	term	0	\N	monthly	\N	\N	\N	\N	1	\N	f	f	t	2025-08-21 22:40:27.538045	2025-08-21 22:40:27.538045	\N
ecobank_diaspora	ecobank	Ecobank Diaspora	plan_epargne	Ã‰pargne diaspora	4.80	100000.00	\N	0.00	notice	0	\N	monthly	\N	\N	\N	\N	1	\N	f	f	t	2025-08-21 22:40:27.538045	2025-08-21 22:40:27.538045	\N
\.


--
-- Data for Name: savings_simulations; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.savings_simulations (id, session_id, savings_product_id, initial_amount, monthly_contribution, duration_months, final_amount, total_contributions, total_interest, effective_rate, monthly_breakdown, recommendations, client_ip, user_agent, created_at) FROM stdin;
sav_001	sess_004	bgfi_livret	1000000.00	200000.00	120	26400000.00	25000000.00	1400000.00	3.25	\N	\N	\N	\N	2025-08-21 22:40:27.547201
sav_002	sess_005	ugb_epargne	500000.00	150000.00	60	9650000.00	9500000.00	150000.00	3.00	\N	\N	\N	\N	2025-08-21 22:40:27.547201
\.


--
-- Name: admin_sessions admin_sessions_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.admin_sessions
    ADD CONSTRAINT admin_sessions_pkey PRIMARY KEY (id);


--
-- Name: admin_users admin_users_email_key; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.admin_users
    ADD CONSTRAINT admin_users_email_key UNIQUE (email);


--
-- Name: admin_users admin_users_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.admin_users
    ADD CONSTRAINT admin_users_pkey PRIMARY KEY (id);


--
-- Name: admin_users admin_users_username_key; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.admin_users
    ADD CONSTRAINT admin_users_username_key UNIQUE (username);


--
-- Name: app_config app_config_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.app_config
    ADD CONSTRAINT app_config_pkey PRIMARY KEY (key);


--
-- Name: audit_logs audit_logs_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.audit_logs
    ADD CONSTRAINT audit_logs_pkey PRIMARY KEY (id);


--
-- Name: banks banks_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.banks
    ADD CONSTRAINT banks_pkey PRIMARY KEY (id);


--
-- Name: credit_applications credit_applications_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.credit_applications
    ADD CONSTRAINT credit_applications_pkey PRIMARY KEY (id);


--
-- Name: credit_products credit_products_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.credit_products
    ADD CONSTRAINT credit_products_pkey PRIMARY KEY (id);


--
-- Name: credit_simulations credit_simulations_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.credit_simulations
    ADD CONSTRAINT credit_simulations_pkey PRIMARY KEY (id);


--
-- Name: insurance_applications insurance_applications_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.insurance_applications
    ADD CONSTRAINT insurance_applications_pkey PRIMARY KEY (id);


--
-- Name: insurance_companies insurance_companies_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.insurance_companies
    ADD CONSTRAINT insurance_companies_pkey PRIMARY KEY (id);


--
-- Name: insurance_products insurance_products_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.insurance_products
    ADD CONSTRAINT insurance_products_pkey PRIMARY KEY (id);


--
-- Name: insurance_quotes insurance_quotes_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.insurance_quotes
    ADD CONSTRAINT insurance_quotes_pkey PRIMARY KEY (id);


--
-- Name: savings_applications savings_applications_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.savings_applications
    ADD CONSTRAINT savings_applications_pkey PRIMARY KEY (id);


--
-- Name: savings_products savings_products_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.savings_products
    ADD CONSTRAINT savings_products_pkey PRIMARY KEY (id);


--
-- Name: savings_simulations savings_simulations_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.savings_simulations
    ADD CONSTRAINT savings_simulations_pkey PRIMARY KEY (id);


--
-- Name: idx_credit_products_active; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_credit_products_active ON public.credit_products USING btree (is_active);


--
-- Name: idx_credit_products_bank; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_credit_products_bank ON public.credit_products USING btree (bank_id);


--
-- Name: idx_credit_products_type; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_credit_products_type ON public.credit_products USING btree (type);


--
-- Name: idx_credit_simulations_product; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_credit_simulations_product ON public.credit_simulations USING btree (credit_product_id);


--
-- Name: idx_credit_simulations_session; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_credit_simulations_session ON public.credit_simulations USING btree (session_id);


--
-- Name: idx_insurance_products_company; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_insurance_products_company ON public.insurance_products USING btree (insurance_company_id);


--
-- Name: idx_insurance_products_type; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_insurance_products_type ON public.insurance_products USING btree (type);


--
-- Name: idx_insurance_quotes_product; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_insurance_quotes_product ON public.insurance_quotes USING btree (insurance_product_id);


--
-- Name: idx_savings_products_bank; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_savings_products_bank ON public.savings_products USING btree (bank_id);


--
-- Name: idx_savings_products_type; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_savings_products_type ON public.savings_products USING btree (type);


--
-- Name: idx_savings_simulations_product; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_savings_simulations_product ON public.savings_simulations USING btree (savings_product_id);


--
-- Name: banks update_banks_modtime; Type: TRIGGER; Schema: public; Owner: postgres
--

CREATE TRIGGER update_banks_modtime BEFORE UPDATE ON public.banks FOR EACH ROW EXECUTE FUNCTION public.update_modified_column();


--
-- Name: credit_products update_credit_products_modtime; Type: TRIGGER; Schema: public; Owner: postgres
--

CREATE TRIGGER update_credit_products_modtime BEFORE UPDATE ON public.credit_products FOR EACH ROW EXECUTE FUNCTION public.update_modified_column();


--
-- Name: insurance_companies update_insurance_companies_modtime; Type: TRIGGER; Schema: public; Owner: postgres
--

CREATE TRIGGER update_insurance_companies_modtime BEFORE UPDATE ON public.insurance_companies FOR EACH ROW EXECUTE FUNCTION public.update_modified_column();


--
-- Name: insurance_products update_insurance_products_modtime; Type: TRIGGER; Schema: public; Owner: postgres
--

CREATE TRIGGER update_insurance_products_modtime BEFORE UPDATE ON public.insurance_products FOR EACH ROW EXECUTE FUNCTION public.update_modified_column();


--
-- Name: savings_products update_savings_products_modtime; Type: TRIGGER; Schema: public; Owner: postgres
--

CREATE TRIGGER update_savings_products_modtime BEFORE UPDATE ON public.savings_products FOR EACH ROW EXECUTE FUNCTION public.update_modified_column();


--
-- Name: admin_sessions admin_sessions_admin_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.admin_sessions
    ADD CONSTRAINT admin_sessions_admin_user_id_fkey FOREIGN KEY (admin_user_id) REFERENCES public.admin_users(id);


--
-- Name: audit_logs audit_logs_admin_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.audit_logs
    ADD CONSTRAINT audit_logs_admin_user_id_fkey FOREIGN KEY (admin_user_id) REFERENCES public.admin_users(id);


--
-- Name: credit_applications credit_applications_credit_product_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.credit_applications
    ADD CONSTRAINT credit_applications_credit_product_id_fkey FOREIGN KEY (credit_product_id) REFERENCES public.credit_products(id);


--
-- Name: credit_applications credit_applications_simulation_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.credit_applications
    ADD CONSTRAINT credit_applications_simulation_id_fkey FOREIGN KEY (simulation_id) REFERENCES public.credit_simulations(id);


--
-- Name: credit_products credit_products_bank_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.credit_products
    ADD CONSTRAINT credit_products_bank_id_fkey FOREIGN KEY (bank_id) REFERENCES public.banks(id);


--
-- Name: credit_simulations credit_simulations_credit_product_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.credit_simulations
    ADD CONSTRAINT credit_simulations_credit_product_id_fkey FOREIGN KEY (credit_product_id) REFERENCES public.credit_products(id);


--
-- Name: insurance_applications insurance_applications_insurance_product_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.insurance_applications
    ADD CONSTRAINT insurance_applications_insurance_product_id_fkey FOREIGN KEY (insurance_product_id) REFERENCES public.insurance_products(id);


--
-- Name: insurance_applications insurance_applications_quote_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.insurance_applications
    ADD CONSTRAINT insurance_applications_quote_id_fkey FOREIGN KEY (quote_id) REFERENCES public.insurance_quotes(id);


--
-- Name: insurance_products insurance_products_insurance_company_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.insurance_products
    ADD CONSTRAINT insurance_products_insurance_company_id_fkey FOREIGN KEY (insurance_company_id) REFERENCES public.insurance_companies(id);


--
-- Name: insurance_quotes insurance_quotes_insurance_product_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.insurance_quotes
    ADD CONSTRAINT insurance_quotes_insurance_product_id_fkey FOREIGN KEY (insurance_product_id) REFERENCES public.insurance_products(id);


--
-- Name: savings_applications savings_applications_savings_product_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.savings_applications
    ADD CONSTRAINT savings_applications_savings_product_id_fkey FOREIGN KEY (savings_product_id) REFERENCES public.savings_products(id);


--
-- Name: savings_applications savings_applications_simulation_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.savings_applications
    ADD CONSTRAINT savings_applications_simulation_id_fkey FOREIGN KEY (simulation_id) REFERENCES public.savings_simulations(id);


--
-- Name: savings_products savings_products_bank_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.savings_products
    ADD CONSTRAINT savings_products_bank_id_fkey FOREIGN KEY (bank_id) REFERENCES public.banks(id);


--
-- Name: savings_simulations savings_simulations_savings_product_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.savings_simulations
    ADD CONSTRAINT savings_simulations_savings_product_id_fkey FOREIGN KEY (savings_product_id) REFERENCES public.savings_products(id);


--
-- PostgreSQL database dump complete
--

