#!/usr/bin/env bash
# Funções compartilhadas por scripts/e2e.sh e scripts/dev.sh (WSL, sem Docker, sem sudo).
# Uso: . scripts/stack.sh   (define ROOT, LOG_DIR, portas e as funções start_*/stop_all)

ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
. "$ROOT/scripts/wsl-env.sh"

PT_HOME="${PAYTRAIL_HOME:-$HOME/.paytrail}"
LOG_DIR="$PT_HOME/logs"
mkdir -p "$LOG_DIR" "$PT_HOME/e2e"
chmod 700 "$PT_HOME/e2e" 2>/dev/null || true

API_PORT="${API_PORT:-8080}"
RPC_PORT="${RPC_PORT:-8899}"
FAUCET_PORT="${FAUCET_PORT:-9900}"
WEB_PORT="${WEB_PORT:-5173}"
RPC_URL="http://127.0.0.1:$RPC_PORT"
API_URL="http://127.0.0.1:$API_PORT/api"
API_JAR="$ROOT/apps/api/target/paytrail-api-0.1.0.jar"

STARTED_PIDS=()
STARTED_NAMES=()

log() { printf '\033[1;34m[stack]\033[0m %s\n' "$*"; }
die() { printf '\033[1;31m[stack] ERRO:\033[0m %s\n' "$*" >&2; exit 1; }

random_hex() { head -c "${1:-32}" /dev/urandom | od -An -tx1 | tr -d ' \n'; }

port_in_use() { ss -ltn 2>/dev/null | awk '{print $4}' | grep -Eq "[:.]$1\$"; }

# Inicia um processo em background numa sessão própria (para matar a árvore inteira depois).
# start_bg <nome> <arquivo-de-log> <cmd...>
start_bg() {
  local name="$1" logfile="$2"
  shift 2
  setsid "$@" >"$logfile" 2>&1 < /dev/null &
  local pid=$!
  STARTED_PIDS+=("$pid")
  STARTED_NAMES+=("$name")
  log "$name iniciado (pid $pid, log $logfile)"
}

