package config

import (
	"encoding/json"
	"os"
	"path/filepath"
	"testing"
)

func TestSaveScheduleConfigUpdatesOnlyCronFields(t *testing.T) {
	dir := t.TempDir()
	path := filepath.Join(dir, "app.json")
	original := `{
  "port": "5391",
  "cron_scrape": "0 0 2,14 * * *",
  "cron_etl": "0 0 1 * * *",
  "mmth_servers": [
    {
      "name": "server1",
      "base_url": "http://localhost:5390",
      "accounts": ["a", "b"],
      "log_path": "./logs"
    }
  ],
  "_data_dir": "./data"
}
`

	if err := os.WriteFile(path, []byte(original), 0644); err != nil {
		t.Fatal(err)
	}

	if err := SaveScheduleConfig(path, "0 */30 * * * *", ""); err != nil {
		t.Fatal(err)
	}

	data, err := os.ReadFile(path)
	if err != nil {
		t.Fatal(err)
	}

	var got map[string]any
	if err := json.Unmarshal(data, &got); err != nil {
		t.Fatal(err)
	}

	if got["cron_scrape"] != "0 */30 * * * *" {
		t.Fatalf("cron_scrape = %v", got["cron_scrape"])
	}
	if got["cron_etl"] != "" {
		t.Fatalf("cron_etl = %v", got["cron_etl"])
	}
	if got["_data_dir"] != "./data" {
		t.Fatalf("_data_dir was not preserved: %v", got["_data_dir"])
	}
	if _, ok := got["mmth_servers"]; !ok {
		t.Fatal("mmth_servers was not preserved")
	}
}

func TestLoadAppConfigAllowsEmptyCronToDisable(t *testing.T) {
	dir := t.TempDir()
	path := filepath.Join(dir, "app.json")
	if err := os.WriteFile(path, []byte(`{"cron_scrape":"","cron_etl":""}`), 0644); err != nil {
		t.Fatal(err)
	}

	appCfg, err := LoadAppConfig(path)
	if err != nil {
		t.Fatal(err)
	}
	cfg := appCfg.ToRuntimeConfig()

	if cfg.CronScrape != "" {
		t.Fatalf("CronScrape = %q, want empty", cfg.CronScrape)
	}
	if cfg.CronETL != "" {
		t.Fatalf("CronETL = %q, want empty", cfg.CronETL)
	}
}
