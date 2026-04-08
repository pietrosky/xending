/**
 * Re-export postgrest client as `supabase` for backward compatibility.
 * All existing imports of `supabase` from this module continue to work
 * without changing any consumer files.
 */
import { postgrest } from './postgrest';

export const supabase = postgrest;
