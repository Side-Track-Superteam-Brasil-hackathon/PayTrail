/** Tipos espelhando specs/03-api.yaml (somente o que o runner usa). */

export type Role = 'FREELANCER' | 'ACCOUNTANT';
export type Network = 'SOLANA' | 'ARC';
export type FxRule = 'CARNE_LEAO' | 'PTAX_DAY';
export type InvoiceStatus = 'OPEN' | 'PARTIALLY_PAID' | 'PAID' | 'OVERPAID' | 'CANCELLED';
export type PaymentStatus = 'DETECTED' | 'MATCHED' | 'UNMATCHED' | 'AMBIGUOUS';
export type MatchMethod = 'REFERENCE' | 'CONTRACT_EVENT' | 'UNIQUE_AMOUNT' | 'MANUAL';

export interface User {
  id: string;
  email: string;
  role: Role;
  name: string;
  city?: string | null;
  bio?: string | null;
  specialties?: string[];
  solanaWallet?: string | null;
  arcWallet?: string | null;
  fxRule?: FxRule;
}

export interface AuthResponse {
  token: string;
  user: User;
}

export interface PublicProfile {
  id: string;
  role: Role;
  name: string;
  city?: string | null;
  bio?: string | null;
  specialties?: string[];
}

export interface Invoice {
  id: string;
  publicId: string;
  clientName: string;
  clientEmail?: string | null;
  description: string;
  network: Network;
  recipientAddress: string;
  baseAmount: string;
  uniqueAmount: string;
  amountPaid: string;
  balance: string;
  excess: string;
  dueDate: string;
  overdue: boolean;
  status: InvoiceStatus;
  payUrl: string;
  createdAt: string;
}

export interface Payment {
  id: string;
  network: Network;
  txHash: string;
  explorerUrl?: string;
  fromAddress: string;
  toAddress: string;
  amount: string;
  blockTime: string;
  invoiceId: string | null;
  status: PaymentStatus;
  matchMethod?: MatchMethod | null;
  unmatchedReason: string | null;
  fxRule?: FxRule | null;
  fxDate?: string | null;
  fxRate?: string | null;
  amountBrl: string | null;
}

export interface InvoiceEvent {
  type: string;
  payload: unknown;
  createdAt: string;
}

export interface InvoiceDetail extends Invoice {
  payments?: Payment[];
  events?: InvoiceEvent[];
}

export interface PayPage {
  publicId: string;
  freelancerName: string;
  clientName: string;
  description: string;
  network: Network;
  recipientAddress: string;
  amountToSend: string;
  status: InvoiceStatus;
  solanaPayUrl?: string;
}

export interface Receipt {
  id: string;
  invoiceId: string;
  sha256: string;
  canonicalJson: string;
  verifyUrl: string;
  anchorTx: string | null;
  createdAt: string;
}

export interface VerifyByHash {
  valid: boolean;
  receipt?: Receipt;
}

export interface VerifyByJson {
  sha256: string;
  valid: boolean;
}

export interface ReportRow {
  date: string;
  clientName: string;
  invoicePublicId: string;
  network: Network;
  txHash: string;
  explorerUrl: string;
  amountUsdc: string;
  fxRule: FxRule;
  fxDate: string;
  fxRate: string;
  amountBrl: string;
}

export interface MonthlyReport {
  month: string;
  freelancerId: string;
  totalUsdc: string;
  totalBrl: string;
  unmatchedCount: number;
  rows: ReportRow[];
}

export interface AccountantAccess {
  id: string;
  accountant: PublicProfile;
  freelancer: PublicProfile;
  periodStart: string;
  periodEnd: string;
  status: 'ACTIVE' | 'REVOKED';
  grantedAt: string;
  revokedAt: string | null;
}

export interface AccountantClient {
  freelancer: PublicProfile;
  access: AccountantAccess;
  currentMonthUsdc: string;
  currentMonthBrl: string;
  unmatchedCount: number;
}

export interface AccessLogEntry {
  action: string;
  createdAt: string;
}

export interface Proposal {
  id: string;
  senderId: string;
  recipientId: string;
  accountantId: string;
  freelancerId: string;
  feeAmount: string;
  feeCurrency: 'BRL' | 'USDC';
  periodStart: string;
  periodEnd: string;
  note?: string | null;
  status: 'SENT' | 'ACCEPTED' | 'REJECTED' | 'CANCELLED';
  createdAt: string;
  decidedAt: string | null;
}

export interface Message {
  id: string;
  conversationId: string;
  senderId: string | null;
  type: 'TEXT' | 'PROPOSAL' | 'SYSTEM';
  body: string;
  proposal?: Proposal | null;
  createdAt: string;
}

export interface Conversation {
  id: string;
  other: PublicProfile;
  lastMessage?: Message | null;
  lastMessageAt?: string;
}

export interface WatchTargets {
  solana: { wallets: string[]; references: string[] };
  arc?: { wallets: string[] };
}

export interface ApiErrorBody {
  code?: string;
  message?: string;
}
