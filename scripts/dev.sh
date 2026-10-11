#!/usr/bin/env bash
# Stack local completa para teste manual / gravação da demo, no validador local (WSL, sem Docker):
# Postgres + solana-test-validator + mint "USDC" de teste + API (perfil dev, DevSeeder) + watcher + web (5173).
# Fica rodando até Ctrl+C (derruba tudo que subiu).
#
# Uso:  bash scripts/dev.sh [--reset] [--no-web] [--skip-build]
#   --reset       zera o ledger local E o banco (estado limpo para gravar)
#   --no-web      não sobe o Vite
#   --skip-build  reusa apps/api/target/*.jar
# Env: DEV_DB (paytrail), API_PORT (8080), RPC_PORT (8899), WEB_PORT (5173), POLL_MS (2000)
# Do Windows: wsl -d Ubuntu-24.04 -- bash /mnt/c/dev/<repo>/scripts/dev.sh
#
# Estado local (fora do git): $HOME/.paytrail/{ledger-dev, keys/*.json, dev/secrets.env, dev/seed-password, logs/}
set -uo pipefail
. "$(dirname "$0")/stack.sh"

RESET=0
WEB=1
while [ $# -gt 0 ]; do
  case "$1" in
    --reset) RESET=1 ;;
    --no-web) WEB=0 ;;
    --skip-build) export SKIP_API_BUILD=1 ;;
    *) die "opção desconhecida: $1" ;;
  esac
  shift
done

DEV_DB="${DEV_DB:-paytrail}"
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

# --- segredos locais persistentes (JWT continua válido entre reinícios) ---
if [ ! -f "$DEV_DIR/secrets.env" ]; then
  umask 077
  printf 'JWT_SECRET=%s\nINTERNAL_SECRET=%s\n' "$(random_hex 32)" "$(random_hex 24)" >"$DEV_DIR/secrets.env"
fi
set -a; . "$DEV_DIR/secrets.env"; set +a

# Senha dos usuários de demo: SEED_PASSWORD do ambiente > do .env > gerada em $DEV_DIR/seed-password.
SEED_SOURCE="ambiente"
if [ -z "${SEED_PASSWORD:-}" ] && [ -f "$ROOT/.env" ]; then
  SEED_PASSWORD="$(grep -E '^SEED_PASSWORD=' "$ROOT/.env" | tail -n1 | cut -d= -f2- | tr -d '\r"')"
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
FRESH_LEDGER=0
if [ "$RESET" = 1 ] || [ ! -d "$LEDGER" ]; then FRESH_LEDGER=1; fi
start_validator "$LEDGER" "$RESET"
SOLANA_USDC_MINT="$(ensure_mint)"
export SOLANA_USDC_MINT

DEMO="$ROOT/tools/e2e/node_modules/.bin/tsx"
(cd "$ROOT/tools/e2e" && "$DEMO" ../demo/keygen.ts ana client exchange >/dev/null) || die "keygen falhou"
KEYS="$PT_HOME/keys"
ANA_WALLET="$(solana-keygen pubkey "$KEYS/ana.json")"
CLIENT_WALLET="$(solana-keygen pubkey "$KEYS/client.json")"
EXCHANGE_WALLET="$(solana-keygen pubkey "$KEYS/exchange.json")"
export SEED_ANA_SOLANA_WALLET="$ANA_WALLET"

if [ "$FRESH_LEDGER" = 1 ]; then
  log "ledger novo: financiando carteiras de demo"
  (cd "$ROOT/tools/e2e" &&
    "$DEMO" ../demo/fund.ts "$CLIENT_WALLET" 10000 --sol 5 --rpc "$RPC_URL" &&
    "$DEMO" ../demo/fund.ts "$EXCHANGE_WALLET" 10000 --sol 5 --rpc "$RPC_URL" &&
    "$DEMO" ../demo/fund.ts "$ANA_WALLET" 0 --sol 1 --rpc "$RPC_URL") >"$LOG_DIR/dev-fund.log" 2>&1 \
    || { cat "$LOG_DIR/dev-fund.log" >&2; die "financiamento das carteiras falhou"; }
fi

# --- banco + API + watcher + web ---
ensure_postgres
if [ "$RESET" = 1 ]; then reset_db "$DEV_DB"; else ensure_db "$DEV_DB"; fi
build_api
start_api "$DEV_DB" dev
start_watcher
[ "$WEB" = 1 ] && start_web

cat <<EOF

================ PayTrail dev (localnet) ================
 Web        http://localhost:$WEB_PORT
 API        $API_URL   (perfil dev, banco $DEV_DB)
 RPC        $RPC_URL   (ledger $LEDGER)
 Mint USDC  $SOLANA_USDC_MINT   (teste, 6 casas; SOLANA_CLUSTER=custom)

 Login demo: ana@demo.paytrail / carlos@demo.paytrail (senha: SEED_PASSWORD, de $SEED_SOURCE)
 Carteiras ($KEYS):
   ana       $ANA_WALLET   (solanaWallet da Ana no seed)
   client    $CLIENT_WALLET
   exchange  $EXCHANGE_WALLET

 Pagar uma fatura (outro terminal; WSL, na raiz do repo):
   . scripts/wsl-env.sh && cd tools/e2e
   npx tsx ../demo/pay.ts INV-XXXX --from $KEYS/client.json                  # link (reference)
   npx tsx ../demo/pay.ts INV-XXXX --from $KEYS/exchange.json --no-reference # exchange
   npx tsx ../demo/pay.ts INV-XXXX --from $KEYS/client.json --amount 400     # parcial
 Financiar uma carteira:   npx tsx ../demo/fund.ts <endereço> 1000 --sol 1
 Nova carteira:            npx tsx ../demo/keygen.ts <nome>

 Explorer: https://explorer.solana.com/?cluster=custom&customUrl=http%3A%2F%2F127.0.0.1%3A$RPC_PORT
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
