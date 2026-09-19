import { SUPPORTED_SCHEMA_MAJOR } from "./api-types";
import type { ChartJsData, DadosRelatorio, Entradas, Produto, ResumoApuracao, Saidas } from "./api-types";

export interface ImpactDelta {
  debitos: number;
  creditos: number;
  resultado: number;
  /** Variation of the effective burden, in percentage points. */
  carga: number;
}

export interface BurdenBar {
  name: string;
  "Sistema Atual": number;
  Reforma: number;
}

export interface PieSlice {
  name: string;
  value: number;
}

export interface ComparativoRow {
  tributo: string;
  Atual: number;
  Reforma: number;
}

/**
 * Parses the raw body returned by the API. The backend may wrap the report in
 * a `dados` key, and a misconfigured server answers with an HTML page.
 */
export const parseApiResponse = (text: string): DadosRelatorio => {
  const body = text.trimStart();
  if (body.startsWith("<!") || body.startsWith("<html")) {
    throw new Error("API retornou HTML em vez de JSON. Verifique se o servidor está rodando.");
  }
  let json: unknown;
  try {
    json = JSON.parse(body);
  } catch {
    throw new Error("Resposta da API não é JSON válido.");
  }
  const report = isRecord(json) && isRecord(json.dados) ? json.dados : json;
  return validateReport(report);
};

const isRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === "object" && value !== null && !Array.isArray(value);

// Declared as a function statement so TypeScript narrows after `if (...) invalid(...)`.
function invalid(path: string, expected: string): never {
  throw new Error(`Resposta da API inválida: "${path}" deveria ser ${expected}.`);
}

const expectObject = (value: unknown, path: string): Record<string, unknown> | undefined => {
  if (value === undefined || value === null) return undefined;
  return isRecord(value) ? value : invalid(path, "um objeto");
};

const expectNumbers = (value: Record<string, unknown>, path: string, keys: string[]) => {
  for (const key of keys) {
    if (typeof value[key] !== "number" || Number.isNaN(value[key])) invalid(`${path}.${key}`, "um número");
  }
};

const expectArrayOfObjects = (value: unknown, path: string) => {
  if (value === undefined || value === null) return;
  if (!Array.isArray(value)) invalid(path, "uma lista");
  (value as unknown[]).forEach((item, i) => { if (!isRecord(item)) invalid(`${path}[${i}]`, "um objeto"); });
};

const expectChart = (value: unknown, path: string) => {
  const chart = expectObject(value, path);
  if (!chart) return;
  if (chart.labels !== undefined && !Array.isArray(chart.labels)) invalid(`${path}.labels`, "uma lista");
  if (chart.datasets !== undefined) {
    if (!Array.isArray(chart.datasets)) invalid(`${path}.datasets`, "uma lista");
    (chart.datasets as unknown[]).forEach((ds, i) => {
      if (!isRecord(ds)) invalid(`${path}.datasets[${i}]`, "um objeto");
      if (ds.data !== undefined && !Array.isArray(ds.data)) invalid(`${path}.datasets[${i}].data`, "uma lista");
    });
  }
};

/**
 * Structural validation of the report. The contract is permissive (every block
 * is optional) but a block that is present must have the documented shape, so
 * a broken backend fails with a clear message instead of rendering NaN.
 */
export const validateReport = (value: unknown): DadosRelatorio => {
  const root = isRecord(value) ? value : invalid("$", "um objeto");

  if (root.schema_version !== undefined) {
    if (typeof root.schema_version !== "string") invalid("schema_version", "uma string");
    const major = parseInt(String(root.schema_version).split(".")[0], 10);
    if (Number.isNaN(major) || major > SUPPORTED_SCHEMA_MAJOR) {
      throw new Error(`Versão do contrato não suportada: ${root.schema_version} (suportada: ${SUPPORTED_SCHEMA_MAJOR}.x).`);
    }
  }

  const resumo = expectObject(root.resumo, "resumo");
  if (resumo) {
    for (const key of ["apuracao_atual", "apuracao_reforma"]) {
      const bloco = expectObject(resumo[key], `resumo.${key}`);
      if (bloco) expectNumbers(bloco, `resumo.${key}`, ["debitos", "creditos", "resultado", "carga_tributaria_efetiva"]);
    }
  }

  for (const key of ["entradas", "saidas"]) {
    const bloco = expectObject(root[key], key);
    if (bloco) expectArrayOfObjects(bloco.produtos, `${key}.produtos`);
  }

  const graficos = expectObject(root.graficos, "graficos");
  if (graficos) {
    for (const key of Object.keys(graficos)) expectChart(graficos[key], `graficos.${key}`);
  }

  return root as DadosRelatorio;
};

/** Reform minus current system, for each headline figure. */
export const computeImpactDelta = (
  atual?: ResumoApuracao,
  reforma?: ResumoApuracao,
): ImpactDelta | null => {
  if (!atual || !reforma) return null;
  return {
    debitos: reforma.debitos - atual.debitos,
    creditos: reforma.creditos - atual.creditos,
    resultado: reforma.resultado - atual.resultado,
    carga: reforma.carga_tributaria_efetiva - atual.carga_tributaria_efetiva,
  };
};

/**
 * Tax burden (current vs. reform) for purchases or sales. Prefers the chart
 * block sent by the backend and falls back to the operation totals.
 */
export const deriveBurdenBar = (
  name: string,
  chart?: ChartJsData,
  operacao?: Entradas | Saidas,
): BurdenBar[] => {
  const values = chart?.datasets?.[0]?.data;
  if (values) return [{ name, "Sistema Atual": values[0], Reforma: values[1] }];
  if (operacao) {
    return [{
      name,
      "Sistema Atual": operacao.carga_tributaria_atual || 0,
      Reforma: operacao.carga_tributaria_reforma || 0,
    }];
  }
  return [];
};

/**
 * Tax composition. Prefers the chart block sent by the backend and falls back
 * to summing the taxes of each product, dropping taxes that add up to zero.
 */
export const derivePieData = (chart?: ChartJsData, produtos: Produto[] = []): PieSlice[] => {
  if (chart) {
    return (chart.labels || []).map((label, i) => ({
      name: label,
      value: chart.datasets?.[0]?.data?.[i] || 0,
    }));
  }
  if (produtos.length === 0) return [];
  const totals: Record<string, number> = { ICMS: 0, PIS: 0, COFINS: 0, "IBS/CBS": 0 };
  produtos.forEach((p) => {
    totals.ICMS += p.icms || 0;
    totals.PIS += p.pis || 0;
    totals.COFINS += p.cofins || 0;
    totals["IBS/CBS"] += p.ibs_cbs || 0;
  });
  return Object.entries(totals)
    .filter(([, value]) => value > 0)
    .map(([name, value]) => ({ name, value }));
};

/** Per-tax comparison: dataset 0 is the current system, dataset 1 the reform. */
export const deriveComparativo = (chart?: ChartJsData): ComparativoRow[] => {
  if (!chart) return [];
  return (chart.labels || []).map((label, i) => ({
    tributo: label,
    Atual: chart.datasets?.[0]?.data?.[i] || 0,
    Reforma: chart.datasets?.[1]?.data?.[i] || 0,
  }));
};

/**
 * Highest `valor_total` first, capped at `limit`. Used by the on-screen
 * ranking and by the print/PDF top-10 tables.
 */
export const rankTopProducts = (produtos: Produto[] = [], limit = 10): Produto[] =>
  [...produtos]
    .sort((a, b) => (b.valor_total || 0) - (a.valor_total || 0))
    .slice(0, limit);
