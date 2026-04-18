package scheduler

import (
	"sync"
	"time"

	"mmth-analyzer/internal/scraper"
)

// Scheduler 定时任务调度器
type Scheduler struct {
	interval time.Duration
	servers  []scraper.ServerConfig
	dataDir  string
	mutex    *sync.Mutex
	ticker   *time.Ticker
	stop     chan bool
}

// NewScheduler 创建新的调度器
func NewScheduler(interval time.Duration, servers []scraper.ServerConfig, dataDir string, mutex *sync.Mutex) *Scheduler {
	return &Scheduler{
		interval: interval,
		servers:  servers,
		dataDir:  dataDir,
		mutex:    mutex,
		stop:     make(chan bool),
	}
}

// Start 启动定时任务
func (s *Scheduler) Start() {
	s.ticker = time.NewTicker(s.interval)

	// 启动时执行一次
	go s.performScrape()

	// 定时执行
	go func() {
		for {
			select {
			case <-s.ticker.C:
				s.performScrape()
			case <-s.stop:
				return
			}
		}
	}()
}

// Stop 停止定时任务
func (s *Scheduler) Stop() {
	if s.ticker != nil {
		s.ticker.Stop()
	}
	close(s.stop)
}

// performScrape 执行抓取任务
func (s *Scheduler) performScrape() {
	if len(s.servers) == 0 {
		return
	}

	// 获取锁，防止与API并发执行
	if !s.mutex.TryLock() {
		// 有正在执行的抓取，跳过本次定时任务
		return
	}
	defer s.mutex.Unlock()

	_ = scraper.ScrapeAllServers(s.servers, s.dataDir)
}
