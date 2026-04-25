package scheduler

import (
	"fmt"
	"net/http"
	"sync"
	"time"

	"github.com/robfig/cron/v3"
)

// Scheduler 定时任务调度器
type Scheduler struct {
	cronScrape string
	cronETL    string
	port       string
	mutex      *sync.Mutex
	client     *http.Client
	cron       *cron.Cron
}

// NewScheduler 创建新的调度器
func NewScheduler(cronScrape, cronETL, port string, mutex *sync.Mutex) *Scheduler {
	return &Scheduler{
		cronScrape: cronScrape,
		cronETL:    cronETL,
		port:       port,
		mutex:      mutex,
		client: &http.Client{
			Timeout: 5 * time.Minute,
		},
	}
}

// Start 启动定时任务
func (s *Scheduler) Start() error {
	s.cron = cron.New(cron.WithSeconds())

	// 注册抓取任务
	if s.cronScrape != "" {
		_, err := s.cron.AddFunc(s.cronScrape, s.performScrape)
		if err != nil {
			return fmt.Errorf("添加抓取定时任务失败: %w", err)
		}
		fmt.Printf("✓ 已注册抓取定时任务: %s\n", s.cronScrape)
	}

	// 注册 ETL 任务
	if s.cronETL != "" {
		_, err := s.cron.AddFunc(s.cronETL, s.performETL)
		if err != nil {
			return fmt.Errorf("添加 ETL 定时任务失败: %w", err)
		}
		fmt.Printf("✓ 已注册 ETL 定时任务: %s\n", s.cronETL)
	}

	s.cron.Start()
	return nil
}

// Stop 停止定时任务
func (s *Scheduler) Stop() {
	if s.cron != nil {
		ctx := s.cron.Stop()
		<-ctx.Done()
	}
}

// performScrape 执行抓取任务（调用 API）
func (s *Scheduler) performScrape() {
	// 获取锁，防止与API并发执行
	if !s.mutex.TryLock() {
		fmt.Println("[定时任务] 抓取任务正在执行中，跳过本次")
		return
	}
	defer s.mutex.Unlock()

	url := fmt.Sprintf("http://localhost:%s/api/scrape/all", s.port)
	fmt.Printf("[定时任务] 开始执行抓取: %s\n", url)

	req, err := http.NewRequest(http.MethodPost, url, nil)
	if err != nil {
		fmt.Printf("[定时任务] 创建抓取请求失败: %v\n", err)
		return
	}
	req.Header.Set("Content-Type", "application/json")

	resp, err := s.client.Do(req)
	if err != nil {
		fmt.Printf("[定时任务] 抓取请求失败: %v\n", err)
		return
	}
	defer resp.Body.Close()

	if resp.StatusCode == http.StatusOK {
		fmt.Println("[定时任务] 抓取任务执行成功")
	} else {
		fmt.Printf("[定时任务] 抓取任务执行失败，状态码: %d\n", resp.StatusCode)
	}
}

// performETL 执行 ETL 任务（调用 API）
func (s *Scheduler) performETL() {
	url := fmt.Sprintf("http://localhost:%s/api/etl/process", s.port)
	fmt.Printf("[定时任务] 开始执行 ETL: %s\n", url)

	req, err := http.NewRequest(http.MethodPost, url, nil)
	if err != nil {
		fmt.Printf("[定时任务] 创建 ETL 请求失败: %v\n", err)
		return
	}
	req.Header.Set("Content-Type", "application/json")

	resp, err := s.client.Do(req)
	if err != nil {
		fmt.Printf("[定时任务] ETL 请求失败: %v\n", err)
		return
	}
	defer resp.Body.Close()

	if resp.StatusCode == http.StatusOK {
		fmt.Println("[定时任务] ETL 任务执行成功")
	} else {
		fmt.Printf("[定时任务] ETL 任务执行失败，状态码: %d\n", resp.StatusCode)
	}
}
