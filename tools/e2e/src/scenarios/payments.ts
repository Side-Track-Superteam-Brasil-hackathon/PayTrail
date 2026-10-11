import { createHash, randomBytes } from 'node:crypto';
import { PublicKey } from '@solana/web3.js';
import { addAmounts, parseUnits, sameAmount, subAmounts } from '../lib/amount.js';
import { assert, assertEq, waitFor, type Scenario, type StepApi } from '../lib/report.js';
import { parseSolanaPayUrl, sendTokens } from '../lib/solana.js';
import type {
  Invoice,
  InvoiceDetail,
  PayPage,
  Payment,
  Receipt,
  VerifyByHash,
  VerifyByJson,
  WatchTargets,
} from '../lib/types.js';
import { brtDate, describeInvoice, getInvoice, need, type Ctx, type Party } from '../context.js';

export function paymentScenarios(ctx: Ctx): Scenario[] {
  return [
    {
      id: 'A1',
      title: 'Criar fatura (OPEN, uniqueAmount 1500.xx, link /pay/INV-...)',
      needs: ['S2'],
      run: async (s) => {
        const ana = need(ctx.ana, 'ana');
        const inv = await s.step('POST /invoices "Landing page - Acme Inc" 1500.00 SOLANA, +15 dias', () =>
          createInvoice(ana, 'Acme Inc', 'Landing page - Acme Inc', '1500.00'),
        );
        s.info(`${inv.publicId} uniqueAmount=${inv.uniqueAmount} payUrl=${inv.payUrl}`);
        await s.step('fatura nasce OPEN com uniqueAmount = 1500.01..1500.99 e link público', async () => {
          checkNewInvoice(inv, '1500.00', ctx.wallets.ana.publicKey.toBase58());
        });
        await s.step('GET /invoices lista a fatura; GET /invoices?status=OPEN também', async () => {
          const all = await ana.api.get<Invoice[]>('/invoices');
          assert(all.some((i) => i.id === inv.id), 'fatura não aparece em GET /invoices');
          const open = await ana.api.get<Invoice[]>('/invoices?status=OPEN');
          assert(open.some((i) => i.id === inv.id), 'fatura não aparece em GET /invoices?status=OPEN');
        });
        await s.step('GET /pay/{publicId} (público) traz valor, destinatário e link Solana Pay', async () => {
          await checkPayPage(ctx, inv);
        });
        await s.step('contador não pode criar fatura (403)', async () => {
          const carlos = need(ctx.carlos, 'carlos');
          await carlos.api.request(
            'POST',
            '/invoices',
            invoiceBody('X', 'X', '10.00'),
            { expect: [403, 422] },
          );
        });
        if (ctx.internalSecret) {
          await s.step('GET /internal/watch-targets inclui a carteira e a reference', async () => {
            const page = await ctx.api.get<PayPage>(`/pay/${inv.publicId}`);
            const ref = parseSolanaPayUrl(need(page.solanaPayUrl, 'solanaPayUrl')).references[0];
            const t = await ctx.api.get<WatchTargets>('/internal/watch-targets', {
              headers: { 'X-Internal-Secret': need(ctx.internalSecret, 'secret') },
            });
            assert(t.solana.wallets.includes(ctx.wallets.ana.publicKey.toBase58()), 'carteira da Ana fora de watch-targets');
            assert(ref !== undefined && t.solana.references.includes(ref), 'reference fora de watch-targets');
          });
          await s.step('GET /internal/watch-targets sem segredo -> 401', async () => {
            await ctx.api.request('GET', '/internal/watch-targets', undefined, { expect: 401 });
          });
        } else {
          s.warn(false, 'INTERNAL_SECRET não definido: checagem de /internal/watch-targets pulada');
        }
        ctx.inv1 = inv;
      },
    },
    {
      id: 'A2',
      title: 'Pagamento pelo link (reference) -> PAID, REFERENCE',
      needs: ['S1', 'A1'],
      run: async (s) => {
        const ana = need(ctx.ana, 'ana');
        const inv = need(ctx.inv1, 'fatura A1');
        const page = await s.step('cliente lê GET /pay/{publicId}', () => ctx.api.get<PayPage>(`/pay/${inv.publicId}`));
        const req = parseSolanaPayUrl(need(page.solanaPayUrl, 'solanaPayUrl'));
        const reference = new PublicKey(need(req.references[0], 'reference'));
        const sig = await s.step(`cliente envia ${page.amountToSend} USDC com a reference (estilo @solana/pay)`, () =>
          sendTokens(ctx.conn, {
            from: ctx.wallets.client,
            mint: need(ctx.mint, 'mint'),
            recipient: new PublicKey(page.recipientAddress),
            amount: page.amountToSend,
            reference,
          }),
        );
        s.info(`tx ${sig}`);
        const paid = await s.step(`fatura sai de OPEN em <= ${ctx.paymentTimeoutMs / 1000}s (watcher + finalized)`, () =>
          waitInvoice(ana, inv.id, (i) => i.status !== 'OPEN', ctx.paymentTimeoutMs),
        );
        await s.step('fatura PAID, pagamento MATCHED via REFERENCE com o txHash certo', async () => {
          assertEq(paid.status, 'PAID', 'status');
          assert(sameAmount(paid.amountPaid, page.amountToSend), `amountPaid=${paid.amountPaid}`);
          assert(sameAmount(paid.balance, '0'), `balance=${paid.balance}`);
          const p = findPayment(paid, sig);
          assertEq(p.status, 'MATCHED', 'payment.status');
          assertEq(p.matchMethod, 'REFERENCE', 'payment.matchMethod');
          assert(sameAmount(p.amount, page.amountToSend), `payment.amount=${p.amount}`);
          assertEq(p.fromAddress, ctx.wallets.client.publicKey.toBase58(), 'payment.fromAddress');
          assertEq(p.toAddress, ctx.wallets.ana.publicKey.toBase58(), 'payment.toAddress');
          assert(typeof p.explorerUrl === 'string' && p.explorerUrl.includes(sig), `explorerUrl sem o txHash: ${p.explorerUrl}`);
          s.warn(p.amountBrl !== null && p.amountBrl !== undefined, 'amountBrl = null (cotação BCB indisponível?)');
          s.warn(p.fxRule === 'CARNE_LEAO', `fxRule=${p.fxRule} (esperado CARNE_LEAO, regra da Ana)`);
          s.info(`BRL ${p.amountBrl} @ ${p.fxRate} (${p.fxRule} ${p.fxDate}) ${p.explorerUrl}`);
        });
        await s.step('GET /pay/{publicId} reflete PAID', async () => {
          const after = await ctx.api.get<PayPage>(`/pay/${inv.publicId}`);
          assertEq(after.status, 'PAID', 'pay.status');
        });
        await s.step('evento na trilha da fatura', async () => {
          assert((paid.events ?? []).length > 0, 'fatura sem events');
        });
        ctx.a2Tx = sig;
      },
    },
    {
      id: 'A3',
      title: 'Pagamento de "exchange" (sem reference) -> PAID, UNIQUE_AMOUNT',
      needs: ['S1', 'S2'],
      run: async (s) => {
        const ana = need(ctx.ana, 'ana');
        const inv = await s.step('POST /invoices 800.00 (2a fatura)', () =>
          createInvoice(ana, 'Globex Corp', 'API integration - Globex', '800.00'),
        );
        checkNewInvoice(inv, '800.00', ctx.wallets.ana.publicKey.toBase58());
        s.info(`${inv.publicId} uniqueAmount=${inv.uniqueAmount}`);
        const sig = await s.step(`exchange envia exatamente ${inv.uniqueAmount} (transferência simples)`, () =>
          sendTokens(ctx.conn, {
            from: ctx.wallets.exchange,
            mint: need(ctx.mint, 'mint'),
            recipient: ctx.wallets.ana.publicKey,
            amount: inv.uniqueAmount,
          }),
        );
        s.info(`tx ${sig}`);
        const paid = await s.step('fatura sai de OPEN', () =>
          waitInvoice(ana, inv.id, (i) => i.status !== 'OPEN', ctx.paymentTimeoutMs),
        );
        await s.step('fatura PAID via UNIQUE_AMOUNT', async () => {
          assertEq(paid.status, 'PAID', 'status');
          const p = findPayment(paid, sig);
          assertEq(p.matchMethod, 'UNIQUE_AMOUNT', 'payment.matchMethod');
          assertEq(p.fromAddress, ctx.wallets.exchange.publicKey.toBase58(), 'payment.fromAddress');
          assert(sameAmount(p.amount, inv.uniqueAmount), `payment.amount=${p.amount}`);
        });
        ctx.a3Tx = sig;
      },
    },
    {
      id: 'A4',
      title: 'Parcial via link + 57.30 avulso -> PARTIALLY_PAID + UNMATCHED; match manual',
      needs: ['S1', 'S2'],
      run: async (s) => {
        const ana = need(ctx.ana, 'ana');
        const mint = need(ctx.mint, 'mint');
        const inv = await s.step('POST /invoices 1000.00 (3a fatura)', () =>
          createInvoice(ana, 'Initech', 'Mobile app MVP - Initech', '1000.00'),
        );
        checkNewInvoice(inv, '1000.00', ctx.wallets.ana.publicKey.toBase58());
        const page = await ctx.api.get<PayPage>(`/pay/${inv.publicId}`);
        const reference = new PublicKey(need(parseSolanaPayUrl(need(page.solanaPayUrl, 'solanaPayUrl')).references[0], 'reference'));
        const partialSig = await s.step('cliente paga 400.00 pelo link (com reference)', () =>
          sendTokens(ctx.conn, { from: ctx.wallets.client, mint, recipient: ctx.wallets.ana.publicKey, amount: '400.00', reference }),
        );
        const straySig = await s.step('exchange envia 57.30 avulso (sem reference)', () =>
          sendTokens(ctx.conn, { from: ctx.wallets.exchange, mint, recipient: ctx.wallets.ana.publicKey, amount: '57.30' }),
        );
        s.info(`txs ${partialSig} ${straySig}`);
        const partial = await s.step('fatura fica PARTIALLY_PAID com amountPaid 400', () =>
          waitInvoice(ana, inv.id, (i) => i.status !== 'OPEN', ctx.paymentTimeoutMs),
        );
        await s.step('saldo = uniqueAmount - 400 e pagamento via REFERENCE', async () => {
          assertEq(partial.status, 'PARTIALLY_PAID', 'status');
          assert(sameAmount(partial.amountPaid, '400'), `amountPaid=${partial.amountPaid}`);
          assert(sameAmount(partial.balance, subAmounts(inv.uniqueAmount, '400')), `balance=${partial.balance}`);
          assertEq(findPayment(partial, partialSig).matchMethod, 'REFERENCE', 'matchMethod');
        });
        const stray = await s.step('57.30 aparece em GET /payments?status=UNMATCHED (NO_CANDIDATE)', () =>
          waitFor(
            'pagamento 57.30 UNMATCHED',
            () => ana.api.get<Payment[]>('/payments?status=UNMATCHED'),
            (list) => list.some((p) => p.txHash === straySig),
            { timeoutMs: ctx.paymentTimeoutMs, describe: (l) => `${l.length} unmatched` },
          ).then((list) => {
            const p = list.find((x) => x.txHash === straySig) as Payment;
            assert(sameAmount(p.amount, '57.30'), `amount=${p.amount}`);
            assertEq(p.status, 'UNMATCHED', 'status');
            assertEq(p.invoiceId ?? null, null, 'invoiceId');
            s.warn(p.unmatchedReason === 'NO_CANDIDATE', `unmatchedReason=${p.unmatchedReason} (esperado NO_CANDIDATE)`);
            return p;
          }),
        );
        await s.step('outro usuário não consegue conciliar o pagamento da Ana', async () => {
          const outsider = need(ctx.outsider, 'outsider');
          await outsider.api.request('POST', `/payments/${stray.id}/match`, { invoiceId: inv.id }, { expect: [403, 404] });
        });
        const matched = await s.step('POST /payments/{id}/match -> MATCHED, MANUAL', async () => {
          const p = await ana.api.post<Payment>(`/payments/${stray.id}/match`, { invoiceId: inv.id });
          assertEq(p.status, 'MATCHED', 'status');
          assertEq(p.matchMethod, 'MANUAL', 'matchMethod');
          assertEq(p.invoiceId, inv.id, 'invoiceId');
          return p;
        });
        await s.step('match repetido -> 409 PAYMENT_ALREADY_MATCHED', async () => {
          await ana.api.request('POST', `/payments/${matched.id}/match`, { invoiceId: inv.id }, { expect: 409 });
        });
        await s.step('saldo diminui 57.30 e evento MANUAL_MATCH na trilha', async () => {
          const after = await getInvoice(ana, inv.id);
          assert(sameAmount(after.amountPaid, addAmounts(['400', '57.30'])), `amountPaid=${after.amountPaid}`);
          assert(sameAmount(after.balance, subAmounts(partial.balance, '57.30')), `balance ${partial.balance} -> ${after.balance}`);
          assertEq(after.status, 'PARTIALLY_PAID', 'status');
          const types = (after.events ?? []).map((e) => e.type);
          assert(types.includes('MANUAL_MATCH'), `events sem MANUAL_MATCH: ${types.join(', ')}`);
        });
        await s.step('57.30 sai da fila UNMATCHED', async () => {
          const list = await ana.api.get<Payment[]>('/payments?status=UNMATCHED');
          assert(!list.some((p) => p.txHash === straySig), 'ainda aparece como UNMATCHED');
        });
        ctx.a4Txs = [partialSig, straySig];
      },
    },
    {
      id: 'A5',
      title: 'Comprovante verificável (sha256, /verify)',
      needs: ['A1'],
      run: async (s) => {
        const ana = need(ctx.ana, 'ana');
        const inv = need(ctx.inv1, 'fatura A1');
        const receipt = await s.step('POST /invoices/{A1}/receipt -> 201', () =>
          ana.api.post<Receipt>(`/invoices/${inv.id}/receipt`, undefined, { expect: 201 }),
        );
        s.info(`sha256 ${receipt.sha256} ${receipt.verifyUrl}`);
        await s.step('sha256 = sha256(canonicalJson) e verifyUrl aponta para /verify/<hash>', async () => {
          assert(/^[0-9a-f]{64}$/.test(receipt.sha256), `sha256 inválido: ${receipt.sha256}`);
          const local = createHash('sha256').update(receipt.canonicalJson, 'utf8').digest('hex');
          assertEq(receipt.sha256, local, 'sha256 recalculado');
          assert(receipt.verifyUrl.includes(`/verify/${receipt.sha256}`), `verifyUrl=${receipt.verifyUrl}`);
          assertEq(receipt.invoiceId, inv.id, 'invoiceId');
        });
        const doc = JSON.parse(receipt.canonicalJson) as unknown;
        s.warn(canonicalize(doc) === receipt.canonicalJson, 'canonicalJson não está em forma canônica (chaves ordenadas, sem espaços)');
        s.warn(receipt.canonicalJson.includes('1 USDC = 1 USD'), 'comprovante sem assumptions "1 USDC = 1 USD"');
        if (ctx.a2Tx) s.warn(receipt.canonicalJson.includes(ctx.a2Tx), 'comprovante não contém o txHash do pagamento de A2');
        await s.step('GET /verify/{sha256} (público) -> valid: true', async () => {
          const v = await ctx.api.get<VerifyByHash>(`/verify/${receipt.sha256}`);
          assertEq(v.valid, true, 'valid');
          if (v.receipt) assertEq(v.receipt.sha256, receipt.sha256, 'receipt.sha256');
        });
        await s.step('GET /verify/<hash inexistente> -> 404', async () => {
          await ctx.api.request('GET', `/verify/${randomBytes(32).toString('hex')}`, undefined, { expect: 404 });
        });
        await s.step('POST /verify com o JSON original -> valid: true', async () => {
          const v = await ctx.api.post<VerifyByJson>('/verify', doc);
          assertEq(v.valid, true, 'valid');
          assertEq(v.sha256, receipt.sha256, 'sha256');
        });
        await s.step('POST /verify com um campo alterado -> valid: false', async () => {
          const tampered = tamper(doc);
          s.info(`campo alterado: ${tampered.path}`);
          const v = await ctx.api.post<VerifyByJson>('/verify', tampered.doc);
          assertEq(v.valid, false, 'valid');
          assert(v.sha256 !== receipt.sha256, 'sha256 igual ao original');
        });
      },
    },
  ];
}

