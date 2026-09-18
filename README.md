# dashreforma

Dashboard that simulates the impact of Brazil's consumption tax reform (**IBS / CBS / IS**) on a company's tax assessment, side by side with the current system.

> 🇧🇷 Painel que simula o impacto da Reforma Tributária (IBS, CBS e Imposto Seletivo) na apuração de uma empresa, comparando com o sistema atual. [Resumo em português](#resumo-em-português) no fim deste arquivo.

[![CI](https://github.com/grupomg-tech/dashreforma/actions/workflows/ci.yml/badge.svg)](https://github.com/grupomg-tech/dashreforma/actions/workflows/ci.yml)
[![Security](https://github.com/grupomg-tech/dashreforma/actions/workflows/security.yml/badge.svg)](https://github.com/grupomg-tech/dashreforma/actions/workflows/security.yml)
[![Live demo](https://img.shields.io/badge/demo-GitHub%20Pages-4e6ae9.svg)](https://grupomg-tech.github.io/dashreforma/)
![License: MIT](https://img.shields.io/badge/license-MIT-blue.svg)
![Status: early stage](https://img.shields.io/badge/status-early%20stage-orange.svg)

**Live demo:** <https://grupomg-tech.github.io/dashreforma/> — runs on a built-in fictional dataset; change the IBS, CBS and IS rates and click *Simular* to recalculate.

![dashreforma screenshot](docs/screenshot.png)

## Why

Constitutional Amendment 132/2023 replaces PIS, COFINS, ICMS, ISS and part of IPI with a dual VAT (IBS + CBS) plus a selective tax (IS), phased in from 2026 to 2033. Companies outside the Simples Nacional regime, and the accounting firms that serve them, need to answer the same question during the transition: *"what happens to my tax burden?"*

`dashreforma` is a front end for that answer: it takes a company's purchases and sales for a period, as computed by a backend that implements the [API contract](#backend-api), and shows where the burden goes up or down, product by product. Several open-source engines and simulators for the reform exist (see [Alternatives](#alternatives)); this project focuses on the presentation layer and on a contract that any of them could feed.

## Who is it for

- **Accountants and finance teams** of companies in the *lucro real* or *lucro presumido* regimes who need to see the reform's effect on their own purchases and sales, not on a generic example.
- **Developers of tax-calculation backends** who want a tested, documented front end instead of building one: implement the JSON contract and point the app at it with `VITE_API_URL`.
- **Anyone exploring the reform** — the [live demo](https://grupomg-tech.github.io/dashreforma/) runs on fictional data and needs no setup.

## Features

- **Current system vs. reform** — debits, credits, net result and effective tax burden for both scenarios.
- **Impact cards** — variation in debits, credits, result (R$) and burden (percentage points).
- **Adjustable rates** — simulate any IBS, CBS and IS rate (defaults: 18.5% / 8.5% / 0%).
- **Charts** — tax burden on purchases and sales, comparison per tax (current vs. reform) and tax composition for inbound and outbound operations.
- **Top products** — the 10 most purchased and most sold products, with per-product value comparison and tax breakdown.
- **Filters** — company, start and end period; filters can be preset through the URL query string.
- **Demo mode** — a fictional catalogue of 12 products (basic-basket items at zero rate, reduced-rate goods, products subject to IS) lets you explore the dashboard without a backend.
- **Auto refresh** — optional 30-second polling.

## What it does not do

- **It does not compute taxes.** The backend does; the dashboard renders what the backend returns. The demo mode uses a deliberately simplified model (see [docs/architecture.md](docs/architecture.md#demo-tax-model-illustrative-only)) that exists only so the UI can be explored.
- **It is not legal or tax advice** and has not been validated against the official Receita Federal calculator.
- **It does not cover the Simples Nacional** regime, whose transition rules differ.
- **It does not import NF-e, SPED or spreadsheets** — that is the backend's job.
- **It does not store anything.** No accounts, no persistence, no analytics.

## Status

Early stage, actively maintained by a single developer. The dashboard is functional; the data mapping, the demo model, the page and the main components are covered by 43 tests (about 90% statement coverage over `src/`, with an 80% threshold enforced in CI). Dependencies are kept current by Dependabot and audited weekly. The UI is Portuguese-only for now. See the [roadmap](#roadmap) and the [open issues](https://github.com/grupomg-tech/dashreforma/issues); contributions are welcome — read [CONTRIBUTING.md](CONTRIBUTING.md).

## Tech stack

React 18 · TypeScript (strict) · Vite 8 · Tailwind CSS · shadcn/ui (Radix) · Recharts · Framer Motion · Vitest + Testing Library

## Getting started

Requires Node.js 20.19+ (CI uses 22) and npm.

```sh
git clone https://github.com/grupomg-tech/dashreforma.git
cd dashreforma
npm ci
npm run dev      # dev server on http://localhost:8080
```

Then open <http://localhost:8080/dashboards/dashboard-cliente/?demo=1> for the demo dataset, or point the app at your backend (see below).

Other scripts:

```sh
npm run build    # production build
npm run preview  # preview the production build
npm run lint     # ESLint
npm run typecheck
npm test         # Vitest (npm run test:coverage for the coverage report)
```

## Configuration

All settings are Vite environment variables (copy `.env.example` to `.env.local`):

| Variable               | Default                                   | Description                                                   |
| ---------------------- | ----------------------------------------- | ------------------------------------------------------------- |
| `VITE_API_URL`         | `/dashboards/api/graficos/dados-relatorio/` | Endpoint that returns the report                            |
| `VITE_BASE`            | `/static/dashboard-cliente/`              | Public path of the built assets                               |
| `VITE_ROUTER_BASENAME` | `/dashboards/dashboard-cliente`           | Router `basename`; must match where the app is hosted         |
| `VITE_DEMO`            | `false`                                   | `true` forces demo mode at build time (`?demo=1` does it per visit) |

The defaults reproduce the original deployment, where the app is served under a sub-path of the backend.

## Backend API

This repository contains the front end only. It expects a backend that serves:

```
GET <VITE_API_URL>
```

| Query parameter   | Example   | Description                     |
| ----------------- | --------- | ------------------------------- |
| `empresa`         | `1`       | Company identifier              |
| `periodo_inicial` | `2026-01` | First month of the period       |
| `periodo_final`   | `2026-06` | Last month of the period        |
| `aliquota_ibs`    | `18.5`    | IBS rate (%)                    |
| `aliquota_cbs`    | `8.5`     | CBS rate (%)                    |
| `aliquota_is`     | `0`       | Selective tax (IS) rate (%)     |

Expected response (JSON, optionally wrapped in a `dados` key). The full contract is in [`src/lib/api-types.ts`](src/lib/api-types.ts); every block is optional and the UI hides what is missing.

**Validation.** The payload is checked when it arrives (`validateReport` in [`src/lib/report.ts`](src/lib/report.ts)): a block that is present must have the documented shape (summary figures are numbers, `produtos` is a list of objects, chart blocks have `labels`/`datasets` lists). A violation is shown as *"Resposta da API inválida: \<path\> deveria ser \<tipo\>"* instead of rendering `NaN`. `schema_version` is optional; a missing value means `1.x`, and a higher major version is rejected with a clear message.

```jsonc
{
  "schema_version": "1.0",
  "resumo": {
    "apuracao_atual":   { "debitos": 0, "creditos": 0, "resultado": 0, "carga_tributaria_efetiva": 0 },
    "apuracao_reforma": { "debitos": 0, "creditos": 0, "resultado": 0, "carga_tributaria_efetiva": 0 }
  },
  "entradas": {
    "compra_bruta": 0, "creditos": 0, "compra_liquida": 0, "carga_tributaria_atual": 0,
    "creditos_ibs_cbs": 0, "compra_total_reforma": 0, "carga_tributaria_reforma": 0,
    "produtos": [
      { "descricao": "…", "ncm": "…", "quantidade": 0, "valor_total": 0, "total_reforma": 0, "dif_total": 0,
        "icms": 0, "pis": 0, "cofins": 0, "ibs": 0, "cbs": 0, "ibs_cbs": 0, "is": 0,
        "creditos": 0, "creditos_reforma": 0 }
    ]
  },
  "saidas": { /* same shape, with venda_* and debitos_* fields */ },
  "graficos": {
    // Chart.js-style objects: { labels: [], datasets: [{ data: [] }] }
    "carga_tributaria_compras": {}, "carga_tributaria_vendas": {},
    "tributos_entradas": {}, "tributos_saidas": {},
    "comparativo_entradas": {}, "comparativo_saidas": {}
  }
}
```

`buildDemoReport()` in [`src/lib/demo.ts`](src/lib/demo.ts) produces a complete example of this payload.

## Architecture

```
FilterPanel ──▶ Index.fetchData ──▶ fetch(API) ──▶ parseApiResponse ──▶ lib/report.* ──▶ cards & charts
                      └── demo mode ──▶ lib/demo.buildDemoReport ─────────┘
```

All computation lives in `src/lib` as pure, unit-tested functions; components only render. The contract is permissive: any missing block hides its section instead of failing. Full description in [docs/architecture.md](docs/architecture.md).

## Project structure

```
src/
├── lib/
│   ├── api-types.ts                 # API contract
│   ├── report.ts                    # pure data-mapping functions (+ tests)
│   ├── demo.ts                      # fictional dataset for demo mode (+ tests)
│   └── config.ts                    # env-based configuration
├── pages/Index.tsx                  # data fetching and page layout
└── components/dashboard/
    ├── FilterPanel.tsx              # company, period and rate filters (+ tests)
    ├── ImpactOverview.tsx           # impact and summary cards
    ├── TaxCharts.tsx                # burden, comparison and composition charts
    ├── TopProducts.tsx              # top purchased / sold products
    └── utils.ts                     # colors and pt-BR formatters
```

## Roadmap

- [x] Configurable API URL and base path through environment variables
- [x] Demo mode so the dashboard runs without a backend
- [x] Typed API contract and unit tests for the data mapping
- [x] Component tests, coverage thresholds, Dependabot, CodeQL and audit workflow
- [ ] Classification of products (NCM) into the reform's differentiated regimes, with legal references
- [ ] Export the simulation (CSV / PDF)
- [ ] English UI (i18n)

## Documentation

| Guide | Content |
| --- | --- |
| [docs/architecture.md](docs/architecture.md) | Data flow, modules, design rules, demo model |
| [docs/development.md](docs/development.md) | Setup, scripts, conventions, branches |
| [docs/testing.md](docs/testing.md) | Test suites, fixture, coverage |
| [docs/release-process.md](docs/release-process.md) | Versioning and release checklist |
| [docs/maintenance.md](docs/maintenance.md) | Dependabot, audits, CodeQL, triage |
| [AGENTS.md](AGENTS.md) | Instructions for coding agents |

## Alternatives

The ecosystem around the reform is young and growing fast. Projects found in September 2026 that overlap with `dashreforma` (listed for orientation, not as a comparison of quality):

| Project | What it is |
| --- | --- |
| [Calculadora da Reforma Tributária (Receita Federal / Serpro)](https://www.gov.br/receitafederal/) | Official calculator, released as open source with a REST component; the reference for rates, classification and calculation memory. |
| [andre-djsystem/CalculadoraRTC](https://github.com/andre-djsystem/CalculadoraRTC) | Pascal library wrapping the official calculator's endpoints. |
| [fraurino/ReformaTributaria2025](https://github.com/fraurino/ReformaTributaria2025) | Tax classification and CBS/IBS rates through the official API. |
| [vilsonneto/tributos-br](https://github.com/vilsonneto/tributos-br) | TypeScript tax-calculation engine (ICMS, IPI, IBS, CBS…). |
| [micdepieri/simulador-reforma-tributaria](https://github.com/micdepieri/simulador-reforma-tributaria) | Python simulator of the 2026–2033 transition across regimes. |
| [locksarnon/simulador-reforma](https://github.com/locksarnon/simulador-reforma) | Full-stack simulator (React + NestJS) with NF-e import and scenarios. |
| [mickbap/tribultz](https://github.com/mickbap/tribultz) | Compliance and simulation platform with an executive dashboard. |
| Free web simulators (Portal Contábeis, Conta Azul, BuscadorNCM, Tributos.io) | Closed-source calculators, some per NCM. |

`dashreforma` differs in scope rather than in ambition: it is only the presentation layer, MIT-licensed, with a public demo, a documented JSON contract, tests and CI. A calculation engine from the list above could feed it by implementing the contract. If you maintain one of these projects and something here is inaccurate, open an issue.

## Contributing

See [CONTRIBUTING.md](CONTRIBUTING.md) and the [Code of Conduct](CODE_OF_CONDUCT.md). Security issues: [SECURITY.md](SECURITY.md).

## Security

No secrets, no persistence, no authentication of its own: the app renders what the configured backend returns. Dependabot (weekly), a weekly `npm audit` workflow, CodeQL and secret scanning with push protection are enabled. Vulnerabilities: see [SECURITY.md](SECURITY.md).

## Disclaimer

This is a simulation tool. Results depend entirely on the data and rates supplied and do not constitute tax or legal advice. The demo dataset is fictional and its tax model is deliberately simplified.

## License

[MIT](LICENSE) © 2026 Bruno Goncalves

---

## Resumo em português

O `dashreforma` é um painel (React + TypeScript) que compara a apuração tributária de uma empresa no **sistema atual** com a apuração simulada na **Reforma Tributária** (IBS, CBS e Imposto Seletivo). Permite ajustar as alíquotas, filtrar por empresa e período, ver a variação de débitos, créditos, resultado e carga tributária, e analisar os produtos mais comprados e mais vendidos.

**Demo online:** <https://grupomg-tech.github.io/dashreforma/> (dados fictícios; altere as alíquotas e clique em *Simular*).

Este repositório contém apenas o front end; os dados vêm de uma API própria (veja [Backend API](#backend-api)). Para rodar sem backend, abra a aplicação com `?demo=1`. Projeto em estágio inicial — contribuições são bem-vindas. Ferramenta de simulação: não substitui orientação tributária profissional.
