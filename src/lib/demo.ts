import type { Aliquotas, DadosRelatorio, Produto } from "./api-types";
import { regimeForNcm } from "./regimes";

/**
 * Demo mode: builds a complete report from a small fictional catalogue, so the
 * dashboard can be explored without a backend. All companies, products and
 * figures below are made up.
 *
 * The model is deliberately simple and is NOT tax advice:
 *  - current system: ICMS, PIS and COFINS are charged "por dentro", i.e. they
 *    are part of `valor_total`;
 *  - reform: IBS, CBS and IS are charged "por fora", on the value net of the
 *    current taxes;
 *  - `regimeForNcm` supplies `fator` (1 = standard, 0.4 = 60% reduction,
 *    0 = zero rate) and the Imposto Seletivo flag from LC 214/2025.
 */

interface DemoItem {
  descricao: string;
  ncm: string;
  quantidade: number;
  valor_total: number;
  /** Current-system rates, in percent. */
  icms: number;
  pis: number;
  cofins: number;
}

const PIS = 1.65;
const COFINS = 7.6;

const COMPRAS: DemoItem[] = [
  { descricao: "Arroz branco tipo 1 5kg", ncm: "1006.30.21", quantidade: 4200, valor_total: 96600, icms: 7, pis: 0, cofins: 0 },
  { descricao: "Feijão carioca 1kg", ncm: "0713.33.19", quantidade: 6100, valor_total: 45750, icms: 7, pis: 0, cofins: 0 },
  { descricao: "Óleo de soja 900ml", ncm: "1507.90.11", quantidade: 7400, valor_total: 51800, icms: 12, pis: PIS, cofins: COFINS },
  { descricao: "Açúcar cristal 2kg", ncm: "1701.99.00", quantidade: 5300, valor_total: 39750, icms: 12, pis: PIS, cofins: COFINS },
  { descricao: "Café torrado e moído 500g", ncm: "0901.21.00", quantidade: 3900, valor_total: 70200, icms: 12, pis: 0, cofins: 0 },
  { descricao: "Refrigerante cola 2L", ncm: "2202.10.00", quantidade: 9800, valor_total: 68600, icms: 17, pis: PIS, cofins: COFINS },
  { descricao: "Cerveja pilsen lata 350ml", ncm: "2203.00.00", quantidade: 24000, valor_total: 79200, icms: 17, pis: PIS, cofins: COFINS },
  { descricao: "Sabão em pó 1,6kg", ncm: "3402.50.00", quantidade: 2600, valor_total: 49400, icms: 17, pis: PIS, cofins: COFINS },
  { descricao: "Papel higiênico 12 rolos", ncm: "4818.10.00", quantidade: 3100, valor_total: 52700, icms: 17, pis: PIS, cofins: COFINS },
  { descricao: "Biscoito recheado 140g", ncm: "1905.31.00", quantidade: 11500, valor_total: 28750, icms: 17, pis: PIS, cofins: COFINS },
  { descricao: "Leite UHT integral 1L", ncm: "0401.20.10", quantidade: 15000, valor_total: 63000, icms: 7, pis: 0, cofins: 0 },
  { descricao: "Detergente líquido 500ml", ncm: "3402.50.00", quantidade: 8200, valor_total: 18860, icms: 17, pis: PIS, cofins: COFINS },
];

/** Markup applied to each purchase to obtain the matching sale. */
const MARKUP = 1.32;

const round = (value: number) => Math.round(value * 100) / 100;
const sum = (items: Produto[], key: keyof Produto) =>
  round(items.reduce((total, item) => total + (Number(item[key]) || 0), 0));
const percent = (part: number, whole: number) => (whole > 0 ? round((part / whole) * 100) : 0);

