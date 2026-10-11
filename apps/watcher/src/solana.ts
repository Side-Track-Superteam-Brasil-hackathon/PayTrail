import { getAssociatedTokenAddressSync } from '@solana/spl-token';
import { Connection, PublicKey, type ParsedTransactionWithMeta } from '@solana/web3.js';
import { formatUnits } from './amount.js';
import type { DetectedTransfer } from './types.js';

const USDC_DECIMALS = 6;

/**
 * Detecta transferências de USDC para as carteiras observadas (specs/04-onchain.md):
 * - por reference (pagamentos via link Solana Pay);
 * - pela ATA de USDC de cada carteira (pagamentos de exchange, sem reference).
 */
export class SolanaAdapter {
  /** Última assinatura processada por endereço observado. */
  private readonly lastSeen = new Map<string, string>();

  constructor(
    private readonly conn: Connection,
    private readonly usdcMint: PublicKey,
  ) {}

  async poll(wallets: string[], references: string[]): Promise<DetectedTransfer[]> {
    const walletSet = new Set(wallets);
    const refSet = new Set(references);

    const watched = [...references, ...wallets.map((w) => this.usdcAta(w))];
    const signatures = new Set<string>();
    for (const address of watched) {
      for (const sig of await this.newSignatures(address)) signatures.add(sig);
    }

    const transfers: DetectedTransfer[] = [];
    for (const sig of signatures) {
      const tx = await this.conn.getParsedTransaction(sig, {
        commitment: 'finalized',
        maxSupportedTransactionVersion: 0,
      });
      if (tx) transfers.push(...this.extract(sig, tx, walletSet, refSet));
    }
    return transfers;
  }

  private usdcAta(wallet: string): string {
    return getAssociatedTokenAddressSync(this.usdcMint, new PublicKey(wallet), true).toBase58();
  }

  private async newSignatures(address: string): Promise<string[]> {
    const until = this.lastSeen.get(address);
    const infos = await this.conn.getSignaturesForAddress(
      new PublicKey(address),
      { until, limit: 100 },
      'finalized',
    );
    if (infos.length > 0) this.lastSeen.set(address, infos[0].signature);
    return infos.filter((i) => i.err === null).map((i) => i.signature);
  }

  /** Valor recebido = saldo pós − saldo pré da conta de USDC do destinatário. */
  private extract(
    sig: string,
    tx: ParsedTransactionWithMeta,
    wallets: Set<string>,
    refs: Set<string>,
  ): DetectedTransfer[] {
    const meta = tx.meta;
    if (!meta || meta.err) return [];

    const mint = this.usdcMint.toBase58();
    const keys = tx.transaction.message.accountKeys.map((k) => k.pubkey.toBase58());
    const txRefs = keys.filter((k) => refs.has(k));
    const pre = meta.preTokenBalances ?? [];
    const post = meta.postTokenBalances ?? [];

    const rawPre = (accountIndex: number) =>
      BigInt(pre.find((b) => b.accountIndex === accountIndex && b.mint === mint)?.uiTokenAmount.amount ?? '0');

    // Quem pagou: a conta de USDC cujo saldo caiu; senão, o fee payer.
    const sender =
      post.find((b) => b.mint === mint && BigInt(b.uiTokenAmount.amount) < rawPre(b.accountIndex))?.owner ?? keys[0];

    const blockTime = new Date((tx.blockTime ?? Math.floor(Date.now() / 1000)) * 1000).toISOString();

    return post
      .filter((b) => b.mint === mint && b.owner !== undefined && wallets.has(b.owner))
      .map((b) => ({ b, delta: BigInt(b.uiTokenAmount.amount) - rawPre(b.accountIndex) }))
      .filter(({ delta }) => delta > 0n)
      .map(({ b, delta }) => ({
        network: 'SOLANA' as const,
        txHash: sig,
        logIndex: b.accountIndex,
        token: mint,
        fromAddress: sender,
        toAddress: b.owner!,
        amount: formatUnits(delta, USDC_DECIMALS),
        blockTime,
        references: txRefs,
        contractInvoiceId: null,
      }));
  }
}
