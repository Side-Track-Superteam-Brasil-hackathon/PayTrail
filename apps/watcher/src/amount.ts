/** Converte unidades brutas do token (bigint) para string decimal, sem perder precisão. */
export function formatUnits(raw: bigint, decimals: number): string {
  const negative = raw < 0n;
  const abs = negative ? -raw : raw;
  const base = 10n ** BigInt(decimals);
  const whole = abs / base;
  const frac = (abs % base).toString().padStart(decimals, '0');
  return `${negative ? '-' : ''}${whole}.${frac}`;
}
