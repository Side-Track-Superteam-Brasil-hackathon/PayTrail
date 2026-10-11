import {
  createAssociatedTokenAccountIdempotent,
  createAssociatedTokenAccountIdempotentInstruction,
  createMint,
  createTransferCheckedInstruction,
  getAccount,
  getAssociatedTokenAddressSync,
  getMint,
  mintTo,
  TokenAccountNotFoundError,
} from '@solana/spl-token';
import {
  Connection,
  Keypair,
  LAMPORTS_PER_SOL,
  PublicKey,
  sendAndConfirmTransaction,
  Transaction,
  type Commitment,
} from '@solana/web3.js';
import { formatUnits, parseUnits } from './amount.js';
import { MINT_AUTHORITY_PATH, MINT_KEYPAIR_PATH, USDC_DECIMALS } from './env.js';
import { loadOrCreateKeypair } from './keys.js';

// Reexportados para tools/demo (que usa as dependências de tools/e2e).
export { Connection, Keypair, PublicKey };

export function connect(rpcUrl: string, commitment: Commitment = 'confirmed'): Connection {
  return new Connection(rpcUrl, commitment);
}

export function isLocalRpc(rpcUrl: string): boolean {
  return /^https?:\/\/(127\.0\.0\.1|localhost|\[::1\])(:\d+)?/.test(rpcUrl);
}

export function explorerTxUrl(signature: string, rpcUrl: string): string {
  if (rpcUrl.includes('devnet')) return `https://explorer.solana.com/tx/${signature}?cluster=devnet`;
  if (rpcUrl.includes('mainnet')) return `https://explorer.solana.com/tx/${signature}`;
  return `https://explorer.solana.com/tx/${signature}?cluster=custom&customUrl=${encodeURIComponent(rpcUrl)}`;
}

export async function airdrop(conn: Connection, to: PublicKey, sol: number): Promise<void> {
  const signature = await conn.requestAirdrop(to, Math.round(sol * LAMPORTS_PER_SOL));
  const bh = await conn.getLatestBlockhash('confirmed');
  const res = await conn.confirmTransaction({ signature, ...bh }, 'confirmed');
  if (res.value.err) throw new Error(`airdrop falhou: ${JSON.stringify(res.value.err)}`);
}

/** Airdrop só se o saldo estiver abaixo de `minSol`. */
export async function ensureSol(conn: Connection, to: PublicKey, minSol: number, topUpSol = minSol * 2): Promise<void> {
  const balance = await conn.getBalance(to, 'confirmed');
  if (balance < minSol * LAMPORTS_PER_SOL) await airdrop(conn, to, topUpSol);
}

export interface TestMint {
  mint: PublicKey;
  authority: Keypair;
  created: boolean;
}

/**
 * Garante o "USDC" de teste (6 casas) no localnet, a partir de keypairs controlados pelo harness
 * em $HOME/.paytrail/e2e/. O endereço do mint é o mesmo entre resets do ledger.
 */
export async function ensureTestMint(conn: Connection): Promise<TestMint> {
  const { keypair: mintKp } = loadOrCreateKeypair(MINT_KEYPAIR_PATH);
  const { keypair: authority } = loadOrCreateKeypair(MINT_AUTHORITY_PATH);
  await ensureSol(conn, authority.publicKey, 5, 100);

  const info = await conn.getAccountInfo(mintKp.publicKey, 'confirmed');
  if (info) {
    const mint = await getMint(conn, mintKp.publicKey, 'confirmed');
    if (mint.decimals !== USDC_DECIMALS) throw new Error(`mint ${mintKp.publicKey.toBase58()} tem ${mint.decimals} casas`);
    if (!mint.mintAuthority?.equals(authority.publicKey)) {
      throw new Error(`mint ${mintKp.publicKey.toBase58()} tem outra mint authority`);
    }
    return { mint: mintKp.publicKey, authority, created: false };
  }
  await createMint(conn, authority, authority.publicKey, null, USDC_DECIMALS, mintKp, { commitment: 'confirmed' });
  return { mint: mintKp.publicKey, authority, created: true };
}

export function ataOf(mint: PublicKey, owner: PublicKey): PublicKey {
  return getAssociatedTokenAddressSync(mint, owner, true);
}

export async function ensureAta(conn: Connection, payer: Keypair, mint: PublicKey, owner: PublicKey): Promise<PublicKey> {
  return createAssociatedTokenAccountIdempotent(conn, payer, mint, owner, { commitment: 'confirmed' });
}

