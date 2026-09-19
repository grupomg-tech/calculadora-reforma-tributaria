import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import { buildDemoReport } from "../../src/lib/demo";
import { validateReport } from "../../src/lib/report";
import { buildReportFromCsv, parseAliquotas, parseProductCsv } from "./catalogue";

const csv = readFileSync(join(process.cwd(), "examples/backend-node/products.csv"), "utf8");
const RATES = { ibs: 18.5, cbs: 8.5, is: 0 };

describe("parseProductCsv", () => {
  it("reads the fictional catalogue, including quoted commas", () => {
    const items = parseProductCsv(csv);
    expect(items).toHaveLength(12);
    expect(items.find((item) => item.descricao.startsWith("Sabão"))).toMatchObject({
      descricao: "Sabão em pó 1,6kg",
      fator: 1,
      seletivo: false,
    });
    expect(items.filter((item) => item.seletivo)).toHaveLength(2);
  });

  it("rejects a CSV that is missing a required column", () => {
    expect(() => parseProductCsv("descricao,ncm\nArroz,1006.30.21\n")).toThrow(/missing column/);
  });
});

describe("parseAliquotas", () => {
  it("uses the dashboard defaults when rates are omitted", () => {
    expect(parseAliquotas(new URLSearchParams())).toEqual(RATES);
  });

  it("treats an invalid rate as 0, like the filter panel", () => {
    expect(parseAliquotas(new URLSearchParams("aliquota_ibs=x")).ibs).toBe(0);
  });
});

describe("buildReportFromCsv", () => {
  it("matches demo mode for the shipped catalogue and default rates", () => {
    const report = buildReportFromCsv(csv, RATES);
    expect(report.schema_version).toBe("1.0");
    expect(validateReport(report)).toEqual(buildDemoReport(RATES));
  });
});
