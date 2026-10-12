# 00 — Produto: PayTrail

> Fonte de verdade do projeto. Toda mudança de comportamento atualiza a spec **antes** do código.

## Pitch

**PT:** Você recebe em USDC. O PayTrail transforma cada pagamento em um recebimento contábil em reais, comprovado on-chain e pronto para o seu contador.

**EN (para Colosseum/vídeos):** *You get paid in USDC. PayTrail turns every payment into an accountant-ready record in BRL, verifiable on-chain — and connects you to the accountant who closes your books.*

## Problema

Freelancers brasileiros que recebem de clientes do exterior em USDC:
1. Não conseguem relacionar facilmente cada transferência a uma cobrança (clientes pagam de exchanges, sem memo, valores parciais).
2. Precisam converter cada recebimento para BRL pela regra correta e entregar isso ao contador.
3. Têm dificuldade de achar um contador que entenda cripto, e o contador não tem uma visão organizada dos clientes.

## Personas

| Persona | Quer | Usa |
|---|---|---|
| **Freelancer** (`FREELANCER`) | Cobrar, saber o que foi pago, fechar o mês sem planilha, achar um contador | Faturas, conciliação, relatório, diretório, inbox |
| **Contador** (`ACCOUNTANT`) | Captar clientes cripto, receber dados prontos e verificáveis | Diretório, inbox, propostas, painel de clientes, export |

Um único tipo de conta (`User`); o papel é escolhido no cadastro.

## Diferenciais (o que o demo precisa provar)

1. **Conciliação robusta** — funciona mesmo quando o cliente paga de exchange sem referência (valor único), além de reference (Solana Pay). Parciais, excedentes e não conciliados tratados explicitamente.
2. **Recebimento em BRL** — cada pagamento convertido pela regra de câmbio escolhida (ver `02-conciliacao.md`).
3. **Comprovante verificável** — hash do comprovante + links on-chain; qualquer pessoa pode verificar integridade.
4. **Ponte com o contador** — diretório + inbox + proposta; aceite concede acesso ao histórico contábil. Contador vira canal de distribuição.

## Escopo do MVP (ordem de construção)

| # | Fatia | Spec |
|---|---|---|
| 1 | Cadastro/login com papel + criar fatura + link/página de pagamento Solana Pay | 01, 03, 04 |
| 2 | Watcher Solana + motor de conciliação + conversão BRL | 02, 04 |
| 3 | Comprovante com hash + verificação pública + relatório mensal + painel do contador | 02, 06 |
| 4 | Perfis + diretório + seed | 06 |
| 5 | Inbox (polling) | 06 |
| 6 | Proposta → aceite → acesso do contador (+ revogar, log de acesso) | 06 |
| 7 | *(opcional)* Honorários do contador pagos em USDC via fatura | 06 |

## Fora do escopo (roadmap / pitch)

- PIX, cartão, on/off-ramp fiat.
- WebSocket, anexos, notificações por e-mail no inbox.
- Reputação/avaliações, ranking no diretório.
- Custódia de fundos pela plataforma (sempre non-custodial).
- Emissão de nota fiscal / cálculo de imposto (o produto **organiza dados**, não faz apuração fiscal).
- Multi-token, multi-moeda além de USDC.
- **Outras redes (Arc/EVM).** O MVP é **somente Solana**. O domínio já tem o campo `network` para facilitar a expansão; o desenho do contrato Arc fica em `04-onchain.md` como roadmap.

## Decisões fixadas

- **Idioma da UI: inglês e português (pt-BR)**, com seletor de idioma em todas as telas (inclusive públicas). Padrão: o idioma salvo pelo usuário; sem escolha salva, o do navegador (`pt*` → pt-BR, resto → inglês). O vídeo do Colosseum é gravado em inglês. Textos centralizados em `apps/web/src/i18n/`.
- **Página inicial pública** em `/`: apresenta o produto e leva a cadastro/login. Usuário logado vai direto para a área dele.
- **Login: e-mail + senha** para todos. Cadastro pede a senha duas vezes (confirmação no front).
- **Política de senha (cadastro):** no mínimo 12 caracteres, com pelo menos um número, uma letra maiúscula, uma minúscula e um símbolo (qualquer caractere que não seja letra, número ou espaço). No máximo 72 bytes em UTF-8 (limite do BCrypt). A API valida e responde `400 WEAK_PASSWORD`; o front mostra a lista de requisitos enquanto o usuário digita. O login não reaplica a política. Carteira é só um campo de perfil (endereço de recebimento) — contador não precisa de carteira.
- **Rede: somente Solana.** Devnet no demo.
- Dados pessoais e comerciais **off-chain**. On-chain: pagamentos, eventos de pagamento, hashes de comprovantes.

## Prazos

| Programa | Prazo | Rede |
|---|---|---|
| Superteam Brasil (Colosseum) | **12/10 23:59 PT = 13/10 03:59 BRT** | Solana |

Feature freeze Superteam: **12/10 16h BRT**. Gravação dos vídeos: 18h–21h.

## Critério de sucesso

Os cenários de `05-aceite.md` passam de ponta a ponta. Nada além disso é obrigatório.
