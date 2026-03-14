import { supabase } from '@/lib/supabase';

// ============================================================
// Syntage API Client — Real endpoints
// Base: /entities/{entityId}/...
// Auth: X-API-Key header
// Format: JSON-LD (hydra:member for collections)
// ============================================================

// ============================================================
// Config
// ============================================================

const PROVIDER = 'syntage';
const MAX_RETRIES = 3;
const CACHE_HOURS = 24;

function getEntityId(): string {
  return import.meta.env.VITE_SYNTAGE_ENTITY_ID ?? '';
}

// ============================================================
// Hydra collection wrapper (JSON-LD pagination)
// ============================================================

export interface HydraCollection<T> {
  '@context'?: string;
  '@id'?: string;
  '@type'?: string;
  'hydra:totalItems': number;
  'hydra:member': T[];
  'hydra:view'?: {
    '@id': string;
    'hydra:first'?: string;
    'hydra:last'?: string;
    'hydra:next'?: string;
    'hydra:previous'?: string;
  };
}

// ============================================================
// GRUPO 1: Tipos — Datos Crudos SAT
// ============================================================

export interface SyntageInvoice {
  '@id'?: string;
  id: string;
  uuid: string;
  type: 'I' | 'E' | 'P' | 'N' | 'T';
  subtotal: number;
  total: number;
  currency: string;
  exchangeRate: number | null;
  paymentMethod: 'PUE' | 'PPD' | string;
  status: string;
  issuedAt: string;
  certifiedAt: string;
  cancelledAt: string | null;
  issuer: {
    rfc: string;
    name: string;
    taxRegime: string;
    blacklistStatus: string | null;
  };
  receiver: {
    rfc: string;
    name: string;
    blacklistStatus: string | null;
  };
  usoCfdi: string;
}
