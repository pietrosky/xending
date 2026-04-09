DO $$ BEGIN
  IF NOT EXISTS (SELECT FROM pg_roles WHERE rolname = 'broker') THEN
    CREATE ROLE broker NOLOGIN;
  END IF;
  IF NOT EXISTS (SELECT FROM pg_roles WHERE rolname = 'admin') THEN
    CREATE ROLE admin NOLOGIN;
  END IF;
END $$;

-- Grant same table permissions as anon
GRANT anon TO broker;
GRANT anon TO admin;

-- Allow authenticator to switch to these roles
GRANT broker TO authenticator;
GRANT admin TO authenticator;
