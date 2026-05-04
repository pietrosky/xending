/// <reference types="vite/client" />

interface ImportMetaEnv {
  readonly VITE_SUPABASE_URL?: string;
  readonly VITE_SUPABASE_ANON_KEY?: string;
  readonly VITE_SYNTAGE_API_KEY?: string;
  readonly VITE_SYNTAGE_API_URL?: string;
  readonly VITE_SCORY_API_KEY?: string;
  readonly VITE_SCORY_API_URL?: string;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}
