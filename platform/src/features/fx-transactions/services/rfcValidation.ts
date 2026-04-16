import { supabase } from '@/lib/supabase';

/**
 * Checks if an RFC already exists in cs_companies.
 * Optionally excludes a specific company ID (for edit mode).
 */
export async function checkRFCExists(
  rfc: string,
  excludeCompanyId?: string,
): Promise<boolean> {
  let query = supabase
    .from('cs_companies')
    .select('id')
    .eq('rfc', rfc.toUpperCase())
    .limit(1);

  if (excludeCompanyId) {
    query = query.neq('id', excludeCompanyId);
  }

  const { data, error } = await query;
  if (error) throw new Error(`Error checking RFC: ${error.message}`);
  return ((data as unknown[] | null)?.length ?? 0) > 0;
}
