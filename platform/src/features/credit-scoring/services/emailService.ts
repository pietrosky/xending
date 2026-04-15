/**
 * Servicio de Emails — Templates y envío para el flujo de expedientes.
 *
 * Genera emails con branding Xending para cada etapa del flujo:
 * - Bienvenida (expediente creado, pasó pre-filtro)
 * - Link Buró (firma de autorización)
 * - Link CIEC (vinculación SAT)
 * - Link documentos (subida de documentación)
 * - Reminder (token próximo a expirar)
 * - Rechazo (solicitud no aprobada)
 * - Aprobación (crédito aprobado)
 *
 * NOTA: El envío real se implementa después (SMTP/SES).
 * Por ahora genera el contenido y lo loguea.
 */

import type { Expediente, TokenPurpose } from '../types/expediente.types';
import type { ExpedienteToken } from '../types/expediente.types';
import { STAGE_LABELS } from '../lib/expedienteStateMachine';
import { getTokenUrl } from './tokenService';

// ─── Tipos ───────────────────────────────────────────────────────────

/** Tipo de email que se puede enviar */
export type EmailTemplate =
  | 'welcome'
  | 'buro_link'
  | 'ciec_link'
  | 'document_link'
  | 'reminder'
  | 'rejection'
  | 'approval';

/** Email generado listo para enviar */
export interface GeneratedEmail {
  to: string;
  subject: string;
  htmlBody: string;
  textBody: string;
  template: EmailTemplate;
  metadata: {
    expedienteId: string;
    folio: string;
    tokenId?: string;
  };
}

/** Resultado de envío */
export interface SendResult {
  success: boolean;
  messageId?: string;
  error?: string;
}

// ─── Branding Xending ────────────────────────────────────────────────

const BRAND = {
  name: 'Xending Capital',
  primaryColor: '#1a3a5c',
  accentColor: '#2563eb',
  logoUrl: 'https://credit.xending.com/assets/logoxending.png',
  supportEmail: 'soporte@xending.com',
  website: 'https://xending.com',
} as const;

// ─── Layout HTML base ────────────────────────────────────────────────

function wrapInLayout(title: string, content: string): string {
  return `<!DOCTYPE html>
<html lang="es">
<head><meta charset="UTF-8"><meta name="viewport" content="width=device-width,initial-scale=1">
<title>${title}</title></head>
<body style="margin:0;padding:0;background:#f4f4f5;font-family:Arial,Helvetica,sans-serif">
<table width="100%" cellpadding="0" cellspacing="0" style="background:#f4f4f5;padding:24px 0">
<tr><td align="center">
<table width="600" cellpadding="0" cellspacing="0" style="background:#fff;border-radius:8px;overflow:hidden">
<tr><td style="background:${BRAND.primaryColor};padding:24px;text-align:center">
<img src="${BRAND.logoUrl}" alt="${BRAND.name}" height="40" style="height:40px">
</td></tr>
<tr><td style="padding:32px 24px">${content}</td></tr>
<tr><td style="background:#f9fafb;padding:16px 24px;text-align:center;font-size:12px;color:#6b7280">
<p>${BRAND.name} | <a href="${BRAND.website}" style="color:${BRAND.accentColor}">${BRAND.website}</a></p>
<p>Este es un correo automatico. Para dudas: <a href="mailto:${BRAND.supportEmail}" style="color:${BRAND.accentColor}">${BRAND.supportEmail}</a></p>
</td></tr>
</table>
</td></tr></table>
</body></html>`;
}

function ctaButton(url: string, label: string): string {
  return `<table width="100%" cellpadding="0" cellspacing="0" style="margin:24px 0">
<tr><td align="center">
<a href="${url}" style="display:inline-block;padding:12px 32px;background:${BRAND.accentColor};color:#fff;text-decoration:none;border-radius:6px;font-weight:bold;font-size:14px">${label}</a>
</td></tr></table>`;
}

// ─── Generadores de templates ────────────────────────────────────────

