import { TemplateService } from './templateService.ts';
import type { HtmlDealData } from './types.ts';
// Todavia no arme la funcionalidad en la pagina, pero este es el punto de entrada para generar el HTML del resumen de la operacion pactada.
export default {
  async fetch(_req: Request): Promise<Response> {
    
    const datosDelDocumento = {

    } as HtmlDealData;

    const html = TemplateService.generateHTML('xending', datosDelDocumento);

    return new Response(html, {
      headers: { 'Content-Type': 'text/html; charset=utf-8' },
    });
  },
};
