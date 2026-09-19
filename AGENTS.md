# AGENTS.md

Instructions for coding agents (Codex, Claude Code and similar) working in this
repository. Humans: see [CONTRIBUTING.md](CONTRIBUTING.md).

## Project overview

React 18 + TypeScript + Vite dashboard that compares a company's tax assessment
under Brazil's current system with the IBS/CBS/IS reform. It is a front end
only: data comes from a backend that implements the contract in
`src/lib/api-types.ts`. A demo mode (`?demo=1`) generates a fictional report
locally. Details: [docs/architecture.md](docs/architecture.md).

## Commands

```sh
npm ci                  # install (use ci, not install, to respect the lockfile)
npm run dev             # http://localhost:8080/dashboards/dashboard-cliente/?demo=1
npm run lint            # ESLint, must be clean
npm run typecheck       # tsc --noEmit, strict mode, must be clean
npm run test:coverage   # Vitest + coverage thresholds (80% statements/lines)
npm run build           # Vite production build
npm audit               # must report 0 vulnerabilities
```

Run lint, typecheck, test:coverage and build before proposing a change. CI runs
the same commands.

## Layout

- `src/lib/` — pure functions and types. All computation goes here, with tests.
- `src/pages/Index.tsx` — state, fetching, layout.
- `src/components/dashboard/` — presentational components.
- `src/components/ui/` — generated shadcn/ui primitives. Do not edit; do not add
  primitives that are not imported.
- `src/test/fixtures/relatorio.json` — canonical example of the API payload.
- `examples/backend-node/` — reference Node server for the report contract.
- `docs/` — architecture, development, testing, release and maintenance guides.

## Conventions

- TypeScript `strict` is on; never introduce `any`. Extend `api-types.ts`
  instead.
- Keep the API contract permissive: new fields are optional, missing blocks hide
  their section, nothing throws on partial data.
- Defaults in `src/lib/config.ts` and `vite.config.ts` must keep working for the
  original deployment paths (`/static/dashboard-cliente/`,
  `/dashboards/dashboard-cliente`, `/dashboards/api/graficos/dados-relatorio/`).
- UI text is pt-BR; code, comments, commit messages and docs are English.
- Commit messages: Conventional Commits (`feat:`, `fix:`, `docs:`, `test:`,
  `build:`, `ci:`, `chore(deps):`, `refactor:`).
- Fictional data only. Never add real company names, CNPJs or figures to
  fixtures, demos or docs.

## Testing rules

- Every change to `src/lib` comes with a unit test in the sibling `*.test.ts`.
- Component changes come with a Testing Library test that asserts through
  roles, labels and text.
- Stub `fetch` and `ResizeObserver` as shown in `src/pages/Index.test.tsx`.
- Update `src/test/fixtures/relatorio.json` when the contract changes.

## Pull requests

- One topic per PR, branch named `<type>/<topic>`.
- Fill the PR template: what, how to test, checklist.
- CI (lint, typecheck, tests, build), the Security workflow and CodeQL must be
  green before merge.
- Do not bump dependency majors in the same PR as feature work.

## Releases

Follow [docs/release-process.md](docs/release-process.md): update
`CHANGELOG.md` (`[Unreleased]` → version), bump `package.json`, tag `vX.Y.Z`,
create the GitHub release, confirm the Pages deploy.

## Security

- No secrets exist in this repository and none should be added; `.env.local` is
  git-ignored.
- Dependabot, secret scanning with push protection and CodeQL are enabled;
  address alerts in dedicated PRs labelled `security`.
- Report vulnerabilities privately as described in [SECURITY.md](SECURITY.md).
