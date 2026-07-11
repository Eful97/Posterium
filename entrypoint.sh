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
  # Detect mount type
  if mount 2>/dev/null | grep -q " on $DATA_DIR "; then
    echo "[entrypoint] Mount info: $(mount 2>/dev/null | grep " on $DATA_DIR ")"
  elif command -v stat >/dev/null 2>&1; then
    FS_TYPE=$(stat -f -c '%T' "$DATA_DIR" 2>/dev/null || echo "unknown")
    echo "[entrypoint] Filesystem type: $FS_TYPE"
  fi

  # Check ownership and permissions
  STAT_INFO=$(ls -ld "$DATA_DIR" 2>/dev/null || echo "cannot stat")
  echo "[entrypoint] Dir permissions: $STAT_INFO"

  # Try chown (may silently fail on FUSE/S3 mounts)
  chown -R nextjs:nodejs "$DATA_DIR" 2>/dev/null || true

  # Test write access as nextjs user
  WRITE_TEST=$(su -s /bin/sh nextjs -c "touch '$DATA_DIR/.write_test' && rm -f '$DATA_DIR/.write_test' && echo ok" 2>&1 || true)
  if [ "$WRITE_TEST" = "ok" ]; then
    echo "[entrypoint] Storage: WRITABLE by nextjs"
  else
    echo "[entrypoint] Storage: NOT WRITABLE by nextjs"
    echo "[entrypoint] Attempting chmod 777 as fallback..."
    chmod 777 "$DATA_DIR" 2>/dev/null || true
    WRITE_TEST2=$(su -s /bin/sh nextjs -c "touch '$DATA_DIR/.write_test' && rm -f '$DATA_DIR/.write_test' && echo ok" 2>&1 || true)
    if [ "$WRITE_TEST2" = "ok" ]; then
      echo "[entrypoint] Storage: WRITABLE after chmod 777"
    else
      echo "[entrypoint] Storage: STILL NOT WRITABLE"
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
  fi
else
  echo "[entrypoint] Creating $DATA_DIR"
  mkdir -p "$DATA_DIR"
  chown -R nextjs:nodejs "$DATA_DIR"
fi

echo "[entrypoint] ============================================"
exec su -s /bin/sh nextjs -c "exec node server.js"
