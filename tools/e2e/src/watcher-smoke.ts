/**
 * Smoke test do apps/watcher contra o validador local, sem a API: um stub HTTP serve
 * GET /internal/watch-targets e grava o que chega em POST /internal/transfers.
 *
 * Checa: (1) transferência com reference -> DetectedTransfer com `references` = [ref];
 *        (2) transferência simples para a carteira -> DetectedTransfer sem references;
 *        (3) token que não é o USDC configurado (mesmo com a reference) -> ignorado;
 *        (4) falha da API no POST (503) não perde transfers (são reenviadas no próximo ciclo);
 *        (5) X-Internal-Secret é enviado.
 *
 *   tsx src/watcher-smoke.ts [--rpc http://127.0.0.1:8899] [--timeout 90]
 */
import { spawn, type ChildProcess } from 'node:child_process';
import { existsSync } from 'node:fs';
import { createServer, type IncomingMessage, type ServerResponse } from 'node:http';
import type { AddressInfo } from 'node:net';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { createMint } from '@solana/spl-token';
import { Keypair, PublicKey } from '@solana/web3.js';
import { DEFAULT_RPC_URL, flagString, parseArgs } from './lib/env.js';
import { assert, assertEq, printSummary, runScenarios, waitFor, type Scenario, type ScenarioResult } from './lib/report.js';
import { airdrop, connect, ensureAta, ensureTestMint, isLocalRpc, mintTokens, sendTokens, waitFinalized } from './lib/solana.js';

interface Detected {
  network: string;
  txHash: string;
  logIndex: number;
  token: string;
  fromAddress: string;
  toAddress: string;
  amount: string;
  blockTime: string;
  references?: string[];
  contractInvoiceId?: string | null;
}

const args = parseArgs(process.argv.slice(2));
const rpcUrl = flagString(args, 'rpc') ?? DEFAULT_RPC_URL;
const timeoutMs = Number(flagString(args, 'timeout') ?? 90) * 1000;
if (!isLocalRpc(rpcUrl)) {
  console.error(`watcher-smoke só roda em localnet (rpc=${rpcUrl})`);
  process.exit(2);
}

const here = dirname(fileURLToPath(import.meta.url));
const watcherDir = resolve(here, '../../../apps/watcher');
const tsxBin = join(watcherDir, 'node_modules', '.bin', 'tsx');
const SECRET = `smoke-${Math.random().toString(36).slice(2)}`;

// ---------- stub da API ----------
const freelancer = Keypair.generate();
const reference = Keypair.generate().publicKey; // como a API: 32 bytes aleatórios
const received: Detected[] = [];
let postCalls = 0;
let failedPosts = 0;
let badSecret = 0;
let targetCalls = 0;

function readBody(req: IncomingMessage): Promise<string> {
  return new Promise((ok, fail) => {
    const chunks: Buffer[] = [];
    req.on('data', (c: Buffer) => chunks.push(c));
    req.on('end', () => ok(Buffer.concat(chunks).toString('utf8')));
    req.on('error', fail);
  });
}

const server = createServer((req: IncomingMessage, res: ServerResponse) => {
  void (async () => {
    if (req.headers['x-internal-secret'] !== SECRET) {
      badSecret++;
      res.writeHead(401).end();
      return;
    }
    if (req.method === 'GET' && req.url === '/api/internal/watch-targets') {
      targetCalls++;
      res.writeHead(200, { 'Content-Type': 'application/json' }).end(
        JSON.stringify({ solana: { wallets: [freelancer.publicKey.toBase58()], references: [reference.toBase58()] }, arc: { wallets: [] } }),
      );
      return;
    }
    if (req.method === 'POST' && req.url === '/api/internal/transfers') {
      const body = JSON.parse(await readBody(req)) as Detected[];
      postCalls++;
      // A 1a entrega com conteúdo falha: o watcher tem que reenviar no ciclo seguinte.
      if (body.length > 0 && failedPosts === 0) {
        failedPosts++;
        res.writeHead(503).end();
        return;
      }
      received.push(...body);
      res.writeHead(202).end();
      return;
    }
    res.writeHead(404).end();
  })();
});

await new Promise<void>((ok) => server.listen(0, '127.0.0.1', ok));
const port = (server.address() as AddressInfo).port;

let watcher: ChildProcess | undefined;
function stopAll(): void {
  watcher?.kill('SIGTERM');
  server.close();
}
process.on('SIGINT', () => {
  stopAll();
  process.exit(130);
});

const conn = connect(rpcUrl);
const client = Keypair.generate();
const exchange = Keypair.generate();
let mint: PublicKey | undefined;
let refSig = '';
let plainSig = '';
let fakeSig = '';

