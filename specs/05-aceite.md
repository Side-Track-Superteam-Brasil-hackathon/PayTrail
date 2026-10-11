# 05 — Critérios de aceite (= roteiro da demo)

Se todos os cenários abaixo passam de ponta a ponta, o MVP está pronto. O vídeo de demo (≤ 3 min, inglês) segue esta ordem.

## Dados de seed

| Usuário | Papel | Notas |
|---|---|---|
| `ana@demo.paytrail` | FREELANCER | Dev, São Paulo. Carteira Solana devnet com SOL para taxas. `fxRule = CARNE_LEAO` |
| `carlos@demo.paytrail` | ACCOUNTANT | "Crypto & export services", Curitiba |
| + 5 contadores e 3 freelancers fictícios | ambos | perfis variados para o diretório não ficar vazio |
| Carteira "cliente" | — | devnet, com USDC do faucet da Circle |
| Carteira "exchange" | — | devnet, outra carteira com USDC — simula saque de exchange (transferência simples, sem reference) |

Senha de todos os usuários de seed: definida em `apps/api/src/main/resources/seed.sql` (não repetir em chat/docs).

## Cenários

### A1 — Criar fatura
**Dado** Ana logada com carteira Solana cadastrada
**Quando** cria fatura "Landing page — Acme Inc", 1500.00 USDC, Solana, vencimento +15 dias
**Então** a fatura aparece `OPEN` com `uniqueAmount` = 1500.xx e um link público `/pay/INV-…` com QR code.

### A2 — Pagamento pelo link (reference)
**Dado** a fatura de A1
**Quando** o "cliente" escaneia o QR com Phantom (devnet) e paga
**Então** em ≤ 30 s a fatura fica `PAID`, o pagamento aparece com método `REFERENCE`, valor em BRL e link do explorer.

### A3 — Pagamento de "exchange" (sem reference)
**Dado** Ana cria uma 2ª fatura de 800.00
**Quando** a carteira "exchange" envia exatamente o `uniqueAmount` como transferência SPL simples
**Então** a fatura fica `PAID` com método `UNIQUE_AMOUNT`.

### A4 — Parcial e não conciliado
**Dado** uma 3ª fatura de 1000.00
**Quando** o cliente paga 400.00 pelo link **e** a carteira "exchange" envia 57.30 avulso
**Então** a fatura fica `PARTIALLY_PAID` com saldo exibido, e 57.30 aparece na fila **Unmatched**.
**E quando** Ana associa manualmente o 57.30 à fatura
**Então** o saldo diminui e o evento `MANUAL_MATCH` aparece na trilha.

### A5 — Comprovante verificável
**Quando** Ana gera o comprovante da fatura de A1
**Então** recebe um sha256 e um link `/verify/<hash>` público que mostra `valid: true`.
**E quando** alguém altera um campo do JSON e envia em `POST /verify`
**Então** `valid: false`.

### A6 — Diretório e inbox
**Quando** Ana busca "crypto" no diretório de contadores
**Então** Carlos aparece. Ana abre a conversa e envia uma mensagem; em outra janela, Carlos a vê em ≤ 5 s e responde.

### A7 — Proposta e acesso
**Quando** Carlos envia proposta "R$ 150/month, Oct–Dec 2026"
**Então** a proposta aparece no chat com botões Accept/Reject para Ana.
**Quando** Ana aceita
**Então** uma mensagem de sistema confirma e Ana aparece em **My clients** de Carlos.

### A8 — Painel do contador
**Quando** Carlos abre Ana em My clients → Outubro/2026
**Então** vê o relatório mensal (linhas, totais USDC e BRL, regra de câmbio, links on-chain, alerta de não conciliados) e exporta CSV.
**E** Ana vê no log de acesso que Carlos visualizou/exportou.

### A9 — Revogar
**Quando** Ana revoga o acesso
**Então** Carlos recebe `403` ao abrir o relatório e Ana some de My clients.

## Roteiro do vídeo de demo (≈ 3 min)

| Tempo | Cena | Cenário |
|---|---|---|
| 0:00–0:15 | Problema em 1 frase + tela inicial | — |
| 0:15–0:45 | Criar fatura, pagar pelo link | A1, A2 |
| 0:45–1:15 | Pagamento de "exchange" + parcial + fila unmatched | A3, A4 |
| 1:15–1:35 | Comprovante e verificação | A5 |
| 1:35–2:20 | Diretório → chat → proposta → aceite | A6, A7 |
| 2:20–2:50 | Visão do contador: relatório em BRL + export | A8 |
| 2:50–3:00 | Fecho: "PayTrail — your payment trail, accountant-ready" | — |

Gravar **cada trecho separadamente** e editar depois. Ter um banco de seed "pronto para gravar" (script de reset).
