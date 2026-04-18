package config

import (
	"encoding/json"
	"flag"
	"fmt"
	"os"
	"time"

	"mmth-analyzer/internal/scraper"
)

// AppConfig 应用配置
type AppConfig struct {
	Port           string                 `json:"port"`
	DataDir        string                 `json:"data_dir"`
	ScrapeInterval string                 `json:"scrape_interval"`
	MmthServers    []scraper.ServerConfig `json:"mmth_servers,omitempty"`
	EtlBinaryPath  string                 `json:"etl_binary_path"`
	MmthLogsDir    string                 `json:"mmth_logs_dir"`
	EtlOutputDir   string                 `json:"etl_output_dir"`
}

// Config 运行时配置
type Config struct {
	Port           string
	DataDir        string
	ScrapeInterval time.Duration
	ScrapeCfg      *scraper.ScrapeConfig
	EtlBinaryPath  string
	MmthLogsDir    string
	EtlOutputDir   string
}

// defaultConfig 默认配置（本地测试用）
func defaultConfig() *Config {
	return &Config{
		Port:           "5391",
		DataDir:        "./data",
		ScrapeInterval: 6 * time.Hour,
		EtlBinaryPath:  "./mmth-etl/mmth_etl.exe",
		MmthLogsDir:    "./data/logs",
		EtlOutputDir:   "./data/etl",
	}
}

// LoadConfig 加载配置
// 优先级：命令行参数 > config/app.json > 默认配置
func LoadConfig() *Config {
	// 解析命令行参数
	configPath := flag.String("config", "", "配置文件路径（可选，默认使用 config/app.json）")
	flag.Parse()

	// 默认使用本地测试配置
	cfg := defaultConfig()

	// 确定配置文件路径
	path := *configPath
	if path == "" {
		// 尝试加载默认配置文件
		if _, err := os.Stat("config/app.json"); err == nil {
			path = "config/app.json"
		}
	}

	// 如果找到配置文件，从文件加载
	if path != "" {
		appCfg, err := LoadAppConfig(path)
		if err != nil {
			fmt.Printf("Warning: Failed to load config from %s: %v\n", path, err)
			fmt.Println("Falling back to default config")
		} else {
			cfg = appCfg.ToRuntimeConfig()
			fmt.Printf("Loaded config from: %s\n", path)
		}
	}

	return cfg
}

// LoadAppConfig 从 JSON 文件加载完整应用配置
func LoadAppConfig(path string) (*AppConfig, error) {
	data, err := os.ReadFile(path)
	if err != nil {
		return nil, err
	}

	var cfg AppConfig
	err = json.Unmarshal(data, &cfg)
	if err != nil {
		return nil, err
	}

	return &cfg, nil
}

// ToRuntimeConfig 转换为运行时配置
func (ac *AppConfig) ToRuntimeConfig() *Config {
	cfg := &Config{
		DataDir:        ac.DataDir,
		EtlBinaryPath:  ac.EtlBinaryPath,
		MmthLogsDir:    ac.MmthLogsDir,
		EtlOutputDir:   ac.EtlOutputDir,
		ScrapeCfg: &scraper.ScrapeConfig{
			Servers: ac.MmthServers,
		},
	}

	// 设置端口
	if ac.Port != "" {
		cfg.Port = ac.Port
	} else {
		cfg.Port = "5391"
	}

	// 解析时间间隔
	if ac.ScrapeInterval != "" {
		duration, err := time.ParseDuration(ac.ScrapeInterval)
		if err == nil {
			cfg.ScrapeInterval = duration
		} else {
			cfg.ScrapeInterval = 6 * time.Hour
		}
	} else {
		cfg.ScrapeInterval = 6 * time.Hour
	}

	return cfg
}

// SaveExampleConfig 保存示例配置到文件
func SaveExampleConfig(path string) error {
	example := &AppConfig{
		Port:           "5391",
		DataDir:        "./data",
		ScrapeInterval: "6h",
		EtlBinaryPath:  "./mmth-etl/mmth_etl.exe",
		MmthLogsDir:    "./data/logs",
		EtlOutputDir:   "./data/etl",
		MmthServers: []scraper.ServerConfig{
			{
				Name:     "server1",
				BaseURL:  "http://localhost:5390",
				Accounts: []string{"account1", "account2"},
			},
		},
	}

	data, err := json.MarshalIndent(example, "", "  ")
	if err != nil {
		return err
	}

	return os.WriteFile(path, data, 0644)
}
