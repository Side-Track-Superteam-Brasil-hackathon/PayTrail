#!/usr/bin/env bash
# E2E de ponta a ponta no WSL: Postgres + solana-test-validator + mint de teste + API + watcher,
# depois roda tools/e2e (cenários A1-A9 de specs/05-aceite.md). Sempre derruba o que subiu.
#
# Uso:  bash scripts/e2e.sh [opções] [-- args do runner, ex.: --only A1,A2 --timeout 90]
#   --watcher-smoke   só validador + mint + tools/e2e/src/watcher-smoke.ts (não precisa da API)
#   --skip-build      reusa apps/api/target/*.jar (equivale a SKIP_API_BUILD=1)
#   --keep            não derruba a stack no fim (Ctrl+C derruba)
# Env: API_PORT (8080), RPC_PORT (8899), FAUCET_PORT (9900), E2E_DB (paytrail_e2e), POLL_MS (2000)
# Do Windows: wsl -d Ubuntu-24.04 -- bash /mnt/c/dev/<repo>/scripts/e2e.sh
set -uo pipefail
. "$(dirname "$0")/stack.sh"

MODE=full
KEEP=0
RUNNER_ARGS=()
while [ $# -gt 0 ]; do
  case "$1" in
    --watcher-smoke) MODE=smoke ;;
    --skip-build) export SKIP_API_BUILD=1 ;;
    --keep) KEEP=1 ;;
    --) shift; RUNNER_ARGS=("$@"); break ;;
    *) RUNNER_ARGS+=("$1") ;;
  esac
  shift
done

E2E_DB="${E2E_DB:-paytrail_e2e}"
LEDGER="$PT_HOME/ledger"

cleanup() {
  local code=$?
  trap - EXIT INT TERM
  stop_all
  echo
  log "logs: $LOG_DIR/{validator,api,api-build,watcher,ensure-mint}.log"
  exit "$code"
}
trap cleanup EXIT
trap 'exit 130' INT TERM

npm_ensure "$ROOT/tools/e2e"
npm_ensure "$ROOT/apps/watcher"

start_validator "$LEDGER" 1
SOLANA_USDC_MINT="$(ensure_mint)"
export SOLANA_USDC_MINT
log "mint de teste (USDC, 6 casas): $SOLANA_USDC_MINT"

if [ "$MODE" = smoke ]; then
  (cd "$ROOT/tools/e2e" && node_modules/.bin/tsx src/watcher-smoke.ts --rpc "$RPC_URL" "${RUNNER_ARGS[@]}")
  exit $?
fi

ensure_postgres
reset_db "$E2E_DB"
build_api

JWT_SECRET="$(random_hex 32)"
INTERNAL_SECRET="$(random_hex 24)"
export JWT_SECRET INTERNAL_SECRET

start_api "$E2E_DB" ""
start_watcher

set +e
(cd "$ROOT/tools/e2e" &&
  API_URL="$API_URL" SOLANA_RPC_URL="$RPC_URL" INTERNAL_SECRET="$INTERNAL_SECRET" SOLANA_USDC_MINT="$SOLANA_USDC_MINT" \
    node_modules/.bin/tsx src/run.ts "${RUNNER_ARGS[@]}")
RESULT=$?

if [ "$KEEP" = 1 ]; then
  log "--keep: stack no ar (API $API_URL, RPC $RPC_URL). Ctrl+C para derrubar."
  while true; do sleep 3600; done
fi
exit "$RESULT"