function invoiceBody(clientName: string, description: string, baseAmount: string): Record<string, string> {
  return {
    clientName,
    clientEmail: 'billing@example.com',
    description,
    network: 'SOLANA',
    baseAmount,
    dueDate: brtDate(15),
  };
}

async function createInvoice(ana: Party, clientName: string, description: string, baseAmount: string): Promise<Invoice> {
  return ana.api.post<Invoice>('/invoices', invoiceBody(clientName, description, baseAmount), { expect: 201 });
}

function checkNewInvoice(inv: Invoice, base: string, wallet: string): void {
  assertEq(inv.status, 'OPEN', 'status');
  assertEq(inv.network, 'SOLANA', 'network');
  assertEq(inv.recipientAddress, wallet, 'recipientAddress');
  assert(sameAmount(inv.baseAmount, base), `baseAmount=${inv.baseAmount}`);
  const suffix = parseUnits(inv.uniqueAmount, 6) - parseUnits(base, 6);
  assert(suffix >= 10_000n && suffix <= 990_000n && suffix % 10_000n === 0n, `uniqueAmount ${inv.uniqueAmount} fora de ${base}+0.01..0.99`);
  assert(sameAmount(inv.amountPaid, '0'), `amountPaid=${inv.amountPaid}`);
  assert(sameAmount(inv.balance, inv.uniqueAmount), `balance=${inv.balance}`);
  assert(/^INV-/.test(inv.publicId), `publicId=${inv.publicId}`);
  assert(typeof inv.payUrl === 'string' && inv.payUrl.includes(`/pay/${inv.publicId}`), `payUrl=${inv.payUrl}`);
}

