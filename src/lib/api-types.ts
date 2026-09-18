/**
 * Contract of the report endpoint consumed by the dashboard
 * (GET `dados-relatorio/`). Every field is optional on purpose: the UI
 * degrades gracefully when the backend omits a block.
 */

/** A purchased or sold product, with its current-system and reform figures. */
export interface Produto {
  descricao?: string;
  nome?: string;
  produto?: string;
  ncm?: string;
  quantidade?: number;
  /** Total value under the current system (taxes included). */
  valor_total?: number;
  /** Total value under the reform (IBS + CBS + IS included). */
  total_reforma?: number;
  /** `total_reforma - valor_total`. */
  dif_total?: number;
  icms?: number;
  pis?: number;
  cofins?: number;
  ibs?: number;
  cbs?: number;
  ibs_cbs?: number;
  is?: number;
  creditos?: number;
  debitos?: number;
  creditos_reforma?: number;
  debitos_reforma?: number;
  [key: string]: string | number | null | undefined;
}

/** Tax assessment totals for one scenario (current system or reform). */
export interface ResumoApuracao {
  debitos: number;
  creditos: number;
  resultado: number;
  /** Effective tax burden, in percent. */
  carga_tributaria_efetiva: number;
}

interface OperacaoBase {
  produtos?: Produto[];
  /** Tax burden under the current system, in percent. */
  carga_tributaria_atual?: number;
  /** Tax burden under the reform, in percent. */
  carga_tributaria_reforma?: number;
}

/** Inbound operations (purchases). */
export interface Entradas extends OperacaoBase {
  compra_bruta?: number;
  creditos?: number;
  compra_liquida?: number;
  creditos_ibs_cbs?: number;
  compra_total_reforma?: number;
}

/** Outbound operations (sales). */
export interface Saidas extends OperacaoBase {
  venda_bruta?: number;
  debitos?: number;
  venda_liquida?: number;
  debitos_ibs_cbs?: number;
  venda_total_reforma?: number;
}

/** Chart.js-style payload used by the `graficos` block. */
export interface ChartJsData {
  labels?: string[];
  datasets?: { label?: string; data?: number[] }[];
}

export interface Graficos {
  carga_tributaria_compras?: ChartJsData;
  carga_tributaria_vendas?: ChartJsData;
  tributos_entradas?: ChartJsData;
  tributos_saidas?: ChartJsData;
  comparativo_entradas?: ChartJsData;
  comparativo_saidas?: ChartJsData;
}

/** Major version of the contract this front end understands. */
export const SUPPORTED_SCHEMA_MAJOR = 1;

export interface DadosRelatorio {
  /**
   * Optional contract version ("1.0"). A payload with a higher major version
   * is rejected with a clear error; a missing version is treated as 1.x.
   */
  schema_version?: string;
  resumo?: {
    apuracao_atual?: ResumoApuracao;
    apuracao_reforma?: ResumoApuracao;
  };
  entradas?: Entradas;
  saidas?: Saidas;
  graficos?: Graficos;
}

/** Rates chosen in the filter panel, in percent. */
export interface Aliquotas {
  ibs: number;
  cbs: number;
  is: number;
}
