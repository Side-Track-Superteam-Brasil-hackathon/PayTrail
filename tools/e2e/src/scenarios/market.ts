import { addAmounts, sameAmount } from '../lib/amount.js';
import { qs } from '../lib/http.js';
import { assert, assertEq, waitFor, type Scenario } from '../lib/report.js';
import type {
  AccessLogEntry,
  AccountantAccess,
  AccountantClient,
  ApiErrorBody,
  Conversation,
  Message,
  MonthlyReport,
  Proposal,
  PublicProfile,
} from '../lib/types.js';
import { lastDayOfMonth, need, shiftMonth, type Ctx } from '../context.js';

export function marketScenarios(ctx: Ctx): Scenario[] {
  return [
    {
      id: 'A6',
      title: 'Diretório (busca "crypto") e inbox entre Ana e Carlos',
      needs: ['S2'],
      run: async (s) => {
        const ana = need(ctx.ana, 'ana');
        const carlos = need(ctx.carlos, 'carlos');
        await s.step('GET /users?role=ACCOUNTANT&q=crypto encontra Carlos', async () => {
          let list = await ana.api.get<PublicProfile[]>(`/users${qs({ role: 'ACCOUNTANT', q: 'crypto' })}`);
          if (!list.some((u) => u.id === carlos.user.id) && list.length >= 50) {
            s.warn(false, 'busca "crypto" atingiu o limite de 50; refinando pelo nome desta execução');
            list = await ana.api.get<PublicProfile[]>(`/users${qs({ role: 'ACCOUNTANT', q: ctx.runId })}`);
          }
          const found = list.find((u) => u.id === carlos.user.id);
          assert(found, `Carlos não está no resultado (${list.length} perfis)`);
          assert(list.every((u) => u.role === 'ACCOUNTANT'), 'filtro role=ACCOUNTANT devolveu outro papel');
          const leaked = list.filter((u) => 'email' in u || 'solanaWallet' in u || 'arcWallet' in u);
          assertEq(leaked.length, 0, 'perfis públicos expondo e-mail/carteira');
        });
        await s.step('GET /users/{id} devolve o perfil público de Carlos', async () => {
          const p = await ana.api.get<PublicProfile & Record<string, unknown>>(`/users/${carlos.user.id}`);
          assertEq(p.id, carlos.user.id, 'id');
          assert(!('email' in p), 'perfil público expõe e-mail');
        });
        const conv = await s.step('POST /conversations {participantId: Carlos} (Ana)', async () => {
          const c = await ana.api.post<Conversation>('/conversations', { participantId: carlos.user.id });
          assertEq(c.other.id, carlos.user.id, 'other.id');
          return c;
        });
        ctx.conversationId = conv.id;
        await s.step('POST /conversations de novo devolve a mesma conversa', async () => {
          const again = await ana.api.post<Conversation>('/conversations', { participantId: carlos.user.id });
          assertEq(again.id, conv.id, 'id');
        });
        await s.step('conversa consigo mesmo é recusada (4xx)', async () => {
          await ana.api.request('POST', '/conversations', { participantId: ana.user.id }, { expect: [400, 409, 422] });
        });
        const msg = await s.step('Ana envia mensagem -> 201 TEXT', async () => {
          const m = await ana.api.post<Message>(
            `/conversations/${conv.id}/messages`,
            { body: `Hi Carlos, I'm paid in USDC and need help with carne-leao. (${ctx.runId})` },
            { expect: 201 },
          );
          assertEq(m.type, 'TEXT', 'type');
          assertEq(m.senderId, ana.user.id, 'senderId');
          assertEq(m.conversationId, conv.id, 'conversationId');
          return m;
        });
        ctx.anaMessage = msg;
        await s.step('Carlos vê a conversa em GET /conversations', async () => {
          const list = await carlos.api.get<Conversation[]>('/conversations');
          const c = list.find((x) => x.id === conv.id);
          assert(c, 'conversa não aparece para Carlos');
          assertEq(c.other.id, ana.user.id, 'other.id');
        });
        await s.step('Carlos vê a mensagem em <= 5 s (polling)', async () => {
          await waitFor(
            'mensagem da Ana',
            () => carlos.api.get<Message[]>(`/conversations/${conv.id}/messages`),
            (list) => list.some((m) => m.id === msg.id),
            { timeoutMs: 5000, intervalMs: 500, describe: (l) => `${l.length} mensagens` },
          );
        });
        const reply = await s.step('Carlos responde', () =>
          carlos.api.post<Message>(
            `/conversations/${conv.id}/messages`,
            { body: 'Hi Ana! Happy to help. I will send you a proposal.' },
            { expect: 201 },
          ),
        );
        await s.step('Ana recebe a resposta via ?after=<createdAt da sua mensagem>', async () => {
          const list = await waitFor(
            'resposta do Carlos',
            () => ana.api.get<Message[]>(`/conversations/${conv.id}/messages${qs({ after: msg.createdAt })}`),
            (l) => l.some((m) => m.id === reply.id),
            { timeoutMs: 5000, intervalMs: 500 },
          );
          assert(!list.some((m) => m.id === msg.id), '?after devolveu mensagem não posterior');
        });
        await s.step('terceiro usuário não lê a conversa (403)', async () => {
          const outsider = need(ctx.outsider, 'outsider');
          await outsider.api.request('GET', `/conversations/${conv.id}/messages`, undefined, { expect: 403 });
        });
      },
    },
    {
      id: 'A7',
      title: 'Proposta do Carlos, aceite da Ana -> Ana em My clients',
      needs: ['A6'],
      run: async (s) => {
        const ana = need(ctx.ana, 'ana');
        const carlos = need(ctx.carlos, 'carlos');
        const convId = need(ctx.conversationId, 'conversa A6');
        const periodStart = `${ctx.month}-01`;
        const periodEnd = lastDayOfMonth(shiftMonth(ctx.month, 2));
        const proposal = await s.step(`Carlos propõe R$ 150/mês, ${periodStart}..${periodEnd}`, async () => {
          const p = await carlos.api.post<Proposal>(
            `/conversations/${convId}/proposals`,
            { feeAmount: '150.00', feeCurrency: 'BRL', periodStart, periodEnd, note: 'Monthly bookkeeping + carne-leao' },
            { expect: 201 },
          );
          assertEq(p.status, 'SENT', 'status');
          assertEq(p.senderId, carlos.user.id, 'senderId');
          assertEq(p.recipientId, ana.user.id, 'recipientId');
          assertEq(p.accountantId, carlos.user.id, 'accountantId');
          assertEq(p.freelancerId, ana.user.id, 'freelancerId');
          assert(sameAmount(p.feeAmount, '150'), `feeAmount=${p.feeAmount}`);
          return p;
        });
        ctx.proposal = proposal;
        await s.step('segunda proposta aberta na conversa -> 409 PROPOSAL_ALREADY_OPEN', async () => {
          const r = await carlos.api.request<ApiErrorBody>(
            'POST',
            `/conversations/${convId}/proposals`,
            { feeAmount: '1.00', feeCurrency: 'BRL', periodStart, periodEnd },
            { expect: 409 },
          );
          s.warn(r.body.code === 'PROPOSAL_ALREADY_OPEN', `code=${r.body.code}`);
        });
        await s.step('Ana vê a mensagem PROPOSAL com a proposta', async () => {
          const list = await ana.api.get<Message[]>(`/conversations/${convId}/messages`);
          const m = list.find((x) => x.type === 'PROPOSAL' && x.proposal?.id === proposal.id);
          assert(m, `sem mensagem PROPOSAL (${list.map((x) => x.type).join(', ')})`);
        });
        await s.step('Carlos (remetente) não pode aceitar a própria proposta', async () => {
          await carlos.api.request('POST', `/proposals/${proposal.id}/accept`, undefined, { expect: [403, 409] });
        });
        await s.step('Ana aceita -> ACCEPTED', async () => {
          const p = await ana.api.post<Proposal>(`/proposals/${proposal.id}/accept`);
          assertEq(p.status, 'ACCEPTED', 'status');
          assert(p.decidedAt, 'decidedAt vazio');
        });
        await s.step('mensagem SYSTEM confirma o aceite', async () => {
          const list = await ana.api.get<Message[]>(`/conversations/${convId}/messages`);
          const sys = list.filter((x) => x.type === 'SYSTEM');
          assert(sys.length > 0, 'sem mensagem SYSTEM');
          assert(sys.every((x) => x.senderId === null || x.senderId === undefined), 'SYSTEM com senderId');
          s.info(`SYSTEM: ${sys[sys.length - 1]?.body}`);
        });
        await s.step('Ana aparece em GET /accountant/clients de Carlos', async () => {
          const list = await carlos.api.get<AccountantClient[]>('/accountant/clients');
          const c = list.find((x) => x.freelancer.id === ana.user.id);
          assert(c, 'Ana não está em My clients');
          assertEq(c.access.status, 'ACTIVE', 'access.status');
          assertEq(c.access.periodStart, periodStart, 'access.periodStart');
          assertEq(c.access.periodEnd, periodEnd, 'access.periodEnd');
          s.info(`mês corrente: ${c.currentMonthUsdc} USDC / R$ ${c.currentMonthBrl}, unmatched ${c.unmatchedCount}`);
        });
        await s.step('freelancer não acessa /accountant/clients (403)', async () => {
          await ana.api.request('GET', '/accountant/clients', undefined, { expect: 403 });
        });
        await s.step('Ana vê o acesso ACTIVE em GET /access', async () => {
          const list = await ana.api.get<AccountantAccess[]>('/access');
          const a = list.find((x) => x.accountant.id === carlos.user.id && x.status === 'ACTIVE');
          assert(a, 'acesso ACTIVE não aparece para Ana');
          assertEq(a.freelancer.id, ana.user.id, 'freelancer.id');
          ctx.accessId = a.id;
        });
      },
    },
    {
      id: 'A8',
      title: 'Painel do contador: relatório mensal + CSV; Ana vê o log de acesso',
      needs: ['A7'],
      run: async (s) => {
        const ana = need(ctx.ana, 'ana');
        const carlos = need(ctx.carlos, 'carlos');
        const accessId = need(ctx.accessId, 'acesso A7');
        const params = qs({ month: ctx.month, freelancerId: ana.user.id });
        const report = await s.step(`Carlos GET /reports/monthly?month=${ctx.month}&freelancerId=Ana -> 200`, () =>
          carlos.api.get<MonthlyReport>(`/reports/monthly${params}`),
        );
        await s.step('relatório: mês, freelancer, linhas e totais consistentes', async () => {
          assertEq(report.month, ctx.month, 'month');
          assertEq(report.freelancerId, ana.user.id, 'freelancerId');
          assert(Array.isArray(report.rows), 'rows não é array');
          assert(Number.isInteger(report.unmatchedCount), 'unmatchedCount não é inteiro');
          const sum = report.rows.length > 0 ? addAmounts(report.rows.map((r) => r.amountUsdc)) : '0';
          assert(sameAmount(report.totalUsdc, sum), `totalUsdc=${report.totalUsdc} != soma das linhas ${sum}`);
          const expected = [ctx.a2Tx, ctx.a3Tx, ...(ctx.a4Txs ?? [])].filter((t): t is string => !!t);
          const missing = expected.filter((t) => !report.rows.some((r) => r.txHash === t));
          assertEq(missing.length, 0, `linhas faltando para txs de A2-A4 (${missing.join(', ')})`);
          for (const r of report.rows) assert(r.explorerUrl?.includes(r.txHash), `linha sem link on-chain: ${r.txHash}`);
          s.info(`${report.rows.length} linhas, ${report.totalUsdc} USDC, R$ ${report.totalBrl}, unmatched ${report.unmatchedCount}`);
          s.warn(report.rows.every((r) => r.fxRule && r.fxRate), 'linhas sem regra/cotação de câmbio');
        });
        await s.step('Carlos GET /reports/monthly.csv -> 200 text/csv', async () => {
          const r = await carlos.api.request<string>('GET', `/reports/monthly.csv${params}`);
          assert((r.headers.get('content-type') ?? '').includes('text/csv'), `content-type=${r.headers.get('content-type')}`);
          assert(r.text.trim().length > 0, 'CSV vazio');
          if (ctx.a2Tx) assert(r.text.includes(ctx.a2Tx), 'CSV sem o txHash de A2');
        });
        await s.step('mês fora do período do acesso -> 403', async () => {
          const before = qs({ month: shiftMonth(ctx.month, -1), freelancerId: ana.user.id });
          await carlos.api.request('GET', `/reports/monthly${before}`, undefined, { expect: 403 });
        });
        await s.step('Ana vê o próprio relatório (sem freelancerId)', async () => {
          const own = await ana.api.get<MonthlyReport>(`/reports/monthly${qs({ month: ctx.month })}`);
          assertEq(own.freelancerId, ana.user.id, 'freelancerId');
        });
        await s.step('Ana vê VIEW_REPORT e EXPORT_CSV em GET /access/{id}/logs', async () => {
          const logs = await ana.api.get<AccessLogEntry[]>(`/access/${accessId}/logs`);
          const actions = new Set(logs.map((l) => l.action));
          assert(actions.has('VIEW_REPORT'), `logs sem VIEW_REPORT: ${[...actions].join(', ')}`);
          assert(actions.has('EXPORT_CSV'), `logs sem EXPORT_CSV: ${[...actions].join(', ')}`);
        });
      },
    },
    {
      id: 'A9',
      title: 'Ana revoga -> Carlos recebe 403 e Ana some de My clients',
      needs: ['A7'],
      run: async (s) => {
        const ana = need(ctx.ana, 'ana');
        const carlos = need(ctx.carlos, 'carlos');
        const accessId = need(ctx.accessId, 'acesso A7');
        await s.step('Carlos não pode revogar (somente a freelancer dona)', async () => {
          await carlos.api.request('POST', `/access/${accessId}/revoke`, undefined, { expect: [403, 404] });
        });
        await s.step('Ana POST /access/{id}/revoke -> REVOKED', async () => {
          const a = await ana.api.post<AccountantAccess>(`/access/${accessId}/revoke`);
          assertEq(a.status, 'REVOKED', 'status');
          assert(a.revokedAt, 'revokedAt vazio');
        });
        const params = qs({ month: ctx.month, freelancerId: ana.user.id });
        await s.step('Carlos GET /reports/monthly -> 403', async () => {
          await carlos.api.request('GET', `/reports/monthly${params}`, undefined, { expect: 403 });
        });
        await s.step('Carlos GET /reports/monthly.csv -> 403', async () => {
          await carlos.api.request('GET', `/reports/monthly.csv${params}`, undefined, { expect: 403 });
        });
        await s.step('Ana some de GET /accountant/clients', async () => {
          const list = await carlos.api.get<AccountantClient[]>('/accountant/clients');
          assert(!list.some((x) => x.freelancer.id === ana.user.id), 'Ana ainda aparece em My clients');
        });
      },
    },
  ];
}
