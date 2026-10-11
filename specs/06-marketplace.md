# 06 — Diretório, inbox, propostas e acesso do contador

## Diretório
- `GET /users?role=ACCOUNTANT&q=crypto` — busca `ILIKE` em name, city, bio e specialties. Sem paginação no MVP (limite 50).
- Perfil público **nunca** expõe e-mail ou carteiras.
- Freelancers também aparecem (contador pode procurar clientes) — busca mútua.
- Card: nome, papel, cidade, especialidades (chips), bio curta, botão **Message**.

## Inbox
- `POST /conversations {participantId}` → retorna a conversa existente do par ou cria. Não pode conversar consigo mesmo.
- **Polling:** a tela de conversa chama `GET /conversations/{id}/messages?after=<último createdAt>` a cada 3 s; a lista de conversas a cada 10 s. Sem WebSocket.
- Só participantes leem/escrevem (`403` caso contrário).
- Mensagens: texto puro, máx. 4000 caracteres, sem edição/exclusão no MVP.
- Indicador de não lidas: **fora do MVP** (se sobrar tempo: `lastReadAt` por participante).

## Propostas
- Criadas dentro de uma conversa entre **um FREELANCER e um ACCOUNTANT** (outros pares → `409 ROLES_INVALID`). Qualquer um dos dois pode propor.
- Campos: honorário (`feeAmount` + `BRL`|`USDC`), período de dados que o contador poderá ver (`periodStart`–`periodEnd`), nota.
- Criar proposta gera uma `Message` tipo `PROPOSAL` (renderizada como card com Accept/Reject para o destinatário e Cancel para o remetente).
- Uma proposta `SENT` por conversa por vez (`409 PROPOSAL_ALREADY_OPEN`).
- **Accept** (somente destinatário), em uma transação:
  1. proposta → `ACCEPTED`;
  2. acesso ACTIVE anterior do mesmo par → `REVOKED`;
  3. cria `AccountantAccess` ACTIVE com o período;
  4. mensagem `SYSTEM`: "Proposal accepted — Carlos can now view Ana's records from Oct 1 to Dec 31, 2026."
- Reject/Cancel → mensagem `SYSTEM` correspondente.

## Acesso do contador
- Contador lê relatório/faturas de um freelancer **somente** se existir acesso ACTIVE e o mês pedido estiver dentro de `periodStart`–`periodEnd`. Senão `403 NO_ACCESS`.
- Contador tem acesso **somente leitura**: não cria fatura, não concilia, não gera comprovante.
- Toda leitura do contador grava `AccessLog` (VIEW_REPORT, EXPORT_CSV, VIEW_INVOICE).
- Freelancer vê seus acessos, o log de cada um e pode **Revoke** a qualquer momento.

## LGPD (argumento de confiança no pitch)
- Consentimento explícito = aceite da proposta, com período definido.
- Revogável a qualquer momento, com efeito imediato.
- Trilha de quem acessou o quê e quando.
- Nada disso vai on-chain.

## (Opcional) Honorários em USDC
Se `feeCurrency = USDC` e sobrar tempo: ao aceitar, gerar automaticamente uma `Invoice` do **contador** para o **freelancer** com o valor do honorário. Reusa todo o fluxo de pagamento e conciliação. Gancho de monetização: taxa da plataforma sobre honorários (roadmap).

## Telas
| Tela | Papel | Conteúdo |
|---|---|---|
| Directory | ambos | busca + cards |
| Inbox | ambos | lista de conversas + conversa com polling + cards de proposta |
| My accountants | freelancer | acessos, período, log, Revoke |
| My clients | contador | lista de clientes com totais do mês e alerta de unmatched → relatório mensal + Export CSV |
