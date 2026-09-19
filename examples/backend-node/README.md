# Example backend (Node)

Small reference server for the dashboard [API contract](../../README.md#backend-api). It reads a fictional product CSV, applies the same simplified model as [`src/lib/demo.ts`](../../src/lib/demo.ts) (`buildReportFromItems`), and serves:

```
GET /dashboards/api/graficos/dados-relatorio/
```

This is **not tax advice**. Figures are illustrative only — the same caveats as demo mode.

## Run

From the repository root (Node 20.19+; uses `npx tsx` so you do not need a second `npm install`):

```sh
npx --yes tsx examples/backend-node/server.ts
```

Or from this directory:

```sh
npm start
```

The process listens on `http://127.0.0.1:8787` by default (`PORT` / `HOST` override). CORS is open (`Access-Control-Allow-Origin: *`) so the Vite app on another port can call it.

## Point the dashboard at it

Copy [`.env.example`](../../.env.example) to `.env.local` and set an **absolute** URL (a relative path would be fetched from the Vite origin, not from this server):

```sh
VITE_API_URL=http://127.0.0.1:8787/dashboards/api/graficos/dados-relatorio/
```

Restart `npm run dev` and open:

<http://localhost:8080/dashboards/dashboard-cliente/>

Do **not** add `?demo=1` — that flag builds the report in the browser and never hits the API. Leave `VITE_DEMO` unset or `false`. Change IBS / CBS / IS and click *Simular*; the query string (`aliquota_ibs`, `aliquota_cbs`, `aliquota_is`) is applied by this server.

`empresa`, `periodo_inicial` and `periodo_final` are accepted and ignored: the CSV is a single fictional catalogue.

## CSV

[`products.csv`](products.csv) is the same 12 products as the in-app demo (basic-basket items at `fator` 0, reduced-rate goods at 0.4, standard rate at 1, `seletivo` for IS). Columns:

| Column | Meaning |
| --- | --- |
| `descricao` | Product label |
| `ncm` | NCM code (string; not classified here) |
| `quantidade` | Quantity |
| `valor_total` | Purchase amount under the current system (taxes included) |
| `icms`, `pis`, `cofins` | Current-system rates, in percent |
| `fator` | Multiplier on IBS/CBS (1 / 0.4 / 0) |
| `seletivo` | `true` if IS applies on the debit side |

Sales are the purchases times a 1.32 markup, inside `buildReportFromItems`. Lines starting with `#` are comments. Replace the file with your own fictional rows to experiment; do not commit real company data.

## Smoke check

From this directory:

```sh
bash smoke.sh
```

Expects HTTP 200 and a non-empty `schema_version`. The same checks run in `server.test.ts` via `npm test` at the repo root.

## Response shape

JSON matching `DadosRelatorio` in [`src/lib/api-types.ts`](../../src/lib/api-types.ts), including `schema_version: "1.0"`, `resumo`, `entradas`, `saidas` and `graficos`. The handler runs `validateReport` before sending the body.
