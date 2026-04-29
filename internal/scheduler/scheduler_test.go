package scheduler

import "testing"

func TestUpdateCronValidAndEmpty(t *testing.T) {
	s := NewScheduler("0 0 2,14 * * *", "0 0 1 * * *", "5391", nil)
	if err := s.Start(); err != nil {
		t.Fatal(err)
	}
	defer s.Stop()

	if err := s.UpdateCron("0 */30 * * * *", ""); err != nil {
		t.Fatal(err)
	}

	cfg := s.GetConfig()
	if cfg.CronScrape != "0 */30 * * * *" {
		t.Fatalf("CronScrape = %q", cfg.CronScrape)
	}
	if cfg.CronETL != "" {
		t.Fatalf("CronETL = %q", cfg.CronETL)
	}
}

func TestUpdateCronRejectsInvalidWithoutChangingState(t *testing.T) {
	s := NewScheduler("0 0 2,14 * * *", "0 0 1 * * *", "5391", nil)
	if err := s.Start(); err != nil {
		t.Fatal(err)
	}
	defer s.Stop()

	if err := s.UpdateCron("bad cron", ""); err == nil {
		t.Fatal("expected invalid cron error")
	}

	cfg := s.GetConfig()
	if cfg.CronScrape != "0 0 2,14 * * *" {
		t.Fatalf("CronScrape changed to %q", cfg.CronScrape)
	}
	if cfg.CronETL != "0 0 1 * * *" {
		t.Fatalf("CronETL changed to %q", cfg.CronETL)
	}
}
