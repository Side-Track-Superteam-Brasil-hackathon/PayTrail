import type { Connection, Keypair, PublicKey } from '@solana/web3.js';
import { Api } from './lib/http.js';
import { assert } from './lib/report.js';
import type { Invoice, InvoiceDetail, Message, Proposal, User } from './lib/types.js';

export interface Party {
  user: User;
  api: Api;
  email: string;
}

/** Estado compartilhado entre cenários (cada cenário declara de quem depende). */
export interface Ctx {
  api: Api;
  rpcUrl: string;
  conn: Connection;
  mint?: PublicKey;
  mintAuthority?: Keypair;
  runId: string;
  paymentTimeoutMs: number;
  internalSecret?: string;
  wallets: { ana: Keypair; client: Keypair; exchange: Keypair };
  month: string;
  ana?: Party;
  carlos?: Party;
  outsider?: Party;
  inv1?: Invoice;
  a2Tx?: string;
  a3Tx?: string;
  a4Txs?: string[];
  conversationId?: string;
  anaMessage?: Message;
  proposal?: Proposal;
  accessId?: string;
}

export function need<T>(v: T | undefined | null, what: string): T {
  assert(v !== undefined && v !== null, `estado ausente: ${what} (cenário anterior não rodou?)`);
  return v;
}

/** Data/hora em BRT (UTC-3; o Brasil não tem horário de verão desde 2019). */
export function brtDate(offsetDays = 0): string {
  return new Date(Date.now() - 3 * 3600_000 + offsetDays * 86_400_000).toISOString().slice(0, 10);
}

export function brtMonth(): string {
  return brtDate().slice(0, 7);
}

/** 'YYYY-MM' deslocado de `delta` meses. */
export function shiftMonth(month: string, delta: number): string {
  const [y, m] = month.split('-').map(Number) as [number, number];
  const d = new Date(Date.UTC(y, m - 1 + delta, 1));
  return d.toISOString().slice(0, 7);
}

export function lastDayOfMonth(month: string): string {
  const [y, m] = month.split('-').map(Number) as [number, number];
  return new Date(Date.UTC(y, m, 0)).toISOString().slice(0, 10);
}

export async function getInvoice(party: Party, id: string): Promise<InvoiceDetail> {
  return party.api.get<InvoiceDetail>(`/invoices/${id}`);
}

export function describeInvoice(inv: InvoiceDetail): string {
  const pays = (inv.payments ?? []).map((p) => `${p.amount}/${p.status}/${p.matchMethod ?? '-'}`).join(', ');
  return `status=${inv.status} amountPaid=${inv.amountPaid} balance=${inv.balance} payments=[${pays}]`;
}
