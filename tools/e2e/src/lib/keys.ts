import { chmodSync, existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { dirname } from 'node:path';
import { Keypair } from '@solana/web3.js';

/** Lê um keypair no formato do solana-keygen (array JSON de 64 bytes). */
export function loadKeypair(path: string): Keypair {
  const raw: unknown = JSON.parse(readFileSync(path, 'utf8'));
  if (!Array.isArray(raw) || raw.length !== 64 || !raw.every((n) => typeof n === 'number')) {
    throw new Error(`${path}: não é um keypair Solana (array JSON de 64 bytes)`);
  }
  return Keypair.fromSecretKey(Uint8Array.from(raw as number[]));
}

/** Grava o keypair com permissão 0600 (diretório 0700). Nunca sobrescreve. */
export function saveKeypair(path: string, kp: Keypair): void {
  if (existsSync(path)) throw new Error(`${path} já existe; não vou sobrescrever`);
  mkdirSync(dirname(path), { recursive: true, mode: 0o700 });
  writeFileSync(path, JSON.stringify(Array.from(kp.secretKey)), { mode: 0o600 });
  chmodSync(path, 0o600);
}

export function loadOrCreateKeypair(path: string): { keypair: Keypair; created: boolean } {
  if (existsSync(path)) return { keypair: loadKeypair(path), created: false };
  const keypair = Keypair.generate();
  saveKeypair(path, keypair);
  return { keypair, created: true };
}
