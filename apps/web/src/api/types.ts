/** Aliases dos schemas do OpenAPI (src/api/schema.d.ts é gerado por `npm run gen:api`). */
import type { components } from './schema';

type S = components['schemas'];

export type Role = S['Role'];
export type Network = S['Network'];
export type FxRule = S['FxRule'];
export type InvoiceStatus = S['InvoiceStatus'];
export type PaymentStatus = S['PaymentStatus'];
export type MatchMethod = S['MatchMethod'];
export type User = S['User'];
export type PublicProfile = S['PublicProfile'];
export type Invoice = S['Invoice'];
export type Payment = S['Payment'];
export type InvoiceEvent = S['InvoiceEvent'];
export type Receipt = S['Receipt'];
export type MonthlyReport = S['MonthlyReport'];
export type AccountantAccess = S['AccountantAccess'];
export type Conversation = S['Conversation'];
export type Message = S['Message'];
export type Proposal = S['Proposal'];

export type InvoiceDetail = Invoice & { payments?: Payment[]; events?: InvoiceEvent[] };

export interface PayPageData {
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
