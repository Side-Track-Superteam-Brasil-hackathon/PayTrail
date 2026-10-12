# Manual de execução do PayTrail

Este documento descreve como instalar, configurar, rodar e testar o PayTrail.
O projeto usa Java 21, Spring Boot, Node.js 20, PostgreSQL e Solana. A stack de
desenvolvimento e os testes E2E usam um validador Solana local.

## 1. Pré-requisitos

Para desenvolvimento completo, instale:

- Windows 10/11 com WSL2 e Ubuntu 24.04 (ou Linux nativo);
- Java 21 e Maven 3.9+;
- Node.js 20+ e npm;
- Docker Desktop com integração WSL habilitada, para o PostgreSQL;
- GNU Make;
- Solana CLI, incluindo `solana-test-validator` e `solana-keygen`;
- `curl`, `ss`, `setsid` e ferramentas POSIX comuns.

O script `scripts/wsl-env.sh` espera um toolchain opcional em
`$HOME/micromamba/envs/paytrail` e coloca Java e Solana no `PATH`. Se as
ferramentas já estiverem instaladas no sistema, o fallback do script usa o
`PATH` atual para Java; ainda assim, Solana CLI precisa estar disponível.

No Windows, abra um terminal WSL na raiz do repositório:

```powershell
wsl -d Ubuntu-24.04
cd /mnt/c/Users/grcal/OneDrive/Documentos/HACKATHONS/Hackathons_web3_10_10_2026/app/PayTrail
```

O caminho acima é específico desta máquina. Para descobrir o caminho montado,
use `pwd` no PowerShell e substitua `C:\` por `/mnt/c/` no WSL.

Confira as versões:

```bash
java -version
mvn -version
node --version
npm --version
make --version
solana-test-validator --version
docker --version
```

## 2. Configuração inicial

Na raiz do projeto, crie o arquivo local de variáveis:

```bash
cp .env.example .env
```

Edite `.env` e defina pelo menos:

```dotenv
POSTGRES_PASSWORD=uma-senha-local
DB_PASSWORD=uma-senha-local
JWT_SECRET=uma-string-aleatoria-com-pelo-menos-32-bytes
INTERNAL_SECRET=outra-string-aleatoria
```

O `.env` não deve ser commitado. Para o fluxo de desenvolvimento com Docker,
`DB_URL` deve apontar para `localhost:5432/paytrail`. Para o fluxo `make dev`,
o script cria e usa uma configuração local própria em `$HOME/.paytrail`.

Instale as dependências JavaScript:

```bash
make install
```

Esse comando executa `npm ci` em `apps/web`, `apps/watcher` e `tools/e2e`.

## 3. Fluxo recomendado para desenvolvimento

O caminho mais completo é a stack local com banco, Solana local, API, watcher e
frontend. Ela cria um ledger e carteiras de demonstração em `$HOME/.paytrail`.

```bash
make dev
```

Na primeira execução, o script compila a API e prepara o estado local. Ao final,
acesse:

- frontend: `http://localhost:5173`;
- API: `http://localhost:8080/api`;
- health check: `http://localhost:8080/api/actuator/health`;
- RPC Solana local: `http://localhost:8899`.

O script imprime os usuários, carteiras, mint de USDC de teste e a senha dos
usuários demo. A senha pode ser fixada em `.env` com `SEED_PASSWORD`. Para zerar
ledger e banco e começar uma demo limpa:

```bash
make dev ARGS="--reset"
```

Para subir a stack sem Vite:

```bash
make dev-no-web
```

Os logs ficam em `$HOME/.paytrail/logs`. Pressione `Ctrl+C` no terminal da stack
para encerrar os processos iniciados pelo script.

## 4. Rodar os componentes separadamente

Use este fluxo quando quiser depurar cada processo individualmente.

Primeiro suba o PostgreSQL:

```bash
make db-up
```

Em terminais separados:

```bash
make api-run
make watcher-dev
make web-dev
```

Nesse modo, a API usa as credenciais e endpoints do `.env`, enquanto o watcher
usa `API_URL`, `SOLANA_RPC_URL` e as demais variáveis do mesmo arquivo. O
frontend usa o proxy configurado em `apps/web/vite.config.ts`.

Para parar e remover o container do banco (o volume não é removido):

```bash
make db-down
```

Para acompanhar o banco:

```bash
make db-logs
```

## 5. Build e testes

Testes da API Java:

```bash
make api-test
```

Testes do watcher:

```bash
make watcher-test
```

Todos os testes principais:

```bash
make test
```

Build de todos os módulos:

```bash
make build
```

