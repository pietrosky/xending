--
-- Name: archive; Type: SCHEMA; Schema: -; Owner: -
--

CREATE SCHEMA archive;


--
-- Name: auth; Type: SCHEMA; Schema: -; Owner: -
--

CREATE SCHEMA auth;


--
-- Name: extensions; Type: SCHEMA; Schema: -; Owner: -
--

CREATE SCHEMA extensions;

CREATE SCHEMA public;
--
-- Name: pgcrypto; Type: EXTENSION; Schema: -; Owner: -
--

CREATE EXTENSION IF NOT EXISTS pgcrypto WITH SCHEMA extensions;


--
-- Name: EXTENSION pgcrypto; Type: COMMENT; Schema: -; Owner: -
--

COMMENT ON EXTENSION pgcrypto IS 'cryptographic functions';


--
-- Name: uuid-ossp; Type: EXTENSION; Schema: -; Owner: -
--

CREATE EXTENSION IF NOT EXISTS "uuid-ossp" WITH SCHEMA extensions;


--
-- Name: EXTENSION "uuid-ossp"; Type: COMMENT; Schema: -; Owner: -
--

COMMENT ON EXTENSION "uuid-ossp" IS 'generate universally unique identifiers (UUIDs)';


--
-- Name: role(); Type: FUNCTION; Schema: auth; Owner: -
--

CREATE FUNCTION auth.role() RETURNS text
    LANGUAGE sql STABLE
    AS $$
  SELECT COALESCE(
    current_setting('request.jwt.claim.role', true),
    (current_setting('request.jwt.claims', true)::jsonb ->> 'role')
  )::text
$$;


--
-- Name: uid(); Type: FUNCTION; Schema: auth; Owner: -
--

CREATE FUNCTION auth.uid() RETURNS uuid
    LANGUAGE sql STABLE
    AS $$
  SELECT COALESCE(
    current_setting('request.jwt.claim.sub', true),
    (current_setting('request.jwt.claims', true)::jsonb ->> 'sub')
  )::uuid
$$;


--
-- Name: archive_company_on_update(); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.archive_company_on_update() RETURNS trigger
    LANGUAGE plpgsql
    SET search_path TO ''
    AS $$
BEGIN
    INSERT INTO archive.cs_companies (original_id, full_record, archived_by)
    VALUES (OLD.id, to_jsonb(OLD), current_setting('app.current_user_id')::uuid);
    RETURN NEW;
END;
$$;


--
-- Name: generate_expediente_folio(); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.generate_expediente_folio() RETURNS trigger
    LANGUAGE plpgsql
    SET search_path TO ''
    AS $$
BEGIN
  NEW.folio := 'XND-' || EXTRACT(YEAR FROM now())::TEXT || '-' ||
               LPAD(nextval('cs_expediente_folio_seq')::TEXT, 5, '0');
  RETURN NEW;
END;
$$;


--
-- Name: login(text, text); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.login(email_input text, password_input text) RETURNS json
    LANGUAGE plpgsql SECURITY DEFINER
    SET search_path TO 'public', 'extensions'
    AS $$
DECLARE
  usr RECORD;
  jwt_secret TEXT := 'super-secret-jwt-token-with-at-least-32-characters-long';
  header TEXT;
  payload TEXT;
  signature TEXT;
  token TEXT;
BEGIN
  SELECT * INTO usr FROM local_users WHERE email = lower(email_input);

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Invalid credentials';
  END IF;

  IF usr.password != password_input THEN
    RAISE EXCEPTION 'Invalid credentials';
  END IF;

  header := encode(convert_to('{"alg":"HS256","typ":"JWT"}', 'utf8'), 'base64');
  header := replace(replace(replace(header, '=', ''), chr(10), ''), chr(13), '');

  payload := encode(convert_to(
    json_build_object(
      'sub', usr.id::text,
      'email', usr.email,
      'full_name', usr.full_name,
      'role', COALESCE(usr.role, 'anon'),
      'iss', 'supabase-demo',
      'exp', extract(epoch from now() + interval '24 hours')::bigint
    )::text, 'utf8'), 'base64');
  payload := replace(replace(replace(payload, '=', ''), chr(10), ''), chr(13), '');

  signature := encode(
    hmac(header || '.' || payload, jwt_secret, 'sha256'),
    'base64'
  );
  signature := replace(replace(replace(replace(replace(signature, '=', ''), '+', '-'), '/', '_'), chr(10), ''), chr(13), '');
  header := replace(replace(header, '+', '-'), '/', '_');
  payload := replace(replace(payload, '+', '-'), '/', '_');

  token := header || '.' || payload || '.' || signature;

  RETURN json_build_object(
    'token', token,
    'user', json_build_object(
      'id', usr.id,
      'email', usr.email,
      'full_name', usr.full_name,
      'role', usr.role
    )
  );
END;
$$;


--
-- Name: prevent_data_field_update(); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.prevent_data_field_update() RETURNS trigger
    LANGUAGE plpgsql
    SET search_path TO ''
    AS $$
BEGIN
  IF OLD.account_number IS DISTINCT FROM NEW.account_number
     OR OLD.account_name IS DISTINCT FROM NEW.account_name
     OR OLD.swift_code IS DISTINCT FROM NEW.swift_code
     OR OLD.bank_name IS DISTINCT FROM NEW.bank_name
     OR OLD.bank_address IS DISTINCT FROM NEW.bank_address
     OR OLD.currency_types IS DISTINCT FROM NEW.currency_types
  THEN
    RAISE EXCEPTION 'No se permite modificar los datos de la cuenta bancaria';
  END IF;
  RETURN NEW;
END;
$$;


--
-- Name: update_expediente_timestamp(); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.update_expediente_timestamp() RETURNS trigger
    LANGUAGE plpgsql
    SET search_path TO ''
    AS $$
BEGIN
  NEW.updated_at := now();
  RETURN NEW;
END;
$$;


SET default_tablespace = '';

SET default_table_access_method = heap;

--
-- Name: cs_ai_analysis; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.cs_ai_analysis (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    application_id uuid NOT NULL,
    risk_narrative text,
    top_risks jsonb DEFAULT '[]'::jsonb NOT NULL,
    top_strengths jsonb DEFAULT '[]'::jsonb NOT NULL,
    confidence_score numeric,
    hidden_risks jsonb DEFAULT '[]'::jsonb NOT NULL,
    trend_narrative text,
    created_at timestamp with time zone DEFAULT now() NOT NULL
);


--
-- Name: cs_ai_recommendations; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.cs_ai_recommendations (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    application_id uuid NOT NULL,
    recommendation_type text NOT NULL,
    recommendation_text text,
    priority text NOT NULL,
    engine_source text,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    CONSTRAINT cs_ai_recommendations_priority_check CHECK ((priority = ANY (ARRAY['high'::text, 'medium'::text, 'low'::text])))
);


--
-- Name: cs_ai_scenarios; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.cs_ai_scenarios (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    application_id uuid NOT NULL,
    scenario_type text NOT NULL,
    scenario_description text,
    impact_assessment jsonb DEFAULT '{}'::jsonb NOT NULL,
    probability text,
    created_at timestamp with time zone DEFAULT now() NOT NULL
);


--
-- Name: cs_api_cache; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.cs_api_cache (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    provider text NOT NULL,
    endpoint text NOT NULL,
    rfc text NOT NULL,
    response_data jsonb NOT NULL,
    expires_at timestamp with time zone NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL
);


--
-- Name: cs_api_calls; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.cs_api_calls (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    application_id uuid,
    provider text NOT NULL,
    endpoint text NOT NULL,
    status_code integer,
    latency_ms integer,
    error_message text,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    CONSTRAINT cs_api_calls_provider_check CHECK ((provider = ANY (ARRAY['scory'::text, 'syntage'::text, 'openai'::text])))
);


--
-- Name: cs_application_status_log; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.cs_application_status_log (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    application_id uuid NOT NULL,
    old_status text,
    new_status text NOT NULL,
    changed_by uuid,
    reason text,
    created_at timestamp with time zone DEFAULT now() NOT NULL
);


--
-- Name: cs_applications; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.cs_applications (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    rfc text NOT NULL,
    company_name text NOT NULL,
    requested_amount numeric NOT NULL,
    term_months integer NOT NULL,
    currency text NOT NULL,
    status text DEFAULT 'pending_scoring'::text NOT NULL,
    scoring_version text,
    created_by uuid,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now(),
    CONSTRAINT cs_applications_currency_check CHECK ((currency = ANY (ARRAY['MXN'::text, 'USD'::text]))),
    CONSTRAINT cs_applications_requested_amount_check CHECK ((requested_amount > (0)::numeric)),
    CONSTRAINT cs_applications_status_check CHECK ((status = ANY (ARRAY['pending_scoring'::text, 'scoring_in_progress'::text, 'scored'::text, 'approved'::text, 'conditional'::text, 'committee'::text, 'rejected'::text]))),
    CONSTRAINT cs_applications_term_months_check CHECK ((term_months > 0))
);


--
-- Name: cs_audit_log; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.cs_audit_log (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    application_id uuid,
    action text NOT NULL,
    details jsonb,
    user_id uuid,
    created_at timestamp with time zone DEFAULT now() NOT NULL
);


--
-- Name: cs_benchmark_comparisons; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.cs_benchmark_comparisons (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    application_id uuid NOT NULL,
    benchmark_id uuid,
    engine_name text NOT NULL,
    metric_name text NOT NULL,
    applicant_value numeric NOT NULL,
    benchmark_value numeric NOT NULL,
    deviation_percent numeric,
    percentile_rank numeric,
    status text NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    CONSTRAINT cs_benchmark_comparisons_status_check CHECK ((status = ANY (ARRAY['above'::text, 'at'::text, 'below'::text])))
);


--
-- Name: cs_benchmark_cross_validation; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.cs_benchmark_cross_validation (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    application_id uuid NOT NULL,
    total_ratios_compared integer,
    ratios_matched integer,
    ratios_minor_deviation integer,
    ratios_major_deviation integer,
    overall_confidence numeric,
    flags jsonb DEFAULT '[]'::jsonb NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL
);


--
-- Name: cs_benchmark_syntage_ratios; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.cs_benchmark_syntage_ratios (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    application_id uuid NOT NULL,
    ratio_category text NOT NULL,
    ratio_name text NOT NULL,
    syntage_value numeric,
    calculated_value numeric,
    deviation_percent numeric,
    match_status text,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    CONSTRAINT cs_benchmark_syntage_ratios_match_status_check CHECK ((match_status = ANY (ARRAY['match'::text, 'minor_deviation'::text, 'major_deviation'::text])))
);


--
-- Name: cs_benchmarks; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.cs_benchmarks (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    sector text NOT NULL,
    size_category text NOT NULL,
    region text,
    metric_name text NOT NULL,
    metric_label text NOT NULL,
    benchmark_value numeric NOT NULL,
    percentile_25 numeric,
    percentile_50 numeric,
    percentile_75 numeric,
    unit text NOT NULL,
    source text,
    effective_date date DEFAULT CURRENT_DATE NOT NULL,
    active boolean DEFAULT true,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    sample_size integer DEFAULT 0,
    CONSTRAINT cs_benchmarks_size_category_check CHECK ((size_category = ANY (ARRAY['micro'::text, 'small'::text, 'medium'::text, 'large'::text])))
);


--
-- Name: cs_buro_active_credits; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.cs_buro_active_credits (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    application_id uuid NOT NULL,
    credit_data jsonb NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL
);


--
-- Name: cs_buro_analysis; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.cs_buro_analysis (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    application_id uuid NOT NULL,
    total_debt numeric,
    monthly_debt_service numeric,
    negative_records jsonb,
    portfolio_quality jsonb,
    created_at timestamp with time zone DEFAULT now() NOT NULL
);


--
-- Name: cs_buro_consultations; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.cs_buro_consultations (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    application_id uuid NOT NULL,
    consultation_data jsonb NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL
);


--
-- Name: cs_buro_data; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.cs_buro_data (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    application_id uuid NOT NULL,
    score_pyme numeric,
    score_causes jsonb,
    califica_data jsonb,
    raw_data jsonb,
    created_at timestamp with time zone DEFAULT now() NOT NULL
);


--
-- Name: cs_buro_debt_rotation; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.cs_buro_debt_rotation (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    application_id uuid NOT NULL,
    rotation_flags jsonb NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL
);


--
-- Name: cs_buro_hawk_checks; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.cs_buro_hawk_checks (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    application_id uuid NOT NULL,
    hawk_data jsonb NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL
);


--
-- Name: cs_buro_liquidated; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.cs_buro_liquidated (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    application_id uuid NOT NULL,
    liquidation_data jsonb NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL
);


--
-- Name: cs_buro_results; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.cs_buro_results (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    application_id uuid NOT NULL,
    module_status text NOT NULL,
    module_score numeric NOT NULL,
    module_grade text NOT NULL,
    risk_flags jsonb DEFAULT '[]'::jsonb NOT NULL,
    key_metrics jsonb DEFAULT '{}'::jsonb NOT NULL,
    benchmark_comparison jsonb DEFAULT '{}'::jsonb NOT NULL,
    explanation text,
    recommended_actions jsonb DEFAULT '[]'::jsonb NOT NULL,
    trend_factor numeric DEFAULT 1.0 NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    CONSTRAINT cs_buro_results_module_grade_check CHECK ((module_grade = ANY (ARRAY['A'::text, 'B'::text, 'C'::text, 'D'::text, 'F'::text]))),
    CONSTRAINT cs_buro_results_module_status_check CHECK ((module_status = ANY (ARRAY['pass'::text, 'fail'::text, 'warning'::text, 'blocked'::text])))
);


--
-- Name: cs_business_rules; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.cs_business_rules (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    rule_key text NOT NULL,
    rule_value jsonb NOT NULL,
    description text,
    updated_by text,
    updated_at timestamp with time zone DEFAULT now()
);


--
-- Name: TABLE cs_business_rules; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON TABLE public.cs_business_rules IS 'Reglas de negocio configurables para el flujo de otorgamiento';


--
-- Name: cs_cashflow_calculations; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.cs_cashflow_calculations (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    application_id uuid NOT NULL,
    metric_name text NOT NULL,
    metric_value numeric,
    formula text,
    period text,
    created_at timestamp with time zone DEFAULT now() NOT NULL
);


--
-- Name: cs_cashflow_inputs; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.cs_cashflow_inputs (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    application_id uuid NOT NULL,
    source text NOT NULL,
    requested_amount numeric,
    term_months integer,
    interest_rate numeric,
    currency text,
    raw_data jsonb NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    CONSTRAINT cs_cashflow_inputs_currency_check CHECK ((currency = ANY (ARRAY['MXN'::text, 'USD'::text]))),
    CONSTRAINT cs_cashflow_inputs_source_check CHECK ((source = ANY (ARRAY['sat'::text, 'financial_statements'::text, 'buro'::text, 'manual'::text, 'combined'::text])))
);


--
-- Name: cs_cashflow_results; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.cs_cashflow_results (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    application_id uuid NOT NULL,
    module_status text NOT NULL,
    module_score numeric NOT NULL,
    module_grade text NOT NULL,
    risk_flags jsonb DEFAULT '[]'::jsonb NOT NULL,
    key_metrics jsonb DEFAULT '{}'::jsonb NOT NULL,
    benchmark_comparison jsonb DEFAULT '{}'::jsonb NOT NULL,
    explanation text,
    recommended_actions jsonb DEFAULT '[]'::jsonb NOT NULL,
    trend_factor numeric DEFAULT 1.0 NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL
);


--
-- Name: cs_cashflow_scenarios; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.cs_cashflow_scenarios (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    application_id uuid NOT NULL,
    scenario_type text NOT NULL,
    assumptions jsonb DEFAULT '{}'::jsonb NOT NULL,
    results jsonb DEFAULT '{}'::jsonb NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    CONSTRAINT cs_cashflow_scenarios_scenario_type_check CHECK ((scenario_type = ANY (ARRAY['base'::text, 'stress'::text])))
);


--
-- Name: cs_companies; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.cs_companies (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    tenant_id text DEFAULT 'xending'::text NOT NULL,
    rfc text NOT NULL,
    legal_name text NOT NULL,
    trade_name text,
    business_activity text,
    tax_regime text,
    incorporation_date date,
    address jsonb DEFAULT '{}'::jsonb,
    syntage_entity_id text,
    scory_entity_id text,
    status text DEFAULT 'active'::text NOT NULL,
    metadata jsonb DEFAULT '{}'::jsonb,
    created_at timestamp with time zone DEFAULT now(),
    updated_at timestamp with time zone DEFAULT now(),
    CONSTRAINT cs_companies_status_check CHECK ((status = ANY (ARRAY['active'::text, 'inactive'::text, 'blacklisted'::text])))
);


--
-- Name: TABLE cs_companies; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON TABLE public.cs_companies IS 'Entidad maestra de empresas — I01 Data Layer';


--
-- Name: COLUMN cs_companies.tenant_id; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.cs_companies.tenant_id IS 'Tenant al que pertenece (default xending). RFC es único por tenant';


--
-- Name: COLUMN cs_companies.status; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.cs_companies.status IS 'active = operando, inactive = suspendido, blacklisted = bloqueado por PLD';


--
-- Name: cs_companies_owners; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.cs_companies_owners (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    company_id uuid NOT NULL,
    user_id uuid NOT NULL,
    created_at timestamp with time zone DEFAULT now()
);


--
-- Name: cs_company_contacts; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.cs_company_contacts (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    company_id uuid NOT NULL,
    contact_type text NOT NULL,
    contact_value text NOT NULL,
    contact_name text,
    is_primary boolean DEFAULT false,
    created_at timestamp with time zone DEFAULT now(),
    CONSTRAINT cs_company_contacts_contact_type_check CHECK ((contact_type = ANY (ARRAY['email'::text, 'phone'::text, 'legal_rep'::text, 'admin'::text, 'billing'::text])))
);


--
-- Name: TABLE cs_company_contacts; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON TABLE public.cs_company_contacts IS 'Contactos de empresa (email, teléfono, representante legal, etc.)';


--
-- Name: cs_companies_summary; Type: VIEW; Schema: public; Owner: -
--

CREATE VIEW public.cs_companies_summary WITH (security_invoker='true') AS
 SELECT c.id,
    c.tenant_id,
    c.rfc,
    c.legal_name,
    c.trade_name,
    c.business_activity,
    c.status,
    c.created_at,
    c.updated_at,
    ( SELECT cc.contact_value
           FROM public.cs_company_contacts cc
          WHERE ((cc.company_id = c.id) AND (cc.contact_type = 'email'::text) AND (cc.is_primary = true))
         LIMIT 1) AS primary_email,
    ( SELECT cc.contact_value
           FROM public.cs_company_contacts cc
          WHERE ((cc.company_id = c.id) AND (cc.contact_type = 'phone'::text) AND (cc.is_primary = true))
         LIMIT 1) AS primary_phone,
    ( SELECT count(*) AS count
           FROM public.cs_company_contacts cc
          WHERE (cc.company_id = c.id)) AS contact_count
   FROM public.cs_companies c;


