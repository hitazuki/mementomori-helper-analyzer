package scheduler

import (
	"fmt"
	"net/http"
	"sync"
	"time"

	"github.com/robfig/cron/v3"
)

// Config is the scheduler's public cron state.
type Config struct {
	CronScrape string `json:"cron_scrape"`
	CronETL    string `json:"cron_etl"`
}

// Scheduler manages scrape and ETL cron jobs.
type Scheduler struct {
	cronScrape string
	cronETL    string
	port       string
	client     *http.Client
	cron       *cron.Cron
	scrapeID   cron.EntryID
	etlID      cron.EntryID
	mu         sync.Mutex
}

func NewScheduler(cronScrape, cronETL, port string, _ *sync.Mutex) *Scheduler {
	return &Scheduler{
		cronScrape: cronScrape,
		cronETL:    cronETL,
		port:       port,
		client: &http.Client{
			Timeout: 5 * time.Minute,
		},
	}
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

func (s *Scheduler) performScrape() {
	url := fmt.Sprintf("http://localhost:%s/api/scrape/all", s.port)
	fmt.Printf("[scheduler] start scrape: %s\n", url)

	req, err := http.NewRequest(http.MethodPost, url, nil)
	if err != nil {
		fmt.Printf("[scheduler] create scrape request failed: %v\n", err)
		return
	}
	req.Header.Set("Content-Type", "application/json")

	resp, err := s.client.Do(req)
	if err != nil {
		fmt.Printf("[scheduler] scrape request failed: %v\n", err)
		return
	}
	defer resp.Body.Close()

	switch resp.StatusCode {
	case http.StatusOK:
		fmt.Println("[scheduler] scrape succeeded")
	case http.StatusConflict:
		fmt.Println("[scheduler] scrape already running, skipped")
	default:
		fmt.Printf("[scheduler] scrape failed, status: %d\n", resp.StatusCode)
	}
}

func (s *Scheduler) performETL() {
	url := fmt.Sprintf("http://localhost:%s/api/etl/process", s.port)
	fmt.Printf("[scheduler] start ETL: %s\n", url)

	req, err := http.NewRequest(http.MethodPost, url, nil)
	if err != nil {
		fmt.Printf("[scheduler] create ETL request failed: %v\n", err)
		return
	}
	req.Header.Set("Content-Type", "application/json")

	resp, err := s.client.Do(req)
	if err != nil {
		fmt.Printf("[scheduler] ETL request failed: %v\n", err)
		return
	}
	defer resp.Body.Close()

	if resp.StatusCode == http.StatusOK {
		fmt.Println("[scheduler] ETL succeeded")
	} else {
		fmt.Printf("[scheduler] ETL failed, status: %d\n", resp.StatusCode)
	}
}
