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
    logo_url text,
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
    updated_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP,
    logo_data bytea,
    logo_content_type character varying
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
    updated_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP,
    created_by_admin character varying,
    updated_by_admin character varying
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
    updated_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP,
    logo_data bytea,
    logo_content_type character varying(255)
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
    updated_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP,
    created_by_admin character varying,
    updated_by_admin character varying
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
    terms_conditions text,
    created_by_admin character varying,
    updated_by_admin character varying
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
    updated_at timestamp without time zone,
    assigned_bank_id character varying(50),
    assigned_insurance_company_id character varying(50),
    CONSTRAINT chk_admin_single_assignment CHECK ((((assigned_bank_id IS NOT NULL) AND (assigned_insurance_company_id IS NULL)) OR ((assigned_bank_id IS NULL) AND (assigned_insurance_company_id IS NOT NULL)) OR ((assigned_bank_id IS NULL) AND (assigned_insurance_company_id IS NULL))))
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
    documents_uploaded jsonb,
    bank_response jsonb,
    processing_notes text,
    assigned_to character varying(100),
    submitted_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP,
    updated_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP,
    applicant_address text,
    birth_date date,
    nationality text,
    marital_status text,
    profession text,
    employer text,
    work_address text,
    employment_type text,
    employment_duration_months integer,
    monthly_income numeric,
    other_income numeric,
    purpose text,
    duration_months integer,
    client_ip character varying(50),
    user_agent text,
    guarantor_info jsonb
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
    updated_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP,
    applicant_address text,
    birth_date character varying(20),
    nationality character varying(50),
    marital_status character varying(50),
    profession character varying(100),
    employer character varying(200),
    beneficiaries text,
    vehicle_make character varying(100),
    vehicle_model character varying(100),
    vehicle_year integer,
    vehicle_value numeric(12,2),
    property_type character varying(100),
    property_value numeric(12,2),
    property_address text,
    medical_history text,
    current_treatments text,
    policy_number character varying(50),
    premium_offered numeric(10,2),
    deductible_offered numeric(10,2),
    medical_exam_date timestamp without time zone,
    documents_required jsonb,
    documents_submitted jsonb,
    processed_at timestamp without time zone
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
-- Name: user_credit_applications; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.user_credit_applications (
    id character varying(50) NOT NULL,
    user_id character varying(50) NOT NULL,
    credit_product_id character varying(50),
    simulation_id character varying(50),
    requested_amount numeric(12,2) NOT NULL,
    duration_months integer NOT NULL,
    purpose text NOT NULL,
    monthly_income numeric(10,2) NOT NULL,
    current_debts numeric(10,2) NOT NULL,
    down_payment numeric(12,2) NOT NULL,
    employment_type character varying(50),
    employer_name character varying(200),
    employment_duration_months integer,
    documents json NOT NULL,
    status character varying(50) NOT NULL,
    bank_response json,
    bank_contact_info json,
    processing_notes text,
    priority_level integer NOT NULL,
    assigned_to character varying(50),
    expected_response_date date,
    user_notified boolean NOT NULL,
    last_notification_sent timestamp without time zone,
    submitted_at timestamp without time zone NOT NULL,
    updated_at timestamp without time zone NOT NULL,
    CONSTRAINT check_credit_application_status CHECK (((status)::text = ANY ((ARRAY['pending'::character varying, 'under_review'::character varying, 'approved'::character varying, 'rejected'::character varying, 'on_hold'::character varying, 'completed'::character varying])::text[]))),
    CONSTRAINT check_priority_level CHECK (((priority_level >= 1) AND (priority_level <= 5)))
);


ALTER TABLE public.user_credit_applications OWNER TO postgres;

--
-- Name: user_documents; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.user_documents (
    id character varying(50) NOT NULL,
    user_id character varying(50) NOT NULL,
    filename character varying(255) NOT NULL,
    original_filename character varying(255) NOT NULL,
    file_type character varying(50) NOT NULL,
    file_size integer NOT NULL,
    file_path character varying(500),
    file_url character varying(500),
    document_type character varying(50),
    application_type character varying(50),
    application_id character varying(50),
    is_verified boolean NOT NULL,
    verified_by character varying(50),
    verified_at timestamp without time zone,
    uploaded_at timestamp without time zone NOT NULL,
    expires_at timestamp without time zone
);


ALTER TABLE public.user_documents OWNER TO postgres;

--
-- Name: user_insurance_applications; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.user_insurance_applications (
    id character varying(50) NOT NULL,
    user_id character varying(50) NOT NULL,
    insurance_product_id character varying(50),
    quote_id character varying(50),
    insurance_type character varying(50) NOT NULL,
    coverage_amount numeric(12,2),
    beneficiaries json NOT NULL,
    vehicle_info json,
    property_info json,
    health_info json,
    travel_info json,
    business_info json,
    documents json NOT NULL,
    medical_exam_required boolean NOT NULL,
    medical_exam_completed boolean NOT NULL,
    status character varying(50) NOT NULL,
    insurance_response json,
    policy_number character varying(50),
    premium_amount numeric(10,2),
    processing_notes text,
    assigned_to character varying(50),
    submitted_at timestamp without time zone NOT NULL,
    updated_at timestamp without time zone NOT NULL,
    CONSTRAINT check_insurance_application_status CHECK (((status)::text = ANY ((ARRAY['pending'::character varying, 'under_review'::character varying, 'medical_exam_required'::character varying, 'approved'::character varying, 'rejected'::character varying, 'active'::character varying])::text[])))
);


ALTER TABLE public.user_insurance_applications OWNER TO postgres;

--
-- Name: user_notifications; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.user_notifications (
    id character varying(50) NOT NULL,
    user_id character varying(50) NOT NULL,
    type character varying(50) NOT NULL,
    title character varying(200) NOT NULL,
    message text NOT NULL,
    related_entity_type character varying(50),
    related_entity_id character varying(50),
    is_read boolean NOT NULL,
    priority character varying(20) NOT NULL,
    created_at timestamp without time zone NOT NULL,
    CONSTRAINT check_notification_priority CHECK (((priority)::text = ANY ((ARRAY['low'::character varying, 'normal'::character varying, 'high'::character varying, 'urgent'::character varying])::text[])))
);


ALTER TABLE public.user_notifications OWNER TO postgres;

--
-- Name: user_savings_applications; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.user_savings_applications (
    id character varying(50) NOT NULL,
    user_id character varying(50) NOT NULL,
    savings_product_id character varying(50),
    simulation_id character varying(50),
    initial_deposit numeric(12,2) NOT NULL,
    monthly_contribution numeric(10,2),
    savings_goal text,
    target_amount numeric(12,2),
    target_date date,
    documents json NOT NULL,
    status character varying(50) NOT NULL,
    bank_response json,
    account_number character varying(50),
    processing_notes text,
    assigned_to character varying(50),
    submitted_at timestamp without time zone NOT NULL,
    updated_at timestamp without time zone NOT NULL,
    CONSTRAINT check_savings_application_status CHECK (((status)::text = ANY ((ARRAY['pending'::character varying, 'under_review'::character varying, 'approved'::character varying, 'rejected'::character varying, 'opened'::character varying, 'active'::character varying])::text[])))
);


ALTER TABLE public.user_savings_applications OWNER TO postgres;

--
-- Name: user_sessions; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.user_sessions (
    id character varying(50) NOT NULL,
    user_id character varying(50) NOT NULL,
    token character varying(500) NOT NULL,
    device_info json NOT NULL,
    ip_address character varying(45),
    user_agent text,
    expires_at timestamp without time zone NOT NULL,
    is_active boolean NOT NULL,
    created_at timestamp without time zone NOT NULL
);


ALTER TABLE public.user_sessions OWNER TO postgres;