--
-- Name: cs_company_payment_accounts; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.cs_company_payment_accounts (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    company_id uuid NOT NULL,
    clabe text NOT NULL,
    bank_name text,
    is_primary boolean DEFAULT false,
    deleted boolean DEFAULT false,
    created_at timestamp with time zone DEFAULT now(),
    currency text DEFAULT 'USD'::text NOT NULL,
    CONSTRAINT cs_company_payment_accounts_clabe_check CHECK ((length(replace(clabe, '-'::text, ''::text)) = 18)),
    CONSTRAINT cs_company_payment_accounts_currency_check CHECK ((currency = ANY (ARRAY['USD'::text, 'MXP'::text])))
);


--
-- Name: cs_compliance_checks; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.cs_compliance_checks (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    application_id uuid NOT NULL,
    check_type text NOT NULL,
    result text NOT NULL,
    details jsonb,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    CONSTRAINT cs_compliance_checks_check_type_check CHECK ((check_type = ANY (ARRAY['listas_negras'::text, 'syger'::text, 'rug'::text, 'peps'::text, 'ofac'::text, '69b'::text]))),
    CONSTRAINT cs_compliance_checks_result_check CHECK ((result = ANY (ARRAY['pass'::text, 'fail'::text, 'review_required'::text])))
);


--
-- Name: cs_compliance_results; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.cs_compliance_results (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    application_id uuid NOT NULL,
    overall_status text NOT NULL,
    risk_flags jsonb DEFAULT '[]'::jsonb NOT NULL,
    blocking_reason text,
    scory_response jsonb,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    CONSTRAINT cs_compliance_results_overall_status_check CHECK ((overall_status = ANY (ARRAY['pass'::text, 'fail'::text, 'hard_stop'::text, 'review_required'::text])))
);


--
-- Name: cs_covenant_monitoring; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.cs_covenant_monitoring (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    covenant_id uuid NOT NULL,
    application_id uuid NOT NULL,
    check_date timestamp with time zone DEFAULT now() NOT NULL,
    actual_value numeric,
    threshold_value numeric NOT NULL,
    compliant boolean NOT NULL,
    breach_severity text,
    notes text,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    CONSTRAINT cs_covenant_monitoring_breach_severity_check CHECK ((breach_severity = ANY (ARRAY['minor'::text, 'material'::text, 'critical'::text])))
);


--
-- Name: cs_covenants; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.cs_covenants (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    application_id uuid NOT NULL,
    covenant_type text NOT NULL,
    covenant_name text NOT NULL,
    metric_name text NOT NULL,
    threshold_value numeric NOT NULL,
    threshold_operator text NOT NULL,
    frequency text DEFAULT 'quarterly'::text NOT NULL,
    grace_period_days integer DEFAULT 30,
    severity text DEFAULT 'warning'::text NOT NULL,
    active boolean DEFAULT true,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    CONSTRAINT cs_covenants_covenant_type_check CHECK ((covenant_type = ANY (ARRAY['financial_ratio'::text, 'revenue_minimum'::text, 'dscr_minimum'::text, 'leverage_maximum'::text, 'reporting'::text, 'insurance'::text, 'guarantee_maintenance'::text]))),
    CONSTRAINT cs_covenants_frequency_check CHECK ((frequency = ANY (ARRAY['monthly'::text, 'quarterly'::text, 'semi_annual'::text, 'annual'::text]))),
    CONSTRAINT cs_covenants_severity_check CHECK ((severity = ANY (ARRAY['info'::text, 'warning'::text, 'critical'::text, 'hard_stop'::text]))),
    CONSTRAINT cs_covenants_threshold_operator_check CHECK ((threshold_operator = ANY (ARRAY['>='::text, '<='::text, '>'::text, '<'::text, '='::text])))
);


--
-- Name: cs_credit_limits; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.cs_credit_limits (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    application_id uuid NOT NULL,
    limit_by_flow numeric,
    limit_by_sales numeric,
    limit_by_ebitda numeric,
    limit_by_guarantee numeric,
    limit_by_portfolio numeric,
    final_limit numeric,
    binding_constraint text,
    explanation text,
    created_at timestamp with time zone DEFAULT now() NOT NULL
);


--
-- Name: cs_cross_analysis; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.cs_cross_analysis (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    application_id uuid NOT NULL,
    cross_number integer NOT NULL,
    cross_name text NOT NULL,
    engines_involved text[] NOT NULL,
    pattern_detected boolean DEFAULT false NOT NULL,
    severity text DEFAULT 'info'::text NOT NULL,
    interpretation text,
    recommended_action text,
    details jsonb,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    CONSTRAINT cs_cross_analysis_cross_number_check CHECK (((cross_number >= 1) AND (cross_number <= 20))),
    CONSTRAINT cs_cross_analysis_severity_check CHECK ((severity = ANY (ARRAY['info'::text, 'warning'::text, 'critical'::text, 'hard_stop'::text])))
);


--
-- Name: cs_decision_gates; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.cs_decision_gates (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    application_id uuid NOT NULL,
    gate_number integer NOT NULL,
    result text NOT NULL,
    details jsonb DEFAULT '{}'::jsonb NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL
);


--
-- Name: cs_document_validations; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.cs_document_validations (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    document_id uuid NOT NULL,
    validation_type text NOT NULL,
    result text NOT NULL,
    details jsonb,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    CONSTRAINT cs_document_validations_result_check CHECK ((result = ANY (ARRAY['pass'::text, 'fail'::text, 'warning'::text])))
);


--
-- Name: cs_documentation_results; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.cs_documentation_results (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    application_id uuid NOT NULL,
    module_status text NOT NULL,
    module_score numeric NOT NULL,
    module_grade text NOT NULL,
    completeness_percent numeric DEFAULT 0 NOT NULL,
    risk_flags jsonb DEFAULT '[]'::jsonb NOT NULL,
    key_metrics jsonb DEFAULT '{}'::jsonb NOT NULL,
    explanation text,
    recommended_actions jsonb DEFAULT '[]'::jsonb NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL
);


--
-- Name: cs_documents; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.cs_documents (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    application_id uuid NOT NULL,
    document_type text NOT NULL,
    file_name text,
    file_url text,
    status text DEFAULT 'pending'::text NOT NULL,
    is_required boolean DEFAULT true NOT NULL,
    is_blocking boolean DEFAULT false NOT NULL,
    expires_at timestamp with time zone,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    CONSTRAINT cs_documents_status_check CHECK ((status = ANY (ARRAY['pending'::text, 'uploaded'::text, 'validated'::text, 'rejected'::text, 'expired'::text])))
);


--
-- Name: cs_employee_headcount; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.cs_employee_headcount (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    application_id uuid NOT NULL,
    period text NOT NULL,
    employee_count integer NOT NULL,
    source text,
    raw_data jsonb DEFAULT '{}'::jsonb NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL
);


--
-- Name: cs_employee_payroll; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.cs_employee_payroll (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    application_id uuid NOT NULL,
    period text NOT NULL,
    payroll_total numeric,
    nomina_ingresos_ratio numeric,
    payroll_trend numeric,
    raw_data jsonb DEFAULT '{}'::jsonb NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL
);


--
-- Name: cs_employee_productivity; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.cs_employee_productivity (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    application_id uuid NOT NULL,
    period text NOT NULL,
    revenue_per_employee numeric,
    metric_name text,
    metric_value numeric,
    raw_data jsonb DEFAULT '{}'::jsonb NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL
);


--
-- Name: cs_employee_results; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.cs_employee_results (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    application_id uuid NOT NULL,
    module_status text NOT NULL,
    module_score numeric NOT NULL,
    module_grade text NOT NULL,
    risk_flags jsonb DEFAULT '[]'::jsonb NOT NULL,
    key_metrics jsonb DEFAULT '{}'::jsonb NOT NULL,
    benchmark_comparison jsonb DEFAULT '{}'::jsonb NOT NULL,
    explanation text,
    recommended_actions jsonb DEFAULT '[]'::jsonb NOT NULL,
    trend_factor numeric DEFAULT 1.0 NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL
);


--
-- Name: cs_expediente_events; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.cs_expediente_events (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    expediente_id uuid NOT NULL,
    event_type text NOT NULL,
    stage text NOT NULL,
    description text NOT NULL,
    data jsonb,
    actor text DEFAULT 'system'::text NOT NULL,
    created_at timestamp with time zone DEFAULT now()
);


--
-- Name: TABLE cs_expediente_events; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON TABLE public.cs_expediente_events IS 'Log inmutable de eventos del expediente (auditoría)';


--
-- Name: cs_expediente_folio_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.cs_expediente_folio_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: cs_expediente_tokens; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.cs_expediente_tokens (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    expediente_id uuid NOT NULL,
    token uuid DEFAULT gen_random_uuid() NOT NULL,
    purpose text NOT NULL,
    expires_at timestamp with time zone NOT NULL,
    is_used boolean DEFAULT false,
    access_count integer DEFAULT 0,
    last_accessed_at timestamp with time zone,
    created_at timestamp with time zone DEFAULT now(),
    CONSTRAINT cs_expediente_tokens_purpose_check CHECK ((purpose = ANY (ARRAY['buro_signature'::text, 'ciec_linkage'::text, 'document_upload'::text, 'general_access'::text])))
);


--
-- Name: TABLE cs_expediente_tokens; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON TABLE public.cs_expediente_tokens IS 'Tokens de acceso por link para solicitantes (sesiones sin login)';


--
-- Name: COLUMN cs_expediente_tokens.token; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.cs_expediente_tokens.token IS 'UUID único que va en la URL del link enviado al solicitante';


--
-- Name: cs_expedientes; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.cs_expedientes (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    folio text NOT NULL,
    rfc text NOT NULL,
    company_name text NOT NULL,
    requested_amount numeric(15,2) NOT NULL,
    currency text DEFAULT 'USD'::text NOT NULL,
    credit_purpose text NOT NULL,
    declared_annual_revenue numeric(15,2) NOT NULL,
    declared_business_age numeric(4,1) NOT NULL,
    term_days integer NOT NULL,
    stage text DEFAULT 'pre_filter'::text NOT NULL,
    rejection_reason text,
    rejected_at_stage text,
    contact_email text NOT NULL,
    contact_phone text,
    legal_representative text,
    syntage_entity_id text,
    application_id uuid,
    pre_filter_score numeric(5,2),
    buro_score numeric(5,1),
    pld_score numeric(5,2),
    metadata jsonb DEFAULT '{}'::jsonb,
    created_at timestamp with time zone DEFAULT now(),
    updated_at timestamp with time zone DEFAULT now(),
    CONSTRAINT cs_expedientes_credit_purpose_check CHECK ((credit_purpose = ANY (ARRAY['importacion'::text, 'factoraje'::text, 'operaciones_fx'::text, 'exportacion'::text]))),
    CONSTRAINT cs_expedientes_currency_check CHECK ((currency = ANY (ARRAY['MXN'::text, 'USD'::text]))),
    CONSTRAINT cs_expedientes_stage_check CHECK ((stage = ANY (ARRAY['pre_filter'::text, 'pld_check'::text, 'buro_authorization'::text, 'sat_linkage'::text, 'analysis'::text, 'documentation'::text, 'decision'::text, 'approved'::text, 'rejected'::text, 'expired'::text]))),
    CONSTRAINT cs_expedientes_term_days_check CHECK (((term_days >= 2) AND (term_days <= 90)))
);


--
-- Name: TABLE cs_expedientes; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON TABLE public.cs_expedientes IS 'Expedientes digitales de crédito - ciclo completo de solicitud';


--
-- Name: COLUMN cs_expedientes.folio; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.cs_expedientes.folio IS 'Folio legible auto-generado: XND-YYYY-NNNNN';


--
-- Name: cs_expedientes_dashboard; Type: VIEW; Schema: public; Owner: -
--

CREATE VIEW public.cs_expedientes_dashboard WITH (security_invoker='true') AS
 SELECT e.id,
    e.folio,
    e.rfc,
    e.company_name,
    e.requested_amount,
    e.currency,
    e.credit_purpose,
    e.stage,
    e.pre_filter_score,
    e.buro_score,
    e.pld_score,
    e.contact_email,
    e.created_at,
    e.updated_at,
    ( SELECT ev.description
           FROM public.cs_expediente_events ev
          WHERE (ev.expediente_id = e.id)
          ORDER BY ev.created_at DESC
         LIMIT 1) AS last_event,
    ( SELECT count(*) AS count
           FROM public.cs_expediente_tokens t
          WHERE ((t.expediente_id = e.id) AND (t.expires_at > now()) AND (NOT t.is_used))) AS active_tokens
   FROM public.cs_expedientes e;


--
-- Name: cs_financial_balance_detail; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.cs_financial_balance_detail (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    application_id uuid NOT NULL,
    fiscal_year integer NOT NULL,
    balance_data jsonb NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL
);


--
-- Name: cs_financial_balanza; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.cs_financial_balanza (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    application_id uuid NOT NULL,
    period text NOT NULL,
    balanza_data jsonb NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL
);


--
-- Name: cs_financial_calculations; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.cs_financial_calculations (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    application_id uuid NOT NULL,
    metric_name text NOT NULL,
    metric_value numeric,
    formula text,
    period text,
    created_at timestamp with time zone DEFAULT now() NOT NULL
);


--
-- Name: cs_financial_income_detail; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.cs_financial_income_detail (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    application_id uuid NOT NULL,
    fiscal_year integer NOT NULL,
    income_data jsonb NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL
);


--
-- Name: cs_financial_inputs; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.cs_financial_inputs (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    application_id uuid NOT NULL,
    source text NOT NULL,
    fiscal_year integer,
    raw_data jsonb NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    CONSTRAINT cs_financial_inputs_source_check CHECK ((source = ANY (ARRAY['syntage'::text, 'manual'::text, 'both'::text])))
);


--
-- Name: cs_financial_related_parties; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.cs_financial_related_parties (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    application_id uuid NOT NULL,
    rp_data jsonb NOT NULL,
    total_exposure_percent numeric,
    created_at timestamp with time zone DEFAULT now() NOT NULL
);


--
-- Name: cs_financial_results; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.cs_financial_results (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    application_id uuid NOT NULL,
    module_status text NOT NULL,
    module_score numeric NOT NULL,
    module_grade text NOT NULL,
    risk_flags jsonb DEFAULT '[]'::jsonb NOT NULL,
    key_metrics jsonb DEFAULT '{}'::jsonb NOT NULL,
    benchmark_comparison jsonb DEFAULT '{}'::jsonb NOT NULL,
    explanation text,
    recommended_actions jsonb DEFAULT '[]'::jsonb NOT NULL,
    trend_factor numeric DEFAULT 1.0 NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL
);


--
-- Name: cs_fx_exposure; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.cs_fx_exposure (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    application_id uuid NOT NULL,
    currency_mismatch_ratio numeric,
    pct_ingresos_misma_moneda numeric,
    natural_hedge_ratio numeric,
    uncovered_fx_exposure numeric,
    raw_data jsonb DEFAULT '{}'::jsonb NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL
);


--
-- Name: cs_fx_inputs; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.cs_fx_inputs (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    application_id uuid NOT NULL,
    moneda_credito text NOT NULL,
    moneda_ingresos text,
    moneda_costos text,
    moneda_facturacion text,
    moneda_cuentas_cobrar text,
    moneda_deuda text,
    raw_data jsonb DEFAULT '{}'::jsonb NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    CONSTRAINT cs_fx_inputs_moneda_credito_check CHECK ((moneda_credito = ANY (ARRAY['MXN'::text, 'USD'::text])))
);


--
-- Name: cs_fx_results; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.cs_fx_results (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    application_id uuid NOT NULL,
    module_status text NOT NULL,
    module_score numeric NOT NULL,
    module_grade text NOT NULL,
    risk_flags jsonb DEFAULT '[]'::jsonb NOT NULL,
    key_metrics jsonb DEFAULT '{}'::jsonb NOT NULL,
    benchmark_comparison jsonb DEFAULT '{}'::jsonb NOT NULL,
    explanation text,
    recommended_actions jsonb DEFAULT '[]'::jsonb NOT NULL,
    trend_factor numeric DEFAULT 1.0 NOT NULL,
    fx_vulnerability text,
    recommended_currency text,
    hedge_obligation text,
    created_at timestamp with time zone DEFAULT now() NOT NULL
);


--
-- Name: cs_fx_scenarios; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.cs_fx_scenarios (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    application_id uuid NOT NULL,
    scenario_type text NOT NULL,
    ebitda_sensitivity numeric,
    dscr_stressed numeric,
    ltv_stressed numeric,
    scenario_data jsonb DEFAULT '{}'::jsonb NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    CONSTRAINT cs_fx_scenarios_scenario_type_check CHECK ((scenario_type = ANY (ARRAY['base'::text, 'stress_mxn_10'::text, 'stress_mxn_20'::text, 'stress_mxn_30'::text])))
);


--
-- Name: cs_guarantee_documents; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.cs_guarantee_documents (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    application_id uuid NOT NULL,
    guarantee_id uuid,
    document_type text NOT NULL,
    document_status text,
    raw_data jsonb DEFAULT '{}'::jsonb NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL
);


--
-- Name: cs_guarantee_guarantees; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.cs_guarantee_guarantees (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    application_id uuid NOT NULL,
    tipo text NOT NULL,
    valor_comercial numeric,
    valor_forzoso numeric,
    liquidez numeric,
    moneda text,
    jurisdiccion text,
    raw_data jsonb DEFAULT '{}'::jsonb NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    CONSTRAINT cs_guarantee_guarantees_moneda_check CHECK ((moneda = ANY (ARRAY['MXN'::text, 'USD'::text]))),
    CONSTRAINT cs_guarantee_guarantees_tipo_check CHECK ((tipo = ANY (ARRAY['inmueble'::text, 'vehiculo'::text, 'cuentas_por_cobrar'::text, 'inventario'::text, 'cash_collateral'::text, 'aval_personal'::text, 'aval_corporativo'::text, 'garantia_prendaria'::text, 'cesion_derechos'::text, 'fideicomiso'::text])))
);


--
-- Name: cs_guarantee_haircuts; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.cs_guarantee_haircuts (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    application_id uuid NOT NULL,
    guarantee_id uuid,
    guarantee_type text NOT NULL,
    haircut_min numeric,
    haircut_max numeric,
    haircut_applied numeric,
    raw_data jsonb DEFAULT '{}'::jsonb NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL
);


--
-- Name: cs_guarantee_results; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.cs_guarantee_results (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    application_id uuid NOT NULL,
    module_status text NOT NULL,
    module_score numeric NOT NULL,
    module_grade text NOT NULL,
    risk_flags jsonb DEFAULT '[]'::jsonb NOT NULL,
    key_metrics jsonb DEFAULT '{}'::jsonb NOT NULL,
    benchmark_comparison jsonb DEFAULT '{}'::jsonb NOT NULL,
    explanation text,
    recommended_actions jsonb DEFAULT '[]'::jsonb NOT NULL,
    trend_factor numeric DEFAULT 1.0 NOT NULL,
    valor_elegible_neto numeric,
    cobertura_neta numeric,
    faltante_garantia numeric,
    cumple_2_1 boolean,
    created_at timestamp with time zone DEFAULT now() NOT NULL
);


--
-- Name: cs_guarantee_valuations; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.cs_guarantee_valuations (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    application_id uuid NOT NULL,
    guarantee_id uuid,
    valuation_date timestamp with time zone,
    valuation_amount numeric,
    appraiser text,
    raw_data jsonb DEFAULT '{}'::jsonb NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL
);


