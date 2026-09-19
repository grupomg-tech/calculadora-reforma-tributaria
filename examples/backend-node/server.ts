import { readFileSync } from "node:fs";
import http from "node:http";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { validateReport } from "../../src/lib/report";
import { buildReportFromCsv, parseAliquotas } from "./catalogue";

export const REPORT_PATH = "/dashboards/api/graficos/dados-relatorio";

const CORS: http.OutgoingHttpHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type",
  "Access-Control-Max-Age": "86400",
};

const normalizePath = (pathname: string): string => pathname.replace(/\/+$/, "") || "/";

export const isReportPath = (pathname: string): boolean =>
  normalizePath(pathname) === REPORT_PATH;

const send = (
  res: http.ServerResponse,
  status: number,
  body: string,
  headers: http.OutgoingHttpHeaders = {},
) => {
  res.writeHead(status, { ...CORS, ...headers });
  res.end(body);
};

const sendJson = (res: http.ServerResponse, status: number, payload: unknown) => {
  send(res, status, `${JSON.stringify(payload)}\n`, {
    "Content-Type": "application/json; charset=utf-8",
    "Cache-Control": "no-store",
  });
};

export const loadDefaultCsv = (): string => {
  const besideModule = join(dirname(fileURLToPath(import.meta.url)), "products.csv");
  try {
    return readFileSync(besideModule, "utf8");
  } catch {
    return readFileSync(join(process.cwd(), "examples/backend-node/products.csv"), "utf8");
  }
};

export const createRequestListener = (csv: string = loadDefaultCsv()): http.RequestListener => {
  return (req, res) => {
    const url = new URL(req.url ?? "/", "http://127.0.0.1");
    const path = normalizePath(url.pathname);

    if (req.method === "OPTIONS") {
      send(res, 204, "");
      return;
    }

    if (req.method !== "GET") {
      sendJson(res, 405, { error: "Method not allowed" });
      return;
    }

    if (path === "/") {
      sendJson(res, 200, {
        service: "calculadora-reforma-tributaria-example-backend",
        report: `${REPORT_PATH}/`,
      });
      return;
    }

    if (!isReportPath(url.pathname)) {
      sendJson(res, 404, { error: `Not found. GET ${REPORT_PATH}/` });
      return;
    }

    try {
      const report = validateReport(buildReportFromCsv(csv, parseAliquotas(url.searchParams)));
      sendJson(res, 200, report);
    } catch (error) {
      const message = error instanceof Error ? error.message : "Failed to build report";
      sendJson(res, 500, { error: message });
    }
  };
};

export const startServer = (
  options: { port?: number; host?: string; csv?: string } = {},
): http.Server => {
  const port = options.port ?? Number.parseInt(process.env.PORT ?? "8787", 10);
  const host = options.host ?? process.env.HOST ?? "127.0.0.1";
  const server = http.createServer(createRequestListener(options.csv));
  server.listen(port, host, () => {
    const address = server.address();
    const actualPort = typeof address === "object" && address ? address.port : port;
    process.stdout.write(
      `Example report API listening on http://${host}:${actualPort}${REPORT_PATH}/\n` +
        "Point the dashboard at it with VITE_API_URL (see README).\n",
    );
  });
  return server;
};

// Vitest imports this module; do not bind a port during tests.
if (!process.env.VITEST) {
  startServer();
}
