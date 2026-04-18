# Scripts

This folder contains utility scripts for managing the mmth-analyzer service.

## Available Scripts

### restart.sh (Bash/Linux/macOS/WSL)

Bash script to restart the mmth-analyzer service.

**Usage:**

```bash
# Build and restart with default config
./restart.sh

# Use specific config file
./restart.sh -c config/test_local.json

# Restart without rebuilding
./restart.sh -n

# Stop service only (no restart)
./restart.sh -s

# Custom wait timeout
./restart.sh -w 5

# Combine options
./restart.sh -c config/test_local.json -n
```

**Parameters:**

| Parameter | Type | Default | Description |
|-----------|------|---------|-------------|
| `-c, --config <path>` | string | "" | Config file path (relative to project root) |
| `-n, --no-build` | switch | false | Skip build step |
| `-s, --stop` | switch | false | Stop service only (no start) |
| `-w, --wait <seconds>` | int | 10 | Max seconds to wait for service stop |

### restart.ps1 (Windows PowerShell)

PowerShell script to restart the mmth-analyzer service.

**Features:**
- Detects current service status
- Stops running service (with port detection)
- Builds the project (optional)
- Starts the service
- Waits for successful startup

**Usage:**

```powershell
# Build and restart with default config (config/app.json)
./restart.ps1

# Use specific config file
./restart.ps1 -Config "../config/test_local.json"

# Restart without rebuilding
./restart.ps1 -NoBuild

# Stop service only (no restart)
./restart.ps1 -Stop

# Custom wait timeout
./restart.ps1 -MaxWait 5

# Combine options
./restart.ps1 -Config "../config/test_local.json" -NoBuild
```

**Parameters:**

| Parameter | Type | Default | Description |
|-----------|------|---------|-------------|
| `-Config` | string | "" | Config file path (relative to scripts/) |
| `-NoBuild` | switch | false | Skip build step |
| `-Stop` | switch | false | Stop service only (no start) |
| `-MaxWait` | int | 10 | Max seconds to wait for service stop |

**How it works:**

1. Reads port from specified config (or `config/app.json`, defaults to 5391)
2. Checks if service is running
3. Stops service by process name and port
4. Waits for clean shutdown
5. If `-Stop`/`-s` flag: exit here
6. Builds the project (unless `-NoBuild`/`-n`)
7. Starts the service with `-config` argument if specified
8. Verifies startup success
