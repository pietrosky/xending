-- Credit Scoring: Policies, Policy Versions & Policy Audit (Decision Layer)

CREATE TABLE IF NOT EXISTS cs_policies (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  policy_name text NOT NULL UNIQUE,
  config jsonb NOT NULL DEFAULT '{}',
  effective_date timestamptz NOT NULL DEFAULT now(),
  version text NOT NULL DEFAULT '1.0',
  active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS cs_policy_versions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  policy_id uuid NOT NULL REFERENCES cs_policies(id) ON DELETE CASCADE,
  old_config jsonb NOT NULL DEFAULT '{}',
  new_config jsonb NOT NULL DEFAULT '{}',
  changed_by uuid,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS cs_policy_audit (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  policy_id uuid NOT NULL REFERENCES cs_policies(id) ON DELETE CASCADE,
  action text NOT NULL,
  details jsonb NOT NULL DEFAULT '{}',
  user_id uuid,
  created_at timestamptz NOT NULL DEFAULT now()
);

-- Indexes
CREATE INDEX idx_cs_policy_versions_policy ON cs_policy_versions(policy_id);
CREATE INDEX idx_cs_policy_audit_policy ON cs_policy_audit(policy_id);

-- RLS
ALTER TABLE cs_policies ENABLE ROW LEVEL SECURITY;
ALTER TABLE cs_policy_versions ENABLE ROW LEVEL SECURITY;
ALTER TABLE cs_policy_audit ENABLE ROW LEVEL SECURITY;