--
-- Name: cs_limit_calculations; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.cs_limit_calculations (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    application_id uuid NOT NULL,
    limit_type text NOT NULL,
    input_values jsonb DEFAULT '{}'::jsonb NOT NULL,
    calculation_steps jsonb DEFAULT '[]'::jsonb NOT NULL,
    result_value numeric,
    created_at timestamp with time zone DEFAULT now() NOT NULL
);


--
-- Name: cs_metric_catalog; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.cs_metric_catalog (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    metric_name text NOT NULL,
    label text NOT NULL,
    description text,
    source text NOT NULL,
    formula text,
    unit text NOT NULL,
    engine_name text NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL
);


--
-- Name: cs_metric_values; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.cs_metric_values (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    application_id uuid NOT NULL,
    metric_name text NOT NULL,
    value numeric,
    benchmark numeric,
    deviation_percent numeric,
    interpretation text,
    impact_on_score text,
    flag text,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    CONSTRAINT cs_metric_values_impact_on_score_check CHECK ((impact_on_score = ANY (ARRAY['positive'::text, 'neutral'::text, 'negative'::text])))
);


--
-- Name: cs_network_clients_detail; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.cs_network_clients_detail (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    application_id uuid NOT NULL,
    client_data jsonb NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL
);


--
-- Name: cs_network_concentration; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.cs_network_concentration (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    application_id uuid NOT NULL,
    concentration_type text NOT NULL,
    hhi numeric,
    top1_percent numeric,
    top3_percent numeric,
    analysis_data jsonb DEFAULT '{}'::jsonb NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL
);


--
-- Name: cs_network_counterparties; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.cs_network_counterparties (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    application_id uuid NOT NULL,
    counterparty_type text NOT NULL,
    rfc text,
    name text,
    revenue_share numeric,
    raw_data jsonb DEFAULT '{}'::jsonb NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    CONSTRAINT cs_network_counterparties_counterparty_type_check CHECK ((counterparty_type = ANY (ARRAY['client'::text, 'supplier'::text])))
);


--
-- Name: cs_network_financial_institutions; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.cs_network_financial_institutions (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    application_id uuid NOT NULL,
    fi_data jsonb NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL
);


--
-- Name: cs_network_government; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.cs_network_government (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    application_id uuid NOT NULL,
    gov_data jsonb NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL
);


--
-- Name: cs_network_metrics; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.cs_network_metrics (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    application_id uuid NOT NULL,
    metric_name text NOT NULL,
    metric_value numeric,
    unit text,
    period text,
    created_at timestamp with time zone DEFAULT now() NOT NULL
);


--
-- Name: cs_network_products; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.cs_network_products (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    application_id uuid NOT NULL,
    product_data jsonb NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL
);


--
-- Name: cs_network_results; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.cs_network_results (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    application_id uuid NOT NULL,
    module_status text NOT NULL,
    module_score numeric NOT NULL,
    module_grade text NOT NULL,
    risk_flags jsonb DEFAULT '[]'::jsonb NOT NULL,
    key_metrics jsonb DEFAULT '{}'::jsonb NOT NULL,
    benchmark_comparison jsonb DEFAULT '{}'::jsonb NOT NULL,
    explanation text,
    recommended_actions jsonb DEFAULT '[]'::jsonb NOT NULL,
    trend_factor numeric DEFAULT 1.0 NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL
);


--
-- Name: cs_network_suppliers_detail; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.cs_network_suppliers_detail (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    application_id uuid NOT NULL,
    supplier_data jsonb NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL
);


--
-- Name: cs_policies; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.cs_policies (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    policy_name text NOT NULL,
    config jsonb DEFAULT '{}'::jsonb NOT NULL,
    effective_date timestamp with time zone DEFAULT now() NOT NULL,
    version text DEFAULT '1.0'::text NOT NULL,
    active boolean DEFAULT true NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL
);


--
-- Name: cs_policy_audit; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.cs_policy_audit (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    policy_id uuid NOT NULL,
    action text NOT NULL,
    details jsonb DEFAULT '{}'::jsonb NOT NULL,
    user_id uuid,
    created_at timestamp with time zone DEFAULT now() NOT NULL
);


--
-- Name: cs_policy_versions; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.cs_policy_versions (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    policy_id uuid NOT NULL,
    old_config jsonb DEFAULT '{}'::jsonb NOT NULL,
    new_config jsonb DEFAULT '{}'::jsonb NOT NULL,
    changed_by uuid,
    created_at timestamp with time zone DEFAULT now() NOT NULL
);


--
-- Name: cs_portfolio_exposure; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.cs_portfolio_exposure (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    application_id uuid NOT NULL,
    exposure_by_sector jsonb DEFAULT '{}'::jsonb NOT NULL,
    exposure_by_currency jsonb DEFAULT '{}'::jsonb NOT NULL,
    exposure_by_group jsonb DEFAULT '{}'::jsonb NOT NULL,
    correlation numeric,
    concentration_post_origination numeric,
    expected_loss_incremental numeric,
    worst_case_loss_incremental numeric,
    created_at timestamp with time zone DEFAULT now() NOT NULL
);


--
-- Name: cs_portfolio_limits; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.cs_portfolio_limits (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    application_id uuid NOT NULL,
    limit_type text NOT NULL,
    limit_name text NOT NULL,
    max_concentration numeric NOT NULL,
    current_concentration numeric,
    post_origination_concentration numeric,
    breach boolean DEFAULT false NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    CONSTRAINT cs_portfolio_limits_limit_type_check CHECK ((limit_type = ANY (ARRAY['sector'::text, 'currency'::text, 'client_group'::text, 'geography'::text])))
);


--
-- Name: cs_portfolio_positions; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.cs_portfolio_positions (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    application_id uuid NOT NULL,
    position_type text NOT NULL,
    position_name text NOT NULL,
    current_exposure numeric DEFAULT 0 NOT NULL,
    exposure_percent numeric,
    counterparty_count integer,
    raw_data jsonb DEFAULT '{}'::jsonb NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    CONSTRAINT cs_portfolio_positions_position_type_check CHECK ((position_type = ANY (ARRAY['sector'::text, 'currency'::text, 'client_group'::text, 'geography'::text])))
);


--
-- Name: cs_portfolio_results; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.cs_portfolio_results (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    application_id uuid NOT NULL,
    module_status text NOT NULL,
    module_score numeric NOT NULL,
    module_grade text NOT NULL,
    risk_flags jsonb DEFAULT '[]'::jsonb NOT NULL,
    key_metrics jsonb DEFAULT '{}'::jsonb NOT NULL,
    benchmark_comparison jsonb DEFAULT '{}'::jsonb NOT NULL,
    explanation text,
    recommended_actions jsonb DEFAULT '[]'::jsonb NOT NULL,
    trend_factor numeric DEFAULT 1.0 NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL
);


--
-- Name: cs_review_schedule; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.cs_review_schedule (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    application_id uuid NOT NULL,
    frequency text NOT NULL,
    next_review timestamp with time zone,
    triggers jsonb DEFAULT '[]'::jsonb NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL
);


--
-- Name: cs_review_triggers; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.cs_review_triggers (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    application_id uuid NOT NULL,
    trigger_type text NOT NULL,
    trigger_condition jsonb DEFAULT '{}'::jsonb NOT NULL,
    is_active boolean DEFAULT true NOT NULL,
    last_triggered_at timestamp with time zone,
    created_at timestamp with time zone DEFAULT now() NOT NULL
);


--
-- Name: cs_risk_matrix_results; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.cs_risk_matrix_results (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    application_id uuid NOT NULL,
    gate1_result text,
    gate1_flags jsonb DEFAULT '[]'::jsonb NOT NULL,
    gate2_result text,
    gate2_semaphores jsonb DEFAULT '[]'::jsonb NOT NULL,
    gate3_score numeric,
    gate3_breakdown jsonb DEFAULT '{}'::jsonb NOT NULL,
    final_decision text,
    created_at timestamp with time zone DEFAULT now() NOT NULL
);


--
-- Name: cs_sat_blacklisted_invoices; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.cs_sat_blacklisted_invoices (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    application_id uuid NOT NULL,
    counterparty_rfc text NOT NULL,
    direction text NOT NULL,
    total_amount numeric,
    invoice_count integer,
    list_type text,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    CONSTRAINT cs_sat_blacklisted_invoices_direction_check CHECK ((direction = ANY (ARRAY['emitidas'::text, 'recibidas'::text])))
);


--
-- Name: cs_sat_data; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.cs_sat_data (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    application_id uuid NOT NULL,
    data_type text NOT NULL,
    raw_data jsonb NOT NULL,
    period text,
    created_at timestamp with time zone DEFAULT now() NOT NULL
);


--
-- Name: cs_sat_facturado_vs_declarado; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.cs_sat_facturado_vs_declarado (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    application_id uuid NOT NULL,
    fiscal_year integer NOT NULL,
    total_facturado numeric,
    total_declarado numeric,
    discrepancy_amount numeric,
    discrepancy_percent numeric,
    flagged boolean DEFAULT false NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL
);


--
-- Name: cs_sat_metrics; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.cs_sat_metrics (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    application_id uuid NOT NULL,
    metric_name text NOT NULL,
    metric_value numeric,
    unit text,
    period text,
    created_at timestamp with time zone DEFAULT now() NOT NULL
);


--
-- Name: cs_sat_payment_behavior; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.cs_sat_payment_behavior (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    application_id uuid NOT NULL,
    period text NOT NULL,
    direction text NOT NULL,
    total_pue numeric,
    total_ppd numeric,
    ppd_collected numeric,
    ppd_collection_ratio numeric,
    dso_days numeric,
    dpo_days numeric,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    CONSTRAINT cs_sat_payment_behavior_direction_check CHECK ((direction = ANY (ARRAY['emitidas'::text, 'recibidas'::text])))
);


--
-- Name: cs_sat_product_diversification; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.cs_sat_product_diversification (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    application_id uuid NOT NULL,
    product_service_key text NOT NULL,
    description text,
    total_amount numeric,
    weight_percent numeric,
    created_at timestamp with time zone DEFAULT now() NOT NULL
);


--
-- Name: cs_sat_results; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.cs_sat_results (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    application_id uuid NOT NULL,
    module_status text NOT NULL,
    module_score numeric NOT NULL,
    module_grade text NOT NULL,
    risk_flags jsonb DEFAULT '[]'::jsonb NOT NULL,
    key_metrics jsonb DEFAULT '{}'::jsonb NOT NULL,
    benchmark_comparison jsonb DEFAULT '{}'::jsonb NOT NULL,
    explanation text,
    recommended_actions jsonb DEFAULT '[]'::jsonb NOT NULL,
    trend_factor numeric DEFAULT 1.0 NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    CONSTRAINT cs_sat_results_module_grade_check CHECK ((module_grade = ANY (ARRAY['A'::text, 'B'::text, 'C'::text, 'D'::text, 'F'::text]))),
    CONSTRAINT cs_sat_results_module_status_check CHECK ((module_status = ANY (ARRAY['pass'::text, 'fail'::text, 'warning'::text, 'blocked'::text])))
);


--
-- Name: cs_sat_revenue_quality; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.cs_sat_revenue_quality (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    application_id uuid NOT NULL,
    period text NOT NULL,
    gross_revenue numeric,
    cancellations numeric,
    credit_notes numeric,
    discounts numeric,
    net_revenue numeric,
    cancellation_ratio numeric,
    credit_note_ratio numeric,
    created_at timestamp with time zone DEFAULT now() NOT NULL
);


--
-- Name: cs_scenario_results; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.cs_scenario_results (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    application_id uuid NOT NULL,
    total_scenarios_run integer,
    scenarios_passed integer,
    scenarios_failed integer,
    worst_case_scenario text,
    breaking_points jsonb,
    resilience_score numeric,
    module_status text NOT NULL,
    module_score numeric NOT NULL,
    module_grade text NOT NULL,
    risk_flags jsonb DEFAULT '[]'::jsonb NOT NULL,
    explanation text,
    recommended_actions jsonb DEFAULT '[]'::jsonb NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL
);


--
-- Name: cs_scenarios; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.cs_scenarios (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    application_id uuid NOT NULL,
    scenario_type text NOT NULL,
    scenario_name text NOT NULL,
    parameters jsonb NOT NULL,
    base_values jsonb,
    stressed_values jsonb,
    impact_summary jsonb,
    breaking_point boolean DEFAULT false NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    CONSTRAINT cs_scenarios_scenario_type_check CHECK ((scenario_type = ANY (ARRAY['revenue_decline'::text, 'margin_compression'::text, 'dso_increase'::text, 'fx_shock'::text, 'combined'::text])))
);


--
-- Name: cs_scoring_versions; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.cs_scoring_versions (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    version text NOT NULL,
    model_config jsonb NOT NULL,
    active boolean DEFAULT false NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL
);


--
-- Name: cs_stability_metrics; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.cs_stability_metrics (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    application_id uuid NOT NULL,
    metric_name text NOT NULL,
    metric_value numeric,
    unit text,
    period text,
    created_at timestamp with time zone DEFAULT now() NOT NULL
);


--
-- Name: cs_stability_results; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.cs_stability_results (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    application_id uuid NOT NULL,
    module_status text NOT NULL,
    module_score numeric NOT NULL,
    module_grade text NOT NULL,
    pattern_classification text,
    risk_flags jsonb DEFAULT '[]'::jsonb NOT NULL,
    key_metrics jsonb DEFAULT '{}'::jsonb NOT NULL,
    benchmark_comparison jsonb DEFAULT '{}'::jsonb NOT NULL,
    explanation text,
    recommended_actions jsonb DEFAULT '[]'::jsonb NOT NULL,
    trend_factor numeric DEFAULT 1.0 NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    CONSTRAINT cs_stability_results_pattern_classification_check CHECK ((pattern_classification = ANY (ARRAY['estable'::text, 'ciclico'::text, 'erratico'::text, 'deteriorando'::text])))
);


--
-- Name: cs_stability_timeseries; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.cs_stability_timeseries (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    application_id uuid NOT NULL,
    metric_name text NOT NULL,
    period text NOT NULL,
    value numeric NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL
);


--
-- Name: cs_trend_ai_narrative; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.cs_trend_ai_narrative (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    application_id uuid NOT NULL,
    executive_summary text,
    top_positive jsonb DEFAULT '[]'::jsonb NOT NULL,
    top_negative jsonb DEFAULT '[]'::jsonb NOT NULL,
    threshold_projections jsonb DEFAULT '[]'::jsonb NOT NULL,
    recommendation text,
    created_at timestamp with time zone DEFAULT now() NOT NULL
);


--
-- Name: cs_trend_charts_config; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.cs_trend_charts_config (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    engine_name text NOT NULL,
    metric_name text NOT NULL,
    chart_type text DEFAULT 'line'::text NOT NULL,
    thresholds jsonb,
    higher_is_better boolean DEFAULT true NOT NULL,
    y_axis_format text DEFAULT '$'::text NOT NULL,
    brand_colors jsonb,
    created_at timestamp with time zone DEFAULT now() NOT NULL
);


--
-- Name: cs_trend_results; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.cs_trend_results (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    application_id uuid NOT NULL,
    engine_name text NOT NULL,
    metric_name text NOT NULL,
    direction text NOT NULL,
    speed text NOT NULL,
    classification text NOT NULL,
    change_percent numeric,
    slope numeric,
    r_squared numeric,
    projection jsonb,
    months_to_threshold integer,
    threshold_value numeric,
    risk_flags jsonb DEFAULT '[]'::jsonb NOT NULL,
    chart_config jsonb,
    created_at timestamp with time zone DEFAULT now() NOT NULL
);


--
-- Name: cs_trend_timeseries; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.cs_trend_timeseries (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    application_id uuid NOT NULL,
    engine_name text NOT NULL,
    metric_name text NOT NULL,
    period text NOT NULL,
    value numeric NOT NULL,
    benchmark numeric,
    created_at timestamp with time zone DEFAULT now() NOT NULL
);


--
-- Name: cs_workflow_decisions; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.cs_workflow_decisions (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    application_id uuid NOT NULL,
    decision text NOT NULL,
    decided_by uuid,
    conditions jsonb DEFAULT '{}'::jsonb NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL
);


--
-- Name: cs_workflow_overrides; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.cs_workflow_overrides (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    application_id uuid NOT NULL,
    override_reason text NOT NULL,
    approved_by uuid,
    created_at timestamp with time zone DEFAULT now() NOT NULL
);


--
-- Name: cs_workflow_queue; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.cs_workflow_queue (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    application_id uuid NOT NULL,
    assigned_to uuid,
    level text NOT NULL,
    sla_deadline timestamp with time zone,
    status text DEFAULT 'pending'::text NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL
);


--
-- Name: cs_working_capital_aging; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.cs_working_capital_aging (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    application_id uuid NOT NULL,
    aging_type text NOT NULL,
    period text NOT NULL,
    aging_data jsonb NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    CONSTRAINT cs_working_capital_aging_aging_type_check CHECK ((aging_type = ANY (ARRAY['cxc'::text, 'cxp'::text])))
);


--
-- Name: cs_working_capital_cycle; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.cs_working_capital_cycle (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    application_id uuid NOT NULL,
    period text NOT NULL,
    dso numeric,
    dio numeric,
    dpo numeric,
    ccc numeric,
    created_at timestamp with time zone DEFAULT now() NOT NULL
);


--
-- Name: cs_working_capital_inputs; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.cs_working_capital_inputs (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    application_id uuid NOT NULL,
    source text NOT NULL,
    raw_data jsonb NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    CONSTRAINT cs_working_capital_inputs_source_check CHECK ((source = ANY (ARRAY['sat'::text, 'financial_statements'::text, 'manual'::text, 'combined'::text])))
);


--
-- Name: cs_working_capital_results; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.cs_working_capital_results (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    application_id uuid NOT NULL,
    module_status text NOT NULL,
    module_score numeric NOT NULL,
    module_grade text NOT NULL,
    risk_flags jsonb DEFAULT '[]'::jsonb NOT NULL,
    key_metrics jsonb DEFAULT '{}'::jsonb NOT NULL,
    benchmark_comparison jsonb DEFAULT '{}'::jsonb NOT NULL,
    explanation text,
    recommended_actions jsonb DEFAULT '[]'::jsonb NOT NULL,
    trend_factor numeric DEFAULT 1.0 NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL
);


--
-- Name: fx_transaction_folio_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.fx_transaction_folio_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: fx_transactions; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.fx_transactions (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    folio text DEFAULT ((('XG-'::text || to_char(now(), 'YY'::text)) || '-'::text) || lpad((nextval('public.fx_transaction_folio_seq'::regclass))::text, 4, '0'::text)) NOT NULL,
    company_id uuid NOT NULL,
    quantity numeric(15,2) NOT NULL,
    base_rate numeric(10,4),
    markup_rate numeric(10,4) NOT NULL,
    buys_currency text DEFAULT 'USD'::text,
    pays_currency text DEFAULT 'MXN'::text,
    status text DEFAULT 'pending'::text NOT NULL,
    payment_account_id uuid,
    pi_account_id uuid,
    created_by uuid NOT NULL,
    authorized_by uuid,
    authorized_at timestamp with time zone,
    proof_url text,
    cancelled boolean DEFAULT false,
    cancelled_at timestamp with time zone,
    cancelled_by uuid,
    created_at timestamp with time zone DEFAULT now(),
    updated_at timestamp with time zone DEFAULT now(),
    CONSTRAINT fx_transactions_markup_rate_check CHECK ((markup_rate > (0)::numeric)),
    CONSTRAINT fx_transactions_quantity_check CHECK ((quantity > (0)::numeric)),
    CONSTRAINT fx_transactions_status_check CHECK ((status = ANY (ARRAY['pending'::text, 'authorized'::text, 'completed'::text])))
);


