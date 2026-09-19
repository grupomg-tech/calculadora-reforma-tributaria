import { describe, it, expect, vi, afterEach } from "vitest";
import relatorio from "@/test/fixtures/relatorio.json";
import type { DadosRelatorio } from "./api-types";
import {
  CSV_BOM,
  CSV_COLUMNS,
  CSV_FILENAME,
  csvFileName,
  CSV_SEPARATOR,
  downloadCsv,
  printDocumentTitle,
  printMetaLine,
  printReport,
  toCsv,
} from "./export";

const HEADER = CSV_COLUMNS.join(CSV_SEPARATOR);

const linesOf = (csv: string): string[] => {
  expect(csv.startsWith(CSV_BOM)).toBe(true);
  return csv.slice(CSV_BOM.length).replace(/\r\n$/, "").split("\r\n");
};

describe("toCsv", () => {
  it("emits a UTF-8 BOM and only the header for an empty report", () => {
    const csv = toCsv({});
    const lines = linesOf(csv);
    expect(lines).toEqual([HEADER]);
    expect(HEADER.split(CSV_SEPARATOR)[0]).toBe("tipo");
    expect(HEADER).toContain("descricao");
    expect(HEADER).toContain("debitos_reforma");
  });

  it("exports one row per fixture product, purchases then sales, with pt-BR decimals", () => {
    const csv = toCsv(relatorio as DadosRelatorio);
    const lines = linesOf(csv);

    expect(lines).toHaveLength(1 + 3 + 3);
    expect(lines[0]).toBe(HEADER);
    expect(lines[1]).toBe(
      "compra;Arroz branco tipo 1 5kg;;;1006.30.21;4200;96600;89838;-6762;6762;0;0;0;0;0;0;6762;;0;",
    );
    expect(lines[2]).toBe(
      "compra;Feijão carioca 1kg;;;0713.33.19;6100;45750;42547,5;-3202,5;3202,5;0;0;0;0;0;0;3202,5;;0;",
    );
    expect(lines[4]).toBe(
      "venda;Arroz branco tipo 1 5kg;;;1006.30.21;4200;127512;118586,16;-8925,84;8925,84;0;0;0;0;0;0;;8925,84;;0",
    );
    expect(lines.slice(1, 4).every((line) => line.startsWith(`compra${CSV_SEPARATOR}`))).toBe(true);
    expect(lines.slice(4).every((line) => line.startsWith(`venda${CSV_SEPARATOR}`))).toBe(true);
    expect(csv).toContain("Óleo de soja 900ml");
  });

  it("quotes descriptions that contain the separator", () => {
    const csv = toCsv({
      entradas: { produtos: [{ descricao: "Arroz; tipo 1", valor_total: 10.5 }] },
    });
    const [, row] = linesOf(csv);
    expect(row).toContain('"Arroz; tipo 1"');
    expect(row).toContain(`${CSV_SEPARATOR}10,5${CSV_SEPARATOR}`);
  });

  it("escapes quotes inside quoted fields", () => {
    const csv = toCsv({
      saidas: { produtos: [{ descricao: 'Óleo "especial"; 900ml' }] },
    });
    const [, row] = linesOf(csv);
    expect(row).toContain('"Óleo ""especial""; 900ml"');
    expect(row.startsWith("venda;")).toBe(true);
  });

  it("skips missing product lists and non-object entries without throwing", () => {
    const csv = toCsv({
      entradas: { produtos: [null, { descricao: "Ok" }] },
      saidas: {},
    } as DadosRelatorio);
    const lines = linesOf(csv);
    expect(lines).toHaveLength(2);
    expect(lines[1].startsWith("compra;Ok;")).toBe(true);
  });
});

describe("downloadCsv", () => {
  afterEach(() => {
    vi.unstubAllGlobals();
    vi.restoreAllMocks();
  });

  it("creates a CSV blob and clicks a temporary download link", () => {
    const blobs: Blob[] = [];
    const createObjectURL = vi.fn((blob: Blob) => {
      blobs.push(blob);
      return "blob:mock-csv";
    });
    const revokeObjectURL = vi.fn();
    vi.stubGlobal("URL", { createObjectURL, revokeObjectURL });

    const click = vi.fn();
    const originalCreateElement = document.createElement.bind(document);
    vi.spyOn(document, "createElement").mockImplementation(((tagName: string) => {
      const element = originalCreateElement(tagName);
      if (tagName === "a") element.click = click;
      return element;
    }) as typeof document.createElement);

    downloadCsv(`${CSV_BOM}${HEADER}\n`, CSV_FILENAME);

    expect(createObjectURL).toHaveBeenCalledTimes(1);
    expect(blobs[0]).toBeInstanceOf(Blob);
    expect(blobs[0].type).toContain("text/csv");
    expect(click).toHaveBeenCalledTimes(1);
    expect(revokeObjectURL).toHaveBeenCalledWith("blob:mock-csv");
  });
});

describe("csvFileName", () => {
  it("joins the filters and skips empty ones", () => {
    expect(csvFileName({ empresa: "42", periodoInicial: "2026-01", periodoFinal: "2026-06" })).toBe("calculadora-reforma-tributaria_42_2026-01_2026-06.csv");
    expect(csvFileName({})).toBe("calculadora-reforma-tributaria.csv");
    expect(csvFileName({ empresa: "Loja Centro/SP" })).toBe("calculadora-reforma-tributaria_Loja_Centro_SP.csv");
  });
});

describe("printDocumentTitle", () => {
  it("uses the same stem as the CSV name without the extension", () => {
    expect(printDocumentTitle({ empresa: "42", periodoInicial: "2026-01", periodoFinal: "2026-06" }))
      .toBe("calculadora-reforma-tributaria_42_2026-01_2026-06");
    expect(printDocumentTitle({})).toBe("calculadora-reforma-tributaria");
  });
});

describe("printMetaLine", () => {
  it("joins company, period and rates with a pt-BR decimal mark", () => {
    expect(printMetaLine({
      empresa: "42",
      periodoInicial: "2026-01",
      periodoFinal: "2026-06",
      aliquotaIbs: "18.5",
      aliquotaCbs: "8.5",
      aliquotaIs: "0",
    })).toBe("Empresa 42 · 2026-01 – 2026-06 · IBS 18,5% · CBS 8,5% · IS 0%");
    expect(printMetaLine({ aliquotaIbs: "18.5", aliquotaCbs: "8.5", aliquotaIs: "0" }))
      .toBe("IBS 18,5% · CBS 8,5% · IS 0%");
    expect(printMetaLine({})).toBe("");
  });
});

describe("printReport", () => {
  afterEach(() => {
    vi.unstubAllGlobals();
    vi.restoreAllMocks();
  });

  it("calls window.print and restores document.title after printing", () => {
    const print = vi.fn();
    vi.stubGlobal("print", print);
    document.title = "Original";

    printReport("calculadora-reforma-tributaria_42");

    expect(print).toHaveBeenCalledTimes(1);
    expect(document.title).toBe("calculadora-reforma-tributaria_42");
    window.dispatchEvent(new Event("afterprint"));
    expect(document.title).toBe("Original");
  });

  it("prints without renaming when no title is given", () => {
    const print = vi.fn();
    vi.stubGlobal("print", print);
    document.title = "Original";

    printReport();

    expect(print).toHaveBeenCalledTimes(1);
    expect(document.title).toBe("Original");
  });
});
