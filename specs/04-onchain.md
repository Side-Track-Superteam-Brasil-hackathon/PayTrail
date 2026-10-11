# 04 — On-chain: Solana e watcher

## Arquitetura

```
apps/watcher (Node + TS)                 apps/api (Spring Boot)
 └─ solana adapter                        ├─ GET  /internal/watch-targets
        └── DetectedTransfer[] ─────────▶ POST /internal/transfers ─▶ motor de conciliação (02)
```

- O watcher **só lê** a chain e normaliza. Toda regra de negócio fica na API.
- A cada 5 s: busca `watch-targets`, consulta as redes, envia transfers novas. A API é idempotente, então reenviar é seguro.
- Guardar no watcher (em memória ou arquivo) o último `signature`/bloco processado por alvo, para não reprocessar tudo.

## Solana (devnet no demo)

| Item | Valor |
|---|---|
| RPC | `https://api.devnet.solana.com` (ou Helius/QuickNode free tier, mais estável) |
| USDC devnet (Circle) | `4zMMC9srt5Ri5X14GAgXhaHii3GnPAEERYPJgZJDncDU` |
| USDC mainnet | `EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v` |
| Faucet USDC devnet | faucet.circle.com |
| Libs | `@solana/web3.js`, `@solana/pay`, `@solana/spl-token` |

### Link de pagamento (Solana Pay — transfer request)
```
solana:<recipientAddress>?amount=<amountToSend>&spl-token=<USDC_MINT>&reference=<invoice.reference>&label=PayTrail&message=<publicId>
```
- `reference`: pubkey nova por fatura (`Keypair.generate().publicKey`), gerada pela API e salva em `Invoice.reference`. A chave privada é descartada.
- Página pública mostra QR code do link + endereço + valor para quem paga de exchange.

### Detecção
1. **Por reference** (pagamentos via link): para cada reference de fatura aberta → `getSignaturesForAddress(reference, { commitment: 'finalized' })`.
2. **Por carteira** (pagamentos de exchange, sem reference): para cada carteira → ATA de USDC (`getAssociatedTokenAddress(mint, wallet)`) → `getSignaturesForAddress(ata)`.
3. Para cada assinatura nova → `getParsedTransaction` → calcular o valor recebido pela diferença `postTokenBalances − preTokenBalances` da conta do destinatário para o mint USDC. Se a tx contém alguma reference observada, preencher `references`.
4. Emitir `DetectedTransfer` (`logIndex = 0`; se a mesma tx tiver duas transferências para carteiras diferentes, usar o índice da conta).

### (Opcional) Ancoragem de comprovante
Memo Program com o texto `paytrail:receipt:<sha256>`, assinado por uma carteira da plataforma (devnet).

## Arc — ROADMAP (fora do MVP; o MVP é somente Solana)

> ⚠️ **Confirmar na documentação da Arc antes de codar:** chain ID, RPC, explorer, **endereço da interface ERC-20 do USDC** e se ela usa 6 casas (o USDC nativo de gas pode usar 18). O contrato abaixo assume a interface ERC-20 de 6 casas.

### Contrato `PayTrailPayments` (Solidity, Foundry)
Non-custodial: o contrato **nunca segura fundos**, só repassa e emite eventos. Isso minimiza o risco na mainnet.

```solidity
// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import {IERC20} from "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import {SafeERC20} from "@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol";

contract PayTrailPayments {
    using SafeERC20 for IERC20;

    IERC20 public immutable usdc;

    event InvoicePaid(bytes32 indexed invoiceId, address indexed payer, address indexed recipient, uint256 amount);
    event ReceiptAnchored(bytes32 indexed receiptHash, bytes32 indexed invoiceId, address indexed anchoredBy);

    error ZeroAmount();
    error ZeroRecipient();

    constructor(IERC20 _usdc) { usdc = _usdc; }

    /// Pagador precisa ter dado approve(amount) para este contrato.
    function pay(bytes32 invoiceId, address recipient, uint256 amount) external {
        if (amount == 0) revert ZeroAmount();
        if (recipient == address(0)) revert ZeroRecipient();
        usdc.safeTransferFrom(msg.sender, recipient, amount);
        emit InvoicePaid(invoiceId, msg.sender, recipient, amount);
    }

    function anchorReceipt(bytes32 receiptHash, bytes32 invoiceId) external {
        emit ReceiptAnchored(receiptHash, invoiceId, msg.sender);
    }
}
```
- `invoiceId = keccak256(bytes(publicId))` → salvo em `Invoice.reference`.
- Testes Foundry mínimos: pay feliz, amount 0, recipient 0, sem approve (reverte), evento emitido com os campos certos.
- Deploy: `forge create` / script, verificar no explorer da Arc. Precisa de um pouco de USDC na Arc para o gas.

### Detecção (adapter `viem`)
1. `getLogs` do evento `InvoicePaid` do contrato → `DetectedTransfer` com `contractInvoiceId`, `toAddress = recipient`, `amount`.
2. `getLogs` do evento `Transfer(from, to, value)` do USDC filtrando `to ∈ carteiras observadas` → transferências diretas (caminho UNIQUE_AMOUNT).
3. Uma tx de `pay()` gera **os dois** logs: deduplicar no watcher. Se a tx tem `InvoicePaid`, descartar o `Transfer` correspondente.
4. `logIndex` = índice real do log; `amount` convertido de 6 casas para string decimal.

## Links do explorer (montados pela API)
- Solana devnet: `https://explorer.solana.com/tx/<sig>?cluster=devnet`
- Arc: `<ARC_EXPLORER_URL>/tx/<hash>` (configurável)
