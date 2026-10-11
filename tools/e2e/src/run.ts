/**
 * Runner E2E dos cenários de aceite (specs/05-aceite.md, A1-A9) contra uma stack rodando
 * (API + watcher + solana-test-validator). Saída PASS/FAIL por cenário; exit != 0 se algo falhar.
 *
 *   tsx src/run.ts [--api URL] [--rpc URL] [--only A1,A2] [--timeout 60]
 *
 * Env: API_URL, SOLANA_RPC_URL, INTERNAL_SECRET (opcional: checa /internal/watch-targets),
 *      SOLANA_USDC_MINT (opcional: confere que a API usa o mint de teste).
 */
import { randomBytes } from 'node:crypto';
import { Keypair } from '@solana/web3.js';
import { brtMonth, type Ctx } from './context.js';
import { DEFAULT_API_URL, DEFAULT_RPC_URL, flagString, parseArgs } from './lib/env.js';
import { Api } from './lib/http.js';
import { bold, printSummary, runScenarios } from './lib/report.js';
import { connect } from './lib/solana.js';
import { marketScenarios } from './scenarios/market.js';
import { paymentScenarios } from './scenarios/payments.js';
import { setupScenarios } from './scenarios/setup.js';

const args = parseArgs(process.argv.slice(2));
const apiUrl = (flagString(args, 'api') ?? DEFAULT_API_URL).replace(/\/$/, '');
const rpcUrl = flagString(args, 'rpc') ?? DEFAULT_RPC_URL;
const timeoutSec = Number(flagString(args, 'timeout') ?? process.env.E2E_PAYMENT_TIMEOUT ?? 60);
const onlyFlag = flagString(args, 'only');

const runId = `${Date.now().toString(36)}${randomBytes(2).toString('hex')}`;
const ctx: Ctx = {
  api: new Api(apiUrl),
  rpcUrl,
  conn: connect(rpcUrl),
  runId,
  paymentTimeoutMs: timeoutSec * 1000,
  internalSecret: process.env.INTERNAL_SECRET || undefined,
  // Carteiras novas por execução: nada de estado entre execuções nem chave em disco.
  wallets: { ana: Keypair.generate(), client: Keypair.generate(), exchange: Keypair.generate() },
  month: brtMonth(),
};

const scenarios = [...setupScenarios(ctx), ...paymentScenarios(ctx), ...marketScenarios(ctx)];

// --only A2 também roda o que A2 precisa (S1, S2, A1).
let only: Set<string> | undefined;
if (onlyFlag) {
  only = new Set(onlyFlag.split(',').map((x) => x.trim().toUpperCase()));
  let grew = true;
  while (grew) {
    grew = false;
    for (const sc of scenarios) {
      if (!only.has(sc.id)) continue;
      for (const n of sc.needs) if (!only.has(n)) (only.add(n), (grew = true));
    }
  }
}

console.log(bold(`PayTrail E2E run ${runId}`));
console.log(`  api ${apiUrl}\n  rpc ${rpcUrl}\n  mês ${ctx.month} (BRT), timeout de pagamento ${timeoutSec}s`);

const results = await runScenarios(scenarios, only);
printSummary(results);
process.exit(results.every((r) => r.outcome === 'PASS') ? 0 : 1);