--
-- Name: local_users; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.local_users (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    email text NOT NULL,
    password text NOT NULL,
    full_name text NOT NULL,
    role text DEFAULT 'broker'::text NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL
);


--
-- Name: pi_accounts; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.pi_accounts (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    account_number text NOT NULL,
    account_name text NOT NULL,
    swift_code text,
    bank_name text NOT NULL,
    bank_address text NOT NULL,
    currency_types text[] DEFAULT '{}'::text[] NOT NULL,
    is_active boolean DEFAULT true NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    created_by uuid NOT NULL,
    disabled_at timestamp with time zone,
    disabled_by uuid,
    tenant_id text DEFAULT 'xending'::text NOT NULL,
    CONSTRAINT pi_accounts_swift_code_check CHECK (((swift_code IS NULL) OR ((length(swift_code) >= 8) AND (length(swift_code) <= 11))))
);


--
-- Name: cs_ai_analysis cs_ai_analysis_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.cs_ai_analysis
    ADD CONSTRAINT cs_ai_analysis_pkey PRIMARY KEY (id);


--
-- Name: cs_ai_recommendations cs_ai_recommendations_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.cs_ai_recommendations
    ADD CONSTRAINT cs_ai_recommendations_pkey PRIMARY KEY (id);


--
-- Name: cs_ai_scenarios cs_ai_scenarios_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.cs_ai_scenarios
    ADD CONSTRAINT cs_ai_scenarios_pkey PRIMARY KEY (id);


--
-- Name: cs_api_cache cs_api_cache_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.cs_api_cache
    ADD CONSTRAINT cs_api_cache_pkey PRIMARY KEY (id);


--
-- Name: cs_api_calls cs_api_calls_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.cs_api_calls
    ADD CONSTRAINT cs_api_calls_pkey PRIMARY KEY (id);


--
-- Name: cs_application_status_log cs_application_status_log_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.cs_application_status_log
    ADD CONSTRAINT cs_application_status_log_pkey PRIMARY KEY (id);


--
-- Name: cs_applications cs_applications_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.cs_applications
    ADD CONSTRAINT cs_applications_pkey PRIMARY KEY (id);


--
-- Name: cs_audit_log cs_audit_log_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.cs_audit_log
    ADD CONSTRAINT cs_audit_log_pkey PRIMARY KEY (id);


--
-- Name: cs_benchmark_comparisons cs_benchmark_comparisons_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.cs_benchmark_comparisons
    ADD CONSTRAINT cs_benchmark_comparisons_pkey PRIMARY KEY (id);


--
-- Name: cs_benchmark_cross_validation cs_benchmark_cross_validation_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.cs_benchmark_cross_validation
    ADD CONSTRAINT cs_benchmark_cross_validation_pkey PRIMARY KEY (id);


--
-- Name: cs_benchmark_syntage_ratios cs_benchmark_syntage_ratios_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.cs_benchmark_syntage_ratios
    ADD CONSTRAINT cs_benchmark_syntage_ratios_pkey PRIMARY KEY (id);


--
-- Name: cs_benchmarks cs_benchmarks_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.cs_benchmarks
    ADD CONSTRAINT cs_benchmarks_pkey PRIMARY KEY (id);


--
-- Name: cs_benchmarks cs_benchmarks_sector_size_category_region_metric_name_effec_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.cs_benchmarks
    ADD CONSTRAINT cs_benchmarks_sector_size_category_region_metric_name_effec_key UNIQUE (sector, size_category, region, metric_name, effective_date);


--
-- Name: cs_benchmarks cs_benchmarks_unique_metric; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.cs_benchmarks
    ADD CONSTRAINT cs_benchmarks_unique_metric UNIQUE (sector, size_category, region, metric_name, source, effective_date);


--
-- Name: cs_buro_active_credits cs_buro_active_credits_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.cs_buro_active_credits
    ADD CONSTRAINT cs_buro_active_credits_pkey PRIMARY KEY (id);


--
-- Name: cs_buro_analysis cs_buro_analysis_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.cs_buro_analysis
    ADD CONSTRAINT cs_buro_analysis_pkey PRIMARY KEY (id);


--
-- Name: cs_buro_consultations cs_buro_consultations_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.cs_buro_consultations
    ADD CONSTRAINT cs_buro_consultations_pkey PRIMARY KEY (id);


--
-- Name: cs_buro_data cs_buro_data_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.cs_buro_data
    ADD CONSTRAINT cs_buro_data_pkey PRIMARY KEY (id);


--
-- Name: cs_buro_debt_rotation cs_buro_debt_rotation_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.cs_buro_debt_rotation
    ADD CONSTRAINT cs_buro_debt_rotation_pkey PRIMARY KEY (id);


--
-- Name: cs_buro_hawk_checks cs_buro_hawk_checks_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.cs_buro_hawk_checks
    ADD CONSTRAINT cs_buro_hawk_checks_pkey PRIMARY KEY (id);


--
-- Name: cs_buro_liquidated cs_buro_liquidated_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.cs_buro_liquidated
    ADD CONSTRAINT cs_buro_liquidated_pkey PRIMARY KEY (id);


--
-- Name: cs_buro_results cs_buro_results_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.cs_buro_results
    ADD CONSTRAINT cs_buro_results_pkey PRIMARY KEY (id);


--
-- Name: cs_business_rules cs_business_rules_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.cs_business_rules
    ADD CONSTRAINT cs_business_rules_pkey PRIMARY KEY (id);


--
-- Name: cs_business_rules cs_business_rules_rule_key_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.cs_business_rules
    ADD CONSTRAINT cs_business_rules_rule_key_key UNIQUE (rule_key);


--
-- Name: cs_cashflow_calculations cs_cashflow_calculations_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.cs_cashflow_calculations
    ADD CONSTRAINT cs_cashflow_calculations_pkey PRIMARY KEY (id);


--
-- Name: cs_cashflow_inputs cs_cashflow_inputs_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.cs_cashflow_inputs
    ADD CONSTRAINT cs_cashflow_inputs_pkey PRIMARY KEY (id);


--
-- Name: cs_cashflow_results cs_cashflow_results_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.cs_cashflow_results
    ADD CONSTRAINT cs_cashflow_results_pkey PRIMARY KEY (id);


--
-- Name: cs_cashflow_scenarios cs_cashflow_scenarios_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.cs_cashflow_scenarios
    ADD CONSTRAINT cs_cashflow_scenarios_pkey PRIMARY KEY (id);


--
-- Name: cs_companies_owners cs_companies_owners_company_id_user_id_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.cs_companies_owners
    ADD CONSTRAINT cs_companies_owners_company_id_user_id_key UNIQUE (company_id, user_id);


--
-- Name: cs_companies_owners cs_companies_owners_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.cs_companies_owners
    ADD CONSTRAINT cs_companies_owners_pkey PRIMARY KEY (id);


--
-- Name: cs_companies cs_companies_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.cs_companies
    ADD CONSTRAINT cs_companies_pkey PRIMARY KEY (id);


--
-- Name: cs_companies cs_companies_tenant_id_rfc_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.cs_companies
    ADD CONSTRAINT cs_companies_tenant_id_rfc_key UNIQUE (tenant_id, rfc);


--
-- Name: cs_company_contacts cs_company_contacts_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.cs_company_contacts
    ADD CONSTRAINT cs_company_contacts_pkey PRIMARY KEY (id);


--
-- Name: cs_company_payment_accounts cs_company_payment_accounts_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.cs_company_payment_accounts
    ADD CONSTRAINT cs_company_payment_accounts_pkey PRIMARY KEY (id);


--
-- Name: cs_compliance_checks cs_compliance_checks_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.cs_compliance_checks
    ADD CONSTRAINT cs_compliance_checks_pkey PRIMARY KEY (id);


--
-- Name: cs_compliance_results cs_compliance_results_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.cs_compliance_results
    ADD CONSTRAINT cs_compliance_results_pkey PRIMARY KEY (id);


--
-- Name: cs_covenant_monitoring cs_covenant_monitoring_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.cs_covenant_monitoring
    ADD CONSTRAINT cs_covenant_monitoring_pkey PRIMARY KEY (id);


--
-- Name: cs_covenants cs_covenants_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.cs_covenants
    ADD CONSTRAINT cs_covenants_pkey PRIMARY KEY (id);


--
-- Name: cs_credit_limits cs_credit_limits_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.cs_credit_limits
    ADD CONSTRAINT cs_credit_limits_pkey PRIMARY KEY (id);


--
-- Name: cs_cross_analysis cs_cross_analysis_application_id_cross_number_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.cs_cross_analysis
    ADD CONSTRAINT cs_cross_analysis_application_id_cross_number_key UNIQUE (application_id, cross_number);


--
-- Name: cs_cross_analysis cs_cross_analysis_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.cs_cross_analysis
    ADD CONSTRAINT cs_cross_analysis_pkey PRIMARY KEY (id);


--
-- Name: cs_decision_gates cs_decision_gates_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.cs_decision_gates
    ADD CONSTRAINT cs_decision_gates_pkey PRIMARY KEY (id);


--
-- Name: cs_document_validations cs_document_validations_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.cs_document_validations
    ADD CONSTRAINT cs_document_validations_pkey PRIMARY KEY (id);


--
-- Name: cs_documentation_results cs_documentation_results_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.cs_documentation_results
    ADD CONSTRAINT cs_documentation_results_pkey PRIMARY KEY (id);


--
-- Name: cs_documents cs_documents_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.cs_documents
    ADD CONSTRAINT cs_documents_pkey PRIMARY KEY (id);


--
-- Name: cs_employee_headcount cs_employee_headcount_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.cs_employee_headcount
    ADD CONSTRAINT cs_employee_headcount_pkey PRIMARY KEY (id);


--
-- Name: cs_employee_payroll cs_employee_payroll_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.cs_employee_payroll
    ADD CONSTRAINT cs_employee_payroll_pkey PRIMARY KEY (id);


--
-- Name: cs_employee_productivity cs_employee_productivity_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.cs_employee_productivity
    ADD CONSTRAINT cs_employee_productivity_pkey PRIMARY KEY (id);


--
-- Name: cs_employee_results cs_employee_results_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.cs_employee_results
    ADD CONSTRAINT cs_employee_results_pkey PRIMARY KEY (id);


--
-- Name: cs_expediente_events cs_expediente_events_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.cs_expediente_events
    ADD CONSTRAINT cs_expediente_events_pkey PRIMARY KEY (id);


--
-- Name: cs_expediente_tokens cs_expediente_tokens_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.cs_expediente_tokens
    ADD CONSTRAINT cs_expediente_tokens_pkey PRIMARY KEY (id);


--
-- Name: cs_expediente_tokens cs_expediente_tokens_token_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.cs_expediente_tokens
    ADD CONSTRAINT cs_expediente_tokens_token_key UNIQUE (token);


--
-- Name: cs_expedientes cs_expedientes_folio_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.cs_expedientes
    ADD CONSTRAINT cs_expedientes_folio_key UNIQUE (folio);


--
-- Name: cs_expedientes cs_expedientes_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.cs_expedientes
    ADD CONSTRAINT cs_expedientes_pkey PRIMARY KEY (id);


--
-- Name: cs_financial_balance_detail cs_financial_balance_detail_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.cs_financial_balance_detail
    ADD CONSTRAINT cs_financial_balance_detail_pkey PRIMARY KEY (id);


--
-- Name: cs_financial_balanza cs_financial_balanza_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.cs_financial_balanza
    ADD CONSTRAINT cs_financial_balanza_pkey PRIMARY KEY (id);


--
-- Name: cs_financial_calculations cs_financial_calculations_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.cs_financial_calculations
    ADD CONSTRAINT cs_financial_calculations_pkey PRIMARY KEY (id);


--
-- Name: cs_financial_income_detail cs_financial_income_detail_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.cs_financial_income_detail
    ADD CONSTRAINT cs_financial_income_detail_pkey PRIMARY KEY (id);


--
-- Name: cs_financial_inputs cs_financial_inputs_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.cs_financial_inputs
    ADD CONSTRAINT cs_financial_inputs_pkey PRIMARY KEY (id);


--
-- Name: cs_financial_related_parties cs_financial_related_parties_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.cs_financial_related_parties
    ADD CONSTRAINT cs_financial_related_parties_pkey PRIMARY KEY (id);


--
-- Name: cs_financial_results cs_financial_results_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.cs_financial_results
    ADD CONSTRAINT cs_financial_results_pkey PRIMARY KEY (id);


--
-- Name: cs_fx_exposure cs_fx_exposure_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.cs_fx_exposure
    ADD CONSTRAINT cs_fx_exposure_pkey PRIMARY KEY (id);


--
-- Name: cs_fx_inputs cs_fx_inputs_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.cs_fx_inputs
    ADD CONSTRAINT cs_fx_inputs_pkey PRIMARY KEY (id);


--
-- Name: cs_fx_results cs_fx_results_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.cs_fx_results
    ADD CONSTRAINT cs_fx_results_pkey PRIMARY KEY (id);


--
-- Name: cs_fx_scenarios cs_fx_scenarios_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.cs_fx_scenarios
    ADD CONSTRAINT cs_fx_scenarios_pkey PRIMARY KEY (id);


--
-- Name: cs_guarantee_documents cs_guarantee_documents_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.cs_guarantee_documents
    ADD CONSTRAINT cs_guarantee_documents_pkey PRIMARY KEY (id);


--
-- Name: cs_guarantee_guarantees cs_guarantee_guarantees_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.cs_guarantee_guarantees
    ADD CONSTRAINT cs_guarantee_guarantees_pkey PRIMARY KEY (id);


--
-- Name: cs_guarantee_haircuts cs_guarantee_haircuts_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.cs_guarantee_haircuts
    ADD CONSTRAINT cs_guarantee_haircuts_pkey PRIMARY KEY (id);


--
-- Name: cs_guarantee_results cs_guarantee_results_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.cs_guarantee_results
    ADD CONSTRAINT cs_guarantee_results_pkey PRIMARY KEY (id);


--
-- Name: cs_guarantee_valuations cs_guarantee_valuations_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.cs_guarantee_valuations
    ADD CONSTRAINT cs_guarantee_valuations_pkey PRIMARY KEY (id);


--
-- Name: cs_limit_calculations cs_limit_calculations_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.cs_limit_calculations
    ADD CONSTRAINT cs_limit_calculations_pkey PRIMARY KEY (id);


--
-- Name: cs_metric_catalog cs_metric_catalog_metric_name_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.cs_metric_catalog
    ADD CONSTRAINT cs_metric_catalog_metric_name_key UNIQUE (metric_name);


--
-- Name: cs_metric_catalog cs_metric_catalog_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.cs_metric_catalog
    ADD CONSTRAINT cs_metric_catalog_pkey PRIMARY KEY (id);


--
-- Name: cs_metric_values cs_metric_values_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.cs_metric_values
    ADD CONSTRAINT cs_metric_values_pkey PRIMARY KEY (id);


--
-- Name: cs_network_clients_detail cs_network_clients_detail_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.cs_network_clients_detail
    ADD CONSTRAINT cs_network_clients_detail_pkey PRIMARY KEY (id);


--
-- Name: cs_network_concentration cs_network_concentration_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.cs_network_concentration
    ADD CONSTRAINT cs_network_concentration_pkey PRIMARY KEY (id);


--
-- Name: cs_network_counterparties cs_network_counterparties_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.cs_network_counterparties
    ADD CONSTRAINT cs_network_counterparties_pkey PRIMARY KEY (id);


--
-- Name: cs_network_financial_institutions cs_network_financial_institutions_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.cs_network_financial_institutions
    ADD CONSTRAINT cs_network_financial_institutions_pkey PRIMARY KEY (id);


--
-- Name: cs_network_government cs_network_government_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.cs_network_government
    ADD CONSTRAINT cs_network_government_pkey PRIMARY KEY (id);


--
-- Name: cs_network_metrics cs_network_metrics_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.cs_network_metrics
    ADD CONSTRAINT cs_network_metrics_pkey PRIMARY KEY (id);


--
-- Name: cs_network_products cs_network_products_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.cs_network_products
    ADD CONSTRAINT cs_network_products_pkey PRIMARY KEY (id);


--
-- Name: cs_network_results cs_network_results_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.cs_network_results
    ADD CONSTRAINT cs_network_results_pkey PRIMARY KEY (id);


--
-- Name: cs_network_suppliers_detail cs_network_suppliers_detail_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.cs_network_suppliers_detail
    ADD CONSTRAINT cs_network_suppliers_detail_pkey PRIMARY KEY (id);


--
-- Name: cs_policies cs_policies_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.cs_policies
    ADD CONSTRAINT cs_policies_pkey PRIMARY KEY (id);


--
-- Name: cs_policies cs_policies_policy_name_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.cs_policies
    ADD CONSTRAINT cs_policies_policy_name_key UNIQUE (policy_name);


--
-- Name: cs_policy_audit cs_policy_audit_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.cs_policy_audit
    ADD CONSTRAINT cs_policy_audit_pkey PRIMARY KEY (id);


--
-- Name: cs_policy_versions cs_policy_versions_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.cs_policy_versions
    ADD CONSTRAINT cs_policy_versions_pkey PRIMARY KEY (id);


--
-- Name: cs_portfolio_exposure cs_portfolio_exposure_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.cs_portfolio_exposure
    ADD CONSTRAINT cs_portfolio_exposure_pkey PRIMARY KEY (id);


--
-- Name: cs_portfolio_limits cs_portfolio_limits_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.cs_portfolio_limits
    ADD CONSTRAINT cs_portfolio_limits_pkey PRIMARY KEY (id);


--
-- Name: cs_portfolio_positions cs_portfolio_positions_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.cs_portfolio_positions
    ADD CONSTRAINT cs_portfolio_positions_pkey PRIMARY KEY (id);


--
-- Name: cs_portfolio_results cs_portfolio_results_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.cs_portfolio_results
    ADD CONSTRAINT cs_portfolio_results_pkey PRIMARY KEY (id);


--
-- Name: cs_review_schedule cs_review_schedule_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.cs_review_schedule
    ADD CONSTRAINT cs_review_schedule_pkey PRIMARY KEY (id);


--
-- Name: cs_review_triggers cs_review_triggers_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.cs_review_triggers
    ADD CONSTRAINT cs_review_triggers_pkey PRIMARY KEY (id);


--
-- Name: cs_risk_matrix_results cs_risk_matrix_results_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.cs_risk_matrix_results
    ADD CONSTRAINT cs_risk_matrix_results_pkey PRIMARY KEY (id);


--
-- Name: cs_sat_blacklisted_invoices cs_sat_blacklisted_invoices_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.cs_sat_blacklisted_invoices
    ADD CONSTRAINT cs_sat_blacklisted_invoices_pkey PRIMARY KEY (id);


