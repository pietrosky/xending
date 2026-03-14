-- Credit Scoring: API calls and cache

CREATE TABLE IF NOT EXISTS cs_api_calls (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  application_id uuid REFERENCES cs_applications(id) ON DELETE SET NULL,
  provider text NOT NULL CHECK (provider IN ('scory', 'syntage', 'openai')),
  endpoint text NOT NULL,
  status_code int,
  latency_ms int,
  error_message text,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS cs_api_cache (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  provider text NOT NULL,
  endpoint text NOT NULL,
  rfc text NOT NULL,
  response_data jsonb NOT NULL,
  expires_at timestamptz NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_cs_api_calls_app ON cs_api_calls(application_id);
CREATE INDEX IF NOT EXISTS idx_cs_api_calls_provider ON cs_api_calls(provider, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_cs_api_cache_lookup ON cs_api_cache(provider, endpoint, rfc);
CREATE INDEX IF NOT EXISTS idx_cs_api_cache_expiry ON cs_api_cache(expires_at);

-- RLS
ALTER TABLE cs_api_calls ENABLE ROW LEVEL SECURITY;
ALTER TABLE cs_api_cache ENABLE ROW LEVEL SECURITY;
