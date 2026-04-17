/**
 * Script de prueba para ver el HTML generado por TemplateService
 * Ejecuta: deno run --allow-net test-template.ts
 * Este archivo fue generado con IA para probar el template de HTML con datos de ejemplo, y verificar que se vea bien formateado.
 */

import { TemplateService } from './templateService.ts';

// Datos de ejemplo para probar
const testData = {
  buyCurrency: "USD",
  buyAmount: "1000.00",
  financingTerm: "Spot",
  exchangeRate: "17.25",
  clientName: "IMPORTADORA MEXICANA SA DE CV",
  payAmount: "17250.00",
  currency: "MXN",
  valueDate: "2026-04-20",
  amountToReceive: "1000.00",
  beneficiary: "IMPORTADORA MEXICANA SA DE CV",
  bankName: "BBVA México",
  clabe: "012345678901234567",
  reference: "REF123456789",
  dealNumber: "DL-20260417-001",
  clientAddress: "Av. Insurgentes Sur 1234, CDMX, México",
  payCurrency: "MXN",
  myBankName: "Banco Santander México",
  myClabe: "987654321098765432",
  myPaymentMethod: "Transferencia SPEI"
};

// Genera HTML con el template Xending
const html = TemplateService.generateHTML('xending', testData);

// Muestra el HTML generado
Deno.writeTextFileSync('test-output.html', html);
console.log('HTML generado.');
