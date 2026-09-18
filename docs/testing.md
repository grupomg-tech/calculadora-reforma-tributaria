# Testing

Tests use [Vitest](https://vitest.dev) with jsdom and
[Testing Library](https://testing-library.com). They live next to the code
they cover (`*.test.ts` / `*.test.tsx`).

```sh
npm test                # single run
npm run test:watch      # watch mode
npm run test:coverage   # coverage report + thresholds (same as CI)
```

## What is covered

| Suite | Scope |
| --- | --- |
| `src/lib/report.test.ts` | `parseApiResponse` (plain, `dados` wrapper, HTML, invalid JSON), `computeImpactDelta`, `deriveBurdenBar`, `derivePieData`, `deriveComparativo` |
| `src/lib/demo.test.ts` | Internal consistency of the fictional model: per-product totals, aggregates, assessment = debits − credits, reaction to rates, selective tax on flagged products only, zero/reduced rates |
| `src/pages/Index.test.tsx` | Fetch on mount with the right query string, `dados` wrapper, HTTP error + fallback button, network error message, `?demo=1` without network, recalculation on rate change, filters from the query string |
| `src/components/dashboard/FilterPanel.test.tsx` | Rendering, setters, submit, disabled while loading, auto-refresh toggle |
| `src/components/dashboard/TopProducts.test.tsx` | Empty state, top-10 ordering, impact badges, detail dialog, purchases tab |
| `src/App.test.tsx` | Root route, 404 route, error boundary |

## Numeric regression

`src/lib/demo.test.ts` freezes the headline figures, the purchase/sale totals
and two products computed by hand (a zero-rated purchase and a sale subject to
IS). They are not a legal reference; they protect the illustrative model from
silent changes. If you change the model or the catalogue on purpose, update the
expected values in the same PR and add a CHANGELOG entry saying the demo
numbers changed.

## Contract validation

`src/lib/report.test.ts` covers `validateReport`: partial payloads are accepted,
wrong types are rejected with the path in the message, and an unsupported
`schema_version` major is refused. Add a case there whenever the contract gains
a block.

## Fixture

`src/test/fixtures/relatorio.json` is a full report in the API contract shape
(three products per side). Use it in new tests instead of building payloads by
hand, and update it when the contract changes.

## Coverage

Coverage is measured with the v8 provider over every file in `src/` except
tests, the test setup and `main.tsx`. CI fails when statements or lines drop
below 80%. Check the current numbers with `npm run test:coverage`; the report is
uploaded as an artifact of the CI workflow.

## Guidelines for new tests

- Test behaviour through the DOM (roles, labels, text), not implementation
  details.
- Stub `fetch` with `vi.stubGlobal("fetch", …)` and clean up with
  `vi.unstubAllGlobals()`.
- Stub `ResizeObserver` when rendering anything that includes Recharts.
- Radix tabs activate on `mouseDown`, not `click`.
- Prefer one assertion per behaviour; name tests by the behaviour they protect.
