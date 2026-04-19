package handlers

import (
	"mmth-analyzer/internal/service"
	"strings"

	"github.com/gin-gonic/gin"
)

// ScrapeHandler 抓取处理器
type ScrapeHandler struct {
	scrapeService *service.ScrapeService
}

// NewScrapeHandler 创建抓取处理器
func NewScrapeHandler(scrapeService *service.ScrapeService) *ScrapeHandler {
	return &ScrapeHandler{scrapeService: scrapeService}
}

// isChromeNotFoundError 检查错误是否为 Chrome 未找到
func isChromeNotFoundError(err error) bool {
	if err == nil {
		return false
	}
	return strings.Contains(err.Error(), "未找到 Chrome/Chromium")
}

// ScrapeAll 抓取所有账号
func (h *ScrapeHandler) ScrapeAll(c *gin.Context) {
	err := h.scrapeService.ScrapeAll()
	if err != nil {
		// 检查是否是 Chrome 未找到错误
		if isChromeNotFoundError(err) {
			c.JSON(500, gin.H{
				"error":         err.Error(),
				"chrome_needed": true,
			})
			return
		}
		c.JSON(500, gin.H{"error": err.Error()})
		return
	}

	c.JSON(200, gin.H{
		"success": true,
		"message": "All accounts scraped successfully",
	})
}

// ScrapeAccount 抓取单个账号
type ScrapeAccountRequest struct {
	URL     string `json:"url" binding:"required"`
	Account string `json:"account" binding:"required"`
	Server  string `json:"server"`
}

func (h *ScrapeHandler) ScrapeAccount(c *gin.Context) {
	var req ScrapeAccountRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(400, gin.H{"error": err.Error()})
		return
	}

	if req.Server == "" {
		req.Server = "manual"
	}

	data, err := h.scrapeService.ScrapeAccount(req.URL, req.Account, req.Server)
	if err != nil {
		c.JSON(500, gin.H{"error": err.Error()})
		return
	}

	c.JSON(200, gin.H{
		"success": true,
		"data":    data,
	})
}
