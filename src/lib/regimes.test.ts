import { describe, it, expect } from "vitest";
import {
  REGIME_TABLE,
  STANDARD_REGIME,
  ncmDigits,
  regimeForNcm,
  regimeKind,
} from "./regimes";

describe("REGIME_TABLE", () => {
  it("cites LC 214/2025 (article and/or annex) on every entry", () => {
    expect(REGIME_TABLE.length).toBeGreaterThan(0);
    for (const entry of REGIME_TABLE) {
      expect(entry.ncm.length).toBeGreaterThan(0);
      expect(entry.base).toMatch(/LC 214\/2025/);
      expect(entry.base).toMatch(/art\.|Anexo/);
    }
  });
});

describe("regimeForNcm", () => {
  it("maps a basic-basket NCM to the zero rate (Anexo I)", () => {
    const rice = regimeForNcm("1006.30.21");
    expect(rice).toEqual({
      fator: 0,
      seletivo: false,
      base: "LC 214/2025 art. 125, Anexo I",
    });
    expect(regimeKind(rice)).toBe("zero");
  });

  it("maps a 60% food-annex NCM (Anexo VII)", () => {
    const oil = regimeForNcm("1507.90.11");
    expect(oil.fator).toBe(0.4);
    expect(oil.seletivo).toBe(false);
    expect(oil.base).toBe("LC 214/2025 art. 135, Anexo VII");
    expect(regimeKind(oil)).toBe("reduced60");
  });

  it("maps a 60% hygiene-annex NCM (Anexo VIII)", () => {
    const paper = regimeForNcm("4818.10.00");
    expect(paper.fator).toBe(0.4);
    expect(paper.seletivo).toBe(false);
    expect(paper.base).toBe("LC 214/2025 art. 136, Anexo VIII");
  });

  it("maps a selective-tax NCM (Anexo XVII)", () => {
    const soda = regimeForNcm("2202.10.00");
    expect(soda).toEqual({
      fator: 1,
      seletivo: true,
      base: "LC 214/2025 art. 409 § 1º, Anexo XVII",
    });
    expect(regimeKind(soda)).toBe("selective");
  });

  it("treats an unknown NCM as the standard rate", () => {
    const unknown = regimeForNcm("9999.99.99");
    expect(unknown).toEqual(STANDARD_REGIME);
    expect(unknown.fator).toBe(1);
    expect(unknown.seletivo).toBe(false);
    expect(unknown.base).toMatch(/art\. 16/);
    expect(regimeKind(unknown)).toBe("standard");
  });

  it("accepts dotted, undotted and spaced NCM spellings", () => {
    expect(regimeForNcm("0901.21.00")).toEqual(regimeForNcm("09012100"));
    expect(regimeForNcm("0901 21 00")).toEqual(regimeForNcm("09.01"));
    expect(ncmDigits("1006.30.21")).toBe("10063021");
  });

  it("returns the standard rate for missing or unusable codes", () => {
    expect(regimeForNcm(undefined)).toEqual(STANDARD_REGIME);
    expect(regimeForNcm(null)).toEqual(STANDARD_REGIME);
    expect(regimeForNcm("")).toEqual(STANDARD_REGIME);
    expect(regimeForNcm("NCM")).toEqual(STANDARD_REGIME);
  });

  it("prefers a more specific heading over a shorter one", () => {
    // 1513.21.20 is Anexo I (óleo de babaçu); 15.13 as a whole is not in the table.
    expect(regimeForNcm("1513.21.20").base).toMatch(/Anexo I/);
    expect(regimeForNcm("1513.21.20").fator).toBe(0);
  });

  it("classifies horticultural zero-rate codes under Anexo XV", () => {
    const tomato = regimeForNcm("0702.00.00");
    expect(tomato.fator).toBe(0);
    expect(tomato.base).toBe("LC 214/2025 art. 148, Anexo XV");
  });
});
