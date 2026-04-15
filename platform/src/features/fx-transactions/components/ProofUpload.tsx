/**
 * ProofUpload — Drag-and-drop para comprobante de pago FX.
 *
 * Zona de arrastrar y soltar + botón de selección de archivo.
 * Valida tipo (JPEG, PNG, PDF) y tamaño (≤ 10 MB) antes de subir.
 * Muestra barra de progreso durante la carga.
 * Muestra enlace de descarga cuando existe comprobante.
 * Deshabilitado si la transacción no está autorizada.
 *
 * Requerimientos: 8.1, 8.2, 8.3, 8.4, 8.5, 7.2, 7.3
 */

import { useCallback, useRef, useState } from 'react';
import { useFileUpload } from '../hooks/useFileUpload';
import { validateFile } from '../services/fileService';

export interface ProofUploadProps {
  transactionId: string;
  isAuthorized: boolean;
  existingProofUrl: string | null;
  onUploadComplete: (url: string) => void;
}

export function ProofUpload({
  transactionId,
  isAuthorized,
  existingProofUrl,
  onUploadComplete,
}: ProofUploadProps) {
  const { upload, status, error: uploadError, reset } = useFileUpload();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [validationError, setValidationError] = useState<string | null>(null);
  const [isDragOver, setIsDragOver] = useState(false);

  const handleFile = useCallback(
    (file: File) => {
      setValidationError(null);
      reset();

      const validation = validateFile(file);
      if (!validation.valid) {
        setValidationError(validation.error ?? 'Archivo inválido');
        return;
      }

      upload(
        { transactionId, file },
        {
          onSuccess: (url) => {
            onUploadComplete(url);
          },
        },
      );
    },
    [transactionId, upload, reset, onUploadComplete],
  );

  const handleDrop = useCallback(
    (e: React.DragEvent<HTMLDivElement>) => {
      e.preventDefault();
      setIsDragOver(false);
      if (!isAuthorized) return;

      const file = e.dataTransfer.files[0];
      if (file) handleFile(file);
    },
    [isAuthorized, handleFile],
  );

  const handleDragOver = useCallback(
    (e: React.DragEvent<HTMLDivElement>) => {
      e.preventDefault();
      if (isAuthorized) setIsDragOver(true);
    },
    [isAuthorized],
  );

  const handleDragLeave = useCallback(() => {
    setIsDragOver(false);
  }, []);

  const handleInputChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const file = e.target.files?.[0];
      if (file) handleFile(file);
      // Reset input so the same file can be re-selected
      if (fileInputRef.current) fileInputRef.current.value = '';
    },
    [handleFile],
  );

  const displayError = validationError ?? uploadError;

  // ─── Disabled state (not authorized) ────────────────────────────
  if (!isAuthorized) {
    return (
      <div className="rounded-lg border-2 border-dashed border-gray-200 bg-gray-50 p-6 text-center opacity-60">
        <svg className="mx-auto h-8 w-8 text-gray-300" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 15v-3m0 0V9m0 3h3m-3 0H9m12 0a9 9 0 11-18 0 9 9 0 0118 0z" />
        </svg>
        <p className="mt-2 text-sm font-medium text-gray-400">Autorización requerida</p>
        <p className="text-xs text-gray-400">La transacción debe ser autorizada antes de cargar un comprobante</p>
      </div>
    );
  }

  // ─── Uploading state ────────────────────────────────────────────
  if (status === 'uploading') {
    return (
      <div className="rounded-lg border-2 border-dashed border-primary/30 bg-primary/5 p-6 text-center">
        <div className="mx-auto mb-3 h-8 w-8 border-3 border-primary/30 border-t-primary rounded-full animate-spin" />
        <p className="text-sm font-medium text-primary">Subiendo comprobante...</p>
        <div className="mt-3 mx-auto w-48 h-2 bg-gray-200 rounded-full overflow-hidden">
          <div className="h-full bg-primary rounded-full animate-pulse w-2/3" />
        </div>
      </div>
    );
  }

  // ─── Existing proof (download link + re-upload option) ──────────
  if (existingProofUrl && status !== 'error') {
    return (
      <div className="rounded-lg border border-green-200 bg-green-50 p-4">
        <div className="flex items-center justify-between gap-3">
          <div className="flex items-center gap-2 min-w-0">
            <svg className="h-5 w-5 flex-shrink-0 text-green-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            <a
              href={existingProofUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="text-sm font-medium text-green-700 underline hover:text-green-800 truncate"
            >
              Descargar comprobante
            </a>
          </div>
          <button
            type="button"
            onClick={() => fileInputRef.current?.click()}
            className="flex-shrink-0 rounded-md bg-white px-3 py-1.5 text-xs font-medium text-gray-700 shadow-sm ring-1 ring-gray-300 hover:bg-gray-50 transition-colors"
          >
            Reemplazar
          </button>
        </div>
        <input
          ref={fileInputRef}
          type="file"
          accept=".jpg,.jpeg,.png,.pdf"
          className="hidden"
          onChange={handleInputChange}
        />
      </div>
    );
  }

  // ─── Drop zone (authorized, no proof yet or error) ──────────────
  return (
    <div>
      <div
        onDrop={handleDrop}
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        className={
          'rounded-lg border-2 border-dashed p-6 text-center transition-colors cursor-pointer ' +
          (isDragOver
            ? 'border-primary bg-primary/5'
            : displayError
              ? 'border-red-300 bg-red-50'
              : 'border-gray-300 bg-white hover:border-gray-400')
        }
        onClick={() => fileInputRef.current?.click()}
        role="button"
        tabIndex={0}
        onKeyDown={(e) => {
          if (e.key === 'Enter' || e.key === ' ') {
            e.preventDefault();
            fileInputRef.current?.click();
          }
        }}
        aria-label="Zona de carga de comprobante"
      >
        <svg className="mx-auto h-8 w-8 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" />
        </svg>
        <p className="mt-2 text-sm font-medium text-gray-600">
          Arrastra tu comprobante aquí
        </p>
        <p className="mt-1 text-xs text-gray-500">
          o haz clic para seleccionar — JPEG, PNG o PDF (máx. 10 MB)
        </p>
      </div>

      {displayError && (
        <p className="mt-2 text-sm text-red-600">{displayError}</p>
      )}

      <input
        ref={fileInputRef}
        type="file"
        accept=".jpg,.jpeg,.png,.pdf"
        className="hidden"
        onChange={handleInputChange}
      />
    </div>
  );
}
