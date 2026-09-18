import { describe, it, expect } from "vitest";
import { toCsv, csvFileName, CSV_COLUMNS } from "./export";
import relatorio from "@/test/fixtures/relatorio.json";
import type { DadosRelatorio } from "./api-types";

const BOM = String.fromCharCode(0xfeff);
const lines = (csv: string) => (csv.startsWith(BOM) ? csv.slice(1) : csv).split("\r\n").filter(Boolean);

describe("toCsv", () => {
  it("starts with a UTF-8 BOM and the header, even for an empty report", () => {
    const csv = toCsv({});
    expect(csv.startsWith(BOM)).toBe(true);
    expect(lines(csv)).toEqual([CSV_COLUMNS.join(";")]);
  });

  it("writes one row per product, purchases first, with pt-BR decimals", () => {
    const csv = toCsv(relatorio as DadosRelatorio);
    const rows = lines(csv);
    const purchases = relatorio.entradas.produtos.length;
    const sales = relatorio.saidas.produtos.length;

    expect(rows).toHaveLength(1 + purchases + sales);
    expect(rows[1].startsWith("entrada;Arroz branco tipo 1 5kg;1006.30.21;4200;96600;")).toBe(true);
    expect(rows[1 + purchases].startsWith("saida;")).toBe(true);
    expect(rows[1]).toContain("6762");
    expect(rows[1 + purchases]).toContain("127512"); // 96,600 * 1.32 markup
    expect(rows[3]).toContain(";854,7;"); // PIS of the oil row: 51,800 * 1.65% with a comma decimal
  });

  it("quotes cells that contain the separator, quotes or line breaks", () => {
    const report: DadosRelatorio = {
      saidas: { produtos: [{ descricao: 'Refrigerante "cola"; 2L', valor_total: 10.5 }] },
    };
    const row = lines(toCsv(report))[1];
    expect(row).toBe('saida;"Refrigerante ""cola""; 2L";;;10,5;;;;;;;;;;;;;');
  });

  it("leaves missing fields empty instead of writing undefined", () => {
    const row = lines(toCsv({ entradas: { produtos: [{ descricao: "X" }] } }))[1];
    expect(row).toBe("entrada;X" + ";".repeat(CSV_COLUMNS.length - 2));
  });
});

describe("csvFileName", () => {
  it("joins the filters and skips empty ones", () => {
    expect(csvFileName({ empresa: "42", periodoInicial: "2026-01", periodoFinal: "2026-06" })).toBe("dashreforma_42_2026-01_2026-06.csv");
    expect(csvFileName({})).toBe("dashreforma.csv");
    expect(csvFileName({ empresa: "Loja Centro/SP" })).toBe("dashreforma_Loja_Centro_SP.csv");
  });
});
