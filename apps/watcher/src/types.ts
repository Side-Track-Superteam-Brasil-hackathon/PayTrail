/** Espelha DetectedTransfer em specs/03-api.yaml. */
export interface DetectedTransfer {
  network: 'SOLANA' | 'ARC';
  txHash: string;
  logIndex: number;
  token: string;
  fromAddress: string;
  toAddress: string;
  amount: string;
  blockTime: string;
  references: string[];
  contractInvoiceId: string | null;
}

/** Espelha GET /internal/watch-targets. */
export interface WatchTargets {
  solana: { wallets: string[]; references: string[] };
}
