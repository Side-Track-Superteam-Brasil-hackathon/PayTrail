/** Valores USDC como string decimal <-> unidades brutas (bigint). Nunca usa number. */

const DECIMAL_RE = /^(\d+)(?:\.(\d+))?$/;

export function parseUnits(value: string, decimals: number): bigint {
  const m = DECIMAL_RE.exec(value.trim());
  if (!m) throw new Error(`valor decimal inválido: "${value}"`);
  const whole = m[1] as string;
  let frac = m[2] ?? '';
  if (frac.length > decimals) {
    if (/[^0]/.test(frac.slice(decimals))) throw new Error(`"${value}" tem mais de ${decimals} casas`);
    frac = frac.slice(0, decimals);
  }
  return BigInt(whole) * 10n ** BigInt(decimals) + BigInt(frac.padEnd(decimals, '0') || '0');
}

export function formatUnits(raw: bigint, decimals: number): string {
  const negative = raw < 0n;
  const abs = negative ? -raw : raw;
  const base = 10n ** BigInt(decimals);
  const frac = (abs % base).toString().padStart(decimals, '0');
  return `${negative ? '-' : ''}${abs / base}.${frac}`;
}

/** Compara dois valores decimais ignorando zeros à direita ("1500.17" == "1500.170000"). */
export function sameAmount(a: string | null | undefined, b: string | null | undefined, decimals = 6): boolean {
  if (a == null || b == null) return false;
  try {
    return parseUnits(a, decimals) === parseUnits(b, decimals);
  } catch {
    return false;
  }
}

export function addAmounts(values: string[], decimals = 6): string {
  return formatUnits(values.reduce((acc, v) => acc + parseUnits(v, decimals), 0n), decimals);
}

export function subAmounts(a: string, b: string, decimals = 6): string {
  return formatUnits(parseUnits(a, decimals) - parseUnits(b, decimals), decimals);
}