--
-- Name: users; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.users (
    id character varying(50) NOT NULL,
    email character varying(100),
    phone character varying(20),
    first_name character varying(100) NOT NULL,
    last_name character varying(100) NOT NULL,
    date_of_birth date,
    gender character varying(10),
    profession character varying(100),
    monthly_income numeric(12,2),
    city character varying(100),
    address text,
    password_hash character varying(255),
    registration_method character varying(20) NOT NULL,
    email_verified boolean NOT NULL,
    phone_verified boolean NOT NULL,
    verification_code character varying(10),
    verification_expires_at timestamp without time zone,
    is_active boolean NOT NULL,
    preferences json NOT NULL,
    last_login timestamp without time zone,
    created_at timestamp without time zone NOT NULL,
    updated_at timestamp without time zone NOT NULL,
    CONSTRAINT check_contact_method CHECK ((((email IS NOT NULL) AND ((email)::text <> ''::text)) OR ((phone IS NOT NULL) AND ((phone)::text <> ''::text)))),
    CONSTRAINT check_gender CHECK ((((gender)::text = ANY ((ARRAY['male'::character varying, 'female'::character varying, 'other'::character varying])::text[])) OR (gender IS NULL))),
    CONSTRAINT check_registration_method CHECK (((registration_method)::text = ANY ((ARRAY['email'::character varying, 'phone'::character varying])::text[])))
);


ALTER TABLE public.users OWNER TO postgres;

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

COPY public.admin_users (id, username, email, password_hash, first_name, last_name, role, permissions, is_active, last_login, created_by, created_at, updated_at, assigned_bank_id, assigned_insurance_company_id) FROM stdin;
admin_007	commercial	commercial@bamboo-credit.ga	$2b$12$5cmRIyulahtry7YpV1/kvuY2plogEadjdE3a2JfnVZHjpzblUw4h.	Gestionnaire	Commercial	manager	{"banks": ["read"], "credit_products": ["read"], "savings_products": ["read"], "insurance_products": ["read"], "simulations": ["read"], "applications": ["read", "update"], "audit": ["read"]}	t	\N	\N	2025-08-22 08:23:34.649846	2025-08-22 08:38:26.685681	\N	\N
admin_008	analyste_risque	risque@bamboo-credit.ga	$2b$12$5cmRIyulahtry7YpV1/kvuY2plogEadjdE3a2JfnVZHjpzblUw4h.	Analyste	Risques	analyst	{"credit_products": ["read"], "savings_products": ["read"], "simulations": ["read"], "applications": ["read"], "audit": ["read"]}	t	\N	\N	2025-08-22 08:23:34.649846	2025-08-22 08:38:26.685681	\N	\N
admin_001	superadmin	admin@bamboo-credit.ga	$2b$12$5cmRIyulahtry7YpV1/kvuY2plogEadjdE3a2JfnVZHjpzblUw4h.	Super	Admin	super_admin	{"banks": ["create", "read", "update", "delete"], "insurance_companies": ["create", "read", "update", "delete"], "credit_products": ["create", "read", "update", "delete"], "savings_products": ["create", "read", "update", "delete"], "insurance_products": ["create", "read", "update", "delete"], "simulations": ["read", "delete"], "applications": ["read", "update", "delete"], "users": ["create", "read", "update", "delete"], "audit": ["read"], "system_settings": ["read", "update"]}	t	2025-08-22 06:47:16.965393	\N	2025-08-22 08:23:34.649846	2025-08-22 08:38:26.685681	\N	\N
admin_010	directeur	directeur@bamboo-credit.ga	$2b$12$5cmRIyulahtry7YpV1/kvuY2plogEadjdE3a2JfnVZHjpzblUw4h.	Directeur	GÃ©nÃ©ral	director	{"banks": ["read"], "insurance_companies": ["read"], "credit_products": ["read"], "savings_products": ["read"], "insurance_products": ["read"], "simulations": ["read"], "applications": ["read"], "users": ["read"], "audit": ["read"], "system_settings": ["read"]}	t	\N	\N	2025-08-22 08:23:34.649846	2025-08-22 08:38:26.685681	\N	\N
admin_bank_test	admin_bank_test	admin.bank.test@bamboo-credit.ga	$2b$12$5cmRIyulahtry7YpV1/kvuY2plogEadjdE3a2JfnVZHjpzblUw4h.	Admin	Banque Test	bank_admin	{\r\n  "banks": ["read"],\r\n  "credit_products": ["create", "read", "update", "delete"],\r\n  "savings_products": ["create", "read", "update", "delete"],\r\n  "simulations": ["read"],\r\n  "applications": ["read", "update"]\r\n}	t	\N	\N	2025-09-15 12:15:04.107357	2025-09-15 12:15:04.107357	uba	\N
admin_insurance_test	admin_insurance_test	admin.insurance.test@bamboo-credit.ga	$2b$12$5cmRIyulahtry7YpV1/kvuY2plogEadjdE3a2JfnVZHjpzblUw4h.	Admin	Assurance Test	insurance_admin	{\r\n  "insurance_companies": ["read"],\r\n  "insurance_products": ["create", "read", "update", "delete"],\r\n  "quotes": ["read"],\r\n  "applications": ["read", "update"]\r\n}	t	\N	\N	2025-09-15 12:15:04.107357	2025-09-15 12:15:04.107357	\N	ogar
admin_005	moderator	moderator@bamboo-credit.ga	$2b$12$5cmRIyulahtry7YpV1/kvuY2plogEadjdE3a2JfnVZHjpzblUw4h.	ModÃ©rateur	Principal	moderator	{\r\n  "banks": ["read"],\r\n  "insurance_companies": ["read"],\r\n  "credit_products": ["read", "update"],\r\n  "savings_products": ["read", "update"],\r\n  "insurance_products": ["read", "update"],\r\n  "applications": ["read", "update"]\r\n}	t	\N	\N	2025-08-22 08:23:34.649846	2025-08-22 08:38:26.685681	\N	\N
admin_002	admin_credit	credit.admin@bamboo-credit.ga	$2b$12$5cmRIyulahtry7YpV1/kvuY2plogEadjdE3a2JfnVZHjpzblUw4h.	Admin	CrÃ©dit	admin	{\r\n  "banks": ["read"],\r\n  "insurance_companies": ["read"],\r\n  "credit_products": ["create", "read", "update", "delete"],\r\n  "savings_products": ["create", "read", "update", "delete"],\r\n  "insurance_products": ["create", "read", "update", "delete"],\r\n  "simulations": ["read"],\r\n  "applications": ["read", "update"]\r\n}	t	\N	\N	2025-08-22 08:23:34.649846	2025-08-22 08:38:26.685681	\N	\N
admin_003	admin_epargne	epargne.admin@bamboo-credit.ga	$2b$12$5cmRIyulahtry7YpV1/kvuY2plogEadjdE3a2JfnVZHjpzblUw4h.	Admin	Ã‰pargne	admin	{\r\n  "banks": ["read"],\r\n  "insurance_companies": ["read"],\r\n  "credit_products": ["create", "read", "update", "delete"],\r\n  "savings_products": ["create", "read", "update", "delete"],\r\n  "insurance_products": ["create", "read", "update", "delete"],\r\n  "simulations": ["read"],\r\n  "applications": ["read", "update"]\r\n}	t	\N	\N	2025-08-22 08:23:34.649846	2025-08-22 08:38:26.685681	\N	\N
admin_006	readonly	readonly@bamboo-credit.ga	$2b$12$5cmRIyulahtry7YpV1/kvuY2plogEadjdE3a2JfnVZHjpzblUw4h.	Utilisateur	Lecture	readonly	{\r\n  "banks": ["read"],\r\n  "insurance_companies": ["read"],\r\n  "credit_products": ["read"],\r\n  "savings_products": ["read"],\r\n  "insurance_products": ["read"],\r\n  "simulations": ["read"],\r\n  "applications": ["read"]\r\n}	t	\N	\N	2025-08-22 08:23:34.649846	2025-08-22 08:38:26.685681	\N	\N
b50b2087-aa1c-4de6-8c5d-08b6e218dd25	marina0203	bebanemb@gmail.com	$2b$12$PxQo3HGKxAizqaKc.91mR.YTaaIc65ehvaOl4eUaIsBx4HMrAsy4m	marina brunelle	BEBANE MOUKOUMBI 	bank_admin	{\r\n  "banks": ["read"],\r\n  "credit_products": ["create", "read", "update", "delete"],\r\n  "savings_products": ["create", "read", "update", "delete"],\r\n  "simulations": ["read"],\r\n  "applications": ["read", "update"]\r\n}	t	\N	current_admin	2025-09-15 12:41:58.390933	2025-09-15 18:00:35.336809	ecobank	\N
admin_004	admin_assurance	assurance.admin@bamboo-credit.ga	$2b$12$5cmRIyulahtry7YpV1/kvuY2plogEadjdE3a2JfnVZHjpzblUw4h.	Admin	Assurance	admin	{\r\n  "banks": ["read"],\r\n  "insurance_companies": ["read"],\r\n  "credit_products": ["create", "read", "update", "delete"],\r\n  "savings_products": ["create", "read", "update", "delete"],\r\n  "insurance_products": ["create", "read", "update", "delete"],\r\n  "simulations": ["read"],\r\n  "applications": ["read", "update"]\r\n}	t	\N	\N	2025-08-22 08:23:34.649846	2025-08-22 08:38:26.685681	\N	\N
admin_009	admin_it	it@bamboo-credit.ga	$2b$12$5cmRIyulahtry7YpV1/kvuY2plogEadjdE3a2JfnVZHjpzblUw4h.	Responsable	IT	admin	{\r\n  "banks": ["read"],\r\n  "insurance_companies": ["read"],\r\n  "credit_products": ["create", "read", "update", "delete"],\r\n  "savings_products": ["create", "read", "update", "delete"],\r\n  "insurance_products": ["create", "read", "update", "delete"],\r\n  "simulations": ["read"],\r\n  "applications": ["read", "update"]\r\n}	t	\N	\N	2025-08-22 08:23:34.649846	2025-08-22 08:38:26.685681	\N	\N
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

