package service

import "mmth-analyzer/internal/scraper"

// ScrapeServiceInterface 抓取服务接口（用于 mock 测试）
type ScrapeServiceInterface interface {
	GetTaskManager() *ScrapeTaskManager
	GetServers() []scraper.ServerConfig
	ScrapeAll() error
	ScrapeAccount(url, account, server string) (*scraper.AccountDiamondData, error)
}

// ETLServiceInterface ETL 服务接口（用于 mock 测试）
type ETLServiceInterface interface {
	GetTaskManager() *ETLTaskManager
	ProcessAllServers(servers []scraper.ServerConfig) error
	CombineAllStats() (map[string]interface{}, error)
}
