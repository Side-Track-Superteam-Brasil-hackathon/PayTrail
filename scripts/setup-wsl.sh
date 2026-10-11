#!/usr/bin/env bash
# Instala o toolchain do PayTrail no WSL, em espaço de usuário (sem sudo):
# micromamba (conda-forge) → Java 21, Maven, Node 20, PostgreSQL 16; Agave (Solana CLI + test validator).
set -euo pipefail

BIN="$HOME/.local/bin"
export MAMBA_ROOT_PREFIX="$HOME/micromamba"
mkdir -p "$BIN"

if [ ! -x "$BIN/micromamba" ]; then
  echo ">> micromamba"
  curl -Ls https://micro.mamba.pm/api/micromamba/linux-64/latest | tar -xj -C "$HOME/.local" bin/micromamba
fi

if [ ! -d "$MAMBA_ROOT_PREFIX/envs/paytrail" ]; then
  echo ">> env paytrail (openjdk 21, maven, nodejs 20, postgresql 16)"
  "$BIN/micromamba" create -y -q -n paytrail -c conda-forge openjdk=21 maven nodejs=20 postgresql=16
fi

if [ ! -x "$HOME/.local/share/solana/install/active_release/bin/solana-test-validator" ]; then
  echo ">> agave (solana cli + test validator)"
  sh -c "$(curl -sSfL https://release.anza.xyz/stable/install)"
fi

echo ">> pronto"
. "$(dirname "$0")/wsl-env.sh"
java -version 2>&1 | head -1
mvn -v | head -1
node -v
psql --version
solana --version
