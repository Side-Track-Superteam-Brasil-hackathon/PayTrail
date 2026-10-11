/**
 * Garante o "USDC" de teste (6 casas) no validador local e imprime SOMENTE o endereço do mint no stdout
 * (logs vão para o stderr), para uso em scripts: MINT=$(tsx src/ensure-mint.ts --rpc http://127.0.0.1:8899)
 */
import { DEFAULT_RPC_URL, flagString, MINT_AUTHORITY_PATH, MINT_KEYPAIR_PATH, parseArgs } from './lib/env.js';
import { connect, ensureTestMint, isLocalRpc } from './lib/solana.js';

const args = parseArgs(process.argv.slice(2));
const rpc = flagString(args, 'rpc') ?? DEFAULT_RPC_URL;
if (!isLocalRpc(rpc)) {
  console.error(`ensure-mint só roda em localnet (rpc=${rpc}). Em devnet use o USDC da Circle.`);
  process.exit(2);
}

try {
  const { mint, created } = await ensureTestMint(connect(rpc));
  console.error(`[ensure-mint] ${created ? 'criado' : 'já existia'}: ${mint.toBase58()} (keypairs: ${MINT_KEYPAIR_PATH}, ${MINT_AUTHORITY_PATH})`);
  console.log(mint.toBase58());
} catch (e) {
  console.error('[ensure-mint]', e instanceof Error ? e.message : e);
  process.exit(1);
}
