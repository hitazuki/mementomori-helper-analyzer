package service

import (
	"fmt"
	"sync"

	"mmth-analyzer/internal/scraper"
)

// ScrapeService 抓取服务
type ScrapeService struct {
	dataDir     string
	servers     []scraper.ServerConfig
	mutex       *sync.Mutex
	taskManager *ScrapeTaskManager
}

// NewScrapeService 创建抓取服务
func NewScrapeService(dataDir string, servers []scraper.ServerConfig, mutex *sync.Mutex) *ScrapeService {
	return &ScrapeService{
		dataDir:     dataDir,
		servers:     servers,
		mutex:       mutex,
		taskManager: NewScrapeTaskManager(),
	}
}

// GetTaskManager 获取任务管理器
func (s *ScrapeService) GetTaskManager() *ScrapeTaskManager {
	return s.taskManager
}

// GetServers 获取服务器配置
func (s *ScrapeService) GetServers() []scraper.ServerConfig {
	return s.servers
}

// ScrapeAll 抓取所有账号
// 包含并发控制，如果任务已在运行则返回 ErrTaskAlreadyRunning
// 处理结果通过 TaskManager 状态追踪，前端轮询获取
func (s *ScrapeService) ScrapeAll() error {
	if len(s.servers) == 0 {
		return nil
	}

	// 原子性检查并开始任务
	if err := s.taskManager.TryStart(len(s.servers)); err != nil {
		return err
	}

	fmt.Printf("开始抓取 %d 个服务器\n", len(s.servers))

	err := scraper.ScrapeAllServers(s.servers, s.dataDir)

	if err != nil {
		fmt.Printf("抓取失败: %v\n", err)
		s.taskManager.Fail(err)
		return err
	}

	fmt.Printf("抓取完成: %d 个服务器\n", len(s.servers))
	s.taskManager.Complete()

	return nil
}

// ScrapeAccount 抓取单个账号
func (s *ScrapeService) ScrapeAccount(url, account, server string) (*scraper.AccountDiamondData, error) {
	return scraper.ScrapeAccount(url, account, server)
}
