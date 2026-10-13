# Roteiro de testes na devnet

Valida as funcionalidades do PayTrail de ponta a ponta na **devnet** da Solana, com carteiras e USDC de teste de verdade. Segue os cenários de aceite de `specs/05-aceite.md` (A1–A9), com **valores pequenos**, porque o faucet de USDC da Circle libera pouco por pedido.

## Preparação (uma vez)

1. **Carteiras** (tutorial em `01-carteira-devnet.md`):
   - **Ana** (recebe): uma conta Phantom em devnet, ou o keypair `~/.paytrail/keys/ana.json`.
   - **Cliente**: conta Phantom com ~0,05 SOL e ~10 USDC de teste.
   - **Exchange**: outra conta Phantom (ou `~/.paytrail/keys/exchange.json`) com ~0,05 SOL e ~5 USDC de teste.
2. No `.env` da raiz:
   - `SEED_ANA_SOLANA_WALLET=<endereço da Ana>`
   - opcional: `SOLANA_RPC_URL=<RPC Helius/QuickNode devnet>`
3. Subir o app limpo na devnet: `make up ARGS="--reset"` (ou `bash scripts/dev.sh --reset` no WSL). O resumo impresso deve mostrar `PayTrail dev (devnet)` e o mint `4zMMC9…DncDU`.
4. Duas janelas de navegador (uma anônima): **Janela 1 = Ana** (`ana@demo.paytrail`), **Janela 2 = Carlos** (`carlos@demo.paytrail`). A senha fica em `~/.paytrail/dev/seed-password` (WSL) ou no `SEED_PASSWORD` do `.env`.

> **Tempo de detecção:** o watcher consulta a devnet a cada 5 s e só aceita transações *finalizadas* (~15–30 s). Espere até **1 minuto** antes de marcar falha.

## Cenários

Marque **OK** ou **Falhou** e anote o link da transação no explorer (`?cluster=devnet`).

| # | Cenário | Passos | Resultado esperado | OK? |
|---|---|---|---|---|
| T1 | **Criar fatura** (A1) | Ana → Faturas → Nova fatura: cliente "Acme Inc", **2,00 USDC**, vencimento +15 dias | Fatura "Em aberto" com valor único **2,xx**; link `/pay/INV-…` com QR code | |
| T2 | **Pagar pelo link** (A2) | Abrir o link público → na Phantom do **Cliente** (devnet), ler o QR ou clicar em "Abrir carteira" e aprovar | Em ≤ 1 min a página muda para **Paga**; na fatura, pagamento com método **Reference**, valor em reais e link do explorer | |
| T3 | **Pagamento de "exchange"** (A3) | Nova fatura de **1,00 USDC** → na Phantom da **Exchange**, **Send** do valor único **exato** (1,xx) para o endereço da Ana, **sem** usar o link | Fatura **Paga**, método **Valor único** | |
| T4 | **Pagamento parcial** (A4, 1ª parte) | Nova fatura de **3,00 USDC** → pagar só **1,00** pelo link: `pay.ts INV-… --from <client.json> --amount 1 --rpc <devnet> --api http://127.0.0.1:8080/api` (comando no resumo do `make up`) | Fatura **Parcialmente paga**, saldo exibido | |
| T5 | **Pagamento não conciliado** (A4, 2ª parte) | Na Phantom da **Exchange**, enviar **0,57 USDC** avulsos para a Ana | **0,57** aparece em **Não conciliados** | |
| T6 | **Match manual** (A4, 3ª parte) | Não conciliados → associar 0,57 à fatura de 3,00 | Saldo diminui; evento **Match manual** na linha do tempo da fatura | |
| T7 | **Comprovante verificável** (A5) | Fatura do T1 → Gerar comprovante → abrir o link `/verify/<hash>` em janela anônima | "Válido"; na verificação colando o JSON, alterar um valor dá **inválido** | |
| T8 | **Diretório e mensagens** (A6) | Ana → Encontrar contador → buscar "crypto" → abrir conversa com Carlos e enviar mensagem | Carlos vê a mensagem em ≤ 5 s (Janela 2) e responde | |
| T9 | **Proposta e acesso** (A7) | Carlos envia proposta "R$ 150/mês, out–dez 2026" → Ana aceita | Mensagem de sistema confirma; Ana aparece em **Meus clientes** do Carlos | |
| T10 | **Painel do contador** (A8) | Carlos → Meus clientes → Ana → mês atual → Exportar CSV | Relatório com linhas, totais em USDC e reais, regra de câmbio, links on-chain e alerta de não conciliados; CSV baixado. Ana vê os acessos em **Meus contadores** | |
| T11 | **Revogar acesso** (A9) | Ana → Meus contadores → Revogar | Carlos perde o acesso ao relatório e Ana some de **Meus clientes** | |

## Verificações complementares

| # | Item | Como testar | Esperado | OK? |
|---|---|---|---|---|
| C1 | Link do explorer | Clicar no hash de um pagamento | Abre a transação na devnet (`cluster=devnet`) | |
| C2 | Valor em reais | Comparar a cotação do pagamento com a PTAX do BCB | Regra Carnê-leão: cotação de compra do último dia útil da 1ª quinzena do mês anterior | |
| C3 | Cadastro | Criar conta com senha fraca e com confirmação diferente | Bloqueado com mensagem clara | |
| C4 | Idioma e tema | Alternar EN/PT e claro/escuro em várias telas | Textos traduzidos e legíveis nos dois temas | |
| C5 | Celular | Abrir a página de pagamento no celular e ler o QR com a Phantom mobile (devnet) | Layout sem rolagem lateral; pagamento conciliado | |

## Se algo falhar

- **Logs (WSL):** `~/.paytrail/logs/watcher.log` (detecção) e `~/.paytrail/logs/api.log` (conciliação).
- **Conferir a transação** no explorer com `?cluster=devnet`: destino = carteira da Ana, token = USDC `4zMMC9…`, valor exato.
- **Watcher lento ou com erro 429:** trocar o RPC público por um da Helius/QuickNode (`SOLANA_RPC_URL` no `.env`) e reiniciar com `make restart`.
- **Para o teste automático (sem carteiras manuais):** `bash scripts/e2e.sh` roda A1–A9 no validador local. Os casos de borda (fatura cancelada, outro token, transação repetida) estão cobertos pelos testes da API (`mvn test`).
