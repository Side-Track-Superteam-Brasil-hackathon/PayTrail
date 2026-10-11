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

## Como rodar

O manual completo de instalação, configuração, desenvolvimento local, testes, demo
e execução E2E está em [docs/EXECUCAO.md](docs/EXECUCAO.md).

Depois de preparar o ambiente, execute `make help` para ver os comandos disponíveis.
