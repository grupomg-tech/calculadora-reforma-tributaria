import type { DadosRelatorio, Produto } from "./api-types";

/** Named columns of `Produto` in `api-types.ts`, in declaration order. */
export const PRODUTO_COLUMNS = [
  "descricao",
  "nome",
  "produto",
  "ncm",
  "quantidade",
  "valor_total",
  "total_reforma",
  "dif_total",
  "icms",
  "pis",
  "cofins",
  "ibs",
  "cbs",
  "ibs_cbs",
  "is",
  "creditos",
  "debitos",
  "creditos_reforma",
  "debitos_reforma",
] as const;

export const CSV_COLUMNS = ["tipo", ...PRODUTO_COLUMNS] as const;

export const CSV_SEPARATOR = ";";
export const CSV_BOM = "\uFEFF";
export const CSV_FILENAME = "calculadora-reforma-tributaria.csv";
/** RFC 4180 line ending; Excel and LibreOffice accept it on every platform. */
export const CSV_EOL = "\r\n";

const NEEDS_QUOTES = /[;"\r\n]/;

/**
 * Serialises a report to a spreadsheet-friendly CSV: one row per product
 * (purchases then sales), `;` as separator, `,` as decimal mark, UTF-8 BOM.
 */
export const toCsv = (report: DadosRelatorio): string => {
  const rows = [CSV_COLUMNS.join(CSV_SEPARATOR)];
  appendProducts(rows, report.entradas?.produtos, "compra");
  appendProducts(rows, report.saidas?.produtos, "venda");
  return `${CSV_BOM}${rows.join(CSV_EOL)}${CSV_EOL}`;
};

export type ReportFileParts = {
  empresa?: string;
  periodoInicial?: string;
  periodoFinal?: string;
};

/**
 * Filter-derived stem shared by the CSV file name and the print/PDF title,
 * e.g. `calculadora-reforma-tributaria_42_2026-01_2026-06`. Empty parts are skipped.
 */
export const reportFileStem = (parts: ReportFileParts): string => {
  const safe = [parts.empresa, parts.periodoInicial, parts.periodoFinal]
    .filter((p): p is string => Boolean(p))
    .map((p) => p.replace(/[^\w-]+/g, "_"));
  return ["calculadora-reforma-tributaria", ...safe].join("_");
};

/**
 * File name derived from the current filters, e.g.
 * `calculadora-reforma-tributaria_42_2026-01_2026-06.csv`; empty parts are skipped.
 */
export const csvFileName = (parts: ReportFileParts): string => `${reportFileStem(parts)}.csv`;

/** Suggested `document.title` so the browser's "Save as PDF" uses a filter-derived name. */
export const printDocumentTitle = (parts: ReportFileParts): string => reportFileStem(parts);

export type PrintMetaParts = ReportFileParts & {
  aliquotaIbs?: string;
  aliquotaCbs?: string;
  aliquotaIs?: string;
};

/**
 * One-line simulation context printed on the PDF (company, period, rates).
 * Decimal marks in the rates are shown as `,` to match the rest of the UI.
 */
export const printMetaLine = (parts: PrintMetaParts): string => {
  const period = [parts.periodoInicial, parts.periodoFinal].filter(Boolean).join(" – ");
  const rate = (value: string | undefined, label: string): string | null => {
    if (value === undefined || value === "") return null;
    return `${label} ${value.replace(".", ",")}%`;
  };
  return [
    parts.empresa ? `Empresa ${parts.empresa}` : null,
    period || null,
    [rate(parts.aliquotaIbs, "IBS"), rate(parts.aliquotaCbs, "CBS"), rate(parts.aliquotaIs, "IS")]
      .filter((item): item is string => Boolean(item))
      .join(" · ") || null,
  ].filter((item): item is string => Boolean(item)).join(" · ");
};

/**
 * Opens the browser print dialog. Optionally sets `document.title` so
 * "Save as PDF" picks a filter-derived name, then restores it on `afterprint`.
 */
export const printReport = (title?: string): void => {
  const previous = document.title;
  const restore = () => {
    document.title = previous;
    window.removeEventListener("afterprint", restore);
  };
  if (title) {
    document.title = title;
    window.addEventListener("afterprint", restore);
  }
  window.print();
};

/** Triggers a browser download of a CSV string. */
export const downloadCsv = (csv: string, filename = CSV_FILENAME): void => {
  const blob = new Blob([csv], { type: "text/csv;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = filename;
  link.rel = "noopener";
  document.body.appendChild(link);
  link.click();
  link.remove();
  URL.revokeObjectURL(url);
};

const appendProducts = (
  rows: string[],
  produtos: Produto[] | undefined,
  tipo: "compra" | "venda",
): void => {
  if (!produtos) return;
  for (const product of produtos) {
    if (!product || typeof product !== "object") continue;
    rows.push([tipo, ...PRODUTO_COLUMNS.map((key) => formatCell(product[key]))].join(CSV_SEPARATOR));
  }
};

const formatCell = (value: string | number | null | undefined): string => {
  if (value === null || value === undefined) return "";
  if (typeof value === "number") {
    if (!Number.isFinite(value)) return "";
    return escapeCsv(String(value).replace(".", ","));
  }
  return escapeCsv(value);
};

const escapeCsv = (value: string): string => {
  if (!NEEDS_QUOTES.test(value)) return value;
  return `"${value.replace(/"/g, "\"\"")}"`;
};
