/**
 * Focused NCM/SH → IBS/CBS/IS regime lookup.
 *
 * The table is illustrative, not an exhaustive encoding of LC 214/2025.
 * Unknown or empty codes receive the standard rate (art. 16). Each row cites
 * the article and annex it comes from. Prefix matching follows the way the
 * annexes list headings (e.g. `09.01` covers `0901.21.00`).
 *
 * This is NOT tax advice.
 */

export interface NcmRegime {
  /** Scales IBS/CBS: 1 = standard, 0.4 = 60% reduction, 0 = zero rate. */
  fator: number;
  seletivo: boolean;
  /** Legal citation, e.g. "LC 214/2025 art. 125, Anexo I". */
  base: string;
}

export type RegimeKind = "zero" | "reduced60" | "standard" | "selective";

export interface RegimeTableEntry extends NcmRegime {
  /** NCM/SH as written in the cited annex (dots optional). */
  ncm: string;
}

const ART_16 = "LC 214/2025 art. 16 (alíquota padrão)";
const ANEXO_I = "LC 214/2025 art. 125, Anexo I";
const ANEXO_VII = "LC 214/2025 art. 135, Anexo VII";
const ANEXO_VIII = "LC 214/2025 art. 136, Anexo VIII";
const ANEXO_XV = "LC 214/2025 art. 148, Anexo XV";
const ANEXO_XVII = "LC 214/2025 art. 409 § 1º, Anexo XVII";

export const STANDARD_REGIME: NcmRegime = {
  fator: 1,
  seletivo: false,
  base: ART_16,
};

const zero = (ncm: string, base: string): RegimeTableEntry => ({
  ncm, fator: 0, seletivo: false, base,
});

const reduced60 = (ncm: string, base: string): RegimeTableEntry => ({
  ncm, fator: 0.4, seletivo: false, base,
});

const selective = (ncm: string, base: string): RegimeTableEntry => ({
  ncm, fator: 1, seletivo: true, base,
});

/**
 * Representative codes from the national basic food basket (Anexo I), the
 * 60% food and hygiene annexes (VII / VIII), horticultural zero-rate
 * (Anexo XV) and the Imposto Seletivo list (Anexo XVII).
 */
export const REGIME_TABLE: readonly RegimeTableEntry[] = [
  // Anexo I — Cesta Básica Nacional de Alimentos (alíquota zero)
  zero("1006.20", ANEXO_I),
  zero("1006.30", ANEXO_I),
  zero("1006.40.00", ANEXO_I),
  zero("0401.10.10", ANEXO_I),
  zero("0401.10.90", ANEXO_I),
  zero("0401.20.10", ANEXO_I),
  zero("0401.20.90", ANEXO_I),
  zero("0401.40.10", ANEXO_I),
  zero("0401.50.10", ANEXO_I),
  zero("0713.33.19", ANEXO_I),
  zero("0713.33.29", ANEXO_I),
  zero("0713.33.99", ANEXO_I),
  zero("0713.35.90", ANEXO_I),
  zero("09.01", ANEXO_I),
  zero("2101.1", ANEXO_I),
  zero("1701.14.00", ANEXO_I),
  zero("1701.99.00", ANEXO_I),
  zero("1101.00.10", ANEXO_I),
  zero("1513.21.20", ANEXO_I),
  zero("02.01", ANEXO_I),
  zero("02.02", ANEXO_I),

  // Anexo XV — hortícolas, frutas e ovos (também alíquota zero)
  zero("0407.2", ANEXO_XV),
  zero("0702.00.00", ANEXO_XV),
  zero("08.03", ANEXO_XV),

  // Anexo VII — alimentos com redução de 60%
  reduced60("1507.90", ANEXO_VII),
  reduced60("15.08", ANEXO_VII),
  reduced60("15.11", ANEXO_VII),
  reduced60("15.12", ANEXO_VII),
  reduced60("15.14", ANEXO_VII),
  reduced60("15.15", ANEXO_VII),
  reduced60("0409.00.00", ANEXO_VII),
  reduced60("1905.90.10", ANEXO_VII),
  reduced60("2002.90.00", ANEXO_VII),
  reduced60("1108.12.00", ANEXO_VII),
  reduced60("0403.20.00", ANEXO_VII),

  // Anexo VIII — higiene e limpeza com redução de 60%
  reduced60("3401.11.90", ANEXO_VIII),
  reduced60("3306.10.00", ANEXO_VIII),
  reduced60("9603.21.00", ANEXO_VIII),
  reduced60("4818.10.00", ANEXO_VIII),
  reduced60("3808.94.19", ANEXO_VIII),
  reduced60("3401.19.00", ANEXO_VIII),
  reduced60("9619.00.00", ANEXO_VIII),

  // Anexo XVII — Imposto Seletivo (IBS/CBS at the standard rate)
  selective("2202.10.00", ANEXO_XVII),
  selective("2203", ANEXO_XVII),
  selective("2204", ANEXO_XVII),
  selective("2205", ANEXO_XVII),
  selective("2206", ANEXO_XVII),
  selective("2208", ANEXO_XVII),
  selective("2402", ANEXO_XVII),
];

/** Strips punctuation so `1006.30.21`, `10063021` and `1006 30 21` compare equal. */
export const ncmDigits = (ncm: string): string => ncm.replace(/\D/g, "");

export const regimeKind = (regime: NcmRegime): RegimeKind => {
  if (regime.seletivo) return "selective";
  if (regime.fator === 0) return "zero";
  if (regime.fator === 0.4) return "reduced60";
  return "standard";
};

/**
 * Looks up the reform regime for an NCM/SH code. The longest table heading
 * that is a prefix of the (digit-only) code wins; otherwise the standard rate.
 */
export const regimeForNcm = (ncm?: string | null): NcmRegime => {
  const code = ncmDigits(ncm ?? "");
  if (code.length < 2) return STANDARD_REGIME;

  let best: RegimeTableEntry | undefined;
  let bestLen = 0;
  for (const entry of REGIME_TABLE) {
    const key = ncmDigits(entry.ncm);
    if (key.length > bestLen && code.startsWith(key)) {
      best = entry;
      bestLen = key.length;
    }
  }
  return best
    ? { fator: best.fator, seletivo: best.seletivo, base: best.base }
    : STANDARD_REGIME;
};