COPY public.banks (id, name, full_name, description, logo_url, website, contact_phone, contact_email, address, swift_code, license_number, established_year, total_assets, rating, is_active, created_at, updated_at, logo_data, logo_content_type) FROM stdin;
uba	UBA	UBA	hrjjjjjtnnnnnnnnnnnnnnn,,	data:image/png;base64,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	https://www.banque.ga	+24177861364	bebanemb@gmail.com	quartier IAI	UBAAGLI	BG2090333	2003	1200000000.00		t	2025-08-22 11:03:48.386445	2025-09-12 15:35:49.830225	\N	image/png
bgfi	BGFI Bank	Banque Gabonaise et FranÃ§aise Internationale	Leader bancaire au Gabon	data:image/jpeg;base64,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	\N	+241 01 76 24 24	info@bgfibank.ga	\N	\N	\N	\N	\N	\N	t	2025-08-21 22:40:27.518299	2025-09-12 15:36:40.846476	\N	image/jpeg
ugb	UGB	Union Gabonaise de Banque	Banque de rÃ©fÃ©rence au Gabon	data:image/jpeg;base64,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	\N	+241 01 76 10 10	contact@ugb.ga	\N	\N	\N	\N	\N	\N	t	2025-08-21 22:40:27.518299	2025-09-12 15:37:15.35139	\N	image/jpeg
bicig	BICIG	Banque Internationale pour le Commerce et l'Industrie	Filiale BNP Paribas	data:image/jpeg;base64,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	\N	+241 01 77 20 00	info@bicig.com	\N	\N	\N	\N	\N	\N	t	2025-08-21 22:40:27.518299	2025-09-12 15:37:55.468353	\N	image/jpeg
ecobank	Ecobank Gabon	Ecobank Gabon S.A.	Banque panafricaine	data:image/png;base64,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	\N	+241 01 44 30 30	gabon@ecobank.com	\N	\N	\N	\N	\N	\N	t	2025-08-21 22:40:27.518299	2025-09-12 15:38:21.16615	\N	image/png
cbao	CBAO Gabon	Compagnie Bancaire de l'Afrique de l'Ouest	Banque de dÃ©tail	data:image/jpeg;base64,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	\N	+241 01 72 35 00	info@cbao.ga	\N	\N	\N	\N	\N	\N	t	2025-08-21 22:40:27.518299	2025-09-12 15:39:25.564378	\N	image/jpeg
\.