--
-- Name: cs_sat_data cs_sat_data_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.cs_sat_data
    ADD CONSTRAINT cs_sat_data_pkey PRIMARY KEY (id);


--
-- Name: cs_sat_facturado_vs_declarado cs_sat_facturado_vs_declarado_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.cs_sat_facturado_vs_declarado
    ADD CONSTRAINT cs_sat_facturado_vs_declarado_pkey PRIMARY KEY (id);


--
-- Name: cs_sat_metrics cs_sat_metrics_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.cs_sat_metrics
    ADD CONSTRAINT cs_sat_metrics_pkey PRIMARY KEY (id);


--
-- Name: cs_sat_payment_behavior cs_sat_payment_behavior_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.cs_sat_payment_behavior
    ADD CONSTRAINT cs_sat_payment_behavior_pkey PRIMARY KEY (id);


--
-- Name: cs_sat_product_diversification cs_sat_product_diversification_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.cs_sat_product_diversification
    ADD CONSTRAINT cs_sat_product_diversification_pkey PRIMARY KEY (id);


--
-- Name: cs_sat_results cs_sat_results_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.cs_sat_results
    ADD CONSTRAINT cs_sat_results_pkey PRIMARY KEY (id);


--
-- Name: cs_sat_revenue_quality cs_sat_revenue_quality_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.cs_sat_revenue_quality
    ADD CONSTRAINT cs_sat_revenue_quality_pkey PRIMARY KEY (id);


--
-- Name: cs_scenario_results cs_scenario_results_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.cs_scenario_results
    ADD CONSTRAINT cs_scenario_results_pkey PRIMARY KEY (id);


--
-- Name: cs_scenarios cs_scenarios_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.cs_scenarios
    ADD CONSTRAINT cs_scenarios_pkey PRIMARY KEY (id);


--
-- Name: cs_scoring_versions cs_scoring_versions_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.cs_scoring_versions
    ADD CONSTRAINT cs_scoring_versions_pkey PRIMARY KEY (id);


--
-- Name: cs_scoring_versions cs_scoring_versions_version_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.cs_scoring_versions
    ADD CONSTRAINT cs_scoring_versions_version_key UNIQUE (version);


--
-- Name: cs_stability_metrics cs_stability_metrics_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.cs_stability_metrics
    ADD CONSTRAINT cs_stability_metrics_pkey PRIMARY KEY (id);


--
-- Name: cs_stability_results cs_stability_results_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.cs_stability_results
    ADD CONSTRAINT cs_stability_results_pkey PRIMARY KEY (id);


--
-- Name: cs_stability_timeseries cs_stability_timeseries_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.cs_stability_timeseries
    ADD CONSTRAINT cs_stability_timeseries_pkey PRIMARY KEY (id);


--
-- Name: cs_trend_ai_narrative cs_trend_ai_narrative_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.cs_trend_ai_narrative
    ADD CONSTRAINT cs_trend_ai_narrative_pkey PRIMARY KEY (id);


--
-- Name: cs_trend_charts_config cs_trend_charts_config_engine_name_metric_name_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.cs_trend_charts_config
    ADD CONSTRAINT cs_trend_charts_config_engine_name_metric_name_key UNIQUE (engine_name, metric_name);


--
-- Name: cs_trend_charts_config cs_trend_charts_config_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.cs_trend_charts_config
    ADD CONSTRAINT cs_trend_charts_config_pkey PRIMARY KEY (id);


--
-- Name: cs_trend_results cs_trend_results_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.cs_trend_results
    ADD CONSTRAINT cs_trend_results_pkey PRIMARY KEY (id);


--
-- Name: cs_trend_timeseries cs_trend_timeseries_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.cs_trend_timeseries
    ADD CONSTRAINT cs_trend_timeseries_pkey PRIMARY KEY (id);


--
-- Name: cs_workflow_decisions cs_workflow_decisions_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.cs_workflow_decisions
    ADD CONSTRAINT cs_workflow_decisions_pkey PRIMARY KEY (id);


--
-- Name: cs_workflow_overrides cs_workflow_overrides_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.cs_workflow_overrides
    ADD CONSTRAINT cs_workflow_overrides_pkey PRIMARY KEY (id);


--
-- Name: cs_workflow_queue cs_workflow_queue_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.cs_workflow_queue
    ADD CONSTRAINT cs_workflow_queue_pkey PRIMARY KEY (id);


--
-- Name: cs_working_capital_aging cs_working_capital_aging_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.cs_working_capital_aging
    ADD CONSTRAINT cs_working_capital_aging_pkey PRIMARY KEY (id);


--
-- Name: cs_working_capital_cycle cs_working_capital_cycle_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.cs_working_capital_cycle
    ADD CONSTRAINT cs_working_capital_cycle_pkey PRIMARY KEY (id);


--
-- Name: cs_working_capital_inputs cs_working_capital_inputs_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.cs_working_capital_inputs
    ADD CONSTRAINT cs_working_capital_inputs_pkey PRIMARY KEY (id);


--
-- Name: cs_working_capital_results cs_working_capital_results_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.cs_working_capital_results
    ADD CONSTRAINT cs_working_capital_results_pkey PRIMARY KEY (id);


--
-- Name: fx_transactions fx_transactions_folio_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.fx_transactions
    ADD CONSTRAINT fx_transactions_folio_key UNIQUE (folio);


--
-- Name: fx_transactions fx_transactions_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.fx_transactions
    ADD CONSTRAINT fx_transactions_pkey PRIMARY KEY (id);


--
-- Name: local_users local_users_email_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.local_users
    ADD CONSTRAINT local_users_email_key UNIQUE (email);


--
-- Name: local_users local_users_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.local_users
    ADD CONSTRAINT local_users_pkey PRIMARY KEY (id);


--
-- Name: pi_accounts pi_accounts_account_number_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.pi_accounts
    ADD CONSTRAINT pi_accounts_account_number_key UNIQUE (account_number);


--
-- Name: pi_accounts pi_accounts_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.pi_accounts
    ADD CONSTRAINT pi_accounts_pkey PRIMARY KEY (id);


--
-- Name: idx_cs_ai_analysis_app; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_cs_ai_analysis_app ON public.cs_ai_analysis USING btree (application_id);


--
-- Name: idx_cs_ai_recommendations_app; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_cs_ai_recommendations_app ON public.cs_ai_recommendations USING btree (application_id);


--
-- Name: idx_cs_ai_scenarios_app; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_cs_ai_scenarios_app ON public.cs_ai_scenarios USING btree (application_id);


--
-- Name: idx_cs_api_cache_expiry; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_cs_api_cache_expiry ON public.cs_api_cache USING btree (expires_at);


--
-- Name: idx_cs_api_cache_lookup; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_cs_api_cache_lookup ON public.cs_api_cache USING btree (provider, endpoint, rfc);


--
-- Name: idx_cs_api_calls_app; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_cs_api_calls_app ON public.cs_api_calls USING btree (application_id);


--
-- Name: idx_cs_api_calls_provider; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_cs_api_calls_provider ON public.cs_api_calls USING btree (provider, created_at DESC);


--
-- Name: idx_cs_applications_created; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_cs_applications_created ON public.cs_applications USING btree (created_at DESC);


--
-- Name: idx_cs_applications_rfc; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_cs_applications_rfc ON public.cs_applications USING btree (rfc);


--
-- Name: idx_cs_applications_status; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_cs_applications_status ON public.cs_applications USING btree (status);


--
-- Name: idx_cs_audit_log_app; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_cs_audit_log_app ON public.cs_audit_log USING btree (application_id);


--
-- Name: idx_cs_audit_log_created; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_cs_audit_log_created ON public.cs_audit_log USING btree (created_at DESC);


--
-- Name: idx_cs_audit_log_user; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_cs_audit_log_user ON public.cs_audit_log USING btree (user_id);


--
-- Name: idx_cs_benchmark_comparisons_app; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_cs_benchmark_comparisons_app ON public.cs_benchmark_comparisons USING btree (application_id);


--
-- Name: idx_cs_benchmark_cross_val_app; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_cs_benchmark_cross_val_app ON public.cs_benchmark_cross_validation USING btree (application_id);


--
-- Name: idx_cs_benchmark_syntage_app; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_cs_benchmark_syntage_app ON public.cs_benchmark_syntage_ratios USING btree (application_id);


--
-- Name: idx_cs_benchmarks_sector; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_cs_benchmarks_sector ON public.cs_benchmarks USING btree (sector, size_category);


--
-- Name: idx_cs_benchmarks_source; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_cs_benchmarks_source ON public.cs_benchmarks USING btree (source, active);


--
-- Name: idx_cs_buro_active_app; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_cs_buro_active_app ON public.cs_buro_active_credits USING btree (application_id);


--
-- Name: idx_cs_buro_analysis_app; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_cs_buro_analysis_app ON public.cs_buro_analysis USING btree (application_id);


--
-- Name: idx_cs_buro_consult_app; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_cs_buro_consult_app ON public.cs_buro_consultations USING btree (application_id);


--
-- Name: idx_cs_buro_data_app; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_cs_buro_data_app ON public.cs_buro_data USING btree (application_id);


--
-- Name: idx_cs_buro_hawk_app; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_cs_buro_hawk_app ON public.cs_buro_hawk_checks USING btree (application_id);


--
-- Name: idx_cs_buro_liquidated_app; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_cs_buro_liquidated_app ON public.cs_buro_liquidated USING btree (application_id);


--
-- Name: idx_cs_buro_results_app; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_cs_buro_results_app ON public.cs_buro_results USING btree (application_id);


--
-- Name: idx_cs_buro_rotation_app; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_cs_buro_rotation_app ON public.cs_buro_debt_rotation USING btree (application_id);


--
-- Name: idx_cs_cf_calc_app; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_cs_cf_calc_app ON public.cs_cashflow_calculations USING btree (application_id);


--
-- Name: idx_cs_cf_inputs_app; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_cs_cf_inputs_app ON public.cs_cashflow_inputs USING btree (application_id);


--
-- Name: idx_cs_cf_results_app; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_cs_cf_results_app ON public.cs_cashflow_results USING btree (application_id);


--
-- Name: idx_cs_cf_scenarios_app; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_cs_cf_scenarios_app ON public.cs_cashflow_scenarios USING btree (application_id);


--
-- Name: idx_cs_companies_activity; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_cs_companies_activity ON public.cs_companies USING btree (business_activity);


--
-- Name: idx_cs_companies_rfc; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_cs_companies_rfc ON public.cs_companies USING btree (rfc);


--
-- Name: idx_cs_companies_status; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_cs_companies_status ON public.cs_companies USING btree (status);


--
-- Name: idx_cs_companies_tenant; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_cs_companies_tenant ON public.cs_companies USING btree (tenant_id);


--
-- Name: idx_cs_compliance_checks_app; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_cs_compliance_checks_app ON public.cs_compliance_checks USING btree (application_id);


--
-- Name: idx_cs_compliance_results_app; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_cs_compliance_results_app ON public.cs_compliance_results USING btree (application_id);


--
-- Name: idx_cs_contacts_company; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_cs_contacts_company ON public.cs_company_contacts USING btree (company_id);


--
-- Name: idx_cs_contacts_type; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_cs_contacts_type ON public.cs_company_contacts USING btree (contact_type);


--
-- Name: idx_cs_covenant_monitoring_app; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_cs_covenant_monitoring_app ON public.cs_covenant_monitoring USING btree (application_id);


--
-- Name: idx_cs_covenant_monitoring_covenant; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_cs_covenant_monitoring_covenant ON public.cs_covenant_monitoring USING btree (covenant_id);


--
-- Name: idx_cs_covenants_app; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_cs_covenants_app ON public.cs_covenants USING btree (application_id);


--
-- Name: idx_cs_credit_limits_app; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_cs_credit_limits_app ON public.cs_credit_limits USING btree (application_id);


--
-- Name: idx_cs_cross_analysis_app; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_cs_cross_analysis_app ON public.cs_cross_analysis USING btree (application_id);


--
-- Name: idx_cs_decision_gates_app; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_cs_decision_gates_app ON public.cs_decision_gates USING btree (application_id);


--
-- Name: idx_cs_doc_results_app; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_cs_doc_results_app ON public.cs_documentation_results USING btree (application_id);


--
-- Name: idx_cs_doc_validations_doc; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_cs_doc_validations_doc ON public.cs_document_validations USING btree (document_id);


--
-- Name: idx_cs_documents_app; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_cs_documents_app ON public.cs_documents USING btree (application_id);


--
-- Name: idx_cs_emp_headcount_app; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_cs_emp_headcount_app ON public.cs_employee_headcount USING btree (application_id);


--
-- Name: idx_cs_emp_payroll_app; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_cs_emp_payroll_app ON public.cs_employee_payroll USING btree (application_id);


--
-- Name: idx_cs_emp_productivity_app; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_cs_emp_productivity_app ON public.cs_employee_productivity USING btree (application_id);


--
-- Name: idx_cs_emp_results_app; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_cs_emp_results_app ON public.cs_employee_results USING btree (application_id);


--
-- Name: idx_cs_events_created; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_cs_events_created ON public.cs_expediente_events USING btree (created_at DESC);


--
-- Name: idx_cs_events_expediente; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_cs_events_expediente ON public.cs_expediente_events USING btree (expediente_id);


--
-- Name: idx_cs_events_type; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_cs_events_type ON public.cs_expediente_events USING btree (event_type);


--
-- Name: idx_cs_expedientes_created; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_cs_expedientes_created ON public.cs_expedientes USING btree (created_at DESC);


--
-- Name: idx_cs_expedientes_email; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_cs_expedientes_email ON public.cs_expedientes USING btree (contact_email);


--
-- Name: idx_cs_expedientes_folio; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_cs_expedientes_folio ON public.cs_expedientes USING btree (folio);


--
-- Name: idx_cs_expedientes_rfc; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_cs_expedientes_rfc ON public.cs_expedientes USING btree (rfc);


--
-- Name: idx_cs_expedientes_stage; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_cs_expedientes_stage ON public.cs_expedientes USING btree (stage);


--
-- Name: idx_cs_fin_balance_app; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_cs_fin_balance_app ON public.cs_financial_balance_detail USING btree (application_id);


--
-- Name: idx_cs_fin_balanza_app; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_cs_fin_balanza_app ON public.cs_financial_balanza USING btree (application_id);


--
-- Name: idx_cs_fin_calc_app; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_cs_fin_calc_app ON public.cs_financial_calculations USING btree (application_id);


--
-- Name: idx_cs_fin_income_app; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_cs_fin_income_app ON public.cs_financial_income_detail USING btree (application_id);


--
-- Name: idx_cs_fin_inputs_app; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_cs_fin_inputs_app ON public.cs_financial_inputs USING btree (application_id);


--
-- Name: idx_cs_fin_results_app; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_cs_fin_results_app ON public.cs_financial_results USING btree (application_id);


--
-- Name: idx_cs_fin_rp_app; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_cs_fin_rp_app ON public.cs_financial_related_parties USING btree (application_id);


--
-- Name: idx_cs_fx_exposure_app; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_cs_fx_exposure_app ON public.cs_fx_exposure USING btree (application_id);


--
-- Name: idx_cs_fx_inputs_app; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_cs_fx_inputs_app ON public.cs_fx_inputs USING btree (application_id);


--
-- Name: idx_cs_fx_results_app; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_cs_fx_results_app ON public.cs_fx_results USING btree (application_id);


--
-- Name: idx_cs_fx_scenarios_app; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_cs_fx_scenarios_app ON public.cs_fx_scenarios USING btree (application_id);


--
-- Name: idx_cs_guar_documents_app; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_cs_guar_documents_app ON public.cs_guarantee_documents USING btree (application_id);


--
-- Name: idx_cs_guar_guarantees_app; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_cs_guar_guarantees_app ON public.cs_guarantee_guarantees USING btree (application_id);


--
-- Name: idx_cs_guar_haircuts_app; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_cs_guar_haircuts_app ON public.cs_guarantee_haircuts USING btree (application_id);


--
-- Name: idx_cs_guar_results_app; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_cs_guar_results_app ON public.cs_guarantee_results USING btree (application_id);


--
-- Name: idx_cs_guar_valuations_app; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_cs_guar_valuations_app ON public.cs_guarantee_valuations USING btree (application_id);


--
-- Name: idx_cs_limit_calculations_app; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_cs_limit_calculations_app ON public.cs_limit_calculations USING btree (application_id);


--
-- Name: idx_cs_metric_catalog_name; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_cs_metric_catalog_name ON public.cs_metric_catalog USING btree (metric_name);


--
-- Name: idx_cs_metric_values_app; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_cs_metric_values_app ON public.cs_metric_values USING btree (application_id);


--
-- Name: idx_cs_net_clients_app; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_cs_net_clients_app ON public.cs_network_clients_detail USING btree (application_id);


--
-- Name: idx_cs_net_concentration_app; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_cs_net_concentration_app ON public.cs_network_concentration USING btree (application_id);


--
-- Name: idx_cs_net_counterparties_app; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_cs_net_counterparties_app ON public.cs_network_counterparties USING btree (application_id);


--
-- Name: idx_cs_net_fi_app; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_cs_net_fi_app ON public.cs_network_financial_institutions USING btree (application_id);


--
-- Name: idx_cs_net_gov_app; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_cs_net_gov_app ON public.cs_network_government USING btree (application_id);


--
-- Name: idx_cs_net_metrics_app; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_cs_net_metrics_app ON public.cs_network_metrics USING btree (application_id);


--
-- Name: idx_cs_net_products_app; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_cs_net_products_app ON public.cs_network_products USING btree (application_id);


--
-- Name: idx_cs_net_results_app; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_cs_net_results_app ON public.cs_network_results USING btree (application_id);


--
-- Name: idx_cs_net_suppliers_app; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_cs_net_suppliers_app ON public.cs_network_suppliers_detail USING btree (application_id);


--
-- Name: idx_cs_policy_audit_policy; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_cs_policy_audit_policy ON public.cs_policy_audit USING btree (policy_id);


--
-- Name: idx_cs_policy_versions_policy; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_cs_policy_versions_policy ON public.cs_policy_versions USING btree (policy_id);


--
-- Name: idx_cs_portfolio_exposure_app; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_cs_portfolio_exposure_app ON public.cs_portfolio_exposure USING btree (application_id);


--
-- Name: idx_cs_portfolio_limits_app; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_cs_portfolio_limits_app ON public.cs_portfolio_limits USING btree (application_id);


--
-- Name: idx_cs_portfolio_positions_app; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_cs_portfolio_positions_app ON public.cs_portfolio_positions USING btree (application_id);


--
-- Name: idx_cs_portfolio_results_app; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_cs_portfolio_results_app ON public.cs_portfolio_results USING btree (application_id);


--
-- Name: idx_cs_review_schedule_app; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_cs_review_schedule_app ON public.cs_review_schedule USING btree (application_id);


--
-- Name: idx_cs_review_triggers_app; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_cs_review_triggers_app ON public.cs_review_triggers USING btree (application_id);


--
-- Name: idx_cs_risk_matrix_results_app; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_cs_risk_matrix_results_app ON public.cs_risk_matrix_results USING btree (application_id);


--
-- Name: idx_cs_sat_blacklist_app; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_cs_sat_blacklist_app ON public.cs_sat_blacklisted_invoices USING btree (application_id);