async function checkPayPage(ctx: Ctx, inv: Invoice): Promise<void> {
  const page = await ctx.api.get<PayPage>(`/pay/${inv.publicId}`);
  assertEq(page.publicId, inv.publicId, 'publicId');
  assertEq(page.status, 'OPEN', 'status');
  assertEq(page.network, 'SOLANA', 'network');
  assertEq(page.recipientAddress, inv.recipientAddress, 'recipientAddress');
  assert(sameAmount(page.amountToSend, inv.uniqueAmount), `amountToSend=${page.amountToSend}`);
  const req = parseSolanaPayUrl(need(page.solanaPayUrl, 'solanaPayUrl'));
  assertEq(req.recipient, inv.recipientAddress, 'solanaPayUrl recipient');
  assertEq(req.splToken, need(ctx.mint, 'mint (S1)').toBase58(), 'solanaPayUrl spl-token (= SOLANA_USDC_MINT)');
  assert(sameAmount(req.amount, inv.uniqueAmount), `solanaPayUrl amount=${req.amount}`);
  assertEq(req.references.length, 1, 'número de references');
  new PublicKey(req.references[0] as string); // 32 bytes base58
}

async function waitInvoice(
  party: Party,
  id: string,
  done: (i: InvoiceDetail) => boolean,
  timeoutMs: number,
): Promise<InvoiceDetail> {
  return waitFor(`fatura ${id}`, () => getInvoice(party, id), done, { timeoutMs, describe: describeInvoice });
}

