# PayTrail

USDC invoicing and reconciliation for Brazilian freelancers: every payment matched to its invoice, converted to BRL, verifiable on-chain, and accountant-ready. Includes an accountant directory, inbox and proposals that grant accountants access to their clients' records.

Built on Solana for the Superteam Brasil side track of the Colosseum hackathon.

## Specs

This project follows spec-driven development. Start here:

| Spec | Contents |
|---|---|
| [00-produto](specs/00-produto.md) | Pitch, personas, MVP scope and build order |
| [01-dominio](specs/01-dominio.md) | Entities and state machines |
| [02-conciliacao](specs/02-conciliacao.md) | Matching engine, BRL conversion, receipts, test cases |
| [03-api](specs/03-api.yaml) | OpenAPI contract |
| [04-onchain](specs/04-onchain.md) | Solana Pay and chain watcher |
| [05-aceite](specs/05-aceite.md) | Acceptance scenarios and demo script |
| [06-marketplace](specs/06-marketplace.md) | Directory, inbox, proposals, accountant access |

See [CLAUDE.md](CLAUDE.md) for stack, repo layout and conventions.

## Running locally

The real app needs four pieces: **Postgres**, the **API** (Spring Boot, port 8080), the **watcher** (reads Solana and reports payments to the API) and the **web** app (port 5173). This is the setup used for the demo and for production. Data is saved, invoices persist and each account keeps the role chosen at sign up.

```bash
cp .env.example .env                       # fill in passwords and secrets
docker compose --env-file .env -f infra/docker-compose.yml up -d
cd apps/api && set -a && . ../../.env && set +a && mvn spring-boot:run -Dspring-boot.run.profiles=dev
cd apps/watcher && npm install && npm run dev
cd apps/web && npm install && npm run dev  # open http://localhost:5173
```

On Windows with WSL (no Docker), `make up` (or `bash scripts/dev.sh`) starts everything against the **Solana devnet**; add `--localnet` (`make up ARGS="--localnet"`) to use a local validator with auto-funded test wallets instead.

Devnet guides (in Portuguese) in [docs/devnet](docs/devnet): [creating and funding a devnet wallet](docs/devnet/01-carteira-devnet.md), [test plan](docs/devnet/02-roteiro-de-testes.md) and [demo video script](docs/devnet/03-roteiro-video.md).

### Mock mode (front-end only)

`npm run mock` plus `VITE_API_TARGET=http://localhost:4010 npm run dev` serves a fake API generated from `specs/03-api.yaml`. Use it only to work on screens without the back end. **Nothing is saved**, every account comes back as the same freelancer, and text fields show placeholder values like `string`. The app shows a yellow "Mock mode" banner while it runs this way.
