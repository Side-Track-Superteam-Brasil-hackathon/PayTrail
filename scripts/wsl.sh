#!/usr/bin/env bash
# Roda um comando no WSL com o toolchain do projeto.
# Uso (do Windows): wsl -d Ubuntu-24.04 -- bash /mnt/c/dev/paytrail/scripts/wsl.sh <dir-relativo> <comando...>
# Ex.: wsl -d Ubuntu-24.04 -- bash /mnt/c/dev/paytrail/scripts/wsl.sh apps/api mvn -B -q test
ROOT="$(cd "$(dirname "$0")/.." && pwd)"
. "$ROOT/scripts/wsl-env.sh"
cd "$ROOT/$1" || exit 1
shift
"$@"
