#!/usr/bin/env bash
# Restart mmth-analyzer service script

set -e

# Default values
CONFIG=""
NO_BUILD=false
MAX_WAIT=10
STOP_ONLY=false

# Parse arguments
while [[ $# -gt 0 ]]; do
  case $1 in
    -c|--config)
      CONFIG="$2"
      shift 2
      ;;
    -n|--no-build)
      NO_BUILD=true
      shift
      ;;
    -w|--wait)
      MAX_WAIT="$2"
      shift 2
      ;;
    -s|--stop)
      STOP_ONLY=true
      shift
      ;;
    -h|--help)
      echo "Usage: $0 [OPTIONS]"
      echo ""
      echo "Options:"
      echo "  -c, --config <path>   Config file path (e.g., 'config/test_local.json')"
      echo "  -n, --no-build        Skip build step"
      echo "  -w, --wait <seconds>  Max seconds to wait for stop (default: 10)"
      echo "  -s, --stop            Stop service only (no start)"
      echo "  -h, --help            Show this help"
      exit 0
      ;;
    *)
      echo "Unknown option: $1"
      exit 1
      ;;
  esac
done

# Project root directory (parent of scripts/)
PROJECT_ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "$PROJECT_ROOT"

# Get port from config
get_config_port() {
  local config_path="$1"
  local port="5391"

  if [ -n "$config_path" ] && [ -f "$config_path" ]; then
    if command -v jq &> /dev/null; then
      port=$(jq -r '.port // "5391"' "$config_path" 2>/dev/null || echo "5391")
    else
      # Fallback: grep for port (simple parsing)
      port=$(grep -o '"port"[[:space:]]*:[[:space:]]*"[^"]*"' "$config_path" 2>/dev/null | grep -o '"[0-9]*"' | tr -d '"' | head -1)
      [ -z "$port" ] && port="5391"
    fi
  elif [ -f "config/app.json" ]; then
    if command -v jq &> /dev/null; then
      port=$(jq -r '.port // "5391"' "config/app.json" 2>/dev/null || echo "5391")
    fi
  fi

  echo "$port"
}

# Determine config path for port reading
CONFIG_PATH=""
if [ -n "$CONFIG" ]; then
  CONFIG_PATH="$CONFIG"
fi

PORT=$(get_config_port "$CONFIG_PATH")

echo "=== mmth-analyzer Service Restart ==="
echo "Project: $PROJECT_ROOT"
if [ -n "$CONFIG" ]; then
  echo "Config: $CONFIG"
else
  echo "Config: config/app.json (default)"
fi
echo "Port: $PORT"

# Check if service is running
check_running() {
  local pid=$(lsof -ti:$PORT 2>/dev/null || netstat -tlnp 2>/dev/null | grep ":$PORT " | awk '{print $7}' | cut -d'/' -f1 | head -1)
  if [ -n "$pid" ] && kill -0 "$pid" 2>/dev/null; then
    return 0
  fi
  return 1
}

# Get status
get_status() {
  local pid=$(lsof -ti:$PORT 2>/dev/null)
  if [ -n "$pid" ]; then
    echo "Running (PID: $pid, Port: $PORT)"
  else
    echo "Stopped"
  fi
}

echo "Status: $(get_status)"

# Stop service
if check_running; then
  echo ""
  echo "Stopping service..."

  # Kill by port
  local pid=$(lsof -ti:$PORT 2>/dev/null)
  if [ -n "$pid" ]; then
    echo "  Killing process on port $PORT (PID: $pid)"
    kill -9 "$pid" 2>/dev/null || true
  fi

  # Also try by name
  pkill -9 -f "mmth-analyzer" 2>/dev/null || true

  # Wait for stop
  echo "Waiting for stop (max ${MAX_WAIT}s)..."
  local waited=0
  while check_running && [ $waited -lt $MAX_WAIT ]; do
    sleep 1
    ((waited++))
    echo "  Waiting... ($waited/$MAX_WAIT)"
  done

  if check_running; then
    echo "ERROR: Failed to stop service"
    exit 1
  fi
  echo "Service stopped"
else
  echo "Service not running, skip stop step"
fi

# If stop only mode, exit here
if [ "$STOP_ONLY" = true ]; then
  echo ""
  echo "Stop only mode (-s), exiting"
  exit 0
fi

# Build
if [ "$NO_BUILD" = false ]; then
  echo ""
  echo "Building..."
  go build -o mmth-analyzer ./cmd/server
  echo "Build success"
else
  echo ""
  echo "Skip build (-n)"
fi

# Start service
echo ""
echo "Starting service..."

if [ ! -f "./mmth-analyzer" ]; then
  echo "ERROR: Executable not found: ./mmth-analyzer"
  exit 1
fi

# Build arguments
ARGS=""
if [ -n "$CONFIG" ]; then
  ARGS="-config $CONFIG"
fi

# Start in background
if [ -n "$ARGS" ]; then
  ./mmth-analyzer $ARGS &
else
  ./mmth-analyzer &
fi

# Wait for start
sleep 2
max_startup_wait=10
startup_waited=0

while ! check_running && [ $startup_waited -lt $max_startup_wait ]; do
  sleep 1
  ((startup_waited++))
done

if check_running; then
  echo "Service started!"
  echo "Visit: http://localhost:$PORT"
  echo "Status: $(get_status)"
else
  echo "ERROR: Failed to start service"
  exit 1
fi
