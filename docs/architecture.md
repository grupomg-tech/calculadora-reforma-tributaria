# Architecture

`calculadora-reforma-tributaria` is a single-page React application with no backend of its own. It
fetches one JSON report per query and renders it. All tax computation happens on
the server that implements the [API contract](../README.md#backend-api); the demo
mode is the only place where the front end computes taxes, and only for
illustration.

## Data flow

```
FilterPanel ──(empresa, período, alíquotas)──▶ Index.fetchData
                                                   │
                        demo mode? ──yes──▶ lib/demo.buildDemoReport(aliquotas)
                                                   │ no
                                                   ▼
                                       fetch(API_URL + query string)
                                                   │
                                       lib/report.parseApiResponse(text)
                                                   │  DadosRelatorio (lib/api-types)
                                                   ▼
                    lib/report: computeImpactDelta · deriveBurdenBar · derivePieData · deriveComparativo
                                                   │
                 ┌─────────────────┬───────────────┴──────────────┬───────────────────┐
                 ▼                 ▼                              ▼                   ▼
        ImpactCards/Badges    SummaryCards                  TopProducts           TaxCharts
```

## Modules

| Path | Responsibility | Tested by |
| --- | --- | --- |
| `src/lib/api-types.ts` | TypeScript contract of the report endpoint. Every block is optional; the UI hides what is missing. | type check |
| `src/lib/report.ts` | Pure functions that turn the report into chart rows and headline deltas. No React, no I/O. | `report.test.ts` |
| `src/lib/export.ts` | `toCsv(report)` serialises purchases and sales as a pt-BR CSV (`;` / `,` / UTF-8 BOM). `downloadCsv` triggers the browser download. | `export.test.ts` |
| `src/lib/regimes.ts` | Focused NCM → IBS/CBS/IS regime table (`regimeForNcm`) with LC 214/2025 citations. | `regimes.test.ts` |
| `src/lib/demo.ts` | Fictional catalogue and a simplified tax model that produce a complete `DadosRelatorio` for any set of rates. | `demo.test.ts` |
| `src/lib/config.ts` | Runtime configuration from `VITE_*` variables and the `?demo` flag. | `Index.test.tsx` |
| `src/pages/Index.tsx` | State (filters, data, loading, error, demo), fetching, auto refresh, page layout, CSV export button. | `Index.test.tsx` |
| `src/components/dashboard/FilterPanel.tsx` | Controlled form for company, period and rates. | `FilterPanel.test.tsx` |
| `src/components/dashboard/ImpactOverview.tsx` | Impact cards, summary cards and header badges. | `Index.test.tsx` (rendering) |
| `src/components/dashboard/TopProducts.tsx` | Ranking chart, product cards and the detail dialog. | `TopProducts.test.tsx` |
| `src/components/dashboard/TaxCharts.tsx` | Burden gauges, per-tax comparison, composition donuts, inbound/outbound summaries. | `Index.test.tsx` (rendering) |
| `src/components/dashboard/utils.ts` | Colour palette and pt-BR number formatters. | indirectly |
| `src/components/ui/*` | shadcn/ui primitives (badge, button, card, dialog, input, label, skeleton, tabs). Generated code; not linted. | — |
| `src/App.tsx` | Error boundary, unhandled-rejection logger, router with `ROUTER_BASENAME`. | `App.test.tsx` |

## Design rules

1. **Everything that computes lives in `src/lib`** and is a pure function with a
   unit test. Components only map data to JSX.
2. **The contract is permissive on purpose, but not shapeless.** Backends
   evolve; a missing block degrades to "section not shown", never to a crash.
   A block that *is* present must have the documented shape:
   `validateReport` rejects wrong types with the offending path, and a
   `schema_version` with a major above `SUPPORTED_SCHEMA_MAJOR` is refused.
   `report.ts` prefers the `graficos` block and falls back to product-level
   sums.
3. **Defaults reproduce the original deployment.** `VITE_BASE`,
   `VITE_ROUTER_BASENAME` and `VITE_API_URL` default to the paths used when the
   app is served under a sub-path of the backend, so upgrading never changes a
   production URL by accident.
4. **Demo mode is explicit.** It is entered only through `?demo=1`, `VITE_DEMO`
   or the fallback button shown on API errors, and always displays a banner.

## Build output

Vite splits the bundle into `react`, `charts` (recharts + d3), `motion`
(framer-motion), `vendor` and the app chunk (~46 kB). Vendor chunks change
rarely, so browsers keep them cached between releases.

## Demo tax model (illustrative only)

`lib/demo.ts` charges ICMS, PIS and COFINS "por dentro" (inside `valor_total`),
then applies IBS, CBS and IS "por fora" on the value net of those taxes.
`regimeForNcm` (in `lib/regimes.ts`) supplies `fator` (1 = standard rate,
0.4 = 60% reduction, 0 = zero rate) and the Imposto Seletivo flag from a
focused, cited table (LC 214/2025). Unknown NCMs receive the standard rate.
The model exists so the UI can be explored; it is not a reference
implementation of the law.