const scenarios: Scenario[] = [
  {
    id: 'W0',
    title: 'Setup: mint de teste, carteiras, saldo',
    needs: [],
    run: async (s) => {
      assert(existsSync(tsxBin), `${tsxBin} não existe: rode npm ci em apps/watcher`);
      const m = await s.step('mint de teste', () => ensureTestMint(conn));
      mint = m.mint;
      s.info(`mint ${m.mint.toBase58()} | freelancer ${freelancer.publicKey.toBase58()} | reference ${reference.toBase58()}`);
      await s.step('airdrop + USDC para cliente e exchange + ATA do freelancer', async () => {
        await Promise.all([airdrop(conn, client.publicKey, 2), airdrop(conn, exchange.publicKey, 2)]);
        await mintTokens(conn, m.authority, m.mint, client.publicKey, '1000');
        await mintTokens(conn, m.authority, m.mint, exchange.publicKey, '1000');
        await ensureAta(conn, client, m.mint, freelancer.publicKey);
      });
    },
  },
  {
    id: 'W1',
    title: 'Watcher detecta transfer com reference e transfer simples',
    needs: ['W0'],
    run: async (s) => {
      const usdc = mint as PublicKey;
      await s.step(`inicia o watcher (stub em :${port}, POLL_MS=1000)`, async () => {
        watcher = spawn(tsxBin, ['src/index.ts'], {
          cwd: watcherDir,
          env: {
            ...process.env,
            API_URL: `http://127.0.0.1:${port}/api`,
            INTERNAL_SECRET: SECRET,
            SOLANA_RPC_URL: rpcUrl,
            SOLANA_USDC_MINT: usdc.toBase58(),
            POLL_MS: '1000',
          },
          stdio: ['ignore', 'pipe', 'pipe'],
        });
        const prefix = (b: Buffer) =>
          b
            .toString()
            .split('\n')
            .filter((l) => l.trim())
            .forEach((l) => console.log(`       [watcher] ${l}`));
        watcher.stdout?.on('data', prefix);
        watcher.stderr?.on('data', prefix);
        await waitFor('watcher consultar watch-targets', async () => targetCalls, (n) => n > 0, { timeoutMs: 30_000, intervalMs: 300 });
      });
      refSig = await s.step('cliente paga 12.34 com reference', () =>
        sendTokens(conn, { from: client, mint: usdc, recipient: freelancer.publicKey, amount: '12.34', reference }),
      );
      plainSig = await s.step('exchange envia 5.67 sem reference', () =>
        sendTokens(conn, { from: exchange, mint: usdc, recipient: freelancer.publicKey, amount: '5.67' }),
      );
      await s.step(`watcher posta as duas transfers (finalized) em <= ${timeoutMs / 1000}s`, () =>
        waitFor(
          'as duas transfers no stub',
          async () => received.map((r) => r.txHash),
          (sigs) => sigs.includes(refSig) && sigs.includes(plainSig),
          { timeoutMs, describe: (sigs) => `${sigs.length} recebidas, ${postCalls} POSTs` },
        ),
      );
      await s.step('transfer com reference: campos de DetectedTransfer', async () => {
        const t = received.find((r) => r.txHash === refSig) as Detected;
        assertEq(t.network, 'SOLANA', 'network');
        assertEq(t.token, usdc.toBase58(), 'token');
        assertEq(t.toAddress, freelancer.publicKey.toBase58(), 'toAddress');
        assertEq(t.fromAddress, client.publicKey.toBase58(), 'fromAddress');
        assertEq(t.amount, '12.340000', 'amount');
        assertEq(JSON.stringify(t.references), JSON.stringify([reference.toBase58()]), 'references');
        assert(Number.isInteger(t.logIndex), 'logIndex');
        assert(!Number.isNaN(Date.parse(t.blockTime)), `blockTime=${t.blockTime}`);
      });
      await s.step('transfer simples: sem references, from = exchange', async () => {
        const t = received.find((r) => r.txHash === plainSig) as Detected;
        assertEq(t.amount, '5.670000', 'amount');
        assertEq(t.fromAddress, exchange.publicKey.toBase58(), 'fromAddress');
        assertEq((t.references ?? []).length, 0, 'references');
      });
      await s.step('POST 503 da API não perdeu transfers (reenvio)', async () => {
        assertEq(failedPosts, 1, 'POSTs com 503 simulados');
      });
      s.warn(badSecret === 0, `${badSecret} requisições sem o X-Internal-Secret correto`);
      const dupes = received.length - new Set(received.map((r) => `${r.txHash}:${r.logIndex}`)).size;
      s.warn(dupes === 0, `${dupes} transfers repetidas (a API é idempotente, mas o watcher deveria evitar)`);
    },
  },
  {
    id: 'W2',
    title: 'Watcher ignora outro token, mesmo com a reference',
    needs: ['W1'],
    run: async (s) => {
      const fake = await s.step('cria outro mint (6 casas) e paga 12.34 dele com a reference', async () => {
        const authority = Keypair.generate();
        await airdrop(conn, authority.publicKey, 1);
        const other = await createMint(conn, authority, authority.publicKey, null, 6, undefined, { commitment: 'confirmed' });
        await mintTokens(conn, authority, other, client.publicKey, '100');
        await ensureAta(conn, client, other, freelancer.publicKey);
        return other;
      });
      fakeSig = await sendTokens(conn, { from: client, mint: fake, recipient: freelancer.publicKey, amount: '12.34', reference });
      await s.step('espera finalizar + 3 ciclos do watcher', async () => {
        await waitFinalized(conn, fakeSig);
        await new Promise((r) => setTimeout(r, 4000));
      });
      await s.step('nada foi postado para a tx do outro token', async () => {
        assert(!received.some((r) => r.txHash === fakeSig), 'watcher postou transfer de token que não é o USDC');
      });
    },
  },
];

let results: ScenarioResult[] = [];
try {
  results = await runScenarios(scenarios);
} finally {
  stopAll();
}
printSummary(results);
process.exit(results.every((r) => r.outcome === 'PASS') ? 0 : 1);
