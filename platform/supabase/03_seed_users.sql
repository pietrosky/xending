-- seed_users.sql — Local dev users for PostgREST JWT auth
-- Must run BEFORE seed_jwt_login.sql (which adds the role column and login function)

CREATE TABLE IF NOT EXISTS local_users (
    id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    email       TEXT UNIQUE NOT NULL,
    password    TEXT NOT NULL,
    full_name   TEXT NOT NULL,
    role        TEXT NOT NULL DEFAULT 'broker',
    created_at  TIMESTAMPTZ NOT NULL DEFAULT now()
);

INSERT INTO local_users (email, password, full_name, role) VALUES
    ('admin@xending.local',   'admin123',  'Admin Xending',   'admin'),
    ('broker@xending.local',  'broker123', 'Broker Xending',  'broker'),
    ('broker2@xending.local', 'broker123', 'Broker 2 Xending','broker')
ON CONFLICT (email) DO UPDATE SET
    password  = EXCLUDED.password,
    full_name = EXCLUDED.full_name,
    role      = EXCLUDED.role;
