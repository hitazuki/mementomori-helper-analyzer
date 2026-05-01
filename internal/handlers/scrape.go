package handlers

import (
	"net/http"

	"mmth-analyzer/internal/scraper"
	"mmth-analyzer/internal/service"

	"github.com/gin-gonic/gin"
)

// ScrapeHandler 抓取处理器
type ScrapeHandler struct {
	scrapeService *service.ScrapeService
	servers       []scraper.ServerConfig
}

// NewScrapeHandler 创建抓取处理器
func NewScrapeHandler(scrapeService *service.ScrapeService, servers []scraper.ServerConfig) *ScrapeHandler {
	return &ScrapeHandler{
		scrapeService: scrapeService,
		servers:       servers,
	}
}

// ScrapeAll 抓取所有账号（异步）
// POST /api/scrape/all
func (h *ScrapeHandler) ScrapeAll(c *gin.Context) {
	if h.scrapeService == nil || len(h.servers) == 0 {
		c.JSON(http.StatusBadRequest, gin.H{
			"error": "no servers configured",
		})
		return
	}

	// 异步执行，并发控制由 ScrapeAll 内部处理
	go func() {
		_ = h.scrapeService.ScrapeAll()
	}()

	c.JSON(http.StatusAccepted, gin.H{
		"message": "Scrape started",
		"status":  "running",
	})
}

// GetStatus 获取抓取任务状态
// GET /api/scrape/status
func (h *ScrapeHandler) GetStatus(c *gin.Context) {
	if h.scrapeService == nil {
		c.JSON(http.StatusOK, gin.H{
			"status": "idle",
		})
		return
	}
	state := h.scrapeService.GetTaskManager().GetState()
	c.JSON(http.StatusOK, state)
}

// ScrapeAccount 抓取单个账号
// POST /api/scrape/account
type ScrapeAccountRequest struct {
	URL     string `json:"url" binding:"required"`
	Account string `json:"account" binding:"required"`
	Server  string `json:"server"`
}

func (h *ScrapeHandler) ScrapeAccount(c *gin.Context) {
	if h.scrapeService == nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "no servers configured"})
		return
	}

	var req ScrapeAccountRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	if req.Server == "" {
		req.Server = "manual"
	}

	data, err := h.scrapeService.ScrapeAccount(req.URL, req.Account, req.Server)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}

	c.JSON(http.StatusOK, gin.H{
		"success": true,
		"data":    data,
	})
}
