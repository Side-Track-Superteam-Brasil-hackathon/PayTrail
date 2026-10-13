# Tutorial: criar e abastecer uma carteira na devnet da Solana

A **devnet** é a rede de testes pública da Solana: funciona igual à rede principal, mas o SOL e o USDC de lá **não valem nada**. É nela que o PayTrail roda a demo (`specs/04-onchain.md`).

> **Testnet ou devnet?** A Solana tem as duas redes de teste. Usamos a **devnet** porque é nela que a Circle publica o USDC de teste (`4zMMC9srt5Ri5X14GAgXhaHii3GnPAEERYPJgZJDncDU`). Na carteira, escolha sempre **Devnet**.

## Do que você precisa

| Item | Para quê | Onde |
|---|---|---|
| Navegador Chrome, Brave ou Edge | Extensão da carteira | — |
| Carteira **Phantom** | Criar o endereço e pagar faturas | [phantom.app](https://phantom.app) |
| Conta no GitHub (opcional) | O faucet de SOL libera mais com login | [github.com](https://github.com) |
| **SOL de devnet** | Pagar as taxas das transações (centavos de SOL) | [faucet.solana.com](https://faucet.solana.com) |
| **USDC de devnet** | O dinheiro de teste das faturas | [faucet.circle.com](https://faucet.circle.com) |

## Quantas carteiras criar para testar o PayTrail

| Carteira | Papel no teste | Precisa de |
|---|---|---|
| **Ana** (recebe) | Carteira cadastrada no perfil da freelancer | Nada: quem paga cria a conta de USDC dela |
| **Cliente** (paga pelo link) | Lê o QR code ou abre o link Solana Pay | ~0,05 SOL + USDC de teste |
| **Exchange** (paga sem link) | Simula um saque de exchange: transferência simples do valor exato | ~0,05 SOL + USDC de teste |

Dá para fazer as três numa só Phantom: ela permite várias contas (**Add / Connect Wallet → Create new account**). Uma conta por papel.

## Passo a passo (Phantom)

### 1. Instalar e criar a carteira
1. Acesse [phantom.app](https://phantom.app) e instale a extensão do navegador (ou o app no celular).
2. Clique em **Create a new wallet** e defina uma senha.
3. Anote a **frase de recuperação** (12 palavras) num lugar seguro. Mesmo sendo para teste, nunca compartilhe e nunca use esta carteira com dinheiro real.

### 2. Ligar o modo devnet
1. Na Phantom, abra **Settings** (engrenagem) → **Developer Settings**.
2. Ative **Testnet Mode**.
3. Em **Solana**, escolha **Devnet**.
4. A Phantom passa a mostrar um aviso de rede de teste no topo. Confira que está em **Devnet** antes de cada teste.

### 3. Copiar o endereço
Clique no nome da conta no topo da Phantom para copiar o endereço (base58, 32–44 caracteres, ex.: `EBcpwGJxBa…RG38BjQ`).

### 4. Pegar SOL de devnet (taxas)
1. Abra [faucet.solana.com](https://faucet.solana.com).
2. Cole o endereço, escolha **Devnet** e peça **1 SOL** (com login do GitHub o limite é maior).
3. Alternativa pelo terminal (WSL): `solana airdrop 1 <endereço> -u devnet`. O faucet público costuma recusar por limite de requisições; se recusar, use o site.

### 5. Pegar USDC de devnet
1. Abra [faucet.circle.com](https://faucet.circle.com).
2. Escolha **USDC** e a rede **Solana Devnet**.
3. Cole o endereço, resolva o captcha e envie.
4. O faucet libera uma quantia pequena por pedido, com intervalo entre pedidos; confira o valor atual no site. **Por isso os testes usam faturas de poucos USDC.**
5. Se o USDC não aparecer na Phantom, procure por "USDC" em **Manage token list**.

### 6. Conferir no explorer
Abra `https://explorer.solana.com/address/<endereço>?cluster=devnet`. Devem aparecer o SOL e a conta de token do USDC.

## Alternativa: carteira pelo terminal (para os scripts)

O PayTrail já cria carteiras de teste em `~/.paytrail/keys/` (dentro do WSL) quando você roda `make up` ou `bash scripts/dev.sh`:

```bash
. scripts/wsl-env.sh && cd tools/e2e
npx tsx ../demo/keygen.ts client exchange     # cria se não existirem e imprime os endereços
solana balance <endereço> -u devnet           # saldo de SOL
```

Abasteça esses endereços pelos mesmos faucets (passos 4 e 5). Depois, o script `tools/demo/pay.ts` paga faturas com eles (veja `02-roteiro-de-testes.md`). As chaves ficam só na sua máquina, nunca no repositório.

## Ligar a carteira ao PayTrail

**Freelancer (recebe):**
- Pela tela: entre como freelancer → **Perfil** → **Carteira Solana** → cole o endereço → **Salvar**.
- Para a Ana da demo, antes de subir o app: no `.env` da raiz, `SEED_ANA_SOLANA_WALLET=<endereço>` e depois `make up ARGS="--reset"` (ou `bash scripts/dev.sh --reset`).
- Uma carteira só pode estar em uma conta (erro "carteira já usada").

**Subir o app na devnet:** `make up` (ou `bash scripts/dev.sh`). A devnet é o padrão. Para voltar ao validador local: `make up ARGS="--localnet"`.

**RPC:** o RPC público `https://api.devnet.solana.com` tem limite de requisições. Se o watcher demorar ou falhar, crie uma chave grátis na Helius ou QuickNode e coloque no `.env`: `SOLANA_RPC_URL=https://devnet.helius-rpc.com/?api-key=<sua-chave>`.

## Problemas comuns

| Sintoma | Causa provável | O que fazer |
|---|---|---|
| Phantom mostra saldo zero após o faucet | Carteira em Mainnet | Ligar Testnet Mode → Devnet |
| "airdrop request failed" | Limite do faucet público | Usar o site, com login do GitHub, ou esperar |
| Pagamento não aparece no PayTrail | Rede errada, ou ainda não finalizado (~15–30 s) | Conferir a tx no explorer com `?cluster=devnet`; aguardar |
| Fatura fica "não conciliada" | Valor diferente do valor exato (ex.: exchange descontou taxa) | Enviar exatamente o valor da página, ou conciliar à mão |
| Erro de saldo insuficiente ao pagar | Falta SOL para a taxa ou para criar a conta de USDC do destino | Pegar mais SOL no faucet |