--
-- Data for Name: credit_applications; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.credit_applications (id, simulation_id, credit_product_id, applicant_name, applicant_email, applicant_phone, requested_amount, status, application_data, documents_uploaded, bank_response, processing_notes, assigned_to, submitted_at, updated_at, applicant_address, birth_date, nationality, marital_status, profession, employer, work_address, employment_type, employment_duration_months, monthly_income, other_income, purpose, duration_months, client_ip, user_agent, guarantor_info) FROM stdin;
9245a894-a62e-4cb4-baa1-49106b31898d	\N	cbao_conso	BEBANE MOUKOUMBI Marina Brunelle	marie.nguema@email.com	+24177861364	2000000.00	pending	{"purpose": "kdksdk", "employer": "ventis", "client_ip": "127.0.0.1", "birth_date": "2000-06-06", "profession": "cadre", "total_cost": 2315972.55, "user_agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/140.0.0.0 Safari/537.36 Edg/140.0.0.0", "applied_rate": 14.5, "data_consent": true, "other_income": 200000, "submitted_at": "2025-09-14T13:06:32.032091", "terms_consent": true, "applicant_name": "BEBANE MOUKOUMBI Marina Brunelle", "marital_status": "Marié(e)", "monthly_income": 1500000, "applicant_email": "marie.nguema@email.com", "applicant_phone": "+24177861364", "contact_consent": true, "employment_type": "CDI", "monthly_payment": 96498.86, "applicant_address": "BP 1234, Rue de la Paix, Quartier Glass", "simulation_reference": "sim_1757855162263_ysvjqslno", "employment_duration_months": 10}	[]	\N	\N	\N	2025-09-14 13:06:32.032091	2025-09-14 13:06:32.032091	BP 1234, Rue de la Paix, Quartier Glass	2000-06-06	\N	Marié(e)	cadre	ventis	\N	CDI	10	1500000.0	200000.0	kdksdk	24	127.0.0.1	Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/140.0.0.0 Safari/537.36 Edg/140.0.0.0	\N
926ba1cc-9c12-412f-abf2-fd7fcf0b3a15	\N	cbao_conso	BEBANE MOUKOUMBI Marina Brunelle	marie.nguema@email.com	+24177861364	2000000.00	pending	{"purpose": "kdksdk", "employer": "ventis", "client_ip": "127.0.0.1", "birth_date": "2000-06-06", "profession": "cadre", "total_cost": 2315972.55, "user_agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/140.0.0.0 Safari/537.36 Edg/140.0.0.0", "applied_rate": 14.5, "data_consent": true, "other_income": 200000, "submitted_at": "2025-09-14T13:11:19.739993", "terms_consent": true, "applicant_name": "BEBANE MOUKOUMBI Marina Brunelle", "marital_status": "Marié(e)", "monthly_income": 1500000, "applicant_email": "marie.nguema@email.com", "applicant_phone": "+24177861364", "contact_consent": true, "employment_type": "CDI", "monthly_payment": 96498.86, "applicant_address": "BP 1234, Rue de la Paix, Quartier Glass", "simulation_reference": "sim_1757855464220_xus9fs5gw", "employment_duration_months": 10}	[]	\N	\N	\N	2025-09-14 13:11:19.739993	2025-09-14 13:11:19.739993	BP 1234, Rue de la Paix, Quartier Glass	2000-06-06	\N	Marié(e)	cadre	ventis	\N	CDI	10	1500000.0	200000.0	kdksdk	24	127.0.0.1	Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/140.0.0.0 Safari/537.36 Edg/140.0.0.0	\N
cbcf1d1b-a541-4220-ae62-42bf08961b34	\N	cbao_conso	BEBANE MOUKOUMBI Marina Brunelle	marie.nguema@email.com	+24177861364	2000000.00	pending	{"purpose": "kdksdk", "employer": "ventis", "client_ip": "127.0.0.1", "birth_date": "2000-06-06", "profession": "cadre", "total_cost": 2315972.55, "user_agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/140.0.0.0 Safari/537.36 Edg/140.0.0.0", "applied_rate": 14.5, "data_consent": true, "other_income": 200000, "submitted_at": "2025-09-14T13:22:22.569720", "terms_consent": true, "applicant_name": "BEBANE MOUKOUMBI Marina Brunelle", "marital_status": "", "monthly_income": 1500000, "applicant_email": "marie.nguema@email.com", "applicant_phone": "+24177861364", "contact_consent": true, "employment_type": "CDI", "monthly_payment": 96498.86, "applicant_address": "BP 1234, Rue de la Paix, Quartier Glass", "simulation_reference": "sim_1757856132256_suk9mijmu", "employment_duration_months": 10}	[]	\N	\N	\N	2025-09-14 13:22:22.57091	2025-09-14 13:22:22.57091	BP 1234, Rue de la Paix, Quartier Glass	2000-06-06	\N		cadre	ventis	\N	CDI	10	1500000.0	200000.0	kdksdk	24	127.0.0.1	Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/140.0.0.0 Safari/537.36 Edg/140.0.0.0	\N
ddedbac1-235f-4782-9881-53037ea76b5e	\N	cbao_conso	BEBANE MOUKOUMBI Marina Brunelle	marie.nguema@email.com	+24177861364	2000000.00	pending	{"purpose": "kdksdk", "employer": "ventis", "client_ip": "127.0.0.1", "birth_date": "2000-06-06", "profession": "cadre", "total_cost": 2315972.55, "user_agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/140.0.0.0 Safari/537.36 Edg/140.0.0.0", "applied_rate": 14.5, "data_consent": true, "other_income": 200000, "submitted_at": "2025-09-14T17:33:45.755056", "terms_consent": true, "applicant_name": "BEBANE MOUKOUMBI Marina Brunelle", "marital_status": "Marié(e)", "monthly_income": 1500000, "applicant_email": "marie.nguema@email.com", "applicant_phone": "+24177861364", "contact_consent": true, "employment_type": "CDI", "monthly_payment": 96498.86, "applicant_address": "BP 1234, Rue de la Paix, Quartier Glass", "simulation_reference": "sim_1757871212045_k21ig3tsr", "employment_duration_months": 10}	[]	\N	\N	\N	2025-09-14 17:33:45.755756	2025-09-14 17:33:45.755756	BP 1234, Rue de la Paix, Quartier Glass	2000-06-06	\N	Marié(e)	cadre	ventis	\N	CDI	10	1500000.0	200000.0	kdksdk	24	127.0.0.1	Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/140.0.0.0 Safari/537.36 Edg/140.0.0.0	\N
acf967a7-63f2-4139-b564-4aeb62dcf69d	\N	cbao_conso	BEBANE MOUKOUMBI Marina Brunelle	marie.nguema@email.com	+24177861364	2000000.00	pending	{"purpose": "kdksdk", "employer": "ventis", "client_ip": "127.0.0.1", "birth_date": "2025-09-12", "profession": "cadre", "total_cost": 2315972.55, "user_agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/140.0.0.0 Safari/537.36 Edg/140.0.0.0", "applied_rate": 14.5, "data_consent": true, "other_income": 4552222, "submitted_at": "2025-09-16T12:17:28.233360", "terms_consent": true, "applicant_name": "BEBANE MOUKOUMBI Marina Brunelle", "marital_status": "Célibataire", "monthly_income": 1255551, "applicant_email": "marie.nguema@email.com", "applicant_phone": "+24177861364", "contact_consent": true, "employment_type": "CDD", "monthly_payment": 96498.86, "applicant_address": "BP 1234, Rue de la Paix, Quartier Glass", "simulation_reference": "sim_1758025017473_dwvi5haxw", "employment_duration_months": 10}	[]	\N	\N	\N	2025-09-16 12:17:28.23336	2025-09-16 12:17:28.23336	BP 1234, Rue de la Paix, Quartier Glass	2025-09-12	\N	Célibataire	cadre	ventis	\N	CDD	10	1255551.0	4552222.0	kdksdk	24	127.0.0.1	Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/140.0.0.0 Safari/537.36 Edg/140.0.0.0	\N
4b0ea135-4cba-4e08-90fb-68041af33b98	\N	cbao_conso	BEBANE MOUKOUMBI Marina Brunelle	marie.nguema@email.com	+24177861364	2000000.00	pending	{"purpose": "kdksdk", "employer": "ventis", "client_ip": "127.0.0.1", "birth_date": "2025-09-12", "profession": "cadre", "total_cost": 2315972.55, "user_agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/140.0.0.0 Safari/537.36 Edg/140.0.0.0", "applied_rate": 14.5, "data_consent": true, "other_income": 2000, "submitted_at": "2025-09-16T12:23:05.883684", "terms_consent": true, "applicant_name": "BEBANE MOUKOUMBI Marina Brunelle", "marital_status": "Marié(e)", "monthly_income": 1500000, "applicant_email": "marie.nguema@email.com", "applicant_phone": "+24177861364", "contact_consent": true, "employment_type": "CDD", "monthly_payment": 96498.86, "applicant_address": "BP 1234, Rue de la Paix, Quartier Glass", "simulation_reference": "sim_1758025364325_1qzkql67n", "employment_duration_months": 10}	[]	\N	\N	\N	2025-09-16 12:23:05.883684	2025-09-16 12:23:05.883684	BP 1234, Rue de la Paix, Quartier Glass	2025-09-12	\N	Marié(e)	cadre	ventis	\N	CDD	10	1500000.0	2000.0	kdksdk	24	127.0.0.1	Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/140.0.0.0 Safari/537.36 Edg/140.0.0.0	\N
3beb81d6-45b4-4327-bea6-8d6736800de7	\N	cbao_conso	BEBANE MOUKOUMBI Marina Brunelle	marie.nguema@email.com	+24177861364	2000000.00	pending	{"purpose": "kdksdk", "employer": "ventis", "client_ip": "127.0.0.1", "birth_date": "2025-09-12", "profession": "cadre", "total_cost": 2315972.55, "user_agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/140.0.0.0 Safari/537.36 Edg/140.0.0.0", "applied_rate": 14.5, "data_consent": true, "other_income": 2000, "submitted_at": "2025-09-16T13:53:08.920308", "terms_consent": true, "applicant_name": "BEBANE MOUKOUMBI Marina Brunelle", "marital_status": "Marié(e)", "monthly_income": 1500000, "applicant_email": "marie.nguema@email.com", "applicant_phone": "+24177861364", "contact_consent": true, "employment_type": "CDD", "monthly_payment": 96498.86, "applicant_address": "BP 1234, Rue de la Paix, Quartier Glass", "simulation_reference": "sim_1758030756337_zpynu3clb", "employment_duration_months": 10}	[]	\N	\N	\N	2025-09-16 13:53:08.920308	2025-09-16 13:53:08.920308	BP 1234, Rue de la Paix, Quartier Glass	2025-09-12	\N	Marié(e)	cadre	ventis	\N	CDD	10	1500000.0	2000.0	kdksdk	24	127.0.0.1	Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/140.0.0.0 Safari/537.36 Edg/140.0.0.0	\N
5b57b9f6-121f-4c32-b340-059f79d40b37	\N	ugb_logement	BEBANE MOUKOUMBI Marina Brunelle	marie.nguema@email.com	+24177861364	5000000.00	pending	{"purpose": "kdksdk", "employer": "ventis", "client_ip": "127.0.0.1", "birth_date": "2025-09-12", "profession": "cadre", "total_cost": 5724855.35, "user_agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/140.0.0.0 Safari/537.36 Edg/140.0.0.0", "applied_rate": 6.8, "data_consent": true, "other_income": 2000, "submitted_at": "2025-09-16T14:49:50.374106", "terms_consent": true, "applicant_name": "BEBANE MOUKOUMBI Marina Brunelle", "marital_status": "Célibataire", "monthly_income": 1500000, "applicant_email": "marie.nguema@email.com", "applicant_phone": "+24177861364", "contact_consent": true, "employment_type": "CDI", "monthly_payment": 119267.82, "applicant_address": "BP 1234, Rue de la Paix, Quartier Glass", "simulation_reference": "sim_1758034160650_a9k0e7klm", "employment_duration_months": 10}	[]	\N	\N	\N	2025-09-16 14:49:50.374106	2025-09-16 14:49:50.374106	BP 1234, Rue de la Paix, Quartier Glass	2025-09-12	\N	Célibataire	cadre	ventis	\N	CDI	10	1500000.0	2000.0	kdksdk	48	127.0.0.1	Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/140.0.0.0 Safari/537.36 Edg/140.0.0.0	\N
b42def1e-0789-4f8b-ad5b-b178a0e606da	\N	cbao_conso	BEBANE MOUKOUMBI Marina Brunelle	marie.nguema@email.com	+24177861364	2000000.00	pending	{"purpose": "kdksdk", "employer": "ventis", "client_ip": "127.0.0.1", "birth_date": "2025-09-12", "profession": "cadre", "total_cost": 2315972.55, "user_agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/140.0.0.0 Safari/537.36 Edg/140.0.0.0", "applied_rate": 14.5, "data_consent": true, "other_income": 2000, "submitted_at": "2025-09-16T15:18:48.490307", "terms_consent": true, "applicant_name": "BEBANE MOUKOUMBI Marina Brunelle", "marital_status": "Marié(e)", "monthly_income": 1500000, "applicant_email": "marie.nguema@email.com", "applicant_phone": "+24177861364", "contact_consent": true, "employment_type": "CDI", "monthly_payment": 96498.86, "applicant_address": "quartier IAI", "simulation_reference": "sim_1758035869240_ythzrkof9", "employment_duration_months": 10}	[]	\N	\N	\N	2025-09-16 15:18:48.490307	2025-09-16 15:18:48.490307	quartier IAI	2025-09-12	\N	Marié(e)	cadre	ventis	\N	CDI	10	1500000.0	2000.0	kdksdk	24	127.0.0.1	Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/140.0.0.0 Safari/537.36 Edg/140.0.0.0	\N
\.


