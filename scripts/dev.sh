#!/usr/bin/env bash
# Stack completa para teste manual / gravação da demo (WSL, sem Docker).
# Padrão: Solana DEVNET (USDC de teste da Circle, carteiras reais como Phantom).
# Com --localnet: validador local + mint "USDC" de teste, carteiras financiadas automaticamente.
# Postgres + API (perfil dev, DevSeeder) + watcher + web (5173). Fica rodando até Ctrl+C.
#
# Uso:  bash scripts/dev.sh [--localnet] [--reset] [--no-web] [--skip-build]
#   --localnet    usa o solana-test-validator local em vez da devnet
#   --reset       zera o banco (e, no localnet, o ledger): estado limpo para gravar
#   --no-web      não sobe o Vite
#   --skip-build  reusa apps/api/target/*.jar
# Env (ambiente > .env): SOLANA_RPC_URL (devnet: https://api.devnet.solana.com; use Helius/QuickNode se limitar),
#   SEED_ANA_SOLANA_WALLET (carteira da Ana; padrão: ~/.paytrail/keys/ana.json), SEED_PASSWORD,
#   DEV_DB (paytrail_devnet | paytrail), API_PORT (8080), RPC_PORT (8899), WEB_PORT (5173), POLL_MS (5000 | 2000)
# Do Windows: wsl -d Ubuntu-24.04 -- bash /mnt/c/dev/<repo>/scripts/dev.sh
#
# Estado local (fora do git): $HOME/.paytrail/{ledger-dev, keys/*.json, dev/secrets.env, dev/seed-password, logs/}
set -uo pipefail
. "$(dirname "$0")/stack.sh"

DEVNET_USDC_MINT="4zMMC9srt5Ri5X14GAgXhaHii3GnPAEERYPJgZJDncDU" # USDC devnet da Circle (specs/04)
NETWORK=devnet
RESET=0
WEB=1
while [ $# -gt 0 ]; do
  case "$1" in
    --localnet) NETWORK=localnet ;;
    --reset) RESET=1 ;;
    --no-web) WEB=0 ;;
    --skip-build) export SKIP_API_BUILD=1 ;;
    *) die "opção desconhecida: $1" ;;
  esac
  shift
done

# Banco separado por rede: faturas e carteiras da devnet não se misturam com as do localnet.
if [ "$NETWORK" = devnet ]; then DEV_DB="${DEV_DB:-paytrail_devnet}"; else DEV_DB="${DEV_DB:-paytrail}"; fi
LEDGER="$PT_HOME/ledger-dev"
DEV_DIR="$PT_HOME/dev"
mkdir -p "$DEV_DIR" && chmod 700 "$DEV_DIR"

cleanup() {
  trap - EXIT INT TERM
  echo
  stop_all
  log "logs: $LOG_DIR/{validator,api,watcher,web}.log"
}
trap cleanup EXIT
trap 'exit 130' INT TERM

# dotenv <NOME>: valor de NOME no .env da raiz (vazio se não houver).
dotenv() {
  [ -f "$ROOT/.env" ] || return 0
  grep -E "^$1=" "$ROOT/.env" | tail -n1 | cut -d= -f2- | tr -d '\r"'
}

# --- segredos locais persistentes (JWT continua válido entre reinícios) ---
if [ ! -f "$DEV_DIR/secrets.env" ]; then
  umask 077
  printf 'JWT_SECRET=%s\nINTERNAL_SECRET=%s\n' "$(random_hex 32)" "$(random_hex 24)" >"$DEV_DIR/secrets.env"
fi
set -a; . "$DEV_DIR/secrets.env"; set +a

# Senha dos usuários de demo: SEED_PASSWORD do ambiente > do .env > gerada em $DEV_DIR/seed-password.
SEED_SOURCE="ambiente"
if [ -z "${SEED_PASSWORD:-}" ]; then
  SEED_PASSWORD="$(dotenv SEED_PASSWORD)"
  SEED_SOURCE="$ROOT/.env"
fi
if [ -z "${SEED_PASSWORD:-}" ]; then
  [ -f "$DEV_DIR/seed-password" ] || (umask 077 && random_hex 8 >"$DEV_DIR/seed-password")
  SEED_PASSWORD="$(cat "$DEV_DIR/seed-password")"
  SEED_SOURCE="$DEV_DIR/seed-password"
fi
export SEED_PASSWORD

npm_ensure "$ROOT/tools/e2e"
npm_ensure "$ROOT/apps/watcher"
[ "$WEB" = 1 ] && npm_ensure "$ROOT/apps/web"

# --- chain ---
if [ "$NETWORK" = devnet ]; then
  RPC_URL="${SOLANA_RPC_URL:-$(dotenv SOLANA_RPC_URL)}"
  RPC_URL="${RPC_URL:-https://api.devnet.solana.com}"
  export SOLANA_USDC_MINT="$DEVNET_USDC_MINT"
  export SOLANA_CLUSTER=devnet
  export POLL_MS="${POLL_MS:-5000}" # RPC público da devnet tem limite de requisições
  wait_until "solana devnet em $RPC_URL" 30 "" "$LOG_DIR/devnet-rpc.log" rpc_healthy
else
  FRESH_LEDGER=0
  if [ "$RESET" = 1 ] || [ ! -d "$LEDGER" ]; then FRESH_LEDGER=1; fi
  start_validator "$LEDGER" "$RESET"
  SOLANA_USDC_MINT="$(ensure_mint)"
  export SOLANA_USDC_MINT
