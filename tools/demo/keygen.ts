/**
 * Cria keypairs de demo em $HOME/.paytrail/keys/<nome>.json (0600) e imprime os endereços.
 * Nunca sobrescreve um arquivo existente e nunca imprime a chave secreta.
 *
 *   tsx ../demo/keygen.ts [nome ...]        (default: ana client exchange)
 */
import { join } from 'node:path';
import { KEYS_DIR, parseArgs } from '../e2e/src/lib/env.js';
import { loadOrCreateKeypair } from '../e2e/src/lib/keys.js';

const { positional } = parseArgs(process.argv.slice(2));
const names = positional.length > 0 ? positional : ['ana', 'client', 'exchange'];

for (const name of names) {
  if (!/^[a-zA-Z0-9_-]+$/.test(name)) {
    console.error(`nome inválido: ${name}`);
    process.exit(2);
  }
  const path = join(KEYS_DIR, `${name}.json`);
  const { keypair, created } = loadOrCreateKeypair(path);
  console.log(`${name.padEnd(10)} ${keypair.publicKey.toBase58()}  ${path}${created ? '  (novo)' : ''}`);
}
