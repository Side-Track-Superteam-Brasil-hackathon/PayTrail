/**
 * Simula quem paga uma fatura na demo (localnet ou devnet):
 *  - cliente pelo link (Solana Pay, com a reference da fatura): default
 *  - "exchange" (transferência simples, sem reference):        --no-reference
 *
 *   tsx ../demo/pay.ts <publicId|payUrl> --from <keypair.json> [--no-reference] [--amount X]
 *                      [--api http://127.0.0.1:8080/api] [--rpc http://127.0.0.1:8899]
 *
 * Busca GET /pay/{publicId}; valor default = amountToSend; mint = spl-token do link (ou SOLANA_USDC_MINT).
 */
import { DEFAULT_API_URL, DEFAULT_RPC_URL, flagBool, flagString, parseArgs } from '../e2e/src/lib/env.js';
import { Api } from '../e2e/src/lib/http.js';
import { loadKeypair } from '../e2e/src/lib/keys.js';
import { connect, explorerTxUrl, parseSolanaPayUrl, PublicKey, sendTokens, tokenBalance } from '../e2e/src/lib/solana.js';
import type { PayPage } from '../e2e/src/lib/types.js';

const args = parseArgs(process.argv.slice(2));
const target = args.positional[0];
const fromPath = flagString(args, 'from');
if (!target || !fromPath) {
  console.error('uso: pay.ts <publicId|payUrl> --from <keypair.json> [--no-reference] [--amount X] [--api URL] [--rpc URL]');
  process.exit(2);
}
const apiUrl = (flagString(args, 'api') ?? DEFAULT_API_URL).replace(/\/$/, '');
const rpc = flagString(args, 'rpc') ?? DEFAULT_RPC_URL;
const withReference = !flagBool(args, 'no-reference');

// Aceita "INV-XXXX" ou "http://localhost:5173/pay/INV-XXXX".
const publicId = decodeURIComponent(target.replace(/[?#].*$/, '').split('/').filter(Boolean).pop() ?? target);

const page = await new Api(apiUrl).get<PayPage>(`/pay/${encodeURIComponent(publicId)}`);
console.log(`${page.publicId}: ${page.description} (${page.clientName} -> ${page.freelancerName}) status ${page.status}`);
if (page.network !== 'SOLANA') throw new Error(`rede ${page.network} não suportada`);
const req = page.solanaPayUrl ? parseSolanaPayUrl(page.solanaPayUrl) : undefined;
const mintAddr = req?.splToken ?? process.env.SOLANA_USDC_MINT;
if (!mintAddr) throw new Error('link sem spl-token e SOLANA_USDC_MINT não definido');
const reference = withReference ? req?.references[0] : undefined;
if (withReference && !reference) throw new Error('link Solana Pay sem reference (use --no-reference para pagar sem)');
const amount = flagString(args, 'amount') ?? page.amountToSend;

const from = loadKeypair(fromPath);
const conn = connect(rpc);
const mint = new PublicKey(mintAddr);
console.log(`pagando ${amount} USDC de ${from.publicKey.toBase58()} para ${page.recipientAddress} ${reference ? `com reference ${reference}` : 'SEM reference (estilo exchange)'}`);
console.log(`saldo do pagador: ${await tokenBalance(conn, mint, from.publicKey)} USDC`);
const sig = await sendTokens(conn, {
  from,
  mint,
  recipient: new PublicKey(page.recipientAddress),
  amount,
  reference: reference ? new PublicKey(reference) : undefined,
  createRecipientAta: true,
});
console.log(`tx ${sig}`);
console.log(explorerTxUrl(sig, rpc));
console.log('o watcher detecta após o commitment finalized (~15 s no validador local).');