function generateWelcome(exp: Expediente): GeneratedEmail {
  const subject = `${BRAND.name} — Solicitud ${exp.folio} recibida`;
  const html = wrapInLayout(subject, `
    <h2 style="color:${BRAND.primaryColor};margin:0 0 16px">Solicitud recibida</h2>
    <p>Hola,</p>
    <p>Hemos recibido la solicitud de credito <strong>${exp.folio}</strong> para <strong>${exp.company_name}</strong>.</p>
    <p>El pre-filtro ha sido aprobado y su solicitud avanza a la siguiente etapa: <strong>${STAGE_LABELS.pld_check}</strong>.</p>
    <p style="margin-top:16px">Le notificaremos cuando necesitemos informacion adicional.</p>
    <p style="color:#6b7280;font-size:13px;margin-top:24px">Folio: ${exp.folio} | RFC: ${exp.rfc} | Monto: ${exp.currency} ${exp.requested_amount.toLocaleString()}</p>
  `);
  const text = `Solicitud ${exp.folio} recibida para ${exp.company_name}. Pre-filtro aprobado.`;
  return { to: exp.contact_email, subject, htmlBody: html, textBody: text, template: 'welcome', metadata: { expedienteId: exp.id, folio: exp.folio } };
}

function generateTokenEmail(
  exp: Expediente,
  token: ExpedienteToken,
  template: EmailTemplate,
  title: string,
  description: string,
  buttonLabel: string,
): GeneratedEmail {
  const url = getTokenUrl(token);
  const subject = `${BRAND.name} — ${title} (${exp.folio})`;
  const html = wrapInLayout(subject, `
    <h2 style="color:${BRAND.primaryColor};margin:0 0 16px">${title}</h2>
    <p>Hola,</p>
    <p>${description}</p>
    ${ctaButton(url, buttonLabel)}
    <p style="color:#6b7280;font-size:13px">Este enlace es valido por 72 horas. Si expira, puede solicitar uno nuevo.</p>
    <p style="color:#6b7280;font-size:13px">Folio: ${exp.folio} | RFC: ${exp.rfc}</p>
  `);
  const text = `${title} - ${exp.folio}. ${description} Enlace: ${url}`;
  return { to: exp.contact_email, subject, htmlBody: html, textBody: text, template, metadata: { expedienteId: exp.id, folio: exp.folio, tokenId: token.id } };
}

function generateReminder(exp: Expediente, token: ExpedienteToken): GeneratedEmail {
  const url = getTokenUrl(token);
  const purposeLabels: Record<TokenPurpose, string> = {
    buro_signature: 'firmar la autorizacion de Buro',
    ciec_linkage: 'conectar su CIEC del SAT',
    document_upload: 'subir la documentacion',
    general_access: 'completar su solicitud',
  };
  const action = purposeLabels[token.purpose];
  const subject = `${BRAND.name} — Recordatorio: ${action} (${exp.folio})`;
  const html = wrapInLayout(subject, `
    <h2 style="color:${BRAND.primaryColor};margin:0 0 16px">Recordatorio</h2>
    <p>Hola,</p>
    <p>Le recordamos que tiene pendiente <strong>${action}</strong> para su solicitud <strong>${exp.folio}</strong>.</p>
    <p>Su enlace expira pronto. Por favor complete el proceso lo antes posible.</p>
    ${ctaButton(url, 'Completar ahora')}
    <p style="color:#6b7280;font-size:13px">Si ya completo este paso, ignore este correo.</p>
  `);
  const text = `Recordatorio: ${action} para solicitud ${exp.folio}. Enlace: ${url}`;
  return { to: exp.contact_email, subject, htmlBody: html, textBody: text, template: 'reminder', metadata: { expedienteId: exp.id, folio: exp.folio, tokenId: token.id } };
}

function generateRejection(exp: Expediente): GeneratedEmail {
  const subject = `${BRAND.name} — Solicitud ${exp.folio} no aprobada`;
  const html = wrapInLayout(subject, `
    <h2 style="color:${BRAND.primaryColor};margin:0 0 16px">Solicitud no aprobada</h2>
    <p>Hola,</p>
    <p>Lamentamos informarle que la solicitud <strong>${exp.folio}</strong> para <strong>${exp.company_name}</strong> no ha sido aprobada.</p>
    ${exp.rejection_reason ? `<p>Motivo: ${exp.rejection_reason}</p>` : ''}
    <p>Si tiene preguntas, contactenos en <a href="mailto:${BRAND.supportEmail}" style="color:${BRAND.accentColor}">${BRAND.supportEmail}</a>.</p>
  `);
  const text = `Solicitud ${exp.folio} no aprobada. ${exp.rejection_reason ?? ''}`;
  return { to: exp.contact_email, subject, htmlBody: html, textBody: text, template: 'rejection', metadata: { expedienteId: exp.id, folio: exp.folio } };
}

