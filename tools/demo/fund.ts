/**
 * Localnet: cunha USDC de teste (mint do harness, $HOME/.paytrail/e2e/) para um endereço e, opcionalmente,
 * faz airdrop de SOL. Em devnet não há como cunhar o USDC da Circle: use faucet.circle.com.
 *
 *   tsx ../demo/fund.ts <endereço|keypair.json> [valorUSDC=1000] [--sol 2] [--rpc http://127.0.0.1:8899]
 */
import { existsSync } from 'node:fs';
import { DEFAULT_RPC_URL, flagString, parseArgs } from '../e2e/src/lib/env.js';
import { loadKeypair } from '../e2e/src/lib/keys.js';
import { airdrop, connect, ensureTestMint, isLocalRpc, mintTokens, PublicKey, tokenBalance } from '../e2e/src/lib/solana.js';

const args = parseArgs(process.argv.slice(2));
const [target, amount = '1000'] = args.positional;
const rpc = flagString(args, 'rpc') ?? DEFAULT_RPC_URL;
const sol = Number(flagString(args, 'sol') ?? 0);

if (!target) {
  console.error('uso: fund.ts <endereço|keypair.json> [valorUSDC=1000] [--sol N] [--rpc URL]');
  process.exit(2);
}
if (!isLocalRpc(rpc)) {
  console.error(`fund.ts só cunha em localnet (rpc=${rpc}).`);
  console.error('Devnet: USDC em https://faucet.circle.com (Solana Devnet) e SOL com `solana airdrop 1 <addr> -u devnet`.');
  process.exit(2);
}

const owner = existsSync(target) ? loadKeypair(target).publicKey : new PublicKey(target);
const conn = connect(rpc);
const { mint, authority } = await ensureTestMint(conn);
if (sol > 0) {
  await airdrop(conn, owner, sol);
  console.log(`airdrop ${sol} SOL -> ${owner.toBase58()}`);
}
if (Number(amount) > 0) {
  const sig = await mintTokens(conn, authority, mint, owner, amount);
  console.log(`mint ${amount} USDC de teste -> ${owner.toBase58()} (tx ${sig})`);
}
console.log(`saldo: ${await tokenBalance(conn, mint, owner)} USDC (mint ${mint.toBase58()})`);
