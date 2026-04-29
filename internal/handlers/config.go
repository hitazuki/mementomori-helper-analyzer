package handlers

import (
	"net/http"
	"strings"

	appconfig "mmth-analyzer/internal/config"
	"mmth-analyzer/internal/scheduler"

	"github.com/gin-gonic/gin"
)

type ScheduleHandler struct {
	configPath string
	scheduler  *scheduler.Scheduler
}

type scheduleRequest struct {
	CronScrape string `json:"cron_scrape"`
	CronETL    string `json:"cron_etl"`
}

func NewScheduleHandler(configPath string, scheduler *scheduler.Scheduler) *ScheduleHandler {
	return &ScheduleHandler{
		configPath: configPath,
		scheduler:  scheduler,
	}
}

func (h *ScheduleHandler) GetSchedule(c *gin.Context) {
	cfg := h.scheduler.GetConfig()
	c.JSON(http.StatusOK, gin.H{
		"cron_scrape":    cfg.CronScrape,
		"cron_etl":       cfg.CronETL,
		"enabled_scrape": cfg.CronScrape != "",
		"enabled_etl":    cfg.CronETL != "",
		"config_path":    h.configPath,
	})
}

func (h *ScheduleHandler) UpdateSchedule(c *gin.Context) {
	if h.configPath == "" {
		c.JSON(http.StatusBadRequest, gin.H{
			"error": "no config file was loaded; cannot persist schedule",
		})
		return
	}

	var req scheduleRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	req.CronScrape = strings.TrimSpace(req.CronScrape)
	req.CronETL = strings.TrimSpace(req.CronETL)

	previous := h.scheduler.GetConfig()
	if err := h.scheduler.UpdateCron(req.CronScrape, req.CronETL); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	if err := appconfig.SaveScheduleConfig(h.configPath, req.CronScrape, req.CronETL); err != nil {
		_ = h.scheduler.UpdateCron(previous.CronScrape, previous.CronETL)
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}

	c.JSON(http.StatusOK, gin.H{
		"cron_scrape":    req.CronScrape,
		"cron_etl":       req.CronETL,
		"enabled_scrape": req.CronScrape != "",
		"enabled_etl":    req.CronETL != "",
		"config_path":    h.configPath,
	})
}
