# PayTrail

Plataforma de cobrança e conciliação de pagamentos em USDC para freelancers brasileiros, com conversão para BRL, comprovantes verificáveis e conexão com contadores (diretório, inbox, propostas, acesso ao histórico).

Hackathon: Superteam Brasil / Colosseum. **Somente Solana** (devnet no demo). Prazo: 13/10/2026 03:59 BRT. Arc/EVM é roadmap: não implementar.

## Specs são a fonte de verdade

Leia antes de implementar qualquer coisa:

- `specs/00-produto.md`: escopo, ordem das fatias, fora do escopo, decisões fixadas
- `specs/01-dominio.md`: entidades e máquinas de estado
- `specs/02-conciliacao.md`: motor de conciliação, câmbio BRL, comprovantes, **casos de teste**
- `specs/03-api.yaml`: contrato OpenAPI entre front e back
- `specs/04-onchain.md`: Solana Pay e watcher (seção Arc = roadmap)
- `specs/05-aceite.md`: cenários de aceite e roteiro da demo
- `specs/06-marketplace.md`: diretório, inbox, propostas, acesso do contador

Regras:
1. Mudança de comportamento → atualizar a spec **primeiro**, depois o código.
2. Não implementar nada listado em "Fora do escopo" (00).
3. Os casos da tabela em `02-conciliacao.md` §6 têm que existir como testes unitários e passar.
4. Mudou `03-api.yaml`? Avise o time: front e back dependem dele.

## Stack e estrutura

```
apps/web        React + Vite + TypeScript (UI em inglês)
apps/api        Java 21 + Spring Boot 3, Spring Security (JWT), Spring Data JPA, Flyway, PostgreSQL
apps/watcher    Node 20 + TypeScript: @solana/web3.js, @solana/pay, @solana/spl-token
infra           docker-compose (Postgres)
specs           especificações
```

## Convenções

- Código e identificadores em inglês; specs em português; UI em inglês.
- Valores USDC: `BigDecimal` (escala 6) no Java, `string` na API, nunca `double`/`number`.
- Datas em UTC no banco; datas de câmbio em `America/Sao_Paulo`.
- Motor de conciliação e cálculo de status como **funções puras** testáveis, separadas de I/O.
- Segredos só em `.env` (fora do git). Nunca commitar chaves privadas.

## Comandos

Pré-requisitos: Java 21 + Maven 3.9, Node 20, Docker (Postgres). Copie `.env.example` → `.env` e preencha.

```bash
# Postgres
docker compose --env-file .env -f infra/docker-compose.yml up -d

# API (porta 8080, base /api). Perfil dev cria os usuários de demo (SEED_PASSWORD)
cd apps/api && set -a && . ../../.env && set +a && mvn spring-boot:run -Dspring-boot.run.profiles=dev
cd apps/api && mvn test            # motor de conciliação: casos de specs/02 §6

# Web (porta 5173, proxy /api → 8080)
cd apps/web && npm install && npm run dev
cd apps/web && npm run mock        # mock da API a partir do OpenAPI (porta 4010)
VITE_API_TARGET=http://localhost:4010 npm run dev   # front contra o mock
cd apps/web && npm run gen:api     # gera src/api/schema.d.ts do 03-api.yaml

# Watcher (lê a Solana devnet e envia transfers à API)
cd apps/watcher && npm install && npm run dev
cd apps/watcher && npm test
```

## Estado do esqueleto

- **API:** auth (register/login/JWT), `GET/PATCH /me`, seed de demo, schema completo (Flyway `V1__init.sql`), filtro de `/internal/**`, e motor de conciliação **puro** em `reconciliation/` (Matcher, UniqueSuffixAllocator, FxDates, TransferFilter) com testes. Faltam os serviços/controllers das fatias 1–6.
- **Watcher:** adapter Solana completo (reference + ATA, delta de saldo). Depende de `GET /internal/watch-targets` e `POST /internal/transfers` na API.
- **Web:** login/cadastro com escolha de papel, navegação por papel, rotas com placeholders que apontam o cenário da spec.
- `reference` da fatura (Solana Pay): 32 bytes aleatórios em base58. Não precisa ser uma chave no curve.
