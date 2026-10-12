#!/usr/bin/env bash

PROGRESS_RESET=$'\033[0m'
PROGRESS_GREEN=$'\033[32m'
PROGRESS_YELLOW=$'\033[33m'
PROGRESS_RED=$'\033[31m'
PROGRESS_CYAN=$'\033[36m'
PROGRESS_FRAMES='|/-\\'

progress_bar() {
  local percent="$1" width=24 filled empty
  filled=$((percent * width / 100))
  empty=$((width - filled))
  printf '['
  printf '%*s' "$filled" '' | tr ' ' '#'
  printf '%*s' "$empty" '' | tr ' ' '-'
  printf ']'
}

progress_line() {
  local label="$1" percent="$2" state="$3" frame="${4:-0}"
  local color="$PROGRESS_YELLOW" marker="${PROGRESS_FRAMES:frame:1}"
  if [ "$state" = done ]; then
    color="$PROGRESS_GREEN"
    marker='OK'
  elif [ "$state" = error ]; then
    color="$PROGRESS_RED"
    marker='!!'
  fi
  printf '\033[2K\r%s%-12s%s ' "$color" "$label" "$PROGRESS_RESET"
  progress_bar "$percent"
  printf ' %3d%% %s\n' "$percent" "$marker"
}

progress_rewind() {
  if [ "${1:-0}" -gt 0 ]; then
    printf '\033[%sA' "$1"
  fi
  return 0
}

progress_title() {
  printf '%s%s%s\n' "$PROGRESS_CYAN" "$1" "$PROGRESS_RESET"
}