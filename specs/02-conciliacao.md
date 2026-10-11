# 02 — Conciliação, câmbio e comprovantes

Esta é a parte que **não pode falhar no demo**. Toda regra aqui tem caso de teste na tabela do fim.

## 1. Valor único (identificação sem cooperação do pagador)

- `uniqueAmount = baseAmount + sufixo`, com sufixo em **centavos**: `0.01` a `0.99`.
  - Por que centavos e não micro-unidades: várias exchanges limitam a precisão de saque a 2 casas.
- O sufixo é sorteado entre os valores **não usados** por faturas `OPEN`/`PARTIALLY_PAID` do **mesmo `recipientAddress` + `network`**. Se não houver sufixo livre → erro `409 NO_UNIQUE_SUFFIX` (limite de 99 faturas abertas por carteira no MVP).
- A página de pagamento mostra o **valor exato a ser recebido** e avisa: *"Send exactly this amount. If paying from an exchange, make sure the fee is not deducted from it."*

## 2. Pipeline de um pagamento detectado

Entrada: `DetectedTransfer` vindo do watcher (formato em `04-onchain.md`).

1. **Filtro:** token = USDC da rede configurada **e** `toAddress` = carteira de algum usuário. Senão: ignorar (não persiste).
2. **Idempotência:** se `(network, txHash, logIndex)` já existe → ignorar.
3. **Finalidade:** só processar transfers finalizadas (Solana: commitment `finalized`).
4. Persistir `Payment` como `DETECTED`.
5. **Matching, nesta ordem (para no primeiro que resolver):**
   1. **REFERENCE** (Solana): a transação contém a `reference` de uma fatura do mesmo freelancer → essa fatura.
   2. **CONTRACT_EVENT** *(roadmap — Arc; não implementar no MVP)*: evento `InvoicePaid(invoiceId, …)` → fatura com `reference = invoiceId`.
   3. **UNIQUE_AMOUNT:** candidatas = faturas do freelancer na mesma rede e mesmo `recipientAddress`, status ∈ {OPEN, PARTIALLY_PAID}, onde `amount == uniqueAmount` **ou** `amount == uniqueAmount − amountPaid` (quitação do saldo de uma parcial).
      - 1 candidata → match.
      - >1 → `AMBIGUOUS` (`MULTIPLE_CANDIDATES`).
      - 0 → `UNMATCHED` (`NO_CANDIDATE`).
6. Se a fatura encontrada (via 5.1/5.2) estiver `CANCELLED` → pagamento `UNMATCHED` com `INVOICE_CANCELLED` (não altera a fatura).
7. **Aplicar match:** `amountPaid += amount`; recalcular status (tabela em 01); gravar `InvoiceEvent`s; calcular BRL (seção 3). Tudo na **mesma transação de banco**.

**Match manual:** `POST /payments/{id}/match {invoiceId}` — permitido para pagamentos `UNMATCHED`/`AMBIGUOUS` do próprio freelancer; mesma lógica do passo 7, `matchMethod = MANUAL`.

## 3. Conversão para BRL

USDC é tratado como **1 USDC = 1 USD** (premissa documentada no comprovante).

| Regra (`fxRule`) | Para quem | Cotação usada |
|---|---|---|
| `CARNE_LEAO` (default) | Pessoa física (carnê-leão) | Dólar **compra** do BCB no **último dia útil da 1ª quinzena do mês anterior** ao recebimento |
| `PTAX_DAY` | PJ / preferência do contador | PTAX **compra** da data do recebimento (BRT); sem cotação no dia → último dia útil anterior |

> ⚠️ Confirmar as duas regras com um contador antes do pitch. O produto **organiza** os dados; não faz apuração fiscal.

