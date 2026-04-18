package main

import (
	"time"

	"mmth-analyzer/scraper"
)

// Scheduler 定时任务调度器
type Scheduler struct {
	config *Config
	ticker *time.Ticker
	stop   chan bool
}

// NewScheduler 创建新的调度器
func NewScheduler(config *Config) *Scheduler {
	return &Scheduler{
		config: config,
		stop:   make(chan bool),
	}
}

// Start 启动定时任务
func (s *Scheduler) Start() {
	s.ticker = time.NewTicker(s.config.ScrapeInterval)

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
	if s.config.ScrapeCfg == nil || len(s.config.ScrapeCfg.Servers) == 0 {
		return
	}

	// 获取锁，防止与API并发执行
	if !scrapeMutex.TryLock() {
		// 有正在执行的抓取，跳过本次定时任务
		return
	}
	defer scrapeMutex.Unlock()

	_ = scraper.ScrapeAllServers(s.config.ScrapeCfg.Servers, s.config.DataDir)
}
