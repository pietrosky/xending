# Project Structure

## Monorepo Layout

```
/
├── credit-scoring/          # Main React SPA (credit scoring + FX transactions)
├── fx-pdf-generator/        # Standalone Node.js PDF generation service
├── docs/                    # Product documentation (Spanish)
│   ├── modules/             # Per-module specs (M01–M17, I01–I08)
│   └── *.md                 # System overview, data model, architecture
├── brand/                   # Brand assets (logos, brand guide)
└── .kiro/specs/             # Kiro spec files for features
```

## credit-scoring/src/ — Feature-Based Architecture

Each feature is a self-contained module under `src/features/`:

```
src/
├── App.tsx                  # Route definitions
├── main.tsx                 # Entry point
├── index.css                # Global styles (Tailwind directives)
├── lib/                     # Shared utilities
│   ├── supabase.ts          # DB client re-export
│   ├── postgrest.ts         # Custom PostgREST query builder
│   ├── authStore.ts         # Zustand auth store
│   └── cn.ts                # className merge utility
├── assets/                  # Static assets (logos, favicon)
└── features/
    ├── auth/                # Login, route guards (ProtectedRoute, AdminRoute, BrokerRedirect)
    ├── credit-scoring/      # Core scoring module (largest feature)
    ├── fx-transactions/     # FX deal management (companies, transactions)
    ├── onboarding/          # Company onboarding
    └── payment-instructions/# Payment instruction management
```

## Feature Module Convention

Each feature follows this internal structure:

```
features/{feature-name}/
├── api/           # External API clients (Syntage, Scory)
├── components/    # React components (presentational + container)
├── engines/       # Scoring engine implementations (credit-scoring only)
├── hooks/         # Custom React hooks
├── lib/           # Feature-specific logic, utilities, demo data
├── pages/         # Route-level page components
├── services/      # Business logic services (orchestrators, email, tokens)
├── types/         # TypeScript type definitions
└── utils/         # Pure utility functions (formatters, masks)
```

Not every feature has all subfolders — only what's needed.

## Scoring Engines Pattern

Engines live in `features/credit-scoring/engines/`. Each engine:
- Is a pure function: `(EngineInput) → EngineOutput`
- Has a co-located test file: `{engine}.test.ts`
- Returns a standard shape: `module_status`, `module_score`, `module_grade`, `risk_flags`, `key_metrics`, `benchmark_comparison`, `explanation`
- Is either a weighted engine (contributes to consolidated score) or a gate engine (pass/fail, no score weight)

## Supabase Structure

```
credit-scoring/supabase/
├── migrations/    # Sequential SQL migrations (cs_ prefix for scoring tables)
├── functions/     # Deno Edge Functions
├── docker/        # Local Supabase Docker config
└── seed_*.sql     # Seed data files
```

## Documentation

Module specs in `docs/modules/` follow the naming convention:
- `M{XX}_{MODULE_NAME}.md` for business modules
- `I{XX}_{INFRA_NAME}.md` for infrastructure modules
