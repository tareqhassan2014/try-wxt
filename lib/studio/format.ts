export function formatPercent(pct: number, hundredths: boolean): string {
  const digits = hundredths ? 2 : 1;
  const formatted = new Intl.NumberFormat(undefined, {
    minimumFractionDigits: digits,
    maximumFractionDigits: digits,
  }).format(pct);
  return `${formatted}%`;
}

export function formatCtr(pct: number, hundredths: boolean): string {
  return formatPercent(pct, hundredths);
}

export function formatApv(pct: number, hundredths: boolean): string {
  return formatPercent(pct, hundredths);
}
