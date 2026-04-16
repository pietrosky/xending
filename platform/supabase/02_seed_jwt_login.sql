-- JWT login function for PostgREST RPC
CREATE EXTENSION IF NOT EXISTS pgcrypto;

ALTER TABLE local_users ADD COLUMN IF NOT EXISTS role TEXT DEFAULT 'broker';
UPDATE local_users SET role = 'admin' WHERE email = 'admin@xending.local';
UPDATE local_users SET role = 'broker' WHERE role IS NULL;

CREATE OR REPLACE FUNCTION login(email_input TEXT, password_input TEXT)
RETURNS JSON AS $$
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
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public, extensions;

GRANT EXECUTE ON FUNCTION login(TEXT, TEXT) TO anon;
