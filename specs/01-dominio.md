# 01 — Domínio

Identificadores de código em inglês. Valores monetários em USDC usam `NUMERIC(20,6)` (6 casas, igual ao token). Datas em UTC (`TIMESTAMPTZ`); datas de câmbio em `DATE` no fuso `America/Sao_Paulo`.

## Entidades

### User
| Campo | Tipo | Notas |
|---|---|---|
| id | UUID | |
| email | text, único | |
| passwordHash | text | BCrypt |
| role | enum `FREELANCER` \| `ACCOUNTANT` | escolhido no cadastro, imutável no MVP |
| name | text | |
| city | text? | |
| bio | text? | |
| specialties | text[] | ex.: `crypto`, `carne-leao`, `mei`, `export-services` |
| solanaWallet | text? | endereço de recebimento (freelancer) |
| arcWallet | text? | *(roadmap — não usado no MVP)* |
| fxRule | enum `CARNE_LEAO` \| `PTAX_DAY` | regra de conversão BRL (ver 02) — default `CARNE_LEAO` |
| createdAt | timestamptz | |

### Invoice
| Campo | Tipo | Notas |
|---|---|---|
| id | UUID | |
| publicId | text, único | curto e legível, ex.: `INV-7K3P9Q` — vai no link público |
| freelancerId | UUID → User | |
| clientName | text | |
| clientEmail | text? | |
| description | text | |
| network | enum `SOLANA` \| `ARC` | MVP: sempre `SOLANA`. `ARC` reservado (roadmap) |
| recipientAddress | text | copiado da carteira do freelancer no momento da criação |
| baseAmount | numeric(20,6) | valor cobrado |
| uniqueAmount | numeric(20,6) | `baseAmount` + sufixo de identificação (ver 02) |
| reference | text? | Solana: pubkey de referência (Solana Pay). Arc: `bytes32` = keccak256(publicId) |
| dueDate | date | |
| amountPaid | numeric(20,6) | soma dos pagamentos conciliados |
| status | enum (ver máquina abaixo) | |
| createdAt, cancelledAt | timestamptz | |

### Payment
Uma transferência de USDC detectada on-chain para a carteira de algum freelancer.
| Campo | Tipo | Notas |
|---|---|---|
| id | UUID | |
| network | enum | |
| txHash | text | assinatura (Solana) ou tx hash (Arc) |
| logIndex | int | 0 na Solana; índice do log na Arc. **Único: (network, txHash, logIndex)** |
| fromAddress, toAddress | text | |
| amount | numeric(20,6) | |
| blockTime | timestamptz | |
| freelancerId | UUID → User | dono do `toAddress` |
| invoiceId | UUID? → Invoice | |
| matchMethod | enum? `REFERENCE` \| `CONTRACT_EVENT` \| `UNIQUE_AMOUNT` \| `MANUAL` | |
| status | enum (ver máquina) | |
| unmatchedReason | text? | ex.: `NO_CANDIDATE`, `MULTIPLE_CANDIDATES`, `INVOICE_CANCELLED` |
| fxRule, fxDate, fxRate, amountBrl | | preenchidos ao conciliar (ver 02) |

### InvoiceEvent (trilha de auditoria — o "trail")
`id, invoiceId, type, payload jsonb, createdAt`. Tipos: `CREATED`, `PAYMENT_MATCHED`, `STATUS_CHANGED`, `CANCELLED`, `RECEIPT_GENERATED`, `RECEIPT_ANCHORED`, `MANUAL_MATCH`.

### Receipt
`id, invoiceId, canonicalJson text, sha256 text (único), createdAt, anchorNetwork?, anchorTx?`

### ExchangeRate (cache)
`date, rule, buyRate, sellRate, source` — PK `(date, rule)`.

### Conversation / Message / Proposal (ver 06)
- **Conversation:** `id, userAId, userBId, createdAt, lastMessageAt` — par único (ordenado).
- **Message:** `id, conversationId, senderId, type (TEXT | PROPOSAL | SYSTEM), body text, proposalId?, createdAt`.
- **Proposal:** `id, conversationId, senderId, recipientId, accountantId, freelancerId, feeAmount numeric, feeCurrency (BRL | USDC), periodStart date, periodEnd date, note text?, status, createdAt, decidedAt`.

### AccountantAccess / AccessLog
- **AccountantAccess:** `id, accountantId, freelancerId, proposalId, periodStart, periodEnd, status, grantedAt, revokedAt` — no máximo **um ACTIVE** por par.
- **AccessLog:** `id, accountantId, freelancerId, action (VIEW_REPORT | EXPORT_CSV | VIEW_INVOICE), createdAt`.

## Máquinas de estado

### Invoice
```
            pagamento conciliado
 OPEN ─────────────────────────────▶ PARTIALLY_PAID ──▶ PAID ──▶ OVERPAID
   │  \                                   │              ▲
   │   \────────────────────────────────────────────────┘ (pagamento único cobre tudo)
   │
   └──▶ CANCELLED   (somente se amountPaid = 0)
```
O status é **recalculado** a partir de `amountPaid` a cada pagamento conciliado (função pura, ver 02):

| Condição | Status |
|---|---|
| cancelada | `CANCELLED` |
| amountPaid = 0 | `OPEN` |
| 0 < amountPaid < baseAmount | `PARTIALLY_PAID` |
| baseAmount ≤ amountPaid ≤ uniqueAmount | `PAID` |
| amountPaid > uniqueAmount | `OVERPAID` (excedente = amountPaid − uniqueAmount) |

`OVERDUE` **não é estado**: é um flag derivado (`dueDate < hoje` e status ∈ {OPEN, PARTIALLY_PAID}), exibido na UI.

### Payment
```
DETECTED ──▶ MATCHED
    ├──────▶ UNMATCHED ──(match manual)──▶ MATCHED
    └──────▶ AMBIGUOUS ──(match manual)──▶ MATCHED
```

### Proposal
```
SENT ──(destinatário)──▶ ACCEPTED   → cria AccountantAccess ACTIVE + mensagem SYSTEM
  ├───(destinatário)──▶ REJECTED
  └───(remetente)─────▶ CANCELLED
```
Regra: no máximo **uma proposta SENT** por conversa. Proposta só pode existir entre um FREELANCER e um ACCOUNTANT.

### AccountantAccess
```
ACTIVE ──(freelancer revoga)──▶ REVOKED
```
Nova proposta aceita com acesso ACTIVE existente → o acesso antigo vira REVOKED e um novo é criado (troca de período).
