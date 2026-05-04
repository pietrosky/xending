import { createClient } from '@supabase/supabase-js';

function getRequiredEnvValue(name: string, value: string | undefined): string {
  const normalized = value?.trim().replace(/^['"]|['"]$/g, '');
  if (!normalized) {
    throw new Error(`Missing required environment variable: ${name}`);
  }
  return normalized;
}

const supabaseUrl = getRequiredEnvValue('VITE_SUPABASE_URL', import.meta.env.VITE_SUPABASE_URL);

const supabaseAnonKey = getRequiredEnvValue(
  'VITE_SUPABASE_ANON_KEY',
  import.meta.env.VITE_SUPABASE_ANON_KEY,
);

try {
  const parsedUrl = new URL(supabaseUrl);
  if (!['http:', 'https:'].includes(parsedUrl.protocol)) {
    throw new Error('Invalid protocol');
  }
} catch {
  throw new Error(
    `Invalid VITE_SUPABASE_URL: expected an HTTP(S) URL, received "${supabaseUrl || '(empty)'}"`,
  );
}

export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  auth: {
    persistSession: true,
    autoRefreshToken: true,
    detectSessionInUrl: true,
  },
});
