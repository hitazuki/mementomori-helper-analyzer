# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

mmth-analyzer is a web application for displaying diamond statistics and scraping diamond data from the MementoMori Helper (mmth) web service. It provides a web UI with charts and a backend API built with Gin.

## Architecture Overview

```
mmth-analyzer/
├── main.go                    # Entry point, Gin server setup, scheduled tasks
├── config.go                  # Configuration loading
├── restart.ps1                # Service restart script
├── handlers/
│   └── handlers.go            # HTTP API handlers
├── scraper/
│   └── scraper.go             # chromedp-based web scraping
├── static/
│   ├── index.html             # Frontend (Alpine.js + ECharts)
│   └── js/app.js              # Frontend logic
├── data/                      # Data storage directory
└── config/                    # Configuration directory
    ├── app.json               # App config (user editable)
    ├── app.example.json       # App config example
    └── test_local.json        # Local test config
```

## Development Commands

### Building
```bash
cd ~/projects/mmth-analyzer
go build -o mmth-analyzer .
```

### Running
```bash
# With default config (uses config/app.json if exists)
./mmth-analyzer

# With custom config
./mmth-analyzer -config ./config/test_local.json

# Access at http://localhost:5391 (or configured port)
```

### Restart Service (PowerShell)
```bash
./restart.ps1           # Build and restart
./restart.ps1 -NoBuild  # Restart without rebuild
```

## Key Files

- **main.go**: Entry point, initializes Gin server, CORS config, routes, and starts scheduled scrape task
- **config.go**: Configuration struct and loader (Port, DataDir, ScrapeInterval, ScrapeCfg)
- **handlers/handlers.go**: API handlers for stats and scrape endpoints
- **scraper/scraper.go**: chromedp-based scraper for mmth character page

## API Endpoints

| Endpoint | Method | Description |
|----------|--------|-------------|
| `/api/stats` | GET | Returns diamond_stats.json content |
| `/api/mmth-diamonds/all` | GET | Returns latest scraped mmth diamond data |
| `/api/mmth-diamonds/history` | GET | Returns all accounts history data |
| `/api/mmth-diamonds/history/:server/:account` | GET | Returns single account history |
| `/api/scrape/all` | POST | Manually trigger scrape for all accounts |
| `/api/scrape/account` | POST | Scrape single account (URL, account, server in body) |

## Configuration

### Config File Location

**Priority (high to low):**
1. `-config` flag specified file
2. `config/app.json` (default config file)
3. Built-in defaults

### Quick Start

```bash
# Copy example config
cp config/app.example.json config/app.json

# Edit config/app.json with your settings
# Then run
./mmth-analyzer
```

### Config Format (`config/app.json`)

```json
{
  "port": "5391",
  "data_dir": "./data",
  "diamond_stats_path": "../diamond_tracker/data/diamond_stats.json",
  "scrape_interval": "6h",
  "mmth_servers": [
    {
      "name": "server1",
      "base_url": "http://mmth-server:5390",
      "accounts": ["account1", "account2"]
    }
  ]
}
```

**Fields:**
- `port`: Server port (default: 5391)
- `data_dir`: Data storage directory
- `diamond_stats_path`: Path to diamond_stats.json
- `scrape_interval`: Duration format like `1h`, `30m`, `6h`
- `mmth_servers`: Array of mmth server configurations

### Default Config

Without config file, uses:
- Port: 5391
- DataDir: ./data
- ScrapeInterval: 6 hours
- No mmth servers configured (scraping disabled)

## Frontend

- **Framework**: Alpine.js (CDN, no build required)
- **Charts**: ECharts
- **CSS**: Tailwind CSS (CDN)

## Dependencies

- `github.com/gin-gonic/gin` - HTTP framework
- `github.com/gin-contrib/cors` - CORS middleware
- `github.com/gin-contrib/static` - Static file serving
- `github.com/chromedp/chromedp` - Headless browser for scraping

## Data Flow

```
User Click → API Handler → Action → Response
                ↓
         /api/stats    → Read diamond_stats.json
         /api/scrape   → chromedp → mmth → parse → save JSON
```

## Scheduled Tasks

The application runs a background goroutine that:
1. Executes scrape on startup (if mmth_servers configured)
2. Repeats at configured interval

## Notes

- chromedp requires Chrome/Chromium installed on the system
- CORS is configured to allow all origins (`*`)
- Data is stored in `data/mmth_diamonds.json` and `data/history/*.json`