--
-- Name: idx_cs_sat_data_app; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_cs_sat_data_app ON public.cs_sat_data USING btree (application_id);


--
-- Name: idx_cs_sat_data_type; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_cs_sat_data_type ON public.cs_sat_data USING btree (application_id, data_type);


--
-- Name: idx_cs_sat_fvd_app; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_cs_sat_fvd_app ON public.cs_sat_facturado_vs_declarado USING btree (application_id);


--
-- Name: idx_cs_sat_metrics_app; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_cs_sat_metrics_app ON public.cs_sat_metrics USING btree (application_id);


--
-- Name: idx_cs_sat_metrics_name; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_cs_sat_metrics_name ON public.cs_sat_metrics USING btree (application_id, metric_name);


--
-- Name: idx_cs_sat_payment_app; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_cs_sat_payment_app ON public.cs_sat_payment_behavior USING btree (application_id);


--
-- Name: idx_cs_sat_product_app; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_cs_sat_product_app ON public.cs_sat_product_diversification USING btree (application_id);


--
-- Name: idx_cs_sat_results_app; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_cs_sat_results_app ON public.cs_sat_results USING btree (application_id);


--
-- Name: idx_cs_sat_revenue_app; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_cs_sat_revenue_app ON public.cs_sat_revenue_quality USING btree (application_id);


--
-- Name: idx_cs_scenario_results_app; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_cs_scenario_results_app ON public.cs_scenario_results USING btree (application_id);


--
-- Name: idx_cs_scenarios_app; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_cs_scenarios_app ON public.cs_scenarios USING btree (application_id);


--
-- Name: idx_cs_scoring_versions_active; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_cs_scoring_versions_active ON public.cs_scoring_versions USING btree (active) WHERE (active = true);


--
-- Name: idx_cs_stab_metrics_app; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_cs_stab_metrics_app ON public.cs_stability_metrics USING btree (application_id);


--
-- Name: idx_cs_stab_results_app; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_cs_stab_results_app ON public.cs_stability_results USING btree (application_id);


--
-- Name: idx_cs_stab_ts_app; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_cs_stab_ts_app ON public.cs_stability_timeseries USING btree (application_id);


--
-- Name: idx_cs_status_log_app; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_cs_status_log_app ON public.cs_application_status_log USING btree (application_id);


--
-- Name: idx_cs_tokens_expediente; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_cs_tokens_expediente ON public.cs_expediente_tokens USING btree (expediente_id);


--
-- Name: idx_cs_tokens_expires; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_cs_tokens_expires ON public.cs_expediente_tokens USING btree (expires_at);


--
-- Name: idx_cs_tokens_token; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_cs_tokens_token ON public.cs_expediente_tokens USING btree (token);


--
-- Name: idx_cs_trend_narrative_app; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_cs_trend_narrative_app ON public.cs_trend_ai_narrative USING btree (application_id);


--
-- Name: idx_cs_trend_results_app; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_cs_trend_results_app ON public.cs_trend_results USING btree (application_id);


--
-- Name: idx_cs_trend_ts_app; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_cs_trend_ts_app ON public.cs_trend_timeseries USING btree (application_id);


--
-- Name: idx_cs_trend_ts_engine; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_cs_trend_ts_engine ON public.cs_trend_timeseries USING btree (application_id, engine_name, metric_name);


--
-- Name: idx_cs_wc_aging_app; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_cs_wc_aging_app ON public.cs_working_capital_aging USING btree (application_id);


--
-- Name: idx_cs_wc_cycle_app; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_cs_wc_cycle_app ON public.cs_working_capital_cycle USING btree (application_id);


--
-- Name: idx_cs_wc_inputs_app; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_cs_wc_inputs_app ON public.cs_working_capital_inputs USING btree (application_id);


--
-- Name: idx_cs_wc_results_app; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_cs_wc_results_app ON public.cs_working_capital_results USING btree (application_id);


--
-- Name: idx_cs_workflow_decisions_app; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_cs_workflow_decisions_app ON public.cs_workflow_decisions USING btree (application_id);


--
-- Name: idx_cs_workflow_overrides_app; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_cs_workflow_overrides_app ON public.cs_workflow_overrides USING btree (application_id);


--
-- Name: idx_cs_workflow_queue_app; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_cs_workflow_queue_app ON public.cs_workflow_queue USING btree (application_id);


--
-- Name: idx_fx_transactions_company; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_fx_transactions_company ON public.fx_transactions USING btree (company_id);


--
-- Name: idx_fx_transactions_created_by; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_fx_transactions_created_by ON public.fx_transactions USING btree (created_by);


--
-- Name: idx_fx_transactions_pi_account; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_fx_transactions_pi_account ON public.fx_transactions USING btree (pi_account_id);


--
-- Name: idx_fx_transactions_status; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_fx_transactions_status ON public.fx_transactions USING btree (status);


--
-- Name: idx_payment_accounts_company; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_payment_accounts_company ON public.cs_company_payment_accounts USING btree (company_id);


--
-- Name: idx_pi_accounts_active; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_pi_accounts_active ON public.pi_accounts USING btree (is_active, created_at DESC);


--
-- Name: idx_pi_accounts_tenant; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_pi_accounts_tenant ON public.pi_accounts USING btree (tenant_id);


--
-- Name: cs_companies trg_archive_company; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER trg_archive_company BEFORE UPDATE ON public.cs_companies FOR EACH ROW EXECUTE FUNCTION public.archive_company_on_update();


--
-- Name: cs_expedientes trg_expediente_folio; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER trg_expediente_folio BEFORE INSERT ON public.cs_expedientes FOR EACH ROW WHEN (((new.folio IS NULL) OR (new.folio = ''::text))) EXECUTE FUNCTION public.generate_expediente_folio();


--
-- Name: cs_expedientes trg_expediente_updated; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER trg_expediente_updated BEFORE UPDATE ON public.cs_expedientes FOR EACH ROW EXECUTE FUNCTION public.update_expediente_timestamp();


--
-- Name: pi_accounts trg_prevent_data_update; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER trg_prevent_data_update BEFORE UPDATE ON public.pi_accounts FOR EACH ROW EXECUTE FUNCTION public.prevent_data_field_update();


--
-- Name: cs_ai_analysis cs_ai_analysis_application_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.cs_ai_analysis
    ADD CONSTRAINT cs_ai_analysis_application_id_fkey FOREIGN KEY (application_id) REFERENCES public.cs_applications(id) ON DELETE CASCADE;


--
-- Name: cs_ai_recommendations cs_ai_recommendations_application_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.cs_ai_recommendations
    ADD CONSTRAINT cs_ai_recommendations_application_id_fkey FOREIGN KEY (application_id) REFERENCES public.cs_applications(id) ON DELETE CASCADE;


--
-- Name: cs_ai_scenarios cs_ai_scenarios_application_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.cs_ai_scenarios
    ADD CONSTRAINT cs_ai_scenarios_application_id_fkey FOREIGN KEY (application_id) REFERENCES public.cs_applications(id) ON DELETE CASCADE;


--
-- Name: cs_api_calls cs_api_calls_application_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.cs_api_calls
    ADD CONSTRAINT cs_api_calls_application_id_fkey FOREIGN KEY (application_id) REFERENCES public.cs_applications(id) ON DELETE SET NULL;


--
-- Name: cs_application_status_log cs_application_status_log_application_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.cs_application_status_log
    ADD CONSTRAINT cs_application_status_log_application_id_fkey FOREIGN KEY (application_id) REFERENCES public.cs_applications(id) ON DELETE CASCADE;


--
-- Name: cs_audit_log cs_audit_log_application_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.cs_audit_log
    ADD CONSTRAINT cs_audit_log_application_id_fkey FOREIGN KEY (application_id) REFERENCES public.cs_applications(id) ON DELETE SET NULL;


--
-- Name: cs_benchmark_comparisons cs_benchmark_comparisons_application_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.cs_benchmark_comparisons
    ADD CONSTRAINT cs_benchmark_comparisons_application_id_fkey FOREIGN KEY (application_id) REFERENCES public.cs_applications(id) ON DELETE CASCADE;


--
-- Name: cs_benchmark_comparisons cs_benchmark_comparisons_benchmark_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.cs_benchmark_comparisons
    ADD CONSTRAINT cs_benchmark_comparisons_benchmark_id_fkey FOREIGN KEY (benchmark_id) REFERENCES public.cs_benchmarks(id);


--
-- Name: cs_benchmark_cross_validation cs_benchmark_cross_validation_application_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.cs_benchmark_cross_validation
    ADD CONSTRAINT cs_benchmark_cross_validation_application_id_fkey FOREIGN KEY (application_id) REFERENCES public.cs_applications(id) ON DELETE CASCADE;


--
-- Name: cs_benchmark_syntage_ratios cs_benchmark_syntage_ratios_application_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.cs_benchmark_syntage_ratios
    ADD CONSTRAINT cs_benchmark_syntage_ratios_application_id_fkey FOREIGN KEY (application_id) REFERENCES public.cs_applications(id) ON DELETE CASCADE;


--
-- Name: cs_buro_active_credits cs_buro_active_credits_application_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.cs_buro_active_credits
    ADD CONSTRAINT cs_buro_active_credits_application_id_fkey FOREIGN KEY (application_id) REFERENCES public.cs_applications(id) ON DELETE CASCADE;


--
-- Name: cs_buro_analysis cs_buro_analysis_application_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.cs_buro_analysis
    ADD CONSTRAINT cs_buro_analysis_application_id_fkey FOREIGN KEY (application_id) REFERENCES public.cs_applications(id) ON DELETE CASCADE;


--
-- Name: cs_buro_consultations cs_buro_consultations_application_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.cs_buro_consultations
    ADD CONSTRAINT cs_buro_consultations_application_id_fkey FOREIGN KEY (application_id) REFERENCES public.cs_applications(id) ON DELETE CASCADE;


--
-- Name: cs_buro_data cs_buro_data_application_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.cs_buro_data
    ADD CONSTRAINT cs_buro_data_application_id_fkey FOREIGN KEY (application_id) REFERENCES public.cs_applications(id) ON DELETE CASCADE;


--
-- Name: cs_buro_debt_rotation cs_buro_debt_rotation_application_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.cs_buro_debt_rotation
    ADD CONSTRAINT cs_buro_debt_rotation_application_id_fkey FOREIGN KEY (application_id) REFERENCES public.cs_applications(id) ON DELETE CASCADE;


--
-- Name: cs_buro_hawk_checks cs_buro_hawk_checks_application_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.cs_buro_hawk_checks
    ADD CONSTRAINT cs_buro_hawk_checks_application_id_fkey FOREIGN KEY (application_id) REFERENCES public.cs_applications(id) ON DELETE CASCADE;


--
-- Name: cs_buro_liquidated cs_buro_liquidated_application_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.cs_buro_liquidated
    ADD CONSTRAINT cs_buro_liquidated_application_id_fkey FOREIGN KEY (application_id) REFERENCES public.cs_applications(id) ON DELETE CASCADE;


--
-- Name: cs_buro_results cs_buro_results_application_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.cs_buro_results
    ADD CONSTRAINT cs_buro_results_application_id_fkey FOREIGN KEY (application_id) REFERENCES public.cs_applications(id) ON DELETE CASCADE;


--
-- Name: cs_cashflow_calculations cs_cashflow_calculations_application_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.cs_cashflow_calculations
    ADD CONSTRAINT cs_cashflow_calculations_application_id_fkey FOREIGN KEY (application_id) REFERENCES public.cs_applications(id) ON DELETE CASCADE;


--
-- Name: cs_cashflow_inputs cs_cashflow_inputs_application_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.cs_cashflow_inputs
    ADD CONSTRAINT cs_cashflow_inputs_application_id_fkey FOREIGN KEY (application_id) REFERENCES public.cs_applications(id) ON DELETE CASCADE;


--
-- Name: cs_cashflow_results cs_cashflow_results_application_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.cs_cashflow_results
    ADD CONSTRAINT cs_cashflow_results_application_id_fkey FOREIGN KEY (application_id) REFERENCES public.cs_applications(id) ON DELETE CASCADE;


--
-- Name: cs_cashflow_scenarios cs_cashflow_scenarios_application_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.cs_cashflow_scenarios
    ADD CONSTRAINT cs_cashflow_scenarios_application_id_fkey FOREIGN KEY (application_id) REFERENCES public.cs_applications(id) ON DELETE CASCADE;


--
-- Name: cs_company_contacts cs_company_contacts_company_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.cs_company_contacts
    ADD CONSTRAINT cs_company_contacts_company_id_fkey FOREIGN KEY (company_id) REFERENCES public.cs_companies(id) ON DELETE CASCADE;


--
-- Name: cs_company_payment_accounts cs_company_payment_accounts_company_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.cs_company_payment_accounts
    ADD CONSTRAINT cs_company_payment_accounts_company_id_fkey FOREIGN KEY (company_id) REFERENCES public.cs_companies(id) ON DELETE CASCADE;


--
-- Name: cs_compliance_checks cs_compliance_checks_application_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.cs_compliance_checks
    ADD CONSTRAINT cs_compliance_checks_application_id_fkey FOREIGN KEY (application_id) REFERENCES public.cs_applications(id) ON DELETE CASCADE;


--
-- Name: cs_compliance_results cs_compliance_results_application_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.cs_compliance_results
    ADD CONSTRAINT cs_compliance_results_application_id_fkey FOREIGN KEY (application_id) REFERENCES public.cs_applications(id) ON DELETE CASCADE;


--
-- Name: cs_covenant_monitoring cs_covenant_monitoring_application_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.cs_covenant_monitoring
    ADD CONSTRAINT cs_covenant_monitoring_application_id_fkey FOREIGN KEY (application_id) REFERENCES public.cs_applications(id) ON DELETE CASCADE;


--
-- Name: cs_covenant_monitoring cs_covenant_monitoring_covenant_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.cs_covenant_monitoring
    ADD CONSTRAINT cs_covenant_monitoring_covenant_id_fkey FOREIGN KEY (covenant_id) REFERENCES public.cs_covenants(id) ON DELETE CASCADE;


--
-- Name: cs_covenants cs_covenants_application_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.cs_covenants
    ADD CONSTRAINT cs_covenants_application_id_fkey FOREIGN KEY (application_id) REFERENCES public.cs_applications(id) ON DELETE CASCADE;


--
-- Name: cs_credit_limits cs_credit_limits_application_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.cs_credit_limits
    ADD CONSTRAINT cs_credit_limits_application_id_fkey FOREIGN KEY (application_id) REFERENCES public.cs_applications(id) ON DELETE CASCADE;


--
-- Name: cs_cross_analysis cs_cross_analysis_application_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.cs_cross_analysis
    ADD CONSTRAINT cs_cross_analysis_application_id_fkey FOREIGN KEY (application_id) REFERENCES public.cs_applications(id) ON DELETE CASCADE;


--
-- Name: cs_decision_gates cs_decision_gates_application_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.cs_decision_gates
    ADD CONSTRAINT cs_decision_gates_application_id_fkey FOREIGN KEY (application_id) REFERENCES public.cs_applications(id) ON DELETE CASCADE;


--
-- Name: cs_document_validations cs_document_validations_document_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.cs_document_validations
    ADD CONSTRAINT cs_document_validations_document_id_fkey FOREIGN KEY (document_id) REFERENCES public.cs_documents(id) ON DELETE CASCADE;


--
-- Name: cs_documentation_results cs_documentation_results_application_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.cs_documentation_results
    ADD CONSTRAINT cs_documentation_results_application_id_fkey FOREIGN KEY (application_id) REFERENCES public.cs_applications(id) ON DELETE CASCADE;


--
-- Name: cs_documents cs_documents_application_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.cs_documents
    ADD CONSTRAINT cs_documents_application_id_fkey FOREIGN KEY (application_id) REFERENCES public.cs_applications(id) ON DELETE CASCADE;


--
-- Name: cs_employee_headcount cs_employee_headcount_application_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.cs_employee_headcount
    ADD CONSTRAINT cs_employee_headcount_application_id_fkey FOREIGN KEY (application_id) REFERENCES public.cs_applications(id) ON DELETE CASCADE;


--
-- Name: cs_employee_payroll cs_employee_payroll_application_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.cs_employee_payroll
    ADD CONSTRAINT cs_employee_payroll_application_id_fkey FOREIGN KEY (application_id) REFERENCES public.cs_applications(id) ON DELETE CASCADE;


--
-- Name: cs_employee_productivity cs_employee_productivity_application_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.cs_employee_productivity
    ADD CONSTRAINT cs_employee_productivity_application_id_fkey FOREIGN KEY (application_id) REFERENCES public.cs_applications(id) ON DELETE CASCADE;


--
-- Name: cs_employee_results cs_employee_results_application_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.cs_employee_results
    ADD CONSTRAINT cs_employee_results_application_id_fkey FOREIGN KEY (application_id) REFERENCES public.cs_applications(id) ON DELETE CASCADE;


--
-- Name: cs_expediente_events cs_expediente_events_expediente_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.cs_expediente_events
    ADD CONSTRAINT cs_expediente_events_expediente_id_fkey FOREIGN KEY (expediente_id) REFERENCES public.cs_expedientes(id) ON DELETE CASCADE;


--
-- Name: cs_expediente_tokens cs_expediente_tokens_expediente_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.cs_expediente_tokens
    ADD CONSTRAINT cs_expediente_tokens_expediente_id_fkey FOREIGN KEY (expediente_id) REFERENCES public.cs_expedientes(id) ON DELETE CASCADE;


--
-- Name: cs_expedientes cs_expedientes_application_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.cs_expedientes
    ADD CONSTRAINT cs_expedientes_application_id_fkey FOREIGN KEY (application_id) REFERENCES public.cs_applications(id);


--
-- Name: cs_financial_balance_detail cs_financial_balance_detail_application_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.cs_financial_balance_detail
    ADD CONSTRAINT cs_financial_balance_detail_application_id_fkey FOREIGN KEY (application_id) REFERENCES public.cs_applications(id) ON DELETE CASCADE;


--
-- Name: cs_financial_balanza cs_financial_balanza_application_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.cs_financial_balanza
    ADD CONSTRAINT cs_financial_balanza_application_id_fkey FOREIGN KEY (application_id) REFERENCES public.cs_applications(id) ON DELETE CASCADE;


--
-- Name: cs_financial_calculations cs_financial_calculations_application_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.cs_financial_calculations
    ADD CONSTRAINT cs_financial_calculations_application_id_fkey FOREIGN KEY (application_id) REFERENCES public.cs_applications(id) ON DELETE CASCADE;


--
-- Name: cs_financial_income_detail cs_financial_income_detail_application_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.cs_financial_income_detail
    ADD CONSTRAINT cs_financial_income_detail_application_id_fkey FOREIGN KEY (application_id) REFERENCES public.cs_applications(id) ON DELETE CASCADE;


--
-- Name: cs_financial_inputs cs_financial_inputs_application_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.cs_financial_inputs
    ADD CONSTRAINT cs_financial_inputs_application_id_fkey FOREIGN KEY (application_id) REFERENCES public.cs_applications(id) ON DELETE CASCADE;


--
-- Name: cs_financial_related_parties cs_financial_related_parties_application_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.cs_financial_related_parties
    ADD CONSTRAINT cs_financial_related_parties_application_id_fkey FOREIGN KEY (application_id) REFERENCES public.cs_applications(id) ON DELETE CASCADE;


