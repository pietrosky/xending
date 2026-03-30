# I07 — RAG (Retrieval Augmented Generation)

## Resumen
Indexación de documentos no estructurados para que el agente conversacional (M14) pueda responder preguntas sobre contratos, políticas, minutas y correspondencia. Usa pgvector en Supabase. Solo para documentos que no se pueden consultar con SQL.

## Estado: POR CONSTRUIR (baja prioridad, después de M14)

## Tipo: Infraestructura

---

## Qué va en RAG vs qué NO

### NO necesita RAG (ya está estructurado en PostgreSQL)

| Dato | Por qué no necesita RAG |
|------|------------------------|
| Facturas, declaraciones, constancia fiscal | Datos numéricos en cs_provider_data, se consultan con SQL |
| Scores de engines | Números en cs_engine_results |
| Estado de expedientes | Campos en cs_expedientes |
| Resultados de KYB/Scory | JSON estructurado en cs_provider_data |
| Resultados de Hawk Checks | JSON estructurado en cs_provider_data |
| Estados financieros procesados | Datos numéricos en schema estándar |
| Alertas, vencimientos, covenants | Datos en tablas específicas |

### SÍ necesita RAG (documentos de texto largo)

| Documento | Ejemplo de pregunta que responde |
|-----------|--------------------------------|
| Contratos de crédito (PDF completo) | "¿Qué penalización tiene ABC por pago tardío?" |
| Políticas internas de crédito | "¿Cuál es nuestra política para créditos arriba de $500K?" |
| Minutas de comité | "¿Por qué se condicionó el crédito de ABC en enero?" |
| Correspondencia / emails | "¿Qué le respondimos a ABC sobre su renovación?" |
| Regulación (CNBV, UIF, CONDUSEF) | "¿Cuál es el plazo para reportar operaciones inusuales?" |

---

## Implementación con Supabase pgvector

```sql
-- Habilitar extensión de vectores
CREATE EXTENSION IF NOT EXISTS vector;

CREATE TABLE cs_document_chunks (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id TEXT NOT NULL DEFAULT 'xending',
  company_id UUID REFERENCES cs_companies(id),  -- null para docs generales
  document_id UUID,                              -- FK al documento original
  document_type TEXT NOT NULL
    CHECK (document_type IN (
      'contract', 'credit_policy', 'committee_minutes',
      'email_correspondence', 'regulation', 'internal_memo'
    )),
  chunk_index INT NOT NULL,
  chunk_text TEXT NOT NULL,
  embedding VECTOR(1536),  -- OpenAI text-embedding-3-small
  metadata JSONB DEFAULT '{}',  -- { page, section, date, author }
  created_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX idx_chunks_embedding ON cs_document_chunks
  USING ivfflat (embedding vector_cosine_ops) WITH (lists = 100);
CREATE INDEX idx_chunks_company ON cs_document_chunks(company_id);
CREATE INDEX idx_chunks_type ON cs_document_chunks(document_type);
```

### Flujo de indexación

```
1. Documento entra (PDF subido, email recibido, minuta guardada)
2. Extraer texto (PDF parser o texto directo)
3. Dividir en chunks de ~500 tokens con overlap de 50
4. Para cada chunk:
   a. Generar embedding con OpenAI text-embedding-3-small
   b. Guardar en cs_document_chunks
5. Documento listo para consultas
```

### Flujo de consulta

```
1. Usuario pregunta: "¿Qué penalización tiene ABC por pago tardío?"
2. Generar embedding de la pregunta
3. Buscar top 5 chunks más similares:
   SELECT chunk_text, metadata, 1 - (embedding <=> query_embedding) as similarity
   FROM cs_document_chunks
   WHERE company_id = 'abc-uuid' AND document_type = 'contract'
   ORDER BY embedding <=> query_embedding
   LIMIT 5;
4. Pasar chunks como contexto al LLM
5. LLM responde basado en los fragmentos relevantes
```

---

## Volumen estimado

| Tipo de documento | Docs por empresa | Chunks por doc | Total chunks (100 empresas) |
|-------------------|-----------------|---------------|---------------------------|
| Contratos | 5-10 | 20-50 | 5,000-50,000 |
| Políticas internas | 5-10 (globales) | 30-100 | 150-1,000 |
| Minutas de comité | 2-4 por año | 10-20 | 2,000-8,000 |
| Emails | 20-50 por empresa | 2-5 | 4,000-25,000 |
| Regulación | 10-20 (globales) | 50-200 | 500-4,000 |

Total estimado: 10K-90K chunks. Manejable con pgvector en Supabase sin problemas.