--
-- Data for Name: credit_products; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.credit_products (id, bank_id, name, type, description, min_amount, max_amount, min_duration_months, max_duration_months, average_rate, min_rate, max_rate, processing_time_hours, required_documents, eligibility_criteria, fees, features, advantages, special_conditions, is_featured, is_active, created_at, updated_at, created_by_admin, updated_by_admin) FROM stdin;
bgfi_habitat	bgfi	BGFI Habitat	immobilier	CrÃ©dit immobilier	5000000.00	200000000.00	60	300	6.50	5.80	8.20	72	\N	\N	\N	\N	\N	\N	f	t	2025-08-21 22:40:27.525168	2025-08-21 22:40:27.525168	\N	\N
bgfi_auto	bgfi	BGFI Auto	auto	CrÃ©dit automobile	2000000.00	50000000.00	12	84	8.90	7.50	11.20	72	\N	\N	\N	\N	\N	\N	f	t	2025-08-21 22:40:27.525168	2025-08-21 22:40:27.525168	\N	\N
ugb_logement	ugb	UGB Logement	immobilier	Solution immobiliÃ¨re	3000000.00	150000000.00	48	360	6.80	6.20	8.50	72	\N	\N	\N	\N	\N	\N	f	t	2025-08-21 22:40:27.525168	2025-08-21 22:40:27.525168	\N	\N
ugb_auto	ugb	UGB Auto Express	auto	CrÃ©dit auto rapide	1500000.00	40000000.00	12	72	9.20	8.10	11.80	72	\N	\N	\N	\N	\N	\N	f	t	2025-08-21 22:40:27.525168	2025-08-21 22:40:27.525168	\N	\N
bicig_pro	bicig	BICIG Pro	professionnel	CrÃ©dit professionnel	10000000.00	500000000.00	60	240	7.20	6.50	9.00	72	\N	\N	\N	\N	\N	\N	f	t	2025-08-21 22:40:27.525168	2025-08-21 22:40:27.525168	\N	\N
ecobank_habitat	ecobank	Ecobank Habitat	immobilier	CrÃ©dit immobilier familial	4000000.00	180000000.00	60	300	7.00	6.30	8.80	72	\N	\N	\N	\N	\N	\N	f	t	2025-08-21 22:40:27.525168	2025-08-21 22:40:27.525168	\N	\N
ecobank_auto	ecobank	Ecobank Auto	auto	CrÃ©dit auto flexible	1800000.00	45000000.00	12	84	9.50	8.20	12.00	72	\N	\N	\N	\N	\N	\N	f	t	2025-08-21 22:40:27.525168	2025-08-21 22:40:27.525168	\N	\N
cbao_primo	cbao	CBAO Primo	immobilier	Premier crÃ©dit immobilier	3500000.00	120000000.00	60	300	6.90	6.10	8.70	72	\N	\N	\N	\N	\N	\N	f	t	2025-08-21 22:40:27.525168	2025-08-21 22:40:27.525168	\N	\N
cbao_conso	cbao	CBAO Conso	consommation	CrÃ©dit personnel	500000.00	15000000.00	6	60	14.50	12.80	18.50	72	\N	\N	\N	\N	\N	\N	f	t	2025-08-21 22:40:27.525168	2025-08-21 22:40:27.525168	\N	\N
bicig_tresorerie	bicig	BICIG TrÃ©sorerie	tresorerie	Solution trÃ©sorerie	1000000.00	50000000.00	3	36	11.50	10.00	14.00	72	\N	\N	\N	\N	\N	\N	f	t	2025-08-21 22:40:27.525168	2025-08-21 22:40:27.525168	\N	\N
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

