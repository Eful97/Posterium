#!/bin/sh
set -e

DATA_DIR="${POSTERIUM_DATA_DIR:-/data}"

# If POSTERIUM_DATA_DIR is /data or default, ensure it's writable by nextjs
if [ -d "$DATA_DIR" ]; then
  # Try chown first (works on local dirs, may silently fail on FUSE mounts)
  chown -R nextjs:nodejs "$DATA_DIR" 2>/dev/null || true
  # Verify write access as nextjs user
  if ! su -s /bin/sh nextjs -c "test -w '$DATA_DIR'" 2>/dev/null; then
    echo "[entrypoint] WARNING: $DATA_DIR not writable by nextjs. Attempting fix..."
    # Last resort: make world-writable (needed for S3FS/HF Storage Bucket)
    chmod 777 "$DATA_DIR" 2>/dev/null || true
    if ! su -s /bin/sh nextjs -c "test -w '$DATA_DIR'" 2>/dev/null; then
      echo "[entrypoint] ERROR: $DATA_DIR still not writable by nextjs. Data will NOT persist!"
    fi
  fi
else
  echo "[entrypoint] Creating $DATA_DIR"
  mkdir -p "$DATA_DIR"
  chown -R nextjs:nodejs "$DATA_DIR"
fi

echo "[entrypoint] Data directory: $DATA_DIR (writable: $(su -s /bin/sh nextjs -c "test -w '$DATA_DIR' && echo yes || echo no"))"

exec su -s /bin/sh nextjs -c "exec node server.js"