--
-- Name: cs_financial_results cs_financial_results_application_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.cs_financial_results
    ADD CONSTRAINT cs_financial_results_application_id_fkey FOREIGN KEY (application_id) REFERENCES public.cs_applications(id) ON DELETE CASCADE;


--
-- Name: cs_fx_exposure cs_fx_exposure_application_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.cs_fx_exposure
    ADD CONSTRAINT cs_fx_exposure_application_id_fkey FOREIGN KEY (application_id) REFERENCES public.cs_applications(id) ON DELETE CASCADE;


--
-- Name: cs_fx_inputs cs_fx_inputs_application_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.cs_fx_inputs
    ADD CONSTRAINT cs_fx_inputs_application_id_fkey FOREIGN KEY (application_id) REFERENCES public.cs_applications(id) ON DELETE CASCADE;


--
-- Name: cs_fx_results cs_fx_results_application_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.cs_fx_results
    ADD CONSTRAINT cs_fx_results_application_id_fkey FOREIGN KEY (application_id) REFERENCES public.cs_applications(id) ON DELETE CASCADE;


--
-- Name: cs_fx_scenarios cs_fx_scenarios_application_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.cs_fx_scenarios
    ADD CONSTRAINT cs_fx_scenarios_application_id_fkey FOREIGN KEY (application_id) REFERENCES public.cs_applications(id) ON DELETE CASCADE;


--
-- Name: cs_guarantee_documents cs_guarantee_documents_application_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.cs_guarantee_documents
    ADD CONSTRAINT cs_guarantee_documents_application_id_fkey FOREIGN KEY (application_id) REFERENCES public.cs_applications(id) ON DELETE CASCADE;


--
-- Name: cs_guarantee_documents cs_guarantee_documents_guarantee_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.cs_guarantee_documents
    ADD CONSTRAINT cs_guarantee_documents_guarantee_id_fkey FOREIGN KEY (guarantee_id) REFERENCES public.cs_guarantee_guarantees(id) ON DELETE CASCADE;


--
-- Name: cs_guarantee_guarantees cs_guarantee_guarantees_application_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.cs_guarantee_guarantees
    ADD CONSTRAINT cs_guarantee_guarantees_application_id_fkey FOREIGN KEY (application_id) REFERENCES public.cs_applications(id) ON DELETE CASCADE;


--
-- Name: cs_guarantee_haircuts cs_guarantee_haircuts_application_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.cs_guarantee_haircuts
    ADD CONSTRAINT cs_guarantee_haircuts_application_id_fkey FOREIGN KEY (application_id) REFERENCES public.cs_applications(id) ON DELETE CASCADE;


--
-- Name: cs_guarantee_haircuts cs_guarantee_haircuts_guarantee_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.cs_guarantee_haircuts
    ADD CONSTRAINT cs_guarantee_haircuts_guarantee_id_fkey FOREIGN KEY (guarantee_id) REFERENCES public.cs_guarantee_guarantees(id) ON DELETE CASCADE;


--
-- Name: cs_guarantee_results cs_guarantee_results_application_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.cs_guarantee_results
    ADD CONSTRAINT cs_guarantee_results_application_id_fkey FOREIGN KEY (application_id) REFERENCES public.cs_applications(id) ON DELETE CASCADE;


--
-- Name: cs_guarantee_valuations cs_guarantee_valuations_application_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.cs_guarantee_valuations
    ADD CONSTRAINT cs_guarantee_valuations_application_id_fkey FOREIGN KEY (application_id) REFERENCES public.cs_applications(id) ON DELETE CASCADE;


--
-- Name: cs_guarantee_valuations cs_guarantee_valuations_guarantee_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.cs_guarantee_valuations
    ADD CONSTRAINT cs_guarantee_valuations_guarantee_id_fkey FOREIGN KEY (guarantee_id) REFERENCES public.cs_guarantee_guarantees(id) ON DELETE CASCADE;


--
-- Name: cs_limit_calculations cs_limit_calculations_application_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.cs_limit_calculations
    ADD CONSTRAINT cs_limit_calculations_application_id_fkey FOREIGN KEY (application_id) REFERENCES public.cs_applications(id) ON DELETE CASCADE;


--
-- Name: cs_metric_values cs_metric_values_application_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.cs_metric_values
    ADD CONSTRAINT cs_metric_values_application_id_fkey FOREIGN KEY (application_id) REFERENCES public.cs_applications(id) ON DELETE CASCADE;


--
-- Name: cs_network_clients_detail cs_network_clients_detail_application_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.cs_network_clients_detail
    ADD CONSTRAINT cs_network_clients_detail_application_id_fkey FOREIGN KEY (application_id) REFERENCES public.cs_applications(id) ON DELETE CASCADE;


--
-- Name: cs_network_concentration cs_network_concentration_application_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.cs_network_concentration
    ADD CONSTRAINT cs_network_concentration_application_id_fkey FOREIGN KEY (application_id) REFERENCES public.cs_applications(id) ON DELETE CASCADE;


--
-- Name: cs_network_counterparties cs_network_counterparties_application_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.cs_network_counterparties
    ADD CONSTRAINT cs_network_counterparties_application_id_fkey FOREIGN KEY (application_id) REFERENCES public.cs_applications(id) ON DELETE CASCADE;


--
-- Name: cs_network_financial_institutions cs_network_financial_institutions_application_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.cs_network_financial_institutions
    ADD CONSTRAINT cs_network_financial_institutions_application_id_fkey FOREIGN KEY (application_id) REFERENCES public.cs_applications(id) ON DELETE CASCADE;


--
-- Name: cs_network_government cs_network_government_application_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.cs_network_government
    ADD CONSTRAINT cs_network_government_application_id_fkey FOREIGN KEY (application_id) REFERENCES public.cs_applications(id) ON DELETE CASCADE;


--
-- Name: cs_network_metrics cs_network_metrics_application_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.cs_network_metrics
    ADD CONSTRAINT cs_network_metrics_application_id_fkey FOREIGN KEY (application_id) REFERENCES public.cs_applications(id) ON DELETE CASCADE;


--
-- Name: cs_network_products cs_network_products_application_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.cs_network_products
    ADD CONSTRAINT cs_network_products_application_id_fkey FOREIGN KEY (application_id) REFERENCES public.cs_applications(id) ON DELETE CASCADE;


--
-- Name: cs_network_results cs_network_results_application_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.cs_network_results
    ADD CONSTRAINT cs_network_results_application_id_fkey FOREIGN KEY (application_id) REFERENCES public.cs_applications(id) ON DELETE CASCADE;


--
-- Name: cs_network_suppliers_detail cs_network_suppliers_detail_application_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.cs_network_suppliers_detail
    ADD CONSTRAINT cs_network_suppliers_detail_application_id_fkey FOREIGN KEY (application_id) REFERENCES public.cs_applications(id) ON DELETE CASCADE;


--
-- Name: cs_policy_audit cs_policy_audit_policy_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.cs_policy_audit
    ADD CONSTRAINT cs_policy_audit_policy_id_fkey FOREIGN KEY (policy_id) REFERENCES public.cs_policies(id) ON DELETE CASCADE;


--
-- Name: cs_policy_versions cs_policy_versions_policy_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.cs_policy_versions
    ADD CONSTRAINT cs_policy_versions_policy_id_fkey FOREIGN KEY (policy_id) REFERENCES public.cs_policies(id) ON DELETE CASCADE;


--
-- Name: cs_portfolio_exposure cs_portfolio_exposure_application_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.cs_portfolio_exposure
    ADD CONSTRAINT cs_portfolio_exposure_application_id_fkey FOREIGN KEY (application_id) REFERENCES public.cs_applications(id) ON DELETE CASCADE;


--
-- Name: cs_portfolio_limits cs_portfolio_limits_application_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.cs_portfolio_limits
    ADD CONSTRAINT cs_portfolio_limits_application_id_fkey FOREIGN KEY (application_id) REFERENCES public.cs_applications(id) ON DELETE CASCADE;


--
-- Name: cs_portfolio_positions cs_portfolio_positions_application_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.cs_portfolio_positions
    ADD CONSTRAINT cs_portfolio_positions_application_id_fkey FOREIGN KEY (application_id) REFERENCES public.cs_applications(id) ON DELETE CASCADE;


--
-- Name: cs_portfolio_results cs_portfolio_results_application_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.cs_portfolio_results
    ADD CONSTRAINT cs_portfolio_results_application_id_fkey FOREIGN KEY (application_id) REFERENCES public.cs_applications(id) ON DELETE CASCADE;


--
-- Name: cs_review_schedule cs_review_schedule_application_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.cs_review_schedule
    ADD CONSTRAINT cs_review_schedule_application_id_fkey FOREIGN KEY (application_id) REFERENCES public.cs_applications(id) ON DELETE CASCADE;


--
-- Name: cs_review_triggers cs_review_triggers_application_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.cs_review_triggers
    ADD CONSTRAINT cs_review_triggers_application_id_fkey FOREIGN KEY (application_id) REFERENCES public.cs_applications(id) ON DELETE CASCADE;


--
-- Name: cs_risk_matrix_results cs_risk_matrix_results_application_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.cs_risk_matrix_results
    ADD CONSTRAINT cs_risk_matrix_results_application_id_fkey FOREIGN KEY (application_id) REFERENCES public.cs_applications(id) ON DELETE CASCADE;


--
-- Name: cs_sat_blacklisted_invoices cs_sat_blacklisted_invoices_application_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.cs_sat_blacklisted_invoices
    ADD CONSTRAINT cs_sat_blacklisted_invoices_application_id_fkey FOREIGN KEY (application_id) REFERENCES public.cs_applications(id) ON DELETE CASCADE;


--
-- Name: cs_sat_data cs_sat_data_application_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.cs_sat_data
    ADD CONSTRAINT cs_sat_data_application_id_fkey FOREIGN KEY (application_id) REFERENCES public.cs_applications(id) ON DELETE CASCADE;


--
-- Name: cs_sat_facturado_vs_declarado cs_sat_facturado_vs_declarado_application_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.cs_sat_facturado_vs_declarado
    ADD CONSTRAINT cs_sat_facturado_vs_declarado_application_id_fkey FOREIGN KEY (application_id) REFERENCES public.cs_applications(id) ON DELETE CASCADE;


--
-- Name: cs_sat_metrics cs_sat_metrics_application_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.cs_sat_metrics
    ADD CONSTRAINT cs_sat_metrics_application_id_fkey FOREIGN KEY (application_id) REFERENCES public.cs_applications(id) ON DELETE CASCADE;


--
-- Name: cs_sat_payment_behavior cs_sat_payment_behavior_application_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.cs_sat_payment_behavior
    ADD CONSTRAINT cs_sat_payment_behavior_application_id_fkey FOREIGN KEY (application_id) REFERENCES public.cs_applications(id) ON DELETE CASCADE;


--
-- Name: cs_sat_product_diversification cs_sat_product_diversification_application_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.cs_sat_product_diversification
    ADD CONSTRAINT cs_sat_product_diversification_application_id_fkey FOREIGN KEY (application_id) REFERENCES public.cs_applications(id) ON DELETE CASCADE;


--
-- Name: cs_sat_results cs_sat_results_application_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.cs_sat_results
    ADD CONSTRAINT cs_sat_results_application_id_fkey FOREIGN KEY (application_id) REFERENCES public.cs_applications(id) ON DELETE CASCADE;


--
-- Name: cs_sat_revenue_quality cs_sat_revenue_quality_application_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.cs_sat_revenue_quality
    ADD CONSTRAINT cs_sat_revenue_quality_application_id_fkey FOREIGN KEY (application_id) REFERENCES public.cs_applications(id) ON DELETE CASCADE;


--
-- Name: cs_scenario_results cs_scenario_results_application_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.cs_scenario_results
    ADD CONSTRAINT cs_scenario_results_application_id_fkey FOREIGN KEY (application_id) REFERENCES public.cs_applications(id) ON DELETE CASCADE;


--
-- Name: cs_scenarios cs_scenarios_application_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.cs_scenarios
    ADD CONSTRAINT cs_scenarios_application_id_fkey FOREIGN KEY (application_id) REFERENCES public.cs_applications(id) ON DELETE CASCADE;


--
-- Name: cs_stability_metrics cs_stability_metrics_application_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.cs_stability_metrics
    ADD CONSTRAINT cs_stability_metrics_application_id_fkey FOREIGN KEY (application_id) REFERENCES public.cs_applications(id) ON DELETE CASCADE;


--
-- Name: cs_stability_results cs_stability_results_application_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.cs_stability_results
    ADD CONSTRAINT cs_stability_results_application_id_fkey FOREIGN KEY (application_id) REFERENCES public.cs_applications(id) ON DELETE CASCADE;


--
-- Name: cs_stability_timeseries cs_stability_timeseries_application_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.cs_stability_timeseries
    ADD CONSTRAINT cs_stability_timeseries_application_id_fkey FOREIGN KEY (application_id) REFERENCES public.cs_applications(id) ON DELETE CASCADE;


--
-- Name: cs_trend_ai_narrative cs_trend_ai_narrative_application_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.cs_trend_ai_narrative
    ADD CONSTRAINT cs_trend_ai_narrative_application_id_fkey FOREIGN KEY (application_id) REFERENCES public.cs_applications(id) ON DELETE CASCADE;


--
-- Name: cs_trend_results cs_trend_results_application_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.cs_trend_results
    ADD CONSTRAINT cs_trend_results_application_id_fkey FOREIGN KEY (application_id) REFERENCES public.cs_applications(id) ON DELETE CASCADE;


--
-- Name: cs_trend_timeseries cs_trend_timeseries_application_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.cs_trend_timeseries
    ADD CONSTRAINT cs_trend_timeseries_application_id_fkey FOREIGN KEY (application_id) REFERENCES public.cs_applications(id) ON DELETE CASCADE;


--
-- Name: cs_workflow_decisions cs_workflow_decisions_application_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.cs_workflow_decisions
    ADD CONSTRAINT cs_workflow_decisions_application_id_fkey FOREIGN KEY (application_id) REFERENCES public.cs_applications(id) ON DELETE CASCADE;


--
-- Name: cs_workflow_overrides cs_workflow_overrides_application_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.cs_workflow_overrides
    ADD CONSTRAINT cs_workflow_overrides_application_id_fkey FOREIGN KEY (application_id) REFERENCES public.cs_applications(id) ON DELETE CASCADE;


--
-- Name: cs_workflow_queue cs_workflow_queue_application_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.cs_workflow_queue
    ADD CONSTRAINT cs_workflow_queue_application_id_fkey FOREIGN KEY (application_id) REFERENCES public.cs_applications(id) ON DELETE CASCADE;


--
-- Name: cs_working_capital_aging cs_working_capital_aging_application_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.cs_working_capital_aging
    ADD CONSTRAINT cs_working_capital_aging_application_id_fkey FOREIGN KEY (application_id) REFERENCES public.cs_applications(id) ON DELETE CASCADE;


--
-- Name: cs_working_capital_cycle cs_working_capital_cycle_application_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.cs_working_capital_cycle
    ADD CONSTRAINT cs_working_capital_cycle_application_id_fkey FOREIGN KEY (application_id) REFERENCES public.cs_applications(id) ON DELETE CASCADE;


--
-- Name: cs_working_capital_inputs cs_working_capital_inputs_application_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.cs_working_capital_inputs
    ADD CONSTRAINT cs_working_capital_inputs_application_id_fkey FOREIGN KEY (application_id) REFERENCES public.cs_applications(id) ON DELETE CASCADE;


--
-- Name: cs_working_capital_results cs_working_capital_results_application_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.cs_working_capital_results
    ADD CONSTRAINT cs_working_capital_results_application_id_fkey FOREIGN KEY (application_id) REFERENCES public.cs_applications(id) ON DELETE CASCADE;


--
-- Name: pi_accounts admin_full_access_pi; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY admin_full_access_pi ON public.pi_accounts USING ((auth.role() = 'admin'::text));


--
-- Name: fx_transactions broker_create_transactions; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY broker_create_transactions ON public.fx_transactions FOR INSERT WITH CHECK ((EXISTS ( SELECT 1
   FROM public.cs_companies_owners
  WHERE ((cs_companies_owners.company_id = fx_transactions.company_id) AND (cs_companies_owners.user_id = auth.uid())))));


--
-- Name: cs_companies broker_own_companies; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY broker_own_companies ON public.cs_companies USING ((EXISTS ( SELECT 1
   FROM public.cs_companies_owners
  WHERE ((cs_companies_owners.company_id = cs_companies.id) AND (cs_companies_owners.user_id = auth.uid())))));


--
-- Name: fx_transactions broker_own_transactions; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY broker_own_transactions ON public.fx_transactions FOR SELECT USING ((EXISTS ( SELECT 1
   FROM public.cs_companies_owners
  WHERE ((cs_companies_owners.company_id = fx_transactions.company_id) AND (cs_companies_owners.user_id = auth.uid())))));


--
-- Name: pi_accounts broker_read_active_pi; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY broker_read_active_pi ON public.pi_accounts FOR SELECT USING ((is_active = true));


--
-- Name: cs_ai_analysis; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.cs_ai_analysis ENABLE ROW LEVEL SECURITY;

--
-- Name: cs_ai_recommendations; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.cs_ai_recommendations ENABLE ROW LEVEL SECURITY;

--
-- Name: cs_ai_scenarios; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.cs_ai_scenarios ENABLE ROW LEVEL SECURITY;

--
-- Name: cs_api_cache; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.cs_api_cache ENABLE ROW LEVEL SECURITY;

--
-- Name: cs_api_cache cs_api_cache_insert; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY cs_api_cache_insert ON public.cs_api_cache FOR INSERT WITH CHECK ((auth.role() = 'authenticated'::text));


--
-- Name: cs_api_cache cs_api_cache_select; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY cs_api_cache_select ON public.cs_api_cache FOR SELECT USING ((auth.role() = 'authenticated'::text));


--
-- Name: cs_api_calls; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.cs_api_calls ENABLE ROW LEVEL SECURITY;

--
-- Name: cs_application_status_log; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.cs_application_status_log ENABLE ROW LEVEL SECURITY;

--
-- Name: cs_applications; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.cs_applications ENABLE ROW LEVEL SECURITY;

--
-- Name: cs_audit_log; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.cs_audit_log ENABLE ROW LEVEL SECURITY;

--
-- Name: cs_audit_log cs_audit_log_insert; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY cs_audit_log_insert ON public.cs_audit_log FOR INSERT WITH CHECK ((auth.role() = 'authenticated'::text));


--
-- Name: cs_benchmark_comparisons; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.cs_benchmark_comparisons ENABLE ROW LEVEL SECURITY;

--
-- Name: cs_benchmark_cross_validation; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.cs_benchmark_cross_validation ENABLE ROW LEVEL SECURITY;

--
-- Name: cs_benchmark_syntage_ratios; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.cs_benchmark_syntage_ratios ENABLE ROW LEVEL SECURITY;

--
-- Name: cs_benchmarks; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.cs_benchmarks ENABLE ROW LEVEL SECURITY;

--
-- Name: cs_benchmarks cs_benchmarks_select; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY cs_benchmarks_select ON public.cs_benchmarks FOR SELECT USING ((auth.role() = 'authenticated'::text));