COPY public.insurance_applications (id, quote_id, insurance_product_id, applicant_name, applicant_email, applicant_phone, coverage_amount, status, application_data, medical_exam_required, documents_uploaded, insurance_response, processing_notes, assigned_to, submitted_at, updated_at, applicant_address, birth_date, nationality, marital_status, profession, employer, beneficiaries, vehicle_make, vehicle_model, vehicle_year, vehicle_value, property_type, property_value, property_address, medical_history, current_treatments, policy_number, premium_offered, deductible_offered, medical_exam_date, documents_required, documents_submitted, processed_at) FROM stdin;
ins_app_6693e4dd	\N	ogar_auto_tr	BEBANE MOUKOUMBI Marina Brunelle	marie.nguema@email.com	+24177861364	0.00	pending	{"consent": {"data_processing": true, "terms_conditions": true, "contact_authorization": true}, "form_data": {"employer": "ventis", "birth_date": "1996-03-15", "profession": "cadre", "nationality": "Gabonaise", "data_consent": true, "vehicle_make": null, "vehicle_year": null, "beneficiaries": null, "property_type": null, "terms_consent": true, "vehicle_model": null, "vehicle_value": null, "applicant_name": "BEBANE MOUKOUMBI Marina Brunelle", "marital_status": "Marié(e)", "property_value": null, "applicant_email": "marie.nguema@email.com", "applicant_phone": "+24177861364", "contact_consent": true, "coverage_amount": null, "medical_history": null, "property_address": null, "applicant_address": "BP 1234, Rue de la Paix, Quartier Glass", "current_treatments": null}, "timestamp": "2025-09-15T15:21:47.667Z", "deductible": 50000, "browser_info": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/140.0.0.0 Safari/537.36 Edg/140.0.0.0", "coverage_info": {"amount": 0.0, "beneficiaries": null}, "personal_info": {"name": "BEBANE MOUKOUMBI Marina Brunelle", "email": "marie.nguema@email.com", "phone": "+24177861364", "address": "BP 1234, Rue de la Paix, Quartier Glass", "employer": "ventis", "birth_date": "1996-03-15", "profession": "cadre", "nationality": "Gabonaise", "marital_status": "Marié(e)"}, "annual_premium": 27916.67, "insurance_type": "voyage", "submitted_from": "web_client", "client_metadata": {"ip": "127.0.0.1", "user_agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/140.0.0.0 Safari/537.36 Edg/140.0.0.0", "submitted_via": "web_portal", "original_quote_id": "main_offer", "processed_quote_id": null, "submission_timestamp": "2025-09-15T15:21:48.122891"}, "monthly_premium": 2326.39, "quote_reference": "main_offer", "coverage_details": {}, "original_product_id": "main_offer", "corrected_product_id": "ogar_auto_tr"}	f	\N	\N	\N	\N	2025-09-15 15:21:48.122891	\N	BP 1234, Rue de la Paix, Quartier Glass	1996-03-15	Gabonaise	Marié(e)	cadre	ventis	\N	\N	\N	0	0.00	\N	0.00	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N
ins_app_9d433207	\N	ogar_habitation	BEBANE MOUKOUMBI Marina Brunelle	marie.nguema@email.com	+24177861364	0.00	pending	{"consent": {"data_processing": true, "terms_conditions": true, "contact_authorization": true}, "form_data": {"employer": "ventis", "birth_date": "1996-03-15", "profession": "cadre", "nationality": "Gabonaise", "data_consent": true, "vehicle_make": "", "vehicle_year": "", "beneficiaries": "", "property_type": "Maison", "terms_consent": true, "vehicle_model": "", "vehicle_value": "", "applicant_name": "BEBANE MOUKOUMBI Marina Brunelle", "marital_status": "Marié(e)", "property_value": 25000000, "applicant_email": "marie.nguema@email.com", "applicant_phone": "+24177861364", "contact_consent": true, "coverage_amount": "", "medical_history": "", "property_address": "BP 1234, Rue de la Paix, Quartier Glass", "applicant_address": "BP 1234, Rue de la Paix, Quartier Glass", "current_treatments": ""}, "timestamp": "2025-09-16T12:14:27.815Z", "deductible": 50000, "browser_info": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/140.0.0.0 Safari/537.36 Edg/140.0.0.0", "coverage_info": {"amount": 0.0, "beneficiaries": ""}, "personal_info": {"name": "BEBANE MOUKOUMBI Marina Brunelle", "email": "marie.nguema@email.com", "phone": "+24177861364", "address": "BP 1234, Rue de la Paix, Quartier Glass", "employer": "ventis", "birth_date": "1996-03-15", "profession": "cadre", "nationality": "Gabonaise", "marital_status": "Marié(e)"}, "property_info": {"type": "Maison", "value": 25000000.0, "address": "BP 1234, Rue de la Paix, Quartier Glass"}, "annual_premium": 129166.67, "insurance_type": "habitation", "submitted_from": "web_client", "client_metadata": {"ip": "127.0.0.1", "user_agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/140.0.0.0 Safari/537.36 Edg/140.0.0.0", "submitted_via": "web_portal", "original_quote_id": "main_offer", "processed_quote_id": null, "submission_timestamp": "2025-09-16T12:14:28.157278"}, "monthly_premium": 10763.89, "quote_reference": "main_offer", "coverage_details": {}, "original_product_id": "main_offer", "corrected_product_id": "ogar_habitation"}	f	\N	\N	\N	\N	2025-09-16 12:14:28.157278	\N	BP 1234, Rue de la Paix, Quartier Glass	1996-03-15	Gabonaise	Marié(e)	cadre	ventis				0	0.00	Maison	25000000.00	BP 1234, Rue de la Paix, Quartier Glass			\N	\N	\N	\N	\N	\N	\N
ins_app_8f3554b1	\N	ogar_auto_tr	BEBANE MOUKOUMBI Marina Brunelle	marie.nguema@email.com	+24177861364	0.00	pending	{"consent": {"data_processing": true, "terms_conditions": true, "contact_authorization": true}, "form_data": {"employer": "ventis", "birth_date": "1998-02-10", "profession": "cadre", "nationality": "Camerounaise", "data_consent": true, "vehicle_make": "toyota", "vehicle_year": 2024, "beneficiaries": "", "property_type": "", "terms_consent": true, "vehicle_model": "corolla", "vehicle_value": 25000000, "applicant_name": "BEBANE MOUKOUMBI Marina Brunelle", "marital_status": "Marié(e)", "property_value": "", "applicant_email": "marie.nguema@email.com", "applicant_phone": "+24177861364", "contact_consent": true, "coverage_amount": "", "medical_history": "", "property_address": "", "applicant_address": "BP 1234, Rue de la Paix, Quartier Glass", "current_treatments": ""}, "timestamp": "2025-09-16T15:26:57.246Z", "deductible": 50000, "browser_info": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/140.0.0.0 Safari/537.36 Edg/140.0.0.0", "vehicle_info": {"make": "toyota", "year": 2024, "model": "corolla", "value": 25000000.0}, "coverage_info": {"amount": 0.0, "beneficiaries": ""}, "personal_info": {"name": "BEBANE MOUKOUMBI Marina Brunelle", "email": "marie.nguema@email.com", "phone": "+24177861364", "address": "BP 1234, Rue de la Paix, Quartier Glass", "employer": "ventis", "birth_date": "1998-02-10", "profession": "cadre", "nationality": "Camerounaise", "marital_status": "Marié(e)"}, "annual_premium": 1181250, "insurance_type": "auto", "submitted_from": "web_client", "client_metadata": {"ip": "127.0.0.1", "user_agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/140.0.0.0 Safari/537.36 Edg/140.0.0.0", "submitted_via": "web_portal", "original_quote_id": "main_offer", "processed_quote_id": null, "submission_timestamp": "2025-09-16T15:26:57.631139"}, "monthly_premium": 98437.5, "quote_reference": "main_offer", "coverage_details": {}, "original_product_id": "main_offer", "corrected_product_id": "ogar_auto_tr"}	f	\N	\N	\N	\N	2025-09-16 15:26:57.642447	\N	BP 1234, Rue de la Paix, Quartier Glass	1998-02-10	Camerounaise	Marié(e)	cadre	ventis		toyota	corolla	2024	25000000.00		0.00				\N	\N	\N	\N	\N	\N	\N
\.


--
-- Data for Name: insurance_companies; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.insurance_companies (id, name, full_name, description, logo_url, website, contact_phone, contact_email, address, license_number, established_year, solvency_ratio, rating, specialties, coverage_areas, is_active, created_at, updated_at, logo_data, logo_content_type) FROM stdin;
ogar	OGAR Assurances	Office Gabonais d'Assurance et de RÃ©assurance	Leader assurance Gabon	\N	\N	+241 01 72 35 00	info@ogar-gabon.com	\N	\N	\N	\N	\N	{auto,habitation,vie}	\N	t	2025-08-21 22:40:27.523224	2025-08-21 22:40:27.523224	\N	\N
nsia	NSIA Assurances	Nouvelle SociÃ©tÃ© Interafricaine d'Assurance	Assureur panafricain	\N	\N	+241 01 44 35 55	contact@nsia-gabon.com	\N	\N	\N	\N	\N	{vie,sante,auto}	\N	t	2025-08-21 22:40:27.523224	2025-08-21 22:40:27.523224	\N	\N
axa_gabon	AXA Gabon	AXA Assurances Gabon	Groupe AXA	\N	\N	+241 01 73 45 67	gabon@axa.com	\N	\N	\N	\N	\N	{vie,sante}	\N	t	2025-08-21 22:40:27.523224	2025-08-21 22:40:27.523224	\N	\N
colina	Colina Assurances	Compagnie Colina Gabon	Assurance dommages	\N	\N	+241 01 76 22 33	info@colina.ga	\N	\N	\N	\N	\N	{auto,habitation}	\N	t	2025-08-21 22:40:27.523224	2025-08-21 22:40:27.523224	\N	\N
saham	Saham Assurance	Saham Assurance Gabon	Groupe Sanlam	\N	\N	+241 01 77 88 99	gabon@saham.com	\N	\N	\N	\N	\N	{auto,voyage}	\N	t	2025-08-21 22:40:27.523224	2025-08-21 22:40:27.523224	\N	\N
\.


--
-- Data for Name: insurance_products; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.insurance_products (id, insurance_company_id, name, type, description, coverage_details, premium_calculation, base_premium, min_coverage, max_coverage, deductible_options, age_limits, exclusions, features, advantages, claim_process, settlement_time_days, renewable, is_featured, is_active, created_at, updated_at, created_by_admin, updated_by_admin) FROM stdin;
ogar_auto_tr	ogar	OGAR Auto Tous Risques	auto	Assurance auto tous risques	\N	\N	875000.00	\N	\N	\N	\N	\N	\N	\N	\N	15	t	f	t	2025-08-21 22:40:27.541302	2025-08-21 22:40:27.541302	\N	\N
ogar_auto_tiers	ogar	OGAR Auto Tiers	auto	Assurance responsabilitÃ© civile	\N	\N	420000.00	\N	\N	\N	\N	\N	\N	\N	\N	15	t	f	t	2025-08-21 22:40:27.541302	2025-08-21 22:40:27.541302	\N	\N
ogar_habitation	ogar	OGAR Habitation	habitation	Assurance habitation	\N	\N	120000.00	\N	\N	\N	\N	\N	\N	\N	\N	15	t	f	t	2025-08-21 22:40:27.541302	2025-08-21 22:40:27.541302	\N	\N
nsia_vie	nsia	NSIA Vie Protection	vie	Assurance vie temporaire	\N	\N	45000.00	\N	\N	\N	\N	\N	\N	\N	\N	15	t	f	t	2025-08-21 22:40:27.541302	2025-08-21 22:40:27.541302	\N	\N
nsia_sante	nsia	NSIA SantÃ© Plus	sante	ComplÃ©mentaire santÃ©	\N	\N	85000.00	\N	\N	\N	\N	\N	\N	\N	\N	15	t	f	t	2025-08-21 22:40:27.541302	2025-08-21 22:40:27.541302	\N	\N
axa_vie	axa_gabon	AXA Vie Ã‰pargne	vie	Assurance vie Ã©pargne	\N	\N	125000.00	\N	\N	\N	\N	\N	\N	\N	\N	15	t	f	t	2025-08-21 22:40:27.541302	2025-08-21 22:40:27.541302	\N	\N
axa_sante	axa_gabon	AXA SantÃ© Premium	sante	Assurance santÃ© premium	\N	\N	175000.00	\N	\N	\N	\N	\N	\N	\N	\N	15	t	f	t	2025-08-21 22:40:27.541302	2025-08-21 22:40:27.541302	\N	\N
colina_auto	colina	Colina Auto Ã‰conomique	auto	Assurance auto Ã©conomique	\N	\N	315000.00	\N	\N	\N	\N	\N	\N	\N	\N	15	t	f	t	2025-08-21 22:40:27.541302	2025-08-21 22:40:27.541302	\N	\N
colina_habitation	colina	Colina Habitation	habitation	Assurance habitation sociale	\N	\N	65000.00	\N	\N	\N	\N	\N	\N	\N	\N	15	t	f	t	2025-08-21 22:40:27.541302	2025-08-21 22:40:27.541302	\N	\N
colina_transport	colina	Colina Transport	transport	Assurance transport	\N	\N	800000.00	\N	\N	\N	\N	\N	\N	\N	\N	15	t	f	t	2025-08-21 22:40:27.541302	2025-08-21 22:40:27.541302	\N	\N
saham_auto	saham	Saham Auto Famille	auto	Assurance auto familiale	\N	\N	485000.00	\N	\N	\N	\N	\N	\N	\N	\N	15	t	f	t	2025-08-21 22:40:27.541302	2025-08-21 22:40:27.541302	\N	\N
saham_voyage	saham	Saham Voyage	voyage	Assurance voyage internationale	\N	\N	25000.00	\N	\N	\N	\N	\N	\N	\N	\N	15	t	f	t	2025-08-21 22:40:27.541302	2025-08-21 22:40:27.541302	\N	\N
saham_habitation	saham	Saham Habitation	habitation	Assurance habitation familiale	\N	\N	155000.00	\N	\N	\N	\N	\N	\N	\N	\N	15	t	f	t	2025-08-21 22:40:27.541302	2025-08-21 22:40:27.541302	\N	\N
nsia_auto	nsia	NSIA Auto	auto	Assurance automobile NSIA	\N	\N	520000.00	\N	\N	\N	\N	\N	\N	\N	\N	15	t	f	t	2025-08-21 22:40:27.541302	2025-08-21 22:40:27.541302	\N	\N
axa_retraite	axa_gabon	AXA Retraite	retraite	Plan retraite complÃ©mentaire	\N	\N	95000.00	\N	\N	\N	\N	\N	\N	\N	\N	15	t	f	t	2025-08-21 22:40:27.541302	2025-08-21 22:40:27.541302	\N	\N
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

COPY public.savings_products (id, bank_id, name, type, description, interest_rate, minimum_deposit, maximum_deposit, minimum_balance, liquidity, notice_period_days, term_months, compounding_frequency, fees, features, advantages, tax_benefits, risk_level, early_withdrawal_penalty, is_islamic_compliant, is_featured, is_active, created_at, updated_at, terms_conditions, created_by_admin, updated_by_admin) FROM stdin;
bgfi_livret	bgfi	BGFI Livret	livret	Livret d'Ã©pargne rÃ©munÃ©rÃ©	3.25	100000.00	\N	0.00	immediate	0	\N	monthly	\N	\N	\N	\N	1	\N	f	f	t	2025-08-21 22:40:27.538045	2025-08-21 22:40:27.538045	\N	\N	\N
bgfi_terme	bgfi	BGFI Terme	terme	DÃ©pÃ´t Ã  terme	4.50	1000000.00	\N	0.00	term	0	\N	monthly	\N	\N	\N	\N	1	\N	f	f	t	2025-08-21 22:40:27.538045	2025-08-21 22:40:27.538045	\N	\N	\N
ugb_epargne	ugb	UGB Ã‰pargne Plus	livret	Compte Ã©pargne rÃ©munÃ©rÃ©	3.00	50000.00	\N	0.00	immediate	0	\N	monthly	\N	\N	\N	\N	1	\N	f	f	t	2025-08-21 22:40:27.538045	2025-08-21 22:40:27.538045	\N	\N	\N
ugb_plan	ugb	UGB Plan Projet	plan_epargne	Ã‰pargne programmÃ©e	4.20	25000.00	\N	0.00	notice	0	\N	monthly	\N	\N	\N	\N	1	\N	f	f	t	2025-08-21 22:40:27.538045	2025-08-21 22:40:27.538045	\N	\N	\N
bicig_entreprise	bicig	BICIG Entreprise	professionnel	Ã‰pargne entreprise	2.75	500000.00	\N	0.00	immediate	0	\N	monthly	\N	\N	\N	\N	1	\N	f	f	t	2025-08-21 22:40:27.538045	2025-08-21 22:40:27.538045	\N	\N	\N
ecobank_smart	ecobank	Ecobank Smart	livret	Ã‰pargne intelligente	3.40	75000.00	\N	0.00	immediate	0	\N	monthly	\N	\N	\N	\N	1	\N	f	f	t	2025-08-21 22:40:27.538045	2025-08-21 22:40:27.538045	\N	\N	\N
cbao_logement	cbao	CBAO Logement	plan_epargne	Plan Ã©pargne logement	3.60	100000.00	\N	0.00	notice	0	\N	monthly	\N	\N	\N	\N	1	\N	f	f	t	2025-08-21 22:40:27.538045	2025-08-21 22:40:27.538045	\N	\N	\N
cbao_jeune	cbao	CBAO Jeune	livret	Livret jeune	4.50	10000.00	\N	0.00	immediate	0	\N	monthly	\N	\N	\N	\N	1	\N	f	f	t	2025-08-21 22:40:27.538045	2025-08-21 22:40:27.538045	\N	\N	\N
bicig_placement	bicig	BICIG Placement	terme	Placement sÃ©curisÃ©	5.20	2000000.00	\N	0.00	term	0	\N	monthly	\N	\N	\N	\N	1	\N	f	f	t	2025-08-21 22:40:27.538045	2025-08-21 22:40:27.538045	\N	\N	\N
ecobank_diaspora	ecobank	Ecobank Diaspora	plan_epargne	Ã‰pargne diaspora	4.80	100000.00	\N	0.00	notice	0	\N	monthly	\N	\N	\N	\N	1	\N	f	f	t	2025-08-21 22:40:27.538045	2025-08-21 22:40:27.538045	\N	\N	\N
\.


--
-- Data for Name: savings_simulations; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.savings_simulations (id, session_id, savings_product_id, initial_amount, monthly_contribution, duration_months, final_amount, total_contributions, total_interest, effective_rate, monthly_breakdown, recommendations, client_ip, user_agent, created_at) FROM stdin;
sav_001	sess_004	bgfi_livret	1000000.00	200000.00	120	26400000.00	25000000.00	1400000.00	3.25	\N	\N	\N	\N	2025-08-21 22:40:27.547201
sav_002	sess_005	ugb_epargne	500000.00	150000.00	60	9650000.00	9500000.00	150000.00	3.00	\N	\N	\N	\N	2025-08-21 22:40:27.547201
\.


--
-- Data for Name: user_credit_applications; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.user_credit_applications (id, user_id, credit_product_id, simulation_id, requested_amount, duration_months, purpose, monthly_income, current_debts, down_payment, employment_type, employer_name, employment_duration_months, documents, status, bank_response, bank_contact_info, processing_notes, priority_level, assigned_to, expected_response_date, user_notified, last_notification_sent, submitted_at, updated_at) FROM stdin;
\.


--
-- Data for Name: user_documents; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.user_documents (id, user_id, filename, original_filename, file_type, file_size, file_path, file_url, document_type, application_type, application_id, is_verified, verified_by, verified_at, uploaded_at, expires_at) FROM stdin;
\.


--
-- Data for Name: user_insurance_applications; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.user_insurance_applications (id, user_id, insurance_product_id, quote_id, insurance_type, coverage_amount, beneficiaries, vehicle_info, property_info, health_info, travel_info, business_info, documents, medical_exam_required, medical_exam_completed, status, insurance_response, policy_number, premium_amount, processing_notes, assigned_to, submitted_at, updated_at) FROM stdin;
\.


--
-- Data for Name: user_notifications; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.user_notifications (id, user_id, type, title, message, related_entity_type, related_entity_id, is_read, priority, created_at) FROM stdin;
\.


--
-- Data for Name: user_savings_applications; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.user_savings_applications (id, user_id, savings_product_id, simulation_id, initial_deposit, monthly_contribution, savings_goal, target_amount, target_date, documents, status, bank_response, account_number, processing_notes, assigned_to, submitted_at, updated_at) FROM stdin;
\.


--
-- Data for Name: user_sessions; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.user_sessions (id, user_id, token, device_info, ip_address, user_agent, expires_at, is_active, created_at) FROM stdin;
\.


--
-- Data for Name: users; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.users (id, email, phone, first_name, last_name, date_of_birth, gender, profession, monthly_income, city, address, password_hash, registration_method, email_verified, phone_verified, verification_code, verification_expires_at, is_active, preferences, last_login, created_at, updated_at) FROM stdin;
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
-- Name: user_credit_applications user_credit_applications_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.user_credit_applications
    ADD CONSTRAINT user_credit_applications_pkey PRIMARY KEY (id);


--
-- Name: user_documents user_documents_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.user_documents
    ADD CONSTRAINT user_documents_pkey PRIMARY KEY (id);


--
-- Name: user_insurance_applications user_insurance_applications_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.user_insurance_applications
    ADD CONSTRAINT user_insurance_applications_pkey PRIMARY KEY (id);


--
-- Name: user_notifications user_notifications_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.user_notifications
    ADD CONSTRAINT user_notifications_pkey PRIMARY KEY (id);


--
-- Name: user_savings_applications user_savings_applications_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.user_savings_applications
    ADD CONSTRAINT user_savings_applications_pkey PRIMARY KEY (id);


--
-- Name: user_sessions user_sessions_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.user_sessions
    ADD CONSTRAINT user_sessions_pkey PRIMARY KEY (id);


--
-- Name: users users_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.users
    ADD CONSTRAINT users_pkey PRIMARY KEY (id);


--
-- Name: idx_admin_users_assigned_bank_id; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_admin_users_assigned_bank_id ON public.admin_users USING btree (assigned_bank_id);


--
-- Name: idx_admin_users_assigned_insurance_id; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_admin_users_assigned_insurance_id ON public.admin_users USING btree (assigned_insurance_company_id);


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
-- Name: idx_insurance_applications_applicant_email; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_insurance_applications_applicant_email ON public.insurance_applications USING btree (applicant_email);


--
-- Name: idx_insurance_applications_product_id; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_insurance_applications_product_id ON public.insurance_applications USING btree (insurance_product_id);


--
-- Name: idx_insurance_applications_status; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_insurance_applications_status ON public.insurance_applications USING btree (status);


--
-- Name: idx_insurance_applications_submitted_at; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_insurance_applications_submitted_at ON public.insurance_applications USING btree (submitted_at);


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
-- Name: ix_user_credit_applications_user_id; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX ix_user_credit_applications_user_id ON public.user_credit_applications USING btree (user_id);


--
-- Name: ix_user_documents_user_id; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX ix_user_documents_user_id ON public.user_documents USING btree (user_id);


--
-- Name: ix_user_insurance_applications_user_id; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX ix_user_insurance_applications_user_id ON public.user_insurance_applications USING btree (user_id);


--
-- Name: ix_user_notifications_user_id; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX ix_user_notifications_user_id ON public.user_notifications USING btree (user_id);


--
-- Name: ix_user_savings_applications_user_id; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX ix_user_savings_applications_user_id ON public.user_savings_applications USING btree (user_id);


--
-- Name: ix_user_sessions_token; Type: INDEX; Schema: public; Owner: postgres
--

CREATE UNIQUE INDEX ix_user_sessions_token ON public.user_sessions USING btree (token);


--
-- Name: ix_user_sessions_user_id; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX ix_user_sessions_user_id ON public.user_sessions USING btree (user_id);


--
-- Name: ix_users_email; Type: INDEX; Schema: public; Owner: postgres
--

CREATE UNIQUE INDEX ix_users_email ON public.users USING btree (email);


--
-- Name: ix_users_phone; Type: INDEX; Schema: public; Owner: postgres
--

CREATE UNIQUE INDEX ix_users_phone ON public.users USING btree (phone);


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
-- Name: admin_users fk_admin_users_bank; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.admin_users
    ADD CONSTRAINT fk_admin_users_bank FOREIGN KEY (assigned_bank_id) REFERENCES public.banks(id) ON DELETE SET NULL;


--
-- Name: admin_users fk_admin_users_insurance; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.admin_users
    ADD CONSTRAINT fk_admin_users_insurance FOREIGN KEY (assigned_insurance_company_id) REFERENCES public.insurance_companies(id) ON DELETE SET NULL;


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
-- Name: user_credit_applications user_credit_applications_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.user_credit_applications
    ADD CONSTRAINT user_credit_applications_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.users(id) ON DELETE CASCADE;


--
-- Name: user_documents user_documents_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.user_documents
    ADD CONSTRAINT user_documents_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.users(id) ON DELETE CASCADE;


--
-- Name: user_insurance_applications user_insurance_applications_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.user_insurance_applications
    ADD CONSTRAINT user_insurance_applications_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.users(id) ON DELETE CASCADE;


--
-- Name: user_notifications user_notifications_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.user_notifications
    ADD CONSTRAINT user_notifications_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.users(id) ON DELETE CASCADE;


--
-- Name: user_savings_applications user_savings_applications_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.user_savings_applications
    ADD CONSTRAINT user_savings_applications_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.users(id) ON DELETE CASCADE;


--
-- Name: user_sessions user_sessions_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.user_sessions
    ADD CONSTRAINT user_sessions_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.users(id) ON DELETE CASCADE;


--
-- PostgreSQL database dump complete
--