- Fonte: API Olinda do BCB  
  `https://olinda.bcb.gov.br/olinda/servico/PTAX/versao/v1/odata/CotacaoDolarDia(dataCotacao=@dataCotacao)?@dataCotacao='MM-DD-YYYY'&$format=json`  
  (campo `cotacaoCompra`). Sem resultado → recuar 1 dia, até 7 tentativas.
- Cache em `ExchangeRate`. Se a API falhar, o pagamento é conciliado mesmo assim, com `amountBrl = null` e um job tenta de novo.
- `amountBrl = round(amount × rate, 2)`.

## 4. Comprovante verificável

- `POST /invoices/{id}/receipt` monta um **JSON canônico** (chaves ordenadas, sem espaços, números como string) com: fatura (publicId, cliente, descrição, valores, rede, destinatário), pagamentos conciliados (txHash, valor, data, método, câmbio, BRL), `generatedAt`, `assumptions: ["1 USDC = 1 USD"]`.
- `sha256(canonicalJson)` → salvo em `Receipt`.
- Verificação pública: `GET /verify/{sha256}` → devolve o JSON e `valid: true`; e um endpoint que aceita o JSON enviado e recalcula o hash.
- *(opcional)* Ancorar o hash on-chain via Solana Memo Program (ver 04).
- Integridade ≠ veracidade: o hash prova que o documento não mudou, não que o serviço foi prestado. Dizer isso no pitch se perguntarem.

## 5. Relatório mensal

`GET /reports/monthly?month=YYYY-MM[&freelancerId=]` — pagamentos `MATCHED` com `blockTime` no mês (BRT), agregados:
- linhas: data, cliente, fatura, rede, txHash, link do explorer, USDC, regra, data da cotação, cotação, BRL;
- totais: USDC, BRL; contagem de não conciliados no mês (alerta).
- Export CSV com as mesmas colunas.

## 6. Casos de teste (viram testes unitários do motor)

Freelancer F, carteira W, rede SOLANA. Fatura A: base 1500.00, unique 1500.17, ref RA. Fatura B: base 300.00, unique 300.42, ref RB.

| # | Estado antes | Transfer recebida | Resultado esperado |
|---|---|---|---|
| 1 | A OPEN | 1500.17, ref RA | A PAID, `REFERENCE` |
| 2 | A OPEN | 1500.17, sem ref | A PAID, `UNIQUE_AMOUNT` |
| 3 | A OPEN | 1500.00, ref RA | A PAID (≥ base), `REFERENCE` |
| 4 | A OPEN | 700.00, ref RA | A PARTIALLY_PAID, amountPaid 700 |
| 5 | A PARTIAL (700) | 800.17, sem ref | A PAID, `UNIQUE_AMOUNT` (saldo exato) |
| 6 | A OPEN | 1600.00, ref RA | A OVERPAID, excedente 99.83 |
| 7 | A, B OPEN | 312.50, sem ref | Payment UNMATCHED `NO_CANDIDATE`; faturas inalteradas |
| 8 | A OPEN; C OPEN com unique 1500.17 em **outra carteira** | 1500.17 sem ref para W | A PAID (C não é candidata) |
| 9 | A CANCELLED | 1500.17, ref RA | Payment UNMATCHED `INVOICE_CANCELLED` |
| 10 | A OPEN | mesma tx (txHash, logIndex) 2× | processa 1×; amountPaid 1500.17 |
| 11 | A OPEN | 1500.17 de outro token (não USDC) | ignorado, nada persistido |
| 12 | Payment UNMATCHED 312.50; B OPEN | match manual → B | B OVERPAID (312.50 > 300.42, excedente 12.08), `MANUAL` |
| 13 | — | criar 100ª fatura aberta na mesma carteira | `409 NO_UNIQUE_SUFFIX` |
| 14 | recebido sáb 2026-10-10, `PTAX_DAY` | — | usa PTAX de sex 2026-10-09 |
| 15 | recebido 2026-10-20, `CARNE_LEAO` | — | usa cotação de compra do último dia útil ≤ 2026-09-15 |