--
-- Name: cs_buro_active_credits; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.cs_buro_active_credits ENABLE ROW LEVEL SECURITY;

--
-- Name: cs_buro_analysis; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.cs_buro_analysis ENABLE ROW LEVEL SECURITY;

--
-- Name: cs_buro_consultations; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.cs_buro_consultations ENABLE ROW LEVEL SECURITY;

--
-- Name: cs_buro_data; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.cs_buro_data ENABLE ROW LEVEL SECURITY;

--
-- Name: cs_buro_debt_rotation; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.cs_buro_debt_rotation ENABLE ROW LEVEL SECURITY;

--
-- Name: cs_buro_hawk_checks; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.cs_buro_hawk_checks ENABLE ROW LEVEL SECURITY;

--
-- Name: cs_buro_liquidated; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.cs_buro_liquidated ENABLE ROW LEVEL SECURITY;

--
-- Name: cs_buro_results; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.cs_buro_results ENABLE ROW LEVEL SECURITY;

--
-- Name: cs_business_rules; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.cs_business_rules ENABLE ROW LEVEL SECURITY;

--
-- Name: cs_cashflow_calculations; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.cs_cashflow_calculations ENABLE ROW LEVEL SECURITY;

--
-- Name: cs_cashflow_inputs; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.cs_cashflow_inputs ENABLE ROW LEVEL SECURITY;

--
-- Name: cs_cashflow_results; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.cs_cashflow_results ENABLE ROW LEVEL SECURITY;

--
-- Name: cs_cashflow_scenarios; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.cs_cashflow_scenarios ENABLE ROW LEVEL SECURITY;

--
-- Name: cs_companies; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.cs_companies ENABLE ROW LEVEL SECURITY;

--
-- Name: cs_companies_owners; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.cs_companies_owners ENABLE ROW LEVEL SECURITY;

--
-- Name: cs_company_contacts; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.cs_company_contacts ENABLE ROW LEVEL SECURITY;

--
-- Name: cs_company_payment_accounts; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.cs_company_payment_accounts ENABLE ROW LEVEL SECURITY;

--
-- Name: cs_compliance_checks; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.cs_compliance_checks ENABLE ROW LEVEL SECURITY;

--
-- Name: cs_compliance_results; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.cs_compliance_results ENABLE ROW LEVEL SECURITY;

--
-- Name: cs_covenant_monitoring; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.cs_covenant_monitoring ENABLE ROW LEVEL SECURITY;

--
-- Name: cs_covenants; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.cs_covenants ENABLE ROW LEVEL SECURITY;

--
-- Name: cs_credit_limits; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.cs_credit_limits ENABLE ROW LEVEL SECURITY;

--
-- Name: cs_cross_analysis; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.cs_cross_analysis ENABLE ROW LEVEL SECURITY;

--
-- Name: cs_decision_gates; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.cs_decision_gates ENABLE ROW LEVEL SECURITY;

--
-- Name: cs_document_validations; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.cs_document_validations ENABLE ROW LEVEL SECURITY;

--
-- Name: cs_documentation_results; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.cs_documentation_results ENABLE ROW LEVEL SECURITY;

--
-- Name: cs_documents; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.cs_documents ENABLE ROW LEVEL SECURITY;

--
-- Name: cs_employee_headcount; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.cs_employee_headcount ENABLE ROW LEVEL SECURITY;

--
-- Name: cs_employee_payroll; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.cs_employee_payroll ENABLE ROW LEVEL SECURITY;

--
-- Name: cs_employee_productivity; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.cs_employee_productivity ENABLE ROW LEVEL SECURITY;

--
-- Name: cs_employee_results; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.cs_employee_results ENABLE ROW LEVEL SECURITY;

--
-- Name: cs_expediente_events cs_events_insert; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY cs_events_insert ON public.cs_expediente_events FOR INSERT TO authenticated WITH CHECK ((auth.uid() IS NOT NULL));


--
-- Name: cs_expediente_events cs_events_select; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY cs_events_select ON public.cs_expediente_events FOR SELECT TO authenticated USING (true);


--
-- Name: cs_expediente_events; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.cs_expediente_events ENABLE ROW LEVEL SECURITY;

--
-- Name: cs_expediente_tokens; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.cs_expediente_tokens ENABLE ROW LEVEL SECURITY;

--
-- Name: cs_expedientes; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.cs_expedientes ENABLE ROW LEVEL SECURITY;

--
-- Name: cs_expedientes cs_expedientes_anon_select; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY cs_expedientes_anon_select ON public.cs_expedientes FOR SELECT TO anon USING ((id IN ( SELECT cs_expediente_tokens.expediente_id
   FROM public.cs_expediente_tokens
  WHERE ((cs_expediente_tokens.expires_at > now()) AND (NOT cs_expediente_tokens.is_used)))));


--
-- Name: cs_expedientes cs_expedientes_insert; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY cs_expedientes_insert ON public.cs_expedientes FOR INSERT TO authenticated WITH CHECK ((auth.uid() IS NOT NULL));


--
-- Name: cs_expedientes cs_expedientes_select; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY cs_expedientes_select ON public.cs_expedientes FOR SELECT TO authenticated USING (true);


--
-- Name: cs_expedientes cs_expedientes_update; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY cs_expedientes_update ON public.cs_expedientes FOR UPDATE TO authenticated USING ((auth.uid() IS NOT NULL)) WITH CHECK ((auth.uid() IS NOT NULL));


--
-- Name: cs_financial_balance_detail; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.cs_financial_balance_detail ENABLE ROW LEVEL SECURITY;

--
-- Name: cs_financial_balanza; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.cs_financial_balanza ENABLE ROW LEVEL SECURITY;

--
-- Name: cs_financial_calculations; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.cs_financial_calculations ENABLE ROW LEVEL SECURITY;

--
-- Name: cs_financial_income_detail; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.cs_financial_income_detail ENABLE ROW LEVEL SECURITY;

--
-- Name: cs_financial_inputs; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.cs_financial_inputs ENABLE ROW LEVEL SECURITY;

--
-- Name: cs_financial_related_parties; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.cs_financial_related_parties ENABLE ROW LEVEL SECURITY;

--
-- Name: cs_financial_results; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.cs_financial_results ENABLE ROW LEVEL SECURITY;

--
-- Name: cs_fx_exposure; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.cs_fx_exposure ENABLE ROW LEVEL SECURITY;

--
-- Name: cs_fx_inputs; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.cs_fx_inputs ENABLE ROW LEVEL SECURITY;

--
-- Name: cs_fx_results; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.cs_fx_results ENABLE ROW LEVEL SECURITY;

--
-- Name: cs_fx_scenarios; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.cs_fx_scenarios ENABLE ROW LEVEL SECURITY;

--
-- Name: cs_guarantee_documents; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.cs_guarantee_documents ENABLE ROW LEVEL SECURITY;

--
-- Name: cs_guarantee_guarantees; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.cs_guarantee_guarantees ENABLE ROW LEVEL SECURITY;

--
-- Name: cs_guarantee_haircuts; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.cs_guarantee_haircuts ENABLE ROW LEVEL SECURITY;

--
-- Name: cs_guarantee_haircuts cs_guarantee_haircuts_select; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY cs_guarantee_haircuts_select ON public.cs_guarantee_haircuts FOR SELECT USING ((auth.role() = 'authenticated'::text));


--
-- Name: cs_guarantee_results; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.cs_guarantee_results ENABLE ROW LEVEL SECURITY;

--
-- Name: cs_guarantee_valuations; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.cs_guarantee_valuations ENABLE ROW LEVEL SECURITY;

--
-- Name: cs_limit_calculations; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.cs_limit_calculations ENABLE ROW LEVEL SECURITY;

--
-- Name: cs_metric_catalog; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.cs_metric_catalog ENABLE ROW LEVEL SECURITY;

--
-- Name: cs_metric_catalog cs_metric_catalog_select; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY cs_metric_catalog_select ON public.cs_metric_catalog FOR SELECT USING ((auth.role() = 'authenticated'::text));


--
-- Name: cs_metric_values; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.cs_metric_values ENABLE ROW LEVEL SECURITY;

--
-- Name: cs_network_clients_detail; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.cs_network_clients_detail ENABLE ROW LEVEL SECURITY;

--
-- Name: cs_network_concentration; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.cs_network_concentration ENABLE ROW LEVEL SECURITY;

--
-- Name: cs_network_counterparties; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.cs_network_counterparties ENABLE ROW LEVEL SECURITY;

--
-- Name: cs_network_financial_institutions; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.cs_network_financial_institutions ENABLE ROW LEVEL SECURITY;

--
-- Name: cs_network_government; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.cs_network_government ENABLE ROW LEVEL SECURITY;

--
-- Name: cs_network_metrics; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.cs_network_metrics ENABLE ROW LEVEL SECURITY;

--
-- Name: cs_network_products; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.cs_network_products ENABLE ROW LEVEL SECURITY;

--
-- Name: cs_network_results; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.cs_network_results ENABLE ROW LEVEL SECURITY;

--
-- Name: cs_network_suppliers_detail; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.cs_network_suppliers_detail ENABLE ROW LEVEL SECURITY;

--
-- Name: cs_policies; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.cs_policies ENABLE ROW LEVEL SECURITY;

--
-- Name: cs_policies cs_policies_select; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY cs_policies_select ON public.cs_policies FOR SELECT USING ((auth.role() = 'authenticated'::text));


--
-- Name: cs_policy_audit; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.cs_policy_audit ENABLE ROW LEVEL SECURITY;

--
-- Name: cs_policy_audit cs_policy_audit_insert; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY cs_policy_audit_insert ON public.cs_policy_audit FOR INSERT WITH CHECK ((auth.role() = 'authenticated'::text));


--
-- Name: cs_policy_versions; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.cs_policy_versions ENABLE ROW LEVEL SECURITY;

--
-- Name: cs_portfolio_exposure; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.cs_portfolio_exposure ENABLE ROW LEVEL SECURITY;

--
-- Name: cs_portfolio_limits; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.cs_portfolio_limits ENABLE ROW LEVEL SECURITY;

--
-- Name: cs_portfolio_positions; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.cs_portfolio_positions ENABLE ROW LEVEL SECURITY;

--
-- Name: cs_portfolio_results; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.cs_portfolio_results ENABLE ROW LEVEL SECURITY;

--
-- Name: cs_review_schedule; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.cs_review_schedule ENABLE ROW LEVEL SECURITY;

--
-- Name: cs_review_triggers; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.cs_review_triggers ENABLE ROW LEVEL SECURITY;

--
-- Name: cs_risk_matrix_results; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.cs_risk_matrix_results ENABLE ROW LEVEL SECURITY;

--
-- Name: cs_business_rules cs_rules_select; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY cs_rules_select ON public.cs_business_rules FOR SELECT TO authenticated USING (true);


--
-- Name: cs_business_rules cs_rules_update; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY cs_rules_update ON public.cs_business_rules FOR UPDATE TO authenticated USING ((auth.role() = 'admin'::text)) WITH CHECK ((auth.role() = 'admin'::text));


--
-- Name: cs_sat_blacklisted_invoices; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.cs_sat_blacklisted_invoices ENABLE ROW LEVEL SECURITY;

--
-- Name: cs_sat_data; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.cs_sat_data ENABLE ROW LEVEL SECURITY;

--
-- Name: cs_sat_facturado_vs_declarado; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.cs_sat_facturado_vs_declarado ENABLE ROW LEVEL SECURITY;

--
-- Name: cs_sat_metrics; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.cs_sat_metrics ENABLE ROW LEVEL SECURITY;

--
-- Name: cs_sat_payment_behavior; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.cs_sat_payment_behavior ENABLE ROW LEVEL SECURITY;

--
-- Name: cs_sat_product_diversification; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.cs_sat_product_diversification ENABLE ROW LEVEL SECURITY;

--
-- Name: cs_sat_results; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.cs_sat_results ENABLE ROW LEVEL SECURITY;

--
-- Name: cs_sat_revenue_quality; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.cs_sat_revenue_quality ENABLE ROW LEVEL SECURITY;

--
-- Name: cs_scenario_results; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.cs_scenario_results ENABLE ROW LEVEL SECURITY;

--
-- Name: cs_scenarios; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.cs_scenarios ENABLE ROW LEVEL SECURITY;

--
-- Name: cs_scoring_versions; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.cs_scoring_versions ENABLE ROW LEVEL SECURITY;

--
-- Name: cs_scoring_versions cs_scoring_versions_select; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY cs_scoring_versions_select ON public.cs_scoring_versions FOR SELECT USING ((auth.role() = 'authenticated'::text));


--
-- Name: cs_stability_metrics; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.cs_stability_metrics ENABLE ROW LEVEL SECURITY;

--
-- Name: cs_stability_results; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.cs_stability_results ENABLE ROW LEVEL SECURITY;

--
-- Name: cs_stability_timeseries; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.cs_stability_timeseries ENABLE ROW LEVEL SECURITY;

--
-- Name: cs_expediente_tokens cs_tokens_anon_select; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY cs_tokens_anon_select ON public.cs_expediente_tokens FOR SELECT TO anon USING ((expires_at > now()));


--
-- Name: cs_expediente_tokens cs_tokens_anon_update; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY cs_tokens_anon_update ON public.cs_expediente_tokens FOR UPDATE TO anon USING ((expires_at > now())) WITH CHECK ((expires_at > now()));


--
-- Name: cs_expediente_tokens cs_tokens_insert; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY cs_tokens_insert ON public.cs_expediente_tokens FOR INSERT TO authenticated WITH CHECK ((auth.uid() IS NOT NULL));


--
-- Name: cs_expediente_tokens cs_tokens_select; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY cs_tokens_select ON public.cs_expediente_tokens FOR SELECT TO authenticated USING (true);


--
-- Name: cs_expediente_tokens cs_tokens_update; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY cs_tokens_update ON public.cs_expediente_tokens FOR UPDATE TO authenticated USING ((auth.uid() IS NOT NULL)) WITH CHECK ((auth.uid() IS NOT NULL));


--
-- Name: cs_trend_ai_narrative; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.cs_trend_ai_narrative ENABLE ROW LEVEL SECURITY;

--
-- Name: cs_trend_charts_config; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.cs_trend_charts_config ENABLE ROW LEVEL SECURITY;

--
-- Name: cs_trend_charts_config cs_trend_charts_config_select; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY cs_trend_charts_config_select ON public.cs_trend_charts_config FOR SELECT USING ((auth.role() = 'authenticated'::text));


--
-- Name: cs_trend_results; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.cs_trend_results ENABLE ROW LEVEL SECURITY;

--
-- Name: cs_trend_timeseries; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.cs_trend_timeseries ENABLE ROW LEVEL SECURITY;

--
-- Name: cs_workflow_decisions; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.cs_workflow_decisions ENABLE ROW LEVEL SECURITY;

--
-- Name: cs_workflow_overrides; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.cs_workflow_overrides ENABLE ROW LEVEL SECURITY;

--
-- Name: cs_workflow_queue; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.cs_workflow_queue ENABLE ROW LEVEL SECURITY;

--
-- Name: cs_working_capital_aging; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.cs_working_capital_aging ENABLE ROW LEVEL SECURITY;

--
-- Name: cs_working_capital_cycle; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.cs_working_capital_cycle ENABLE ROW LEVEL SECURITY;

--
-- Name: cs_working_capital_inputs; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.cs_working_capital_inputs ENABLE ROW LEVEL SECURITY;

--
-- Name: cs_working_capital_results; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.cs_working_capital_results ENABLE ROW LEVEL SECURITY;

--
-- Name: cs_companies dev_open_delete; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY dev_open_delete ON public.cs_companies FOR DELETE USING (true);


--
-- Name: cs_companies_owners dev_open_delete; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY dev_open_delete ON public.cs_companies_owners FOR DELETE USING (true);


--
-- Name: cs_company_contacts dev_open_delete; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY dev_open_delete ON public.cs_company_contacts FOR DELETE USING (true);


--
-- Name: cs_company_payment_accounts dev_open_delete; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY dev_open_delete ON public.cs_company_payment_accounts FOR DELETE USING (true);


--
-- Name: fx_transactions dev_open_delete; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY dev_open_delete ON public.fx_transactions FOR DELETE USING (true);


--
-- Name: pi_accounts dev_open_delete; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY dev_open_delete ON public.pi_accounts FOR DELETE USING (true);


--
-- Name: cs_companies dev_open_insert; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY dev_open_insert ON public.cs_companies FOR INSERT WITH CHECK (true);


--
-- Name: cs_companies_owners dev_open_insert; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY dev_open_insert ON public.cs_companies_owners FOR INSERT WITH CHECK (true);


--
-- Name: cs_company_contacts dev_open_insert; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY dev_open_insert ON public.cs_company_contacts FOR INSERT WITH CHECK (true);


--
-- Name: cs_company_payment_accounts dev_open_insert; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY dev_open_insert ON public.cs_company_payment_accounts FOR INSERT WITH CHECK (true);


--
-- Name: fx_transactions dev_open_insert; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY dev_open_insert ON public.fx_transactions FOR INSERT WITH CHECK (true);


--
-- Name: pi_accounts dev_open_insert; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY dev_open_insert ON public.pi_accounts FOR INSERT WITH CHECK (true);


--
-- Name: cs_companies dev_open_select; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY dev_open_select ON public.cs_companies FOR SELECT USING (true);


--
-- Name: cs_companies_owners dev_open_select; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY dev_open_select ON public.cs_companies_owners FOR SELECT USING (true);


--
-- Name: cs_company_contacts dev_open_select; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY dev_open_select ON public.cs_company_contacts FOR SELECT USING (true);


--
-- Name: cs_company_payment_accounts dev_open_select; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY dev_open_select ON public.cs_company_payment_accounts FOR SELECT USING (true);


--
-- Name: fx_transactions dev_open_select; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY dev_open_select ON public.fx_transactions FOR SELECT USING (true);


--
-- Name: pi_accounts dev_open_select; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY dev_open_select ON public.pi_accounts FOR SELECT USING (true);


--
-- Name: cs_companies dev_open_update; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY dev_open_update ON public.cs_companies FOR UPDATE USING (true) WITH CHECK (true);


--
-- Name: cs_companies_owners dev_open_update; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY dev_open_update ON public.cs_companies_owners FOR UPDATE USING (true) WITH CHECK (true);


--
-- Name: cs_company_contacts dev_open_update; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY dev_open_update ON public.cs_company_contacts FOR UPDATE USING (true) WITH CHECK (true);


--
-- Name: cs_company_payment_accounts dev_open_update; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY dev_open_update ON public.cs_company_payment_accounts FOR UPDATE USING (true) WITH CHECK (true);


--
-- Name: fx_transactions dev_open_update; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY dev_open_update ON public.fx_transactions FOR UPDATE USING (true) WITH CHECK (true);


--
-- Name: pi_accounts dev_open_update; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY dev_open_update ON public.pi_accounts FOR UPDATE USING (true) WITH CHECK (true);


--
-- Name: fx_transactions; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.fx_transactions ENABLE ROW LEVEL SECURITY;

--
-- Name: pi_accounts; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.pi_accounts ENABLE ROW LEVEL SECURITY;

--
-- PostgreSQL database dump complete
--