O build executa o typecheck e o bundle do frontend, compila o watcher e cria o
JAR da API sem testes. Verificações individuais do frontend e watcher:

```bash
make web-typecheck
make watcher-typecheck
```

## 6. Testes E2E

Os cenários E2E iniciam automaticamente PostgreSQL, `solana-test-validator`,
mint de teste, API e watcher. Ao terminar, a stack é encerrada.

```bash
make e2e
```

Para executar somente alguns cenários:

```bash
make e2e ARGS="-- --only A2,A6"
```

Para alterar o timeout do runner:

```bash
make e2e ARGS="-- --timeout 90"
```

Smoke test do watcher, sem iniciar a API:

```bash
make e2e-smoke
```

Os logs da execução ficam em `$HOME/.paytrail/logs`. O banco E2E padrão é
`paytrail_e2e`; a porta da API é `8080` e a RPC local é `8899`. É possível
sobrescrever portas e nomes com variáveis, por exemplo:

```bash
API_PORT=8081 RPC_PORT=8890 make e2e
```

## 7. Pagamento manual na demo

Com `make dev` em execução, use outro terminal WSL. O script informa os nomes
das carteiras em `$HOME/.paytrail/keys` e o mint criado para a localnet.

Para pagar uma fatura usando a referência Solana Pay:

```bash
cd tools/e2e
npx tsx ../demo/pay.ts INV-XXXX --from ~/.paytrail/keys/client.json
```

Para simular pagamento sem referência, como uma exchange:

```bash
npx tsx ../demo/pay.ts INV-XXXX --from ~/.paytrail/keys/exchange.json --no-reference
```

Para gerar uma carteira ou financiá-la:

```bash
npx tsx ../demo/keygen.ts nova-carteira
npx tsx ../demo/fund.ts <endereco> 1000 --sol 1
```

Substitua `INV-XXXX` pelo identificador real de uma fatura criada na interface.

## 8. Gerar tipos da API

Quando `specs/03-api.yaml` mudar, regenere os tipos usados pelo frontend:

```bash
cd apps/web
npm run gen:api
```

Depois execute `make web-typecheck` e avise os responsáveis pelo frontend e
backend, pois o contrato OpenAPI é compartilhado.

## 9. Comandos Make disponíveis

Veja a lista diretamente no terminal:

```bash
make help
```

O Makefile possui somente os fluxos operacionais principais:

```bash
make up        # stack real em background, com progresso no terminal
make dev       # alias de up
make mock      # frontend + mock OpenAPI
make logs      # logs do PostgreSQL
make stop      # para a aplicação sem remover dados
make restart   # reinicia em background sem apagar dados
make down      # encerra a stack e remove containers, volumes e órfãos
```

Use `ARGS` para passar opções ao modo real, por exemplo `make up ARGS="--reset"`.
O processo da stack fica registrado em `$HOME/.paytrail/dev.pid` e o log completo
do startup fica em `$HOME/.paytrail/logs/dev-console.log`.
Durante o startup, cada serviço aparece em uma linha própria com cor, percentual
e spinner ASCII enquanto está em execução. O modo mock grava logs em
`$HOME/.paytrail/logs/mock-prism.log` e `mock-web.log`.
Os comandos `stop`, `restart` e `down` exibem os nomes e estados dos containers
quando Docker Compose está disponível. `stop` pausa sem remover; `restart` recria
os containers sem remover volumes; `down` remove containers, volumes e órfãos.
O alvo `mock` encerra o Prism e o Vite quando você pressiona `Ctrl+C`.

## 10. Problemas comuns

**Porta ocupada.** A stack usa API `8080`, RPC `8899`, faucet `9900` e web
`5173`. Encerre o processo antigo ou escolha portas alternativas nas variáveis
do script.

**Docker não acessível no WSL.** Ative a integração da distribuição Ubuntu no
Docker Desktop e confirme com `docker ps` dentro do WSL.

**Dependência Node ausente.** Execute `make install` na raiz. O script usa os
lockfiles e instala com `npm ci`.

**Java ou Solana não encontrados.** Carregue `scripts/wsl-env.sh` ou corrija o
`PATH`/`JAVA_HOME` no WSL antes de executar os comandos.

**API não inicia.** Consulte `$HOME/.paytrail/logs/api.log` e
`$HOME/.paytrail/logs/api-build.log`; verifique também a conexão com o
PostgreSQL e as variáveis de segredo.

**Estado local inconsistente.** Pare a stack e execute `make dev ARGS="--reset"`
ou remova somente o estado de desenvolvimento em `$HOME/.paytrail/dev` e
`$HOME/.paytrail/ledger-dev` se precisar recriar a configuração local.