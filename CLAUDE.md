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

### Localnet: E2E e stack de demo (WSL, sem Docker)

Tudo roda no WSL com o toolchain de `scripts/wsl-env.sh` (Postgres via `scripts/pg.sh`, `solana-test-validator`).
Do Windows: `wsl -d Ubuntu-24.04 -- bash /mnt/c/dev/<repo>/scripts/<script>.sh`. Estado local (keypairs, ledger, logs,
segredos de dev) fica em `$HOME/.paytrail/`, nunca no repo. Mint "USDC" de teste (6 casas): keypair fixo em
`$HOME/.paytrail/e2e/usdc-mint.json`, então o endereço não muda entre resets do ledger.

```bash
# E2E completo: validador (--reset) + mint + banco paytrail_e2e recriado + API (jar) + watcher + runner A1–A9.
# Derruba tudo no fim; exit != 0 se algum cenário falhar. Logs em ~/.paytrail/logs/.
bash scripts/e2e.sh
bash scripts/e2e.sh --skip-build -- --only A2,A6      # reusa o jar; roda só A2 e A6 (+ dependências)
bash scripts/e2e.sh --keep                            # deixa a stack no ar depois (Ctrl+C derruba)
bash scripts/e2e.sh --watcher-smoke                   # só validador + watcher contra um stub da API (não precisa da API)

# Runner contra uma stack já rodando (API_URL, SOLANA_RPC_URL, INTERNAL_SECRET opcional)
cd tools/e2e && npm ci && npx tsx src/run.ts --api http://127.0.0.1:8080/api --rpc http://127.0.0.1:8899 [--only A1] [--timeout 60]
cd tools/e2e && npm run typecheck

# Stack de demo: validador (ledger persistente) + API perfil dev (DevSeeder, Ana com a carteira ~/.paytrail/keys/ana.json)
# + watcher + web em http://localhost:5173. Imprime mint, carteiras e comandos. --reset zera ledger e banco.
bash scripts/dev.sh [--reset] [--no-web] [--skip-build]

# CLIs da demo (usam as dependências de tools/e2e; localnet ou devnet via --rpc/--api)
cd tools/e2e
npx tsx ../demo/keygen.ts ana client exchange                     # cria ~/.paytrail/keys/<nome>.json, imprime endereços
npx tsx ../demo/fund.ts <endereço> 1000 --sol 1                    # localnet: cunha USDC de teste + airdrop
npx tsx ../demo/pay.ts INV-XXXX --from ~/.paytrail/keys/client.json                  # paga pelo link (reference)
npx tsx ../demo/pay.ts INV-XXXX --from ~/.paytrail/keys/exchange.json --no-reference # "exchange", sem reference
npx tsx ../demo/pay.ts http://localhost:5173/pay/INV-XXXX --from k.json --amount 400 \
  --rpc https://api.devnet.solana.com --api http://localhost:8080/api                # devnet / parcial
```

## Estado do projeto

MVP das fatias 1–6 completo. `mvn test` (71 testes) e `scripts/e2e.sh` (S1, S2, A1–A9 contra o validador local) passam.

- **API:** todas as rotas de `specs/03-api.yaml`: auth, `/me`, faturas, página pública de pagamento, conciliação (`/internal/*`), pagamentos e match manual, câmbio BRL (PTAX do BCB com cache e retry; `paytrail.bcb.enabled=false` usa cotação fixa offline), comprovantes + `/verify`, relatórios mensais + CSV, diretório, inbox, propostas, acessos e logs. Motor de conciliação **puro** em `reconciliation/`.
- **Watcher:** adapter Solana completo (reference + ATA, delta de saldo). Depende de `GET /internal/watch-targets` e `POST /internal/transfers` na API. O cursor por endereço só avança depois que a API aceita o POST (falha da API não perde transfers). Validado no localnet por `scripts/e2e.sh --watcher-smoke`.
- **E2E:** `tools/e2e` (runner A1–A9 contra a spec 03 + watcher smoke), `scripts/e2e.sh`, `scripts/dev.sh`, `tools/demo` (pay/fund/keygen).
- **Web:** todas as telas (financeiro + marketplace) em Tailwind + lucide-react, seguindo `design/reference-gemini.jsx`. UI em inglês.
- **Fora do MVP (opcional na spec):** honorários do contador em USDC (fatia 7) e ancoragem on-chain do hash do comprovante.
- `reference` da fatura (Solana Pay): 32 bytes aleatórios em base58. Não precisa ser uma chave no curve.
