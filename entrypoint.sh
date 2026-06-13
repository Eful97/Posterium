#!/bin/sh
# Fix permissions on /data volume if mounted
if [ -d /data ]; then
  chown -R nextjs:nodejs /data 2>/dev/null || true
fi
exec su -s /bin/sh nextjs -c "exec node server.js"
