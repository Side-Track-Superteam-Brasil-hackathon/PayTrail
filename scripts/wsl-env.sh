#!/usr/bin/env bash
# Coloca o toolchain no PATH. Uso: . scripts/wsl-env.sh
ENV_PREFIX="$HOME/micromamba/envs/paytrail"
export PATH="$ENV_PREFIX/bin:$HOME/.local/share/solana/install/active_release/bin:$HOME/.local/bin:$PATH"
export JAVA_HOME="$ENV_PREFIX/lib/jvm"
[ -d "$JAVA_HOME" ] || export JAVA_HOME="$ENV_PREFIX"
export PGDATA="$HOME/.paytrail/pgdata"
