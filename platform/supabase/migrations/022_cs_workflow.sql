-- Credit Scoring: Workflow Queue, Decisions & Overrides (Decision Layer)

CREATE TABLE IF NOT EXISTS cs_workflow_queue (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  application_id uuid NOT NULL REFERENCES cs_applications(id) ON DELETE CASCADE,
  assigned_to uuid,
  level text NOT NULL,
  sla_deadline timestamptz,
  status text NOT NULL DEFAULT 'pending',
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS cs_workflow_decisions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  application_id uuid NOT NULL REFERENCES cs_applications(id) ON DELETE CASCADE,
  decision text NOT NULL,
  decided_by uuid,
  conditions jsonb NOT NULL DEFAULT '{}',
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS cs_workflow_overrides (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  application_id uuid NOT NULL REFERENCES cs_applications(id) ON DELETE CASCADE,
  override_reason text NOT NULL,
  approved_by uuid,
  created_at timestamptz NOT NULL DEFAULT now()
);

-- Indexes
CREATE INDEX idx_cs_workflow_queue_app ON cs_workflow_queue(application_id);
CREATE INDEX idx_cs_workflow_decisions_app ON cs_workflow_decisions(application_id);
CREATE INDEX idx_cs_workflow_overrides_app ON cs_workflow_overrides(application_id);

-- RLS
ALTER TABLE cs_workflow_queue ENABLE ROW LEVEL SECURITY;
ALTER TABLE cs_workflow_decisions ENABLE ROW LEVEL SECURITY;
ALTER TABLE cs_workflow_overrides ENABLE ROW LEVEL SECURITY;
