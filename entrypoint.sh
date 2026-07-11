#!/bin/sh
set -e

DATA_DIR="${POSTERIUM_DATA_DIR:-/data}"
HF_STORAGE="${HF_STORAGE_DIR:-}"

echo "[entrypoint] ============================================"
echo "[entrypoint] Posterium storage diagnostics"
echo "[entrypoint] ============================================"
echo "[entrypoint] POSTERIUM_DATA_DIR = $DATA_DIR"
echo "[entrypoint] HF_STORAGE_DIR    = ${HF_STORAGE_DIR:-<not set>}"
echo "[entrypoint] CWD               = $(pwd)"
echo "[entrypoint] User              = $(id)"

if [ -n "$HF_STORAGE" ] && [ "$HF_STORAGE" != "$DATA_DIR" ]; then
  echo "[entrypoint] WARNING: HF_STORAGE_DIR ($HF_STORAGE) ≠ POSTERIUM_DATA_DIR ($DATA_DIR)"
fi

if [ -d "$DATA_DIR" ]; then
  if mount 2>/dev/null | grep -q " on $DATA_DIR "; then
    echo "[entrypoint] Mount info: $(mount 2>/dev/null | grep " on $DATA_DIR ")"
  elif command -v stat >/dev/null 2>&1; then
    FS_TYPE=$(stat -f -c '%T' "$DATA_DIR" 2>/dev/null || echo "unknown")
    echo "[entrypoint] Filesystem type: $FS_TYPE"
  fi

  STAT_INFO=$(ls -ld "$DATA_DIR" 2>/dev/null || echo "cannot stat")
  echo "[entrypoint] Dir permissions: $STAT_INFO"
else
  echo "[entrypoint] Creating $DATA_DIR"
  mkdir -p "$DATA_DIR"
fi

# Test write as root (the actual process user)
WRITE_TEST=$(touch "$DATA_DIR/.write_test" && rm -f "$DATA_DIR/.write_test" && echo ok 2>&1 || true)
if [ "$WRITE_TEST" = "ok" ]; then
  echo "[entrypoint] Storage: WRITABLE (root)"
else
  echo "[entrypoint] Storage: NOT WRITABLE even as root"
  echo "[entrypoint]"
  echo "[entrypoint] ========================================================"
  echo "[entrypoint] DATA WILL NOT PERSIST ACROSS REBUILDS!"
  echo "[entrypoint]"
  echo "[entrypoint] To fix:"
  echo "[entrypoint]   1. Create bucket: https://huggingface.co/new-storage"
  echo "[entrypoint]   2. Link to Space: Settings → Storage → Link bucket"
  echo "[entrypoint]   3. Factory rebuild"
  echo "[entrypoint] ========================================================"
fi

echo "[entrypoint] ============================================"
exec env POSTERIUM_DATA_DIR="$DATA_DIR" node server.js