const buildProduto = (item: DemoItem, aliquotas: Aliquotas, tipo: "entrada" | "saida"): Produto => {
  const valorTotal = tipo === "saida" ? round(item.valor_total * MARKUP) : item.valor_total;
  const icms = round((valorTotal * item.icms) / 100);
  const pis = round((valorTotal * item.pis) / 100);
  const cofins = round((valorTotal * item.cofins) / 100);
  const base = valorTotal - icms - pis - cofins;
  const regime = regimeForNcm(item.ncm);

  const ibs = round((base * aliquotas.ibs * regime.fator) / 100);
  const cbs = round((base * aliquotas.cbs * regime.fator) / 100);
  const is = regime.seletivo ? round((base * aliquotas.is) / 100) : 0;
  const totalReforma = round(base + ibs + cbs + is);

  const produto: Produto = {
    descricao: item.descricao,
    ncm: item.ncm,
    quantidade: item.quantidade,
    valor_total: valorTotal,
    total_reforma: totalReforma,
    dif_total: round(totalReforma - valorTotal),
    icms,
    pis,
    cofins,
    ibs,
    cbs,
    ibs_cbs: round(ibs + cbs),
    is,
  };

  // IS is not creditable, so it only shows up on the debit side.
  if (tipo === "entrada") {
    produto.creditos = round(icms + pis + cofins);
    produto.creditos_reforma = produto.ibs_cbs;
  } else {
    produto.debitos = round(icms + pis + cofins);
    produto.debitos_reforma = round(ibs + cbs + is);
  }
  return produto;
};

const comparativo = (produtos: Produto[]) => ({
  labels: ["ICMS", "PIS", "COFINS", "IBS", "CBS", "IS"],
  datasets: [
    { label: "Atual", data: [sum(produtos, "icms"), sum(produtos, "pis"), sum(produtos, "cofins"), 0, 0, 0] },
    { label: "Reforma", data: [0, 0, 0, sum(produtos, "ibs"), sum(produtos, "cbs"), sum(produtos, "is")] },
  ],
});

export const buildDemoReport = (aliquotas: Aliquotas): DadosRelatorio => {
  const compras = COMPRAS.map((item) => buildProduto(item, aliquotas, "entrada"));
  const vendas = COMPRAS.map((item) => buildProduto(item, aliquotas, "saida"));

  const compraBruta = sum(compras, "valor_total");
  const creditos = sum(compras, "creditos");
  const creditosReforma = sum(compras, "creditos_reforma");
  const compraReforma = sum(compras, "total_reforma");

  const vendaBruta = sum(vendas, "valor_total");
  const debitos = sum(vendas, "debitos");
  const debitosReforma = sum(vendas, "debitos_reforma");
  const vendaReforma = sum(vendas, "total_reforma");

  const resultadoAtual = round(debitos - creditos);
  const resultadoReforma = round(debitosReforma - creditosReforma);

  return {
    schema_version: "1.0",
    resumo: {
      apuracao_atual: {
        debitos,
        creditos,
        resultado: resultadoAtual,
        carga_tributaria_efetiva: percent(resultadoAtual, vendaBruta),
      },
      apuracao_reforma: {
        debitos: debitosReforma,
        creditos: creditosReforma,
        resultado: resultadoReforma,
        carga_tributaria_efetiva: percent(resultadoReforma, vendaReforma),
      },
    },
    entradas: {
      produtos: compras,
      compra_bruta: compraBruta,
      creditos,
      compra_liquida: round(compraBruta - creditos),
      carga_tributaria_atual: percent(creditos, compraBruta),
      creditos_ibs_cbs: creditosReforma,
      compra_total_reforma: compraReforma,
      carga_tributaria_reforma: percent(creditosReforma, compraReforma),
    },
    saidas: {
      produtos: vendas,
      venda_bruta: vendaBruta,
      debitos,
      venda_liquida: round(vendaBruta - debitos),
      carga_tributaria_atual: percent(debitos, vendaBruta),
      debitos_ibs_cbs: debitosReforma,
      venda_total_reforma: vendaReforma,
      carga_tributaria_reforma: percent(debitosReforma, vendaReforma),
    },
    graficos: {
      comparativo_entradas: comparativo(compras),
      comparativo_saidas: comparativo(vendas),
    },
  };
};
