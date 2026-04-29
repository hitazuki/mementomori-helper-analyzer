package config

import (
	"encoding/json"
	"flag"
	"fmt"
	"os"

	"mmth-analyzer/internal/scraper"
)

// AppConfig is the JSON file shape.
type AppConfig struct {
	Port          string                 `json:"port"`
	DataDir       string                 `json:"data_dir"`
	CronScrape    string                 `json:"cron_scrape,omitempty"`
	CronETL       string                 `json:"cron_etl,omitempty"`
	MmthServers   []scraper.ServerConfig `json:"mmth_servers,omitempty"`
	EtlBinaryPath string                 `json:"etl_binary_path"`
	EtlOutputDir  string                 `json:"etl_output_dir"`
	cronScrapeSet bool
	cronETLSet    bool
}

// Config is the runtime configuration.
type Config struct {
	Port          string
	DataDir       string
	ConfigPath    string
	CronScrape    string
	CronETL       string
	ScrapeCfg     *scraper.ScrapeConfig
	EtlBinaryPath string
	EtlOutputDir  string
}

func defaultConfig() *Config {
	return &Config{
		Port:          "5391",
		DataDir:       "./data",
		CronScrape:    "0 0 2,14 * * *",
		CronETL:       "0 0 1 * * *",
		EtlBinaryPath: "./mmth-etl/mmth_etl.exe",
		EtlOutputDir:  "./data/etl",
	}
}

// LoadConfig loads configuration from -config, config/app.json, or defaults.
func LoadConfig() *Config {
	configPath := flag.String("config", "", "config file path")
	flag.Parse()

	cfg := defaultConfig()

	path := *configPath
	if path == "" {
		if _, err := os.Stat("config/app.json"); err == nil {
			path = "config/app.json"
		}
	}

	if path != "" {
		appCfg, err := LoadAppConfig(path)
		if err != nil {
			fmt.Printf("Warning: Failed to load config from %s: %v\n", path, err)
			fmt.Println("Falling back to default config")
		} else {
			cfg = appCfg.ToRuntimeConfig()
			cfg.ConfigPath = path
			fmt.Printf("Loaded config from: %s\n", path)
		}
	}

	return cfg
}

// LoadAppConfig loads the application config from a JSON file.
func LoadAppConfig(path string) (*AppConfig, error) {
	data, err := os.ReadFile(path)
	if err != nil {
		return nil, err
	}

	var cfg AppConfig
	if err := json.Unmarshal(data, &cfg); err != nil {
		return nil, err
	}
	var raw map[string]json.RawMessage
	if err := json.Unmarshal(data, &raw); err != nil {
		return nil, err
	}
	_, cfg.cronScrapeSet = raw["cron_scrape"]
	_, cfg.cronETLSet = raw["cron_etl"]

	return &cfg, nil
}

// SaveScheduleConfig updates only the persisted schedule fields.
func SaveScheduleConfig(path, cronScrape, cronETL string) error {
	data, err := os.ReadFile(path)
	if err != nil {
		return err
	}

	var raw map[string]json.RawMessage
	if err := json.Unmarshal(data, &raw); err != nil {
		return err
	}

	scrapeData, err := json.Marshal(cronScrape)
	if err != nil {
		return err
	}
	etlData, err := json.Marshal(cronETL)
	if err != nil {
		return err
	}

	raw["cron_scrape"] = scrapeData
	raw["cron_etl"] = etlData

	out, err := json.MarshalIndent(raw, "", "  ")
	if err != nil {
		return err
	}
	out = append(out, '\n')

	return os.WriteFile(path, out, 0644)
}

// ToRuntimeConfig converts file config to runtime config with defaults.
func (ac *AppConfig) ToRuntimeConfig() *Config {
	defaults := defaultConfig()

	cfg := &Config{
		Port:          defaults.Port,
		DataDir:       defaults.DataDir,
		EtlBinaryPath: defaults.EtlBinaryPath,
		EtlOutputDir:  defaults.EtlOutputDir,
		CronScrape:    defaults.CronScrape,
		CronETL:       defaults.CronETL,
		ScrapeCfg: &scraper.ScrapeConfig{
			Servers: ac.MmthServers,
		},
	}

	if ac.Port != "" {
		cfg.Port = ac.Port
	}
	if ac.DataDir != "" {
		cfg.DataDir = ac.DataDir
	}
	if ac.EtlBinaryPath != "" {
		cfg.EtlBinaryPath = ac.EtlBinaryPath
	}
	if ac.EtlOutputDir != "" {
		cfg.EtlOutputDir = ac.EtlOutputDir
	}
	if ac.cronScrapeSet {
		cfg.CronScrape = ac.CronScrape
	}
	if ac.cronETLSet {
		cfg.CronETL = ac.CronETL
	}

	return cfg
}

// SaveExampleConfig writes an example config file.
func SaveExampleConfig(path string) error {
	example := &AppConfig{
		Port:          "5391",
		DataDir:       "./data",
		CronScrape:    "0 0 2,14 * * *",
		CronETL:       "0 0 1 * * *",
		EtlBinaryPath: "./mmth-etl/mmth_etl.exe",
		EtlOutputDir:  "./data/etl",
		MmthServers: []scraper.ServerConfig{
			{
				Name:     "server1",
				BaseURL:  "http://localhost:5390",
				Accounts: []string{"account1", "account2"},
				LogPath:  "./data/logs/server1.log",
			},
		},
	}

	data, err := json.MarshalIndent(example, "", "  ")
	if err != nil {
		return err
	}

	return os.WriteFile(path, data, 0644)
}
