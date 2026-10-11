#!/usr/bin/env bash
# Instala as dependências Node de todos os pacotes (web, watcher, tools/e2e).
set -euo pipefail
ROOT="$(cd "$(dirname "$0")/.." && pwd)"
. "$ROOT/scripts/wsl-env.sh"
for dir in apps/web apps/watcher tools/e2e; do
  echo ">> npm ci $dir"
  (cd "$ROOT/$dir" && npm ci --no-audit --no-fund --loglevel=error)
done
