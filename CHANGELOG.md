# Changelog

All notable changes to this project are documented here. The format follows
[Keep a Changelog](https://keepachangelog.com/en/1.1.0/).

## [Unreleased]

### Added

- NCM → reform-regime lookup (`src/lib/regimes.ts`): zero rate (Anexos I / XV),
  60% reduction (Anexos VII / VIII), Imposto Seletivo (Anexo XVII) and the
  standard-rate fallback (art. 16). Demo products use `regimeForNcm` instead of
  a hard-coded `fator`. Product cards and the detail dialog show a regime
  badge with the legal citation (#16).
- CSV export of the loaded report: header button "Exportar CSV" (enabled when
  a report is present) downloads one row per purchase and sale product, with
  the `Produto` columns plus `tipo`, `;` as separator, `,` as decimal mark and
  a UTF-8 BOM so Excel opens it correctly (#17, contributed by @dyk1454683243-sudo
  in #30). File name now follows the filters
  (`calculadora-reforma-tributaria_<empresa>_<inicio>_<fim>.csv`) and lines end
  with CRLF (RFC 4180).
- Link to the repository in the dashboard header and an English line in the
  demo banner pointing to the source and the API contract.
- README sections "Who is it for", "What it does not do" and "Alternatives"
  (survey of related open-source and free tools, September 2026).
- Runtime validation of the API payload (`validateReport`): wrong types are
  rejected with the offending path instead of rendering `NaN`; optional
  `schema_version` with a supported-major check. Demo and fixture now carry
  `schema_version: "1.0"`.
- Numeric regression tests for the demo model (headline figures, totals and two
  hand-computed products) and a rounding check.

### Changed

- Demo sugar (NCM 1701.99.00) is now zero-rated per LC 214/2025 art. 125,
  Anexo I; the catalogue previously hard-coded a 60% reduction. Headline
  demo figures in the numeric regression tests were updated to match.
- **Project renamed** from `dashreforma` to `calculadora-reforma-tributaria`
  ("Calculadora Reforma Tributária"): repository URL, demo URL
  (`grupomg-tech.github.io/calculadora-reforma-tributaria/`), package name,
  page title, header and CSV file names. GitHub redirects the old repository
  URL; the old Pages URL does not. The README states that the project is not
  affiliated with the Receita Federal's official calculator.
- README "Why" no longer claims that open tooling is scarce; the project is
  positioned as a presentation layer over a documented contract.

### Removed

- Template leftovers: `lovable-tagger` and its Vite plugin, `.lovable/plan.md`
  and `public/placeholder.svg`.

### Fixed

- Donut slice labels were not drawn after the Recharts 3 upgrade; the label
  render prop now returns an SVG element (#23).
- The ranking chart tooltip shows the full product name instead of the
  18-character axis label (#24).

## [0.1.1] - 2026-09-17

Maintenance release: security, tests, documentation and dependency currency.
No changes to the API contract or to the deployment defaults.

### Added

- Component and routing tests (`Index`, `FilterPanel`, `TopProducts`, `AppRoutes`,
  `ErrorBoundary`) and a contract fixture `src/test/fixtures/relatorio.json`;
  43 tests, ~90% statement coverage with an 80% threshold enforced in CI (#1).
- Dependabot (npm weekly, GitHub Actions monthly), a weekly `npm audit`
  workflow, CodeQL default setup and secret scanning with push protection (#1).
- `CODE_OF_CONDUCT.md` (Contributor Covenant 2.1), `AGENTS.md` and the `docs/`
  guides: architecture, development, testing, release process, maintenance.
- `npm run typecheck` and `npm run test:coverage` scripts.

### Changed

- TypeScript `strict` mode enabled across the app (#1).
- Vendor code (React, Recharts, Framer Motion) is split into cacheable chunks;
  the application chunk went from 919 kB to 46 kB (#1).
- Toolchain upgraded: Vite 8, Vitest 5, react-router-dom 7,
  `@vitejs/plugin-react` (#1).
- React 19, Recharts 3, Framer Motion 13, lucide-react 1.x, tailwind-merge 3
  and the Radix primitives updated; tooltip formatters adapted to Recharts 3
  types (#7, #10, #11, #12, #15).
- `NotFound` uses the router link and no longer logs to the console.
- CONTRIBUTING rewritten with branch, commit and review rules.

### Removed

- 41 unused shadcn/ui components, the toast/tooltip/sonner providers, the
  react-query provider, `NavLink` and unused hooks; 36 unused runtime
  dependencies (#1).

### Security

- `npm audit`: 25 findings (1 critical, 17 high) fixed; 0 remaining (#1).

## [0.1.0] - 2026-09-17

First tagged release.

### Added

- Demo mode with a built-in fictional dataset (`?demo=1` or `VITE_DEMO=true`),
  so the dashboard runs without a backend; the rates chosen in the filter panel
  recalculate the simulation.
- "Ver com dados de exemplo" fallback when the API is unreachable.
- Live demo on GitHub Pages, deployed by CI.
- Typed API contract (`src/lib/api-types.ts`) and pure data-mapping functions
  (`src/lib/report.ts`) with unit tests.
- Configuration through environment variables (`VITE_API_URL`, `VITE_BASE`,
  `VITE_ROUTER_BASENAME`, `VITE_DEMO`).
- CI workflow (lint, type check, tests, build), contributing guide, security
  policy, issue and pull request templates.
- MIT license and project documentation.

### Changed

- Page title and metadata now describe the project instead of the template.
- Dashboard components are fully typed (no `any`).

[Unreleased]: https://github.com/grupomg-tech/calculadora-reforma-tributaria/compare/v0.1.1...HEAD
[0.1.1]: https://github.com/grupomg-tech/calculadora-reforma-tributaria/compare/v0.1.0...v0.1.1
[0.1.0]: https://github.com/grupomg-tech/calculadora-reforma-tributaria/releases/tag/v0.1.0
