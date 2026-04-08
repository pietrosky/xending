/**
 * React Query hook para carga de comprobantes FX (Xending Capital).
 *
 * useFileUpload() — mutation para subir comprobante con estado de progreso.
 * Estados: idle, uploading, success, error.
 *
 * Req 8.1, 8.2, 8.3
 */

import { useMutation, useQueryClient } from '@tanstack/react-query';
import { uploadProof } from '../services/fileService';

type UploadStatus = 'idle' | 'uploading' | 'success' | 'error';

export function useFileUpload() {
  const qc = useQueryClient();

  const mutation = useMutation({
    mutationFn: ({ transactionId, file }: { transactionId: string; file: File }) =>
      uploadProof(transactionId, file),
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: ['transactions-fx'] });
    },
  });

  const status: UploadStatus = mutation.isPending
    ? 'uploading'
    : mutation.isSuccess
      ? 'success'
      : mutation.isError
        ? 'error'
        : 'idle';

  return {
    upload: mutation.mutate,
    uploadAsync: mutation.mutateAsync,
    status,
    error: mutation.error?.message ?? null,
    proofUrl: mutation.data ?? null,
    reset: mutation.reset,
  };
}