function findPayment(inv: InvoiceDetail, txHash: string): Payment {
  const p = (inv.payments ?? []).find((x) => x.txHash === txHash);
  assert(p, `pagamento ${txHash} não aparece em invoice.payments (${describeInvoice(inv)})`);
  return p;
}

/** JSON canônico: chaves ordenadas, sem espaços (specs/02 §4). */
export function canonicalize(v: unknown): string {
  if (v === null || typeof v !== 'object') return JSON.stringify(v);
  if (Array.isArray(v)) return `[${v.map(canonicalize).join(',')}]`;
  const obj = v as Record<string, unknown>;
  return `{${Object.keys(obj)
    .sort()
    .map((k) => `${JSON.stringify(k)}:${canonicalize(obj[k])}`)
    .join(',')}}`;
}

/** Altera o primeiro valor string encontrado (busca em profundidade, chaves ordenadas). */
function tamper(doc: unknown): { doc: unknown; path: string } {
  const copy = JSON.parse(JSON.stringify(doc)) as unknown;
  const visit = (node: unknown, path: string): string | undefined => {
    if (node === null || typeof node !== 'object') return undefined;
    const entries: [string, unknown][] = Array.isArray(node)
      ? node.map((v, i) => [String(i), v])
      : Object.keys(node as Record<string, unknown>)
          .sort()
          .map((k) => [k, (node as Record<string, unknown>)[k]]);
    for (const [k, v] of entries) {
      if (typeof v === 'string') {
        (node as Record<string, unknown>)[k] = `${v}-tampered`;
        return `${path}.${k}`;
      }
    }
    for (const [k, v] of entries) {
      const found = visit(v, `${path}.${k}`);
      if (found) return found;
    }
    return undefined;
  };
  const path = visit(copy, '$');
  assert(path, 'comprovante sem nenhum campo string para alterar');
  return { doc: copy, path };
}
