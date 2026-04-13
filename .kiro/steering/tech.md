# Tech Stack & Build System

## credit-scoring/ (Main App)

- Runtime: React 18 + TypeScript 5.6 (strict mode, `noUncheckedIndexedAccess` enabled)
- Build: Vite 6 with `@vitejs/plugin-react`
- Styling: TailwindCSS 3 + PostCSS + Autoprefixer
- Utility: `cn()` helper using `clsx` + `tailwind-merge` for conditional classes
- State: Zustand 5 (global stores), React Query / TanStack Query 5 (server state)
- Routing: React Router DOM 6 (nested routes, role-based guards)
- Icons: lucide-react
- Charts: Recharts 2
- PDF: jspdf (client-side generation)
- Backend: Supabase (PostgreSQL + Edge Functions + Auth + Storage)
- DB client: Custom PostgREST query builder in `src/lib/postgrest.ts` (not the official Supabase JS client for queries)
- Auth: Local dev auth via Zustand store + sessionStorage (no real Supabase Auth in dev)
- Testing: Vitest
- Linting: ESLint 9 with flat config, react-hooks and react-refresh plugins
- Path alias: `@/` maps to `./src/`

## fx-pdf-generator/ (PDF Service)

- Runtime: Node.js + Express 4
- PDF: Puppeteer (HTML→PDF) + pdf-lib (PDF manipulation)
- HTTP: Axios
- Security: express-rate-limit, express-slow-down, CORS, input validation middleware
- Dev: Nodemon

## Supabase

- Migrations: SQL files in `credit-scoring/supabase/migrations/` (numbered sequentially, `cs_` prefix for credit scoring tables)
- Edge Functions: Deno-based, in `credit-scoring/supabase/functions/` (cs-engine-runner, cs-orchestrator, cs-report-generator, cs-scory-proxy, cs-syntage-proxy, cs-trend-analyzer, fx-payment-order)
- Local dev: Docker Compose (`credit-scoring/docker-compose.yml`)
- Seed files: SQL seeds in `credit-scoring/supabase/seed_*.sql`

## Common Commands

### credit-scoring/
```bash
npm run dev          # Start Vite dev server
npm run build        # TypeScript compile + Vite production build
npm run preview      # Preview production build
npm run lint         # ESLint
npm run type-check   # TypeScript type checking (tsc --noEmit)
npx vitest --run     # Run tests (single execution)
```

### fx-pdf-generator/
```bash
npm start            # Start Express server (node server.js)
npm run dev          # Start with nodemon (auto-reload)
npm test             # Run test-generator.js
```

## Deployment

- credit-scoring: Vercel (`vercel.json` present)
- fx-pdf-generator: Standalone Node.js service
