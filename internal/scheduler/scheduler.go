package scheduler

import (
	"fmt"
	"sync"
	"time"

	"mmth-analyzer/internal/scraper"
)

// Scheduler 定时任务调度器
type Scheduler struct {
	interval  time.Duration
	servers   []scraper.ServerConfig
	dataDir   string
	mutex     *sync.Mutex
	ticker    *time.Ticker
	stop      chan bool
	skipScrape bool  // 跳过抓取（Chrome 未安装）
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
	// 检测 Chrome 是否可用
	if err := scraper.CheckChrome(); err != nil {
		fmt.Printf("⚠️  抓取功能已禁用: %v\n", err)
		fmt.Println("    如需使用抓取功能，请安装 Chrome/Chromium 浏览器")
		s.skipScrape = true
	}

	s.ticker = time.NewTicker(s.interval)

	// 启动时执行一次（如果 Chrome 可用）
	if !s.skipScrape {
		go s.performScrape()
	}

	// 定时执行
	go func() {
		for {
			select {
			case <-s.ticker.C:
				if !s.skipScrape {
					s.performScrape()
				}
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
