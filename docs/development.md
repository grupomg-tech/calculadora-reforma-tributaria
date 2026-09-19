# Development

## Requirements

- Node.js 22 (the version used in CI; 20.19+ also works with Vite 8)
- npm 10+

## Setup

```sh
git clone https://github.com/grupomg-tech/calculadora-reforma-tributaria.git
cd calculadora-reforma-tributaria
npm ci
npm run dev
```

The dev server listens on <http://localhost:8080>. Because the router uses a
basename, open
<http://localhost:8080/dashboards/dashboard-cliente/?demo=1> to see the
dashboard with the fictional dataset.

## Working against a real backend

1. Copy `.env.example` to `.env.local`.
2. Set `VITE_API_URL` to your report endpoint (absolute URL or a path proxied by
   your server).
3. Restart `npm run dev`.

The endpoint must return the JSON described in the
[API contract](../README.md#backend-api). `src/test/fixtures/relatorio.json` is a
complete, valid example you can serve from any static server to check the
integration.

## Scripts

| Script | What it does |
| --- | --- |
| `npm run dev` | Vite dev server with HMR |
| `npm run build` | Production build into `dist/` |
| `npm run preview` | Serves `dist/` locally |
| `npm run lint` | ESLint (generated `src/components/ui` is ignored) |
| `npm run typecheck` | `tsc --noEmit` with `strict` on |
| `npm test` | Vitest, single run |
| `npm run test:watch` | Vitest in watch mode |
| `npm run test:coverage` | Vitest with v8 coverage and thresholds |

## Conventions

- TypeScript `strict` is on. Do not add `any`; extend `src/lib/api-types.ts`
  when the backend gains a field.
- Put computation in `src/lib` as pure functions with tests; keep components
  presentational.
- UI strings are Portuguese (pt-BR) for now; code, comments and docs are
  English.
- Do not edit `src/components/ui/*` by hand. Regenerate with the shadcn CLI if a
  primitive needs to change, and only keep primitives that are imported.
- Commit messages follow the Conventional Commits style used in the history:
  `feat:`, `fix:`, `docs:`, `test:`, `build:`, `ci:`, `chore(deps):`,
  `refactor:`.

## Branches and pull requests

`main` is protected: changes land through pull requests with a green CI. Use
short-lived branches named `<type>/<topic>` (for example `test/top-products`,
`docs/architecture`). One topic per PR.

## Debugging tips

- The API error card shows the HTTP status or the network error; a server
  returning HTML (login page, 404 page) is reported as
  "API retornou HTML em vez de JSON".
- `?demo=1` bypasses the network entirely, which isolates UI bugs from backend
  bugs.
- Recharts needs a sized container; in tests `ResizeObserver` is stubbed and
  charts render empty, which is expected.
- **Exportar PDF** uses the browser print dialog (`window.print()`) plus the
  `@media print` rules in `src/index.css`. Choose "Save as PDF" / "Salvar como
  PDF" in the dialog. Filters, charts and other chrome are hidden; the printed
  page is the impact cards, the two summary blocks and the top-10 tables.
