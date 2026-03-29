# M17 — Comité y Facultades

## Resumen
Sistema de autorización por firmas de socios. Gestiona dos flujos: comité formal para aprobación de líneas de crédito, y autorización rápida por facultades para operaciones intradía. Reglas deterministas de quórum según monto.

## Estado: POR CONSTRUIR

## Dependencias: M04 Decision (recomendación), M12 Gestor Cartera (operaciones intradía)

---

## Dos flujos de autorización

### 1. Comité formal (líneas de crédito)
- Se presenta caso con resumen del expediente + score + recomendación del sistema
- Al inicio TODOS los casos van a comité (los 5 socios votan)
- Futuro: auto-approve configurable si score > umbral y monto < límite
- Cada socio recibe email con link para votar
- Voto: aprobar / condicionar / rechazar (con comentario)
- Cuando se alcanza quórum → resultado

### 2. Facultades rápidas (operaciones intradía)
- Para operaciones de crédito intradía o máximo 1 día
- Clientes conocidos con línea ya aprobada
- Se envía email a socios requeridos con resumen de la operación
- Cada socio autoriza vía link/token
- Cuando se alcanza quórum → se libera operación

---

## Reglas de quórum (función determinista)

```
Operaciones intradía:
  Hasta $100,000 USD       → 3 de 5 socios
  $100,001 - $350,000 USD  → 4 de 5 socios
  Más de $350,000 USD      → 5 de 5 socios (unanimidad)

Líneas de crédito (comité):
  Al inicio: 5 de 5 socios para todas
  Futuro: configurable por tenant
```

---

## Flujo de autorización

```
1. Se crea solicitud de autorización
   - tipo: 'credit_line' o 'intraday'
   - monto, moneda
   - quórum requerido (calculado por getRequiredApprovals)
   - resumen del caso (expediente o operación)

2. Se envía email a los socios requeridos
   - Cada email tiene link único con token
   - Incluye resumen: empresa, monto, score, recomendación

3. Cada socio vota
   - Abre link → ve resumen → vota aprobar/rechazar
   - Puede agregar comentario
   - Voto se registra con timestamp

4. Se evalúa quórum
   - Si votos_approve >= quórum → APROBADO
   - Si votos_reject > (total - quórum) → RECHAZADO (imposible alcanzar quórum)
   - Si timeout (configurable) → EXPIRADO

5. Resultado
   - Aprobado → disparar siguiente paso (contrato o liberación)
   - Rechazado → notificar, registrar motivo
   - Expirado → notificar, opción de reenviar
```

---

## Tablas

```
cs_authorization_requests
  id uuid pk
  tenant_id text
  entity_type text          -- 'expediente' o 'operation'
  entity_id uuid
  authorization_type text   -- 'credit_line', 'intraday', 'renewal'
  amount numeric
  currency text
  required_approvals int    -- 3, 4, o 5
  current_approvals int default 0
  current_rejections int default 0
  status text               -- 'pending', 'approved', 'rejected', 'expired'
  summary jsonb             -- resumen del caso para los votantes
  expires_at timestamptz
  resolved_at timestamptz
  created_at timestamptz

cs_authorization_votes
  id uuid pk
  request_id uuid fk → cs_authorization_requests
  voter_id text             -- ID del socio
  voter_name text
  vote text                 -- 'approve', 'reject'
  comment text
  voted_at timestamptz
```

---

## Eventos que emite

| Evento | Cuándo |
|--------|--------|
| authorization_requested | Se crea solicitud |
| authorization_vote_cast | Un socio vota |
| authorization_approved | Se alcanza quórum |
| authorization_rejected | Imposible alcanzar quórum |
| authorization_expired | Timeout sin quórum |
