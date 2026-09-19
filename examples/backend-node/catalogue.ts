import type { Aliquotas, DadosRelatorio } from "../../src/lib/api-types";
import { buildReportFromItems, type CatalogueItem } from "../../src/lib/demo";

const COLUMNS = [
  "descricao",
  "ncm",
  "quantidade",
  "valor_total",
  "icms",
  "pis",
  "cofins",
  "fator",
  "seletivo",
] as const;

const DEFAULT_RATES: Aliquotas = { ibs: 18.5, cbs: 8.5, is: 0 };

/**
 * Minimal RFC 4180 reader: commas, quoted fields, escaped quotes.
 * Lines whose first cell starts with `#` are comments.
 */
export const parseCsvRows = (text: string): string[][] => {
  const source = text.replace(/^\uFEFF/, "").replace(/\r\n/g, "\n").replace(/\r/g, "\n");
  const rows: string[][] = [];
  let row: string[] = [];
  let cell = "";
  let inQuotes = false;

  for (let i = 0; i < source.length; i += 1) {
    const ch = source[i];
    if (inQuotes) {
      if (ch === "\"") {
        if (source[i + 1] === "\"") {
          cell += "\"";
          i += 1;
        } else {
          inQuotes = false;
        }
      } else {
        cell += ch;
      }
    } else if (ch === "\"") {
      inQuotes = true;
    } else if (ch === ",") {
      row.push(cell);
      cell = "";
    } else if (ch === "\n") {
      row.push(cell);
      rows.push(row);
      row = [];
      cell = "";
    } else {
      cell += ch;
    }
  }

  if (inQuotes) throw new Error("CSV has an unclosed quote");
  if (cell !== "" || row.length > 0) {
    row.push(cell);
    rows.push(row);
  }
  return rows;
};

const parseNumber = (raw: string, column: string, row: number): number => {
  const value = Number(raw.trim());
  if (raw.trim() === "" || Number.isNaN(value)) {
    throw new Error(`CSV row ${row}: "${column}" must be a number`);
  }
  return value;
};

const parseSeletivo = (raw: string): boolean => {
  const value = raw.trim().toLowerCase();
  return value === "true" || value === "1" || value === "yes";
};

export const parseProductCsv = (text: string): CatalogueItem[] => {
  const rows = parseCsvRows(text).filter((row) => {
    const first = (row[0] ?? "").trim();
    if (first.startsWith("#")) return false;
    return row.some((cell) => cell.trim() !== "");
  });
  if (rows.length === 0) throw new Error("CSV is empty");

  const header = rows[0].map((cell) => cell.trim().toLowerCase());
  const index = Object.fromEntries(
    COLUMNS.map((column) => [column, header.indexOf(column)]),
  ) as Record<(typeof COLUMNS)[number], number>;
  for (const column of COLUMNS) {
    if (index[column] < 0) throw new Error(`CSV is missing column "${column}"`);
  }

  return rows.slice(1).map((row, offset) => {
    const line = offset + 2;
    return {
      descricao: (row[index.descricao] ?? "").trim(),
      ncm: (row[index.ncm] ?? "").trim(),
      quantidade: parseNumber(row[index.quantidade] ?? "", "quantidade", line),
      valor_total: parseNumber(row[index.valor_total] ?? "", "valor_total", line),
      icms: parseNumber(row[index.icms] ?? "", "icms", line),
      pis: parseNumber(row[index.pis] ?? "", "pis", line),
      cofins: parseNumber(row[index.cofins] ?? "", "cofins", line),
      fator: parseNumber(row[index.fator] ?? "", "fator", line),
      seletivo: parseSeletivo(row[index.seletivo] ?? ""),
    };
  });
};

const parseRate = (value: string | null, fallback: number): number => {
  if (value === null || value.trim() === "") return fallback;
  return Number.parseFloat(value) || 0;
};

/** Dashboard defaults when a rate is omitted; invalid values become 0 (same as the UI). */
export const parseAliquotas = (search: URLSearchParams): Aliquotas => ({
  ibs: parseRate(search.get("aliquota_ibs"), DEFAULT_RATES.ibs),
  cbs: parseRate(search.get("aliquota_cbs"), DEFAULT_RATES.cbs),
  is: parseRate(search.get("aliquota_is"), DEFAULT_RATES.is),
});

export const buildReportFromCsv = (csv: string, aliquotas: Aliquotas): DadosRelatorio =>
  buildReportFromItems(parseProductCsv(csv), aliquotas);
