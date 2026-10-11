import { homedir } from 'node:os';
import { join } from 'node:path';

/** Tudo que é local e sensível (keypairs, ledger, logs) mora fora do repositório. */
export const PAYTRAIL_HOME = process.env.PAYTRAIL_HOME ?? join(homedir(), '.paytrail');
export const E2E_DIR = join(PAYTRAIL_HOME, 'e2e');
export const KEYS_DIR = join(PAYTRAIL_HOME, 'keys');

/** Keypairs do "USDC" de teste (localnet): o endereço do mint é fixo entre resets do ledger. */
export const MINT_KEYPAIR_PATH = process.env.E2E_MINT_KEYPAIR ?? join(E2E_DIR, 'usdc-mint.json');
export const MINT_AUTHORITY_PATH = process.env.E2E_MINT_AUTHORITY ?? join(E2E_DIR, 'mint-authority.json');

export const DEFAULT_RPC_URL = process.env.SOLANA_RPC_URL ?? 'http://127.0.0.1:8899';
export const DEFAULT_API_URL = process.env.API_URL ?? 'http://127.0.0.1:8080/api';

export const USDC_DECIMALS = 6;

/** Lê `--flag valor` / `--flag=valor` / `--switch` de argv. */
export interface ParsedArgs {
  positional: string[];
  flags: Map<string, string | true>;
}

export function parseArgs(argv: string[]): ParsedArgs {
  const positional: string[] = [];
  const flags = new Map<string, string | true>();
  for (let i = 0; i < argv.length; i++) {
    const a = argv[i] as string;
    if (!a.startsWith('--')) {
      positional.push(a);
      continue;
    }
    const eq = a.indexOf('=');
    if (eq > 0) {
      flags.set(a.slice(2, eq), a.slice(eq + 1));
      continue;
    }
    const next = argv[i + 1];
    if (next !== undefined && !next.startsWith('--')) {
      flags.set(a.slice(2), next);
      i++;
    } else {
      flags.set(a.slice(2), true);
    }
  }
  return { positional, flags };
}

export function flagString(args: ParsedArgs, name: string): string | undefined {
  const v = args.flags.get(name);
  return typeof v === 'string' ? v : undefined;
}

export function flagBool(args: ParsedArgs, name: string): boolean {
  return args.flags.has(name);
}
