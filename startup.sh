#!/bin/sh
# Codec War: start the dev server on 127.0.0.1 (port 9597 unless
# CODECWAR_PORT says otherwise), installing dependencies first if they are
# missing. Waits until the page answers.
#
#   ./startup.sh          start, or report it is already up
#   ./startup.sh stop     stop the server this script started
set -eu
ROOT=$(CDPATH= cd -- "$(dirname "$0")" && pwd)
cd "$ROOT"
PORT=${CODECWAR_PORT:-9597}
URL="http://127.0.0.1:$PORT/"
PIDFILE="$ROOT/.dev-server.pid"
LOG=${CODECWAR_LOG:-/tmp/app-startup.log}

if [ "${1:-}" = "stop" ]; then
  if [ -f "$PIDFILE" ]; then
    PID=$(cat "$PIDFILE")
    if kill "$PID" 2>/dev/null; then
      echo "Stopped Codec War (pid $PID)."
    else
      echo "Codec War (pid $PID) was not running."
    fi
    rm -f "$PIDFILE"
  else
    echo "No Codec War server started by this script."
  fi
  exit 0
fi

if curl -sf -o /dev/null --max-time 2 "$URL"; then
  echo "Codec War is already up at $URL"
  exit 0
fi

if [ ! -x node_modules/.bin/vite ]; then
  echo "Installing dependencies (npm ci)..."
  npm ci
fi

node_modules/.bin/vite dev --host 127.0.0.1 --port "$PORT" --strictPort >>"$LOG" 2>&1 &
echo $! >"$PIDFILE"

i=0
while [ "$i" -lt 60 ]; do
  if curl -sf -o /dev/null --max-time 2 "$URL"; then
    echo "Codec War is up at $URL (pid $(cat "$PIDFILE"), log $LOG)"
    exit 0
  fi
  sleep 0.5
  i=$((i + 1))
done
echo "Codec War did not answer at $URL within 30 seconds. See $LOG" >&2
exit 1
