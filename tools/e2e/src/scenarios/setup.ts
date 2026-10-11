import { randomBytes } from 'node:crypto';
import { Api } from '../lib/http.js';
import { assert, assertEq, type Scenario } from '../lib/report.js';
import { airdrop, ensureAta, ensureTestMint, mintTokens, tokenBalance } from '../lib/solana.js';
import type { ApiErrorBody, AuthResponse, Role, User } from '../lib/types.js';
import { need, type Ctx, type Party } from '../context.js';

const FUNDING = '10000';

export function setupScenarios(ctx: Ctx): Scenario[] {
  return [
    {
      id: 'S1',
      title: 'Setup on-chain: validador, mint de teste, carteiras, ATAs e USDC',
      needs: [],
      run: async (s) => {
        await s.step(`RPC ${ctx.rpcUrl} responde`, async () => {
          const v = await ctx.conn.getVersion();
          s.info(`solana-core ${v['solana-core']}`);
        });
        const { mint, authority } = await s.step('mint "USDC" de teste (6 casas) existe', () => ensureTestMint(ctx.conn));
        ctx.mint = mint;
        ctx.mintAuthority = authority;
        s.info(`mint ${mint.toBase58()}`);
        const configured = process.env.SOLANA_USDC_MINT;
        s.warn(!configured || configured === mint.toBase58(), `SOLANA_USDC_MINT=${configured} difere do mint de teste ${mint.toBase58()}`);
        const { ana, client, exchange } = ctx.wallets;
        s.info(`ana ${ana.publicKey.toBase58()} | client ${client.publicKey.toBase58()} | exchange ${exchange.publicKey.toBase58()}`);
        await s.step('airdrop de SOL para cliente e exchange', async () => {
          await Promise.all([airdrop(ctx.conn, client.publicKey, 2), airdrop(ctx.conn, exchange.publicKey, 2)]);
        });
        await s.step(`cunha ${FUNDING} USDC de teste para cliente e exchange`, async () => {
          await mintTokens(ctx.conn, authority, mint, client.publicKey, FUNDING);
          await mintTokens(ctx.conn, authority, mint, exchange.publicKey, FUNDING);
          assertEq(await tokenBalance(ctx.conn, mint, client.publicKey), `${FUNDING}.000000`, 'saldo do cliente');
        });
        await s.step('ATA de USDC da Ana existe (paga pelo cliente)', async () => {
          await ensureAta(ctx.conn, client, mint, ana.publicKey);
        });
      },
    },
    {
      id: 'S2',
      title: 'Setup API: health, cadastro, login e perfil (Ana, Carlos)',
      needs: [],
      run: async (s) => {
        await s.step('GET /actuator/health = UP', async () => {
          const h = await ctx.api.get<{ status: string }>('/actuator/health');
          assertEq(h.status, 'UP', 'health');
        });
        ctx.ana = await s.step('POST /auth/register Ana (FREELANCER)', () =>
          register(ctx.api, `ana.${ctx.runId}@e2e.paytrail`, `Ana Souza ${ctx.runId}`, 'FREELANCER'),
        );
        ctx.carlos = await s.step('POST /auth/register Carlos (ACCOUNTANT)', () =>
          register(ctx.api, `carlos.${ctx.runId}@e2e.paytrail`, `Carlos Lima ${ctx.runId}`, 'ACCOUNTANT'),
        );
        ctx.outsider = await s.step('POST /auth/register terceiro usuário (para checar 403)', () =>
          register(ctx.api, `igor.${ctx.runId}@e2e.paytrail`, `Igor Nunes ${ctx.runId}`, 'FREELANCER'),
        );
        const ana = need(ctx.ana, 'ana');
        await s.step('e-mail repetido -> 409 EMAIL_TAKEN', async () => {
          const r = await ctx.api.request<ApiErrorBody>(
            'POST',
            '/auth/register',
            { email: ana.email, password: randomPassword(), name: 'dup', role: 'FREELANCER' },
            { expect: 409 },
          );
          assertEq(r.body.code, 'EMAIL_TAKEN', 'code');
        });
        await s.step('POST /auth/login com senha errada -> 401', async () => {
          await ctx.api.request('POST', '/auth/login', { email: ana.email, password: 'wrong-password-123' }, { expect: 401 });
        });
        await s.step('GET /me sem token -> 401', async () => {
          await ctx.api.request('GET', '/me', undefined, { expect: 401 });
        });
        await s.step('GET /me com token devolve o próprio usuário', async () => {
          const me = await ana.api.get<User>('/me');
          assertEq(me.id, ana.user.id, 'id');
          assertEq(me.role, 'FREELANCER', 'role');
        });
        await s.step('PATCH /me Ana: solanaWallet + perfil', async () => {
          const wallet = ctx.wallets.ana.publicKey.toBase58();
          const me = await ana.api.patch<User>('/me', {
            solanaWallet: wallet,
            city: 'São Paulo',
            bio: 'Full-stack developer working with US startups.',
            specialties: ['web', 'react', 'java'],
            fxRule: 'CARNE_LEAO',
          });
          assertEq(me.solanaWallet, wallet, 'solanaWallet');
          ana.user = me;
        });
        await s.step('PATCH /me com carteira inválida -> 422', async () => {
          await ana.api.request('PATCH', '/me', { solanaWallet: 'not-a-wallet' }, { expect: 422 });
        });
        await s.step('PATCH /me Carlos: perfil de contador cripto', async () => {
          const carlos = need(ctx.carlos, 'carlos');
          carlos.user = await carlos.api.patch<User>('/me', {
            city: 'Curitiba',
            bio: 'Accountant for freelancers paid from abroad. Crypto & export services.',
            specialties: ['crypto', 'carne-leao', 'export-services'],
          });
        });
      },
    },
  ];
}

function randomPassword(): string {
  return randomBytes(12).toString('hex');
}

/** Cadastra e confere o login com a mesma senha (gerada por execução, nunca impressa). */
async function register(api: Api, email: string, name: string, role: Role): Promise<Party> {
  const password = randomPassword();
  const reg = await api.post<AuthResponse>('/auth/register', { email, password, name, role }, { expect: 201 });
  assert(typeof reg.token === 'string' && reg.token.length > 20, 'register sem token');
  assertEq(reg.user.email, email, 'user.email');
  assertEq(reg.user.role, role, 'user.role');
  const login = await api.post<AuthResponse>('/auth/login', { email, password });
  assertEq(login.user.id, reg.user.id, 'login user.id');
  return { user: reg.user, api: api.as(login.token), email };
}
