/**
 * Servicio de archivos — Upload/download de comprobantes FX.
 *
 * Valida tipo MIME y tamaño, sube archivos a Supabase Storage bucket `fx-proofs`,
 * actualiza la transacción con la URL del comprobante y permite obtener la URL pública.
 *
 * Req 8.1, 8.2, 8.4, 8.5
 */

import { supabase } from '@/lib/supabase';

// ─── Constantes ──────────────────────────────────────────────────────

export const ALLOWED_MIME_TYPES = ['image/jpeg', 'image/png', 'application/pdf'];
export const MAX_FILE_SIZE = 10 * 1024 * 1024; // 10 MB

// ─── Validación ──────────────────────────────────────────────────────

/**
 * Valida que el archivo tenga un tipo MIME permitido (JPEG, PNG, PDF)
 * y que su tamaño no exceda 10 MB.
 *
 * Req 8.4, 8.5
 */
export function validateFile(file: File): { valid: boolean; error?: string } {
  if (!ALLOWED_MIME_TYPES.includes(file.type)) {
    return {
      valid: false,
      error: 'Solo se aceptan archivos JPEG, PNG o PDF',
    };
  }

  if (file.size > MAX_FILE_SIZE) {
    return {
      valid: false,
      error: 'El archivo excede el tamaño máximo de 10 MB',
    };
  }

  return { valid: true };
}

// ─── Upload ──────────────────────────────────────────────────────────

/**
 * Sube un comprobante a Supabase Storage en `fx-proofs/{transactionId}/{filename}`,
 * luego actualiza `proof_url` y `status` a `'completed'` en `fx_transactions`.
 * Retorna la URL pública del archivo subido.
 *
 * Req 8.1, 8.2
 */
export async function uploadProof(transactionId: string, file: File): Promise<string> {
  const validation = validateFile(file);
  if (!validation.valid) {
    throw new Error(validation.error);
  }

  const extension = file.name.split('.').pop()?.toLowerCase() ?? 'bin';
  const safeName = file.name
    .replace(/\.[^.]+$/, '')
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9_-]+/g, '-')
    .replace(/^-+|-+$/g, '') || 'proof';
  const filePath = `${transactionId}/${Date.now()}-${safeName}.${extension}`;

  const { error: uploadError } = await supabase.storage
    .from('fx-proofs')
    .upload(filePath, file, {
      contentType: file.type,
      upsert: false,
    });

  if (uploadError) {
    throw new Error(`Error al subir comprobante: ${uploadError.message}`);
  }

  const { data: publicUrlData } = supabase.storage
    .from('fx-proofs')
    .getPublicUrl(filePath);

  const proofUrl = publicUrlData.publicUrl;

  // Update transaction with proof_url and status = 'completed'
  const { error: updateError } = await supabase
    .from('fx_transactions')
    .update({
      proof_url: proofUrl,
      status: 'completed',
      updated_at: new Date().toISOString(),
    })
    .eq('id', transactionId);

  if (updateError) {
    throw new Error(`Error al actualizar transacción: ${updateError.message}`);
  }

  return proofUrl;
}

// ─── Download ────────────────────────────────────────────────────────

/**
 * Retorna la URL pública del comprobante de una transacción,
 * o null si no tiene comprobante cargado.
 *
 * Req 8.2
 */
export async function getProofUrl(transactionId: string): Promise<string | null> {
  const { data, error } = await supabase
    .from('fx_transactions')
    .select('proof_url')
    .eq('id', transactionId)
    .single();

  if (error) {
    if (error.code === 'PGRST116') return null; // Not found
    throw new Error(`Error al obtener comprobante: ${error.message}`);
  }

  return (data?.proof_url as string) ?? null;
}
