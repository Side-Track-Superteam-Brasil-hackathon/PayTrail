function required(name: string): string {
  const v = process.env[name];
  if (!v) throw new Error(`variável de ambiente ${name} não definida (veja .env.example)`);
  return v;
}

export const config = {
  apiUrl: process.env.API_URL ?? 'http://localhost:8080/api',
  internalSecret: required('INTERNAL_SECRET'),
  solanaRpcUrl: process.env.SOLANA_RPC_URL ?? 'https://api.devnet.solana.com',
  usdcMint: process.env.SOLANA_USDC_MINT ?? '4zMMC9srt5Ri5X14GAgXhaHii3GnPAEERYPJgZJDncDU',
  pollMs: Number(process.env.POLL_MS ?? 5000),
};