fi

DEMO="$ROOT/tools/e2e/node_modules/.bin/tsx"
(cd "$ROOT/tools/e2e" && "$DEMO" ../demo/keygen.ts ana client exchange >/dev/null) || die "keygen falhou"
KEYS="$PT_HOME/keys"
ANA_WALLET="$(solana-keygen pubkey "$KEYS/ana.json")"
CLIENT_WALLET="$(solana-keygen pubkey "$KEYS/client.json")"
EXCHANGE_WALLET="$(solana-keygen pubkey "$KEYS/exchange.json")"

if [ "$NETWORK" = devnet ]; then
  # Carteira da Ana: ambiente > .env > keypair local. Na devnet ela pode ser uma carteira Phantom.
  SEED_ANA_SOLANA_WALLET="${SEED_ANA_SOLANA_WALLET:-$(dotenv SEED_ANA_SOLANA_WALLET)}"
  export SEED_ANA_SOLANA_WALLET="${SEED_ANA_SOLANA_WALLET:-$ANA_WALLET}"
else
  export SEED_ANA_SOLANA_WALLET="$ANA_WALLET"
  if [ "$FRESH_LEDGER" = 1 ]; then
    log "ledger novo: financiando carteiras de demo"
    (cd "$ROOT/tools/e2e" &&
      "$DEMO" ../demo/fund.ts "$CLIENT_WALLET" 10000 --sol 5 --rpc "$RPC_URL" &&
      "$DEMO" ../demo/fund.ts "$EXCHANGE_WALLET" 10000 --sol 5 --rpc "$RPC_URL" &&
      "$DEMO" ../demo/fund.ts "$ANA_WALLET" 0 --sol 1 --rpc "$RPC_URL") >"$LOG_DIR/dev-fund.log" 2>&1 \
      || { cat "$LOG_DIR/dev-fund.log" >&2; die "financiamento das carteiras falhou"; }
  fi
fi

# --- banco + API + watcher + web ---
ensure_postgres
if [ "$RESET" = 1 ]; then reset_db "$DEV_DB"; else ensure_db "$DEV_DB"; fi
build_api
start_api "$DEV_DB" dev
start_watcher
[ "$WEB" = 1 ] && start_web

if [ "$NETWORK" = devnet ]; then
  RPC_ARG="--rpc $RPC_URL --api $API_URL"
  EXPLORER="https://explorer.solana.com/address/<endereço>?cluster=devnet"
  FUND_HELP=" Fundos na devnet (manual, por carteira):
   SOL (taxas):  solana airdrop 1 <endereço> -u devnet   ou https://faucet.solana.com
   USDC de teste: https://faucet.circle.com  (rede Solana Devnet)
   Guia completo: docs/devnet/01-carteira-devnet.md"
  CLUSTER_NOTE="USDC devnet da Circle; SOLANA_CLUSTER=devnet"
else
  RPC_ARG=""
  EXPLORER="https://explorer.solana.com/?cluster=custom&customUrl=http%3A%2F%2F127.0.0.1%3A$RPC_PORT"
  FUND_HELP=" Financiar uma carteira:   npx tsx ../demo/fund.ts <endereço> 1000 --sol 1"
  CLUSTER_NOTE="teste, 6 casas; SOLANA_CLUSTER=custom"
fi

cat <<EOF

================ PayTrail dev ($NETWORK) ================
 Web        http://localhost:$WEB_PORT
 API        $API_URL   (perfil dev, banco $DEV_DB)
 RPC        $RPC_URL
 Mint USDC  $SOLANA_USDC_MINT   ($CLUSTER_NOTE)

 Login demo: ana@demo.paytrail / carlos@demo.paytrail (senha: SEED_PASSWORD, de $SEED_SOURCE)
 Carteiras:
   ana (recebe)  $SEED_ANA_SOLANA_WALLET   (solanaWallet da Ana no seed)
   client        $CLIENT_WALLET   ($KEYS/client.json)
   exchange      $EXCHANGE_WALLET   ($KEYS/exchange.json)

 Pagar uma fatura (outro terminal; WSL, na raiz do repo):
   . scripts/wsl-env.sh && cd tools/e2e
   npx tsx ../demo/pay.ts INV-XXXX --from $KEYS/client.json $RPC_ARG                  # link (reference)
   npx tsx ../demo/pay.ts INV-XXXX --from $KEYS/exchange.json --no-reference $RPC_ARG # exchange
   npx tsx ../demo/pay.ts INV-XXXX --from $KEYS/client.json --amount 2 $RPC_ARG       # parcial
$FUND_HELP
 Nova carteira:            npx tsx ../demo/keygen.ts <nome>

 Explorer: $EXPLORER
 Logs: $LOG_DIR      Ctrl+C derruba tudo.
=========================================================
EOF

# Fica de pé até Ctrl+C; se algum processo cair, avisa e encerra.
while true; do
  for i in "${!STARTED_PIDS[@]}"; do
    if ! kill -0 "${STARTED_PIDS[$i]}" 2>/dev/null; then
      log "${STARTED_NAMES[$i]} caiu (veja $LOG_DIR/${STARTED_NAMES[$i]}.log); derrubando o resto"
      exit 1
    fi
  done
  sleep 3
done
