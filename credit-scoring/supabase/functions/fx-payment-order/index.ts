// fx-payment-order — Supabase Edge Function
//
// Generates a PDF payment order using HTML templates (Monex / Xending / Generic).
// Receives deal data via POST, renders HTML with embedded CSS, converts to PDF
// using Deno's built-in capabilities, and returns the PDF binary.
//
// POST { partner: string, dealData: Record<string, unknown> }

import { createClient, SupabaseClient } from 'https://esm.sh/@supabase/supabase-js@2';
import { TemplateService } from './templateService.ts';

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

const CORS_HEADERS: Record<string, string> = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization',
};

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

interface PaymentOrderRequest {
  partner: string;
  dealData: Record<string, unknown>;
}

// ---------------------------------------------------------------------------
// Utilities
// ---------------------------------------------------------------------------

function jsonResponse(body: unknown, status: number): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { 'Content-Type': 'application/json', ...CORS_HEADERS },
  });
}

function pdfResponse(pdfBytes: Uint8Array, filename: string): Response {
  return new Response(pdfBytes, {
    status: 200,
    headers: {
      'Content-Type': 'application/pdf',
      'Content-Disposition': `attachment; filename="${filename}"`,
      ...CORS_HEADERS,
    },
  });
}

function htmlResponse(html: string): Response {
  return new Response(html, {
    status: 200,
    headers: {
      'Content-Type': 'text/html; charset=utf-8',
      ...CORS_HEADERS,
    },
  });
}

function getSupabaseClient(): SupabaseClient {
  const url = Deno.env.get('SUPABASE_URL');
  const serviceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');
  if (!url || !serviceKey) {
    throw new Error('Missing SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY env vars');
  }
  return createClient(url, serviceKey);
}

async function validateAuth(req: Request): Promise<boolean> {
  const authHeader = req.headers.get('Authorization');
  if (!authHeader?.startsWith('Bearer ')) return false;

  try {
    const sb = getSupabaseClient();
    const token = authHeader.replace('Bearer ', '');
    const { data, error } = await sb.auth.getUser(token);
    return !error && !!data?.user;
  } catch {
    return false;
  }
}

// ---------------------------------------------------------------------------
// Request handler
// ---------------------------------------------------------------------------

async function handleRequest(body: PaymentOrderRequest): Promise<Response> {
  const { partner, dealData } = body;

  // Validate partner
  if (!partner || !TemplateService.isValidPartner(partner)) {
    const available = TemplateService.getAvailablePartners().join(', ');
    return jsonResponse(
      { error: `Invalid partner: "${partner}". Available: ${available}` },
      400,
    );
  }

  // Generate HTML
  const html = TemplateService.generateHTML(partner, dealData);

  // Return HTML with instructions for client-side PDF conversion
  // The client will use this HTML to generate the PDF via html2canvas/jsPDF
  // or render it in an iframe for printing
  return htmlResponse(html);
}

// ---------------------------------------------------------------------------
// Deno.serve entry point
// ---------------------------------------------------------------------------

Deno.serve(async (req: Request): Promise<Response> => {
  // CORS preflight
  if (req.method === 'OPTIONS') {
    return new Response(null, { status: 204, headers: CORS_HEADERS });
  }

  if (req.method !== 'POST') {
    return jsonResponse({ error: 'Method not allowed' }, 405);
  }

  // Auth validation (skip in local dev if no auth header)
  const authHeader = req.headers.get('Authorization');
  if (authHeader) {
    const isValid = await validateAuth(req);
    if (!isValid) {
      return jsonResponse({ error: 'Unauthorized' }, 401);
    }
  }

  try {
    const body = (await req.json()) as PaymentOrderRequest;

    if (!body.partner) {
      return jsonResponse({ error: 'Missing required field: partner' }, 400);
    }
    if (!body.dealData) {
      return jsonResponse({ error: 'Missing required field: dealData' }, 400);
    }

    return await handleRequest(body);
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Internal server error';
    console.error('[fx-payment-order] Error:', message);
    return jsonResponse({ error: message }, 500);
  }
});
