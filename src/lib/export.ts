import type { DadosRelatorio, Produto } from "./api-types";

/**
 * CSV export of the loaded report: one row per product, purchases first, then
 * sales. Formatted for Brazilian spreadsheets (";" separator, "," decimal mark,
 * UTF-8 with BOM so Excel opens accents correctly).
 */

export const CSV_COLUMNS: (keyof Produto | "tipo")[] = [
  "tipo", "descricao", "ncm", "quantidade",
  "valor_total", "total_reforma", "dif_total",
  "icms", "pis", "cofins", "ibs", "cbs", "ibs_cbs", "is",
  "creditos", "creditos_reforma", "debitos", "debitos_reforma",
];

const SEPARATOR = ";";
const BOM = String.fromCharCode(0xfeff);

const escapeCell = (value: unknown): string => {
  if (value === undefined || value === null) return "";
  const text = typeof value === "number" ? String(value).replace(".", ",") : String(value);
  return /[;"\r\n]/.test(text) ? `"${text.replace(/"/g, '""')}"` : text;
};

const toRow = (tipo: "entrada" | "saida", produto: Produto): string =>
  CSV_COLUMNS.map((column) => escapeCell(column === "tipo" ? tipo : produto[column])).join(SEPARATOR);

export const toCsv = (report: DadosRelatorio): string => {
  const header = CSV_COLUMNS.join(SEPARATOR);
  const rows = [
    ...(report.entradas?.produtos ?? []).map((p) => toRow("entrada", p)),
    ...(report.saidas?.produtos ?? []).map((p) => toRow("saida", p)),
  ];
  return BOM + [header, ...rows].join("\r\n") + "\r\n";
};

/** File name such as `dashreforma_1_2026-01_2026-06.csv`; empty parts are skipped. */
export const csvFileName = (parts: { empresa?: string; periodoInicial?: string; periodoFinal?: string }): string => {
  const safe = [parts.empresa, parts.periodoInicial, parts.periodoFinal]
    .filter((p): p is string => Boolean(p))
    .map((p) => p.replace(/[^\w-]+/g, "_"));
  return ["dashreforma", ...safe].join("_") + ".csv";
};

/** Triggers a browser download of the CSV. Kept separate so `toCsv` stays pure and testable. */
export const downloadCsv = (report: DadosRelatorio, fileName: string): void => {
  const blob = new Blob([toCsv(report)], { type: "text/csv;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = fileName;
  document.body.appendChild(link);
  link.click();
  link.remove();
  URL.revokeObjectURL(url);
};