function generateApproval(exp: Expediente): GeneratedEmail {
  const subject = `${BRAND.name} — Credito aprobado (${exp.folio})`;
  const html = wrapInLayout(subject, `
    <h2 style="color:${BRAND.primaryColor};margin:0 0 16px">Credito aprobado</h2>
    <p>Hola,</p>
    <p>Nos complace informarle que el credito para <strong>${exp.company_name}</strong> ha sido <strong>aprobado</strong>.</p>
    <p style="font-size:18px;font-weight:bold;color:${BRAND.primaryColor}">Monto: ${exp.currency} ${exp.requested_amount.toLocaleString()} | Plazo: ${exp.term_days} dias</p>
    <p>Un ejecutivo se pondra en contacto para la formalizacion.</p>
    <p style="color:#6b7280;font-size:13px">Folio: ${exp.folio} | RFC: ${exp.rfc}</p>
  `);
  const text = `Credito aprobado para ${exp.company_name}. Monto: ${exp.currency} ${exp.requested_amount.toLocaleString()}. Folio: ${exp.folio}`;
  return { to: exp.contact_email, subject, htmlBody: html, textBody: text, template: 'approval', metadata: { expedienteId: exp.id, folio: exp.folio } };
}

// ─── API pública ─────────────────────────────────────────────────────

/**
 * Genera el email apropiado para un template dado.
 */
export function generateEmail(
  template: EmailTemplate,
  exp: Expediente,
  token?: ExpedienteToken,
): GeneratedEmail {
  switch (template) {
    case 'welcome':
      return generateWelcome(exp);

    case 'buro_link':
      if (!token) throw new Error('Token requerido para email buro_link');
      return generateTokenEmail(exp, token, 'buro_link',
        'Firma de autorizacion Buro',
        'Para continuar con su solicitud de credito, necesitamos su autorizacion para consultar el Buro de Credito.',
        'Firmar autorizacion',
      );

    case 'ciec_link':
      if (!token) throw new Error('Token requerido para email ciec_link');
      return generateTokenEmail(exp, token, 'ciec_link',
        'Vinculacion SAT',
        'Para analizar su situacion fiscal, necesitamos que conecte su CIEC del SAT de forma segura.',
        'Conectar CIEC',
      );

    case 'document_link':
      if (!token) throw new Error('Token requerido para email document_link');
      return generateTokenEmail(exp, token, 'document_link',
        'Documentacion requerida',
        'Su solicitud avanza bien. Ahora necesitamos que suba la documentacion complementaria.',
        'Subir documentos',
      );

    case 'reminder':
      if (!token) throw new Error('Token requerido para email reminder');
      return generateReminder(exp, token);

    case 'rejection':
      return generateRejection(exp);

    case 'approval':
      return generateApproval(exp);

    default: {
      const _exhaustive: never = template;
      throw new Error(`Template desconocido: ${_exhaustive}`);
    }
  }
}

/**
 * Envía un email generado.
 *
 * PLACEHOLDER: Por ahora solo loguea el email.
 * En producción se conecta a SMTP/SES/Resend.
 */
export async function sendEmail(email: GeneratedEmail): Promise<SendResult> {
  // Placeholder — en producción se reemplaza por SMTP/SES
  const messageId = crypto.randomUUID();

  // Registrar metadata para trazabilidad
  const _trace = {
    to: email.to,
    subject: email.subject,
    template: email.template,
    messageId,
  };
  void _trace;

  return { success: true, messageId };
}

/**
 * Genera y envía un email en un solo paso.
 */
export async function sendTemplateEmail(
  template: EmailTemplate,
  exp: Expediente,
  token?: ExpedienteToken,
): Promise<SendResult> {
  const email = generateEmail(template, exp, token);
  return sendEmail(email);
}

// ─── Mapeo template ↔ propósito de token ─────────────────────────────

/** Qué template de email corresponde a cada propósito de token */
export const TOKEN_PURPOSE_TO_TEMPLATE: Record<TokenPurpose, EmailTemplate> = {
  buro_signature: 'buro_link',
  ciec_linkage: 'ciec_link',
  document_upload: 'document_link',
  general_access: 'welcome',
};
