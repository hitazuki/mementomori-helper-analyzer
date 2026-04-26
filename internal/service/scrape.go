package service

import (
	"errors"
	"mmth-analyzer/internal/scraper"
	"sync"
)

// ErrScrapeInProgress 抓取任务正在执行中
var ErrScrapeInProgress = errors.New("抓取任务正在执行中，请稍后重试")

// ScrapeService 抓取服务
type ScrapeService struct {
	dataDir string
	servers []scraper.ServerConfig
	mutex   *sync.Mutex
}

// NewScrapeService 创建抓取服务
func NewScrapeService(dataDir string, servers []scraper.ServerConfig, mutex *sync.Mutex) *ScrapeService {
	return &ScrapeService{
		dataDir: dataDir,
		servers: servers,
		mutex:   mutex,
	}
}

// ScrapeAll 抓取所有账号
func (s *ScrapeService) ScrapeAll() error {
	if len(s.servers) == 0 {
		return nil
	}

	if !s.mutex.TryLock() {
		return ErrScrapeInProgress
	}
	defer s.mutex.Unlock()

	return scraper.ScrapeAllServers(s.servers, s.dataDir)
}

// ScrapeAccount 抓取单个账号
func (s *ScrapeService) ScrapeAccount(url, account, server string) (*scraper.AccountDiamondData, error) {
	return scraper.ScrapeAccount(url, account, server)
}
