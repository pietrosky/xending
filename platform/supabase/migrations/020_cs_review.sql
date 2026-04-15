-- Credit Scoring: Review Schedule & Review Triggers (Decision Layer)

CREATE TABLE IF NOT EXISTS cs_review_schedule (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  application_id uuid NOT NULL REFERENCES cs_applications(id) ON DELETE CASCADE,
  frequency text NOT NULL,
  next_review timestamptz,
  triggers jsonb NOT NULL DEFAULT '[]',
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS cs_review_triggers (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  application_id uuid NOT NULL REFERENCES cs_applications(id) ON DELETE CASCADE,
  trigger_type text NOT NULL,
  trigger_condition jsonb NOT NULL DEFAULT '{}',
  is_active boolean NOT NULL DEFAULT true,
  last_triggered_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now()
);

-- Indexes
CREATE INDEX idx_cs_review_schedule_app ON cs_review_schedule(application_id);
CREATE INDEX idx_cs_review_triggers_app ON cs_review_triggers(application_id);

-- RLS
ALTER TABLE cs_review_schedule ENABLE ROW LEVEL SECURITY;
ALTER TABLE cs_review_triggers ENABLE ROW LEVEL SECURITY;