stop_all() {
  local i pid
  for ((i = ${#STARTED_PIDS[@]} - 1; i >= 0; i--)); do
    pid="${STARTED_PIDS[$i]}"
    if kill -0 "$pid" 2>/dev/null; then
      kill -TERM -- "-$pid" 2>/dev/null || kill -TERM "$pid" 2>/dev/null
    fi
  done
  for _ in $(seq 1 20); do
    local alive=0
    for pid in "${STARTED_PIDS[@]}"; do kill -0 "$pid" 2>/dev/null && alive=1; done
    [ "$alive" = 0 ] && break
    sleep 0.5
  done
  for pid in "${STARTED_PIDS[@]}"; do kill -KILL -- "-$pid" 2>/dev/null || true; done
  [ ${#STARTED_PIDS[@]} -gt 0 ] && log "processos encerrados: ${STARTED_NAMES[*]}"
  STARTED_PIDS=()
  STARTED_NAMES=()
}

# wait_until <descrição> <timeout-s> <pid-ou-vazio> <logfile> <cmd...>: espera cmd ter sucesso.
wait_until() {
  local what="$1" timeout="$2" pid="$3" logfile="$4"
  shift 4
  local start=$SECONDS
  until "$@" >/dev/null 2>&1; do
    if [ -n "$pid" ] && ! kill -0 "$pid" 2>/dev/null; then
      echo "----- últimas linhas de $logfile -----" >&2
      tail -n 40 "$logfile" >&2 || true
      die "$what: processo morreu"
    fi
    if [ $((SECONDS - start)) -ge "$timeout" ]; then
      echo "----- últimas linhas de $logfile -----" >&2
      tail -n 40 "$logfile" >&2 || true
      die "$what: timeout de ${timeout}s"
    fi
    sleep 1
  done
  log "$what ok ($((SECONDS - start))s)"
}

last_pid() { echo "${STARTED_PIDS[${#STARTED_PIDS[@]} - 1]}"; }

# npm ci só quando node_modules está ausente ou mais velho que o lockfile.
npm_ensure() {
  local dir="$1"
  if [ ! -f "$dir/node_modules/.package-lock.json" ] || [ "$dir/package-lock.json" -nt "$dir/node_modules/.package-lock.json" ]; then
    log "npm ci em ${dir#"$ROOT"/}"
    (cd "$dir" && npm ci --no-audit --no-fund --loglevel=error) || die "npm ci falhou em $dir"
  fi
}

ensure_postgres() {
  bash "$ROOT/scripts/pg.sh" start >/dev/null || die "Postgres não subiu (scripts/pg.sh start)"
  log "postgres ok (localhost:5432)"
}

reset_db() {
  local db="$1"
  dropdb --if-exists --force -h localhost -U paytrail "$db" || die "dropdb $db falhou"
  createdb -h localhost -U paytrail "$db" || die "createdb $db falhou"
  log "banco $db recriado"
}

ensure_db() {
  local db="$1"
  psql -h localhost -U paytrail -d postgres -tAc "select 1 from pg_database where datname='$db'" | grep -q 1 \
    || createdb -h localhost -U paytrail "$db"
}

rpc_healthy() {
  curl -sf -m 2 -X POST -H 'Content-Type: application/json' \
    -d '{"jsonrpc":"2.0","id":1,"method":"getHealth"}' "$RPC_URL" | grep -q '"ok"'
}

# start_validator <ledger-dir> <reset: 1|0>
start_validator() {
  local ledger="$1" reset="$2"
  port_in_use "$RPC_PORT" && die "porta $RPC_PORT ocupada (outro solana-test-validator rodando?)"
  mkdir -p "$(dirname "$ledger")"
  local args=(--ledger "$ledger" --quiet --rpc-port "$RPC_PORT" --faucet-port "$FAUCET_PORT" --bind-address 127.0.0.1)
  [ "$reset" = 1 ] && args+=(--reset)
  start_bg validator "$LOG_DIR/validator.log" solana-test-validator "${args[@]}"
  wait_until "solana-test-validator em $RPC_URL" 90 "$(last_pid)" "$LOG_DIR/validator.log" rpc_healthy
}

# Imprime o endereço do mint de teste (cria se preciso).
ensure_mint() {
  (cd "$ROOT/tools/e2e" && node_modules/.bin/tsx src/ensure-mint.ts --rpc "$RPC_URL" 2>>"$LOG_DIR/ensure-mint.log") \
    || die "ensure-mint falhou (veja $LOG_DIR/ensure-mint.log)"
}

build_api() {
  if [ "${SKIP_API_BUILD:-0}" = 1 ] && [ -f "$API_JAR" ]; then
    log "SKIP_API_BUILD=1: usando $API_JAR"
    return
  fi
  log "build da API (mvn -DskipTests package)..."
  (cd "$ROOT/apps/api" && mvn -q -B -DskipTests package >"$LOG_DIR/api-build.log" 2>&1) \
    || { tail -n 40 "$LOG_DIR/api-build.log" >&2; die "build da API falhou (log $LOG_DIR/api-build.log)"; }
  [ -f "$API_JAR" ] || die "jar não encontrado: $API_JAR"
}

api_healthy() { curl -sf -m 2 "$API_URL/actuator/health" | grep -q '"UP"'; }

# start_api <db> <profile-ou-vazio>. Usa JWT_SECRET, INTERNAL_SECRET, SOLANA_USDC_MINT (e SEED_*) do ambiente.
start_api() {
  local db="$1" profile="$2"
  port_in_use "$API_PORT" && die "porta $API_PORT ocupada (outra API rodando?)"
  local args=(-jar "$API_JAR" "--server.port=$API_PORT")
  [ -n "$profile" ] && args+=("--spring.profiles.active=$profile")
  start_bg api "$LOG_DIR/api.log" env \
    DB_URL="jdbc:postgresql://localhost:5432/$db" DB_USER=paytrail DB_PASSWORD= \
    JWT_SECRET="$JWT_SECRET" INTERNAL_SECRET="$INTERNAL_SECRET" \
    SOLANA_USDC_MINT="$SOLANA_USDC_MINT" SOLANA_CLUSTER=custom \
    PUBLIC_WEB_URL="http://localhost:$WEB_PORT" \
    SEED_PASSWORD="${SEED_PASSWORD:-}" SEED_ANA_SOLANA_WALLET="${SEED_ANA_SOLANA_WALLET:-}" \
    java "${args[@]}"
  wait_until "API em $API_URL" 180 "$(last_pid)" "$LOG_DIR/api.log" api_healthy
}

start_watcher() {
  cd "$ROOT/apps/watcher" || die "apps/watcher não existe"
  start_bg watcher "$LOG_DIR/watcher.log" env \
    API_URL="$API_URL" INTERNAL_SECRET="$INTERNAL_SECRET" SOLANA_RPC_URL="$RPC_URL" \
    SOLANA_USDC_MINT="$SOLANA_USDC_MINT" POLL_MS="${POLL_MS:-2000}" \
    node_modules/.bin/tsx src/index.ts
  cd "$ROOT" || true
  sleep 2
  kill -0 "$(last_pid)" 2>/dev/null || { tail -n 20 "$LOG_DIR/watcher.log" >&2; die "watcher morreu ao iniciar"; }
}

web_healthy() { curl -sf -m 2 -o /dev/null "http://127.0.0.1:$WEB_PORT/"; }

start_web() {
  port_in_use "$WEB_PORT" && die "porta $WEB_PORT ocupada"
  cd "$ROOT/apps/web" || die "apps/web não existe"
  start_bg web "$LOG_DIR/web.log" env VITE_API_TARGET="http://127.0.0.1:$API_PORT" \
    node_modules/.bin/vite --host 127.0.0.1 --port "$WEB_PORT" --strictPort
  cd "$ROOT" || true
  wait_until "web em http://localhost:$WEB_PORT" 60 "$(last_pid)" "$LOG_DIR/web.log" web_healthy
}
