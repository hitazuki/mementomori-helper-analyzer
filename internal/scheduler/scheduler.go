package scheduler

import (
	"fmt"
	"sync"

	"mmth-analyzer/internal/scraper"
	"mmth-analyzer/internal/service"

	"github.com/robfig/cron/v3"
)

// Config is the scheduler's public cron state.
type Config struct {
	CronScrape string `json:"cron_scrape"`
	CronETL    string `json:"cron_etl"`
}

// Scheduler manages scrape and ETL cron jobs.
type Scheduler struct {
	cronScrape   string
	cronETL      string
	cron         *cron.Cron
	scrapeID     cron.EntryID
	etlID        cron.EntryID
	mu           sync.Mutex
	scrapeService *service.ScrapeService
	etlService   *service.ETLService
	servers      []scraper.ServerConfig
}

// NewScheduler 创建调度器实例
func NewScheduler(cronScrape, cronETL, _ string, _ *sync.Mutex) *Scheduler {
	return &Scheduler{
		cronScrape: cronScrape,
		cronETL:    cronETL,
	}
}

// SetScrapeService 设置抓取服务
func (s *Scheduler) SetScrapeService(scrapeService *service.ScrapeService) {
	s.scrapeService = scrapeService
}

// SetETLService 设置 ETL 服务
func (s *Scheduler) SetETLService(etlService *service.ETLService, servers []scraper.ServerConfig) {
	s.etlService = etlService
	s.servers = servers
}

func StartParser() cron.Parser {
	return cron.NewParser(cron.Second | cron.Minute | cron.Hour | cron.Dom | cron.Month | cron.Dow)
}

// ValidateCron validates the six-field cron syntax used by this app.
func ValidateCron(expr string) error {
	if expr == "" {
		return nil
	}
	_, err := StartParser().Parse(expr)
	return err
}

// Start starts cron scheduling.
func (s *Scheduler) Start() error {
	s.mu.Lock()
	defer s.mu.Unlock()

	if s.cron == nil {
		s.cron = cron.New(cron.WithParser(StartParser()))
	}

	if err := s.validateLocked(s.cronScrape, s.cronETL); err != nil {
		return err
	}
	if err := s.registerLocked(); err != nil {
		return err
	}

	s.cron.Start()
	return nil
}

// Stop stops all scheduled jobs.
func (s *Scheduler) Stop() {
	s.mu.Lock()
	c := s.cron
	s.mu.Unlock()

	if c != nil {
		ctx := c.Stop()
		<-ctx.Done()
	}
}

// GetConfig returns the current cron expressions.
func (s *Scheduler) GetConfig() Config {
	s.mu.Lock()
	defer s.mu.Unlock()

	return Config{
		CronScrape: s.cronScrape,
		CronETL:    s.cronETL,
	}
}

// UpdateCron replaces both cron jobs atomically after validation.
func (s *Scheduler) UpdateCron(cronScrape, cronETL string) error {
	s.mu.Lock()
	defer s.mu.Unlock()

	if err := s.validateLocked(cronScrape, cronETL); err != nil {
		return err
	}

	if s.cron == nil {
		s.cron = cron.New(cron.WithParser(StartParser()))
		s.cron.Start()
	}

	s.removeLocked()
	previousScrape := s.cronScrape
	previousETL := s.cronETL
	s.cronScrape = cronScrape
	s.cronETL = cronETL

	if err := s.registerLocked(); err != nil {
		s.removeLocked()
		s.cronScrape = previousScrape
		s.cronETL = previousETL
		_ = s.registerLocked()
		return err
	}

	return nil
}

func (s *Scheduler) validateLocked(cronScrape, cronETL string) error {
	if err := ValidateCron(cronScrape); err != nil {
		return fmt.Errorf("invalid cron_scrape: %w", err)
	}
	if err := ValidateCron(cronETL); err != nil {
		return fmt.Errorf("invalid cron_etl: %w", err)
	}
	return nil
}

func (s *Scheduler) registerLocked() error {
	if s.cronScrape != "" {
		id, err := s.cron.AddFunc(s.cronScrape, s.performScrape)
		if err != nil {
			return fmt.Errorf("add scrape cron failed: %w", err)
		}
		s.scrapeID = id
		fmt.Printf("Registered scrape cron: %s\n", s.cronScrape)
	}

	if s.cronETL != "" {
		id, err := s.cron.AddFunc(s.cronETL, s.performETL)
		if err != nil {
			if s.scrapeID != 0 {
				s.cron.Remove(s.scrapeID)
				s.scrapeID = 0
			}
			return fmt.Errorf("add ETL cron failed: %w", err)
		}
		s.etlID = id
		fmt.Printf("Registered ETL cron: %s\n", s.cronETL)
	}

	return nil
}

func (s *Scheduler) removeLocked() {
	if s.scrapeID != 0 {
		s.cron.Remove(s.scrapeID)
		s.scrapeID = 0
	}
	if s.etlID != 0 {
		s.cron.Remove(s.etlID)
		s.etlID = 0
	}
}

// performScrape 执行定时抓取（异步执行，不阻塞调度器）
func (s *Scheduler) performScrape() {
	if s.scrapeService == nil {
		fmt.Println("[scheduler] scrape service not configured")
		return
	}

	fmt.Printf("[scheduler] start scrape: %d servers\n", len(s.scrapeService.GetServers()))

	// 异步执行，并发控制由 ScrapeAll() 内部处理
	go func() {
		err := s.scrapeService.ScrapeAll()
		if err != nil {
			if err == service.ErrScrapeInProgress {
				fmt.Println("[scheduler] scrape already running, skipped")
			} else {
				fmt.Printf("[scheduler] scrape failed: %v\n", err)
			}
			return
		}
		fmt.Println("[scheduler] scrape succeeded")
	}()
}

// performETL 执行定时 ETL（异步执行，不阻塞调度器）
func (s *Scheduler) performETL() {
	if s.etlService == nil {
		fmt.Println("[scheduler] ETL service not configured")
		return
	}

	fmt.Printf("[scheduler] start ETL: %d servers\n", len(s.servers))

	// 异步执行，并发控制由 ProcessAllServers() 内部处理
	go func() {
		err := s.etlService.ProcessAllServers(s.servers)
		if err != nil {
			if err == service.ErrTaskAlreadyRunning {
				fmt.Println("[scheduler] ETL already running, skipped")
			} else {
				fmt.Printf("[scheduler] ETL failed: %v\n", err)
			}
		}
	}()

	fmt.Println("[scheduler] ETL started")
}
