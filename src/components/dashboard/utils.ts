export const COLORS = {
  blue: "#4e6ae9",
  purple: "#764ba2",
  green: "#10b981",
  orange: "#f59e0b",
  red: "#ef4444",
  cyan: "#06b6d4",
  pink: "#ec4899",
  indigo: "#6366f1",
};

export const PIE_COLORS = [COLORS.blue, COLORS.purple, COLORS.green, COLORS.orange, COLORS.cyan, COLORS.pink];

// Number and currency stay pt-BR / BRL regardless of the UI language (issue #19).
export const formatCurrency = (value: number) =>
  new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(value);

export const formatCurrencyShort = (value: number) => {
  if (Math.abs(value) >= 1000000) return `R$ ${(value / 1000000).toFixed(1)}M`;
  if (Math.abs(value) >= 1000) return `R$ ${(value / 1000).toFixed(1)}K`;
  return formatCurrency(value);
};

export const formatPercent = (value: number) => `${value.toFixed(2)}%`;

export const formatNumber = (value: number) =>
  new Intl.NumberFormat("pt-BR").format(value);

/** Tooltip formatter for Recharts: values may arrive as strings, arrays or undefined. */
export const tooltipCurrency = (value: unknown) => formatCurrency(Number(value) || 0);
