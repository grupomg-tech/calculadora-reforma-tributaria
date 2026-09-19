import { describe, it, expect } from "vitest";
import { buildDemoReport } from "./demo";
import { regimeForNcm } from "./regimes";

const RATES = { ibs: 18.5, cbs: 8.5, is: 0 };
const round2 = (n: number) => Math.round(n * 100) / 100;

describe("buildDemoReport", () => {
  const report = buildDemoReport(RATES);

  it("produces every block the dashboard renders", () => {
    expect(report.resumo?.apuracao_atual).toBeDefined();
    expect(report.resumo?.apuracao_reforma).toBeDefined();
    expect(report.entradas?.produtos?.length).toBeGreaterThan(0);
    expect(report.saidas?.produtos?.length).toBeGreaterThan(0);
    expect(report.graficos?.comparativo_entradas?.labels).toEqual(["ICMS", "PIS", "COFINS", "IBS", "CBS", "IS"]);
  });

  it("keeps each product internally consistent", () => {
    for (const p of [...report.entradas!.produtos!, ...report.saidas!.produtos!]) {
      const base = p.valor_total! - p.icms! - p.pis! - p.cofins!;
      expect(p.total_reforma).toBeCloseTo(base + p.ibs! + p.cbs! + p.is!, 2);
      expect(p.dif_total).toBeCloseTo(p.total_reforma! - p.valor_total!, 2);
      expect(p.ibs_cbs).toBeCloseTo(p.ibs! + p.cbs!, 2);
    }
  });

  it("aggregates purchases and sales from their products", () => {
    const compras = report.entradas!.produtos!;
    const vendas = report.saidas!.produtos!;
    const total = (items: typeof compras, key: string) => round2(items.reduce((s, i) => s + (Number(i[key]) || 0), 0));

    expect(report.entradas!.compra_bruta).toBe(total(compras, "valor_total"));
    expect(report.entradas!.creditos).toBe(total(compras, "creditos"));
    expect(report.entradas!.creditos_ibs_cbs).toBe(total(compras, "creditos_reforma"));
    expect(report.saidas!.venda_bruta).toBe(total(vendas, "valor_total"));
    expect(report.saidas!.debitos).toBe(total(vendas, "debitos"));
    expect(report.saidas!.debitos_ibs_cbs).toBe(total(vendas, "debitos_reforma"));
  });

  it("computes the assessment as debits minus credits", () => {
    const { apuracao_atual: atual, apuracao_reforma: reforma } = report.resumo!;
    expect(atual!.resultado).toBeCloseTo(atual!.debitos - atual!.creditos, 2);
    expect(reforma!.resultado).toBeCloseTo(reforma!.debitos - reforma!.creditos, 2);
    expect(atual!.carga_tributaria_efetiva).toBeGreaterThan(0);
    expect(reforma!.carga_tributaria_efetiva).toBeGreaterThan(0);
  });

  it("reacts to the chosen rates", () => {
    const zero = buildDemoReport({ ibs: 0, cbs: 0, is: 0 });
    expect(zero.resumo!.apuracao_reforma!.debitos).toBe(0);
    expect(zero.resumo!.apuracao_reforma!.creditos).toBe(0);

    const higher = buildDemoReport({ ibs: 20, cbs: 10, is: 0 });
    expect(higher.resumo!.apuracao_reforma!.debitos).toBeGreaterThan(report.resumo!.apuracao_reforma!.debitos);
  });

  it("applies the selective tax only to flagged products, on the debit side", () => {
    const withIs = buildDemoReport({ ...RATES, is: 10 });
    const vendas = withIs.saidas!.produtos!;
    const seletivos = vendas.filter((p) => (p.is as number) > 0);
    expect(seletivos.length).toBeGreaterThan(0);
    expect(seletivos.length).toBeLessThan(vendas.length);
    expect(withIs.resumo!.apuracao_reforma!.creditos).toBe(report.resumo!.apuracao_reforma!.creditos);
    expect(withIs.resumo!.apuracao_reforma!.debitos).toBeGreaterThan(report.resumo!.apuracao_reforma!.debitos);
  });

  // Numeric regression: these figures were computed by hand from the model described in
  // docs/architecture.md and frozen here. Changing the model, the catalogue or the NCM
  // table must update them on purpose, together with a CHANGELOG entry.
  describe("numeric regression (default rates 18.5 / 8.5 / 0)", () => {
    it("reproduces the headline assessment figures", () => {
      expect(report.resumo!.apuracao_atual).toEqual({
        debitos: 158861.01, creditos: 120349.26, resultado: 38511.75, carga_tributaria_efetiva: 4.39,
      });
      expect(report.resumo!.apuracao_reforma).toEqual({
        debitos: 75703.25, creditos: 57350.94, resultado: 18352.31, carga_tributaria_efetiva: 2.31,
      });
    });

    it("reproduces the purchases and sales totals", () => {
      const { produtos: _p, ...entradas } = report.entradas!;
      const { produtos: _s, ...saidas } = report.saidas!;
      expect(entradas).toEqual({
        compra_bruta: 664610, creditos: 120349.26, compra_liquida: 544260.74, carga_tributaria_atual: 18.11,
        creditos_ibs_cbs: 57350.94, compra_total_reforma: 601611.68, carga_tributaria_reforma: 9.53,
      });
      expect(saidas).toEqual({
        venda_bruta: 877285.2, debitos: 158861.01, venda_liquida: 718424.19, carga_tributaria_atual: 18.11,
        debitos_ibs_cbs: 75703.25, venda_total_reforma: 794127.44, carga_tributaria_reforma: 9.53,
      });
    });

    it("computes a zero-rated purchase by hand: rice", () => {
      // 96,600 gross; ICMS 7% = 6,762; no PIS/COFINS; fator 0 => no IBS/CBS.
      const arroz = report.entradas!.produtos!.find((p) => String(p.descricao).startsWith("Arroz"))!;
      expect(arroz).toMatchObject({
        valor_total: 96600, icms: 6762, pis: 0, cofins: 0, ibs: 0, cbs: 0, is: 0,
        total_reforma: 89838, dif_total: -6762, creditos: 6762, creditos_reforma: 0,
      });
    });

    it("computes a selective-tax sale by hand: beer with IS 10%", () => {
      // 79,200 * 1.32 markup = 104,544 gross; ICMS 17% = 17,772.48; PIS 1.65% = 1,724.98;
      // COFINS 7.6% = 7,945.34; base = 77,101.20; IBS 18.5% = 14,263.72; CBS 8.5% = 6,553.60;
      // IS 10% = 7,710.12; total under the reform = 105,628.64.
      const withIs = buildDemoReport({ ibs: 18.5, cbs: 8.5, is: 10 });
      const cerveja = withIs.saidas!.produtos!.find((p) => String(p.descricao).startsWith("Cerveja"))!;
      expect(cerveja).toMatchObject({
        valor_total: 104544, icms: 17772.48, pis: 1724.98, cofins: 7945.34,
        ibs: 14263.72, cbs: 6553.6, is: 7710.12, ibs_cbs: 20817.32,
        total_reforma: 105628.64, dif_total: 1084.64, debitos: 27442.8, debitos_reforma: 28527.44,
      });
    });

    it("rounds every monetary figure to cents", () => {
      const decimals = (n: number) => (String(n).split(".")[1] ?? "").length;
      for (const p of [...report.entradas!.produtos!, ...report.saidas!.produtos!]) {
        for (const key of ["valor_total", "total_reforma", "dif_total", "icms", "pis", "cofins", "ibs", "cbs", "is", "ibs_cbs"]) {
          expect(decimals(Number(p[key]))).toBeLessThanOrEqual(2);
        }
      }
    });
  });

  it("applies reduced and zero rates from the NCM table", () => {
    const arroz = report.entradas!.produtos!.find((p) => String(p.descricao).startsWith("Arroz"))!;
    const acucar = report.entradas!.produtos!.find((p) => String(p.descricao).startsWith("Açúcar"))!;
    const oleo = report.entradas!.produtos!.find((p) => String(p.descricao).startsWith("Óleo"))!;
    const sabao = report.entradas!.produtos!.find((p) => String(p.descricao).startsWith("Sabão"))!;
    expect(regimeForNcm(String(arroz.ncm)).fator).toBe(0);
    expect(regimeForNcm(String(acucar.ncm)).fator).toBe(0);
    expect(regimeForNcm(String(oleo.ncm)).fator).toBe(0.4);
    expect(regimeForNcm(String(sabao.ncm)).fator).toBe(1);
    expect(arroz.ibs_cbs).toBe(0);
    expect(acucar.ibs_cbs).toBe(0);
    expect(oleo.ibs_cbs).toBeGreaterThan(0);
    expect(sabao.ibs_cbs).toBeGreaterThan(oleo.ibs_cbs!);
  });

  it("applies each product's IBS/CBS from regimeForNcm, not a hard-coded fator", () => {
    for (const p of report.entradas!.produtos!) {
      const regime = regimeForNcm(String(p.ncm));
      const base = p.valor_total! - p.icms! - p.pis! - p.cofins!;
      expect(p.ibs).toBeCloseTo(round2((base * RATES.ibs * regime.fator) / 100), 2);
      expect(p.cbs).toBeCloseTo(round2((base * RATES.cbs * regime.fator) / 100), 2);
    }
  });
});