/** Cunha `amount` (string decimal) do mint de teste para a ATA de `owner`. */
export async function mintTokens(
  conn: Connection,
  authority: Keypair,
  mint: PublicKey,
  owner: PublicKey,
  amount: string,
  decimals = USDC_DECIMALS,
): Promise<string> {
  const ata = await ensureAta(conn, authority, mint, owner);
  return mintTo(conn, authority, mint, ata, authority, parseUnits(amount, decimals), [], { commitment: 'confirmed' });
}

export async function tokenBalance(conn: Connection, mint: PublicKey, owner: PublicKey, decimals = USDC_DECIMALS): Promise<string> {
  try {
    const acc = await getAccount(conn, ataOf(mint, owner), 'confirmed');
    return formatUnits(acc.amount, decimals);
  } catch (e) {
    if (e instanceof TokenAccountNotFoundError) return formatUnits(0n, decimals);
    throw e;
  }
}

export interface TransferOptions {
  from: Keypair;
  mint: PublicKey;
  recipient: PublicKey;
  /** String decimal, ex.: "1500.17". */
  amount: string;
  decimals?: number;
  /** Reference do Solana Pay: conta read-only, não signatária, na instrução de transferência. */
  reference?: PublicKey;
  /** Cria a ATA do destinatário (idempotente) antes de transferir. */
  createRecipientAta?: boolean;
  commitment?: Commitment;
}

/**
 * Transferência SPL no formato do @solana/pay (createTransfer): transferChecked da ATA do pagador para a
 * ATA do destinatário, com a `reference` anexada como chave read-only não signatária da instrução.
 * Sem `reference`, é uma transferência simples (o que uma exchange faz).
 */
export async function sendTokens(conn: Connection, opts: TransferOptions): Promise<string> {
  const decimals = opts.decimals ?? USDC_DECIMALS;
  const source = ataOf(opts.mint, opts.from.publicKey);
  const destination = ataOf(opts.mint, opts.recipient);
  const tx = new Transaction();
  if (opts.createRecipientAta) {
    tx.add(createAssociatedTokenAccountIdempotentInstruction(opts.from.publicKey, destination, opts.recipient, opts.mint));
  }
  const ix = createTransferCheckedInstruction(
    source,
    opts.mint,
    destination,
    opts.from.publicKey,
    parseUnits(opts.amount, decimals),
    decimals,
  );
  if (opts.reference) ix.keys.push({ pubkey: opts.reference, isSigner: false, isWritable: false });
  tx.add(ix);
  return sendAndConfirmTransaction(conn, tx, [opts.from], { commitment: opts.commitment ?? 'confirmed' });
}

export interface SolanaPayRequest {
  recipient: string;
  amount?: string;
  splToken?: string;
  references: string[];
  label?: string;
  message?: string;
}

/** Interpreta `solana:<recipient>?amount=..&spl-token=..&reference=..` (transfer request do Solana Pay). */
export function parseSolanaPayUrl(url: string): SolanaPayRequest {
  if (!url.startsWith('solana:')) throw new Error(`não é um link Solana Pay: ${url}`);
  const rest = url.slice('solana:'.length);
  const q = rest.indexOf('?');
  const recipient = decodeURIComponent(q >= 0 ? rest.slice(0, q) : rest);
  const params = new URLSearchParams(q >= 0 ? rest.slice(q + 1) : '');
  return {
    recipient,
    amount: params.get('amount') ?? undefined,
    splToken: params.get('spl-token') ?? undefined,
    references: params.getAll('reference'),
    label: params.get('label') ?? undefined,
    message: params.get('message') ?? undefined,
  };
}

export async function waitFinalized(conn: Connection, signature: string, timeoutMs = 60_000): Promise<void> {
  const deadline = Date.now() + timeoutMs;
  for (;;) {
    const st = await conn.getSignatureStatus(signature, { searchTransactionHistory: true });
    if (st.value?.err) throw new Error(`tx ${signature} falhou: ${JSON.stringify(st.value.err)}`);
    if (st.value?.confirmationStatus === 'finalized') return;
    if (Date.now() > deadline) throw new Error(`tx ${signature} não finalizou em ${timeoutMs} ms`);
    await new Promise((r) => setTimeout(r, 500));
  }
}
