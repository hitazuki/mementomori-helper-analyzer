package handlers

import (
	"net/http"

	"mmth-analyzer/internal/scraper"
	"mmth-analyzer/internal/service"

	"github.com/gin-gonic/gin"
)

// ETLHandler ETL处理器
type ETLHandler struct {
	etlService *service.ETLService
	servers    []scraper.ServerConfig
}

// NewETLHandler 创建ETL处理器实例
func NewETLHandler(etlService *service.ETLService, servers []scraper.ServerConfig) *ETLHandler {
	return &ETLHandler{etlService: etlService, servers: servers}
}

// ProcessServers 按服务器独立处理日志
// POST /api/etl/process
func (h *ETLHandler) ProcessServers(c *gin.Context) {
	if len(h.servers) == 0 {
		c.JSON(http.StatusBadRequest, gin.H{
			"error": "no servers configured",
		})
		return
	}

	result, err := h.etlService.ProcessAllServers(h.servers)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{
			"error": err.Error(),
		})
		return
	}

	c.JSON(http.StatusOK, gin.H{
		"message":      "ETL processing completed",
		"total_files":  result.TotalFiles,
		"success":      result.SuccessCount,
		"failed":       result.FailedCount,
		"failed_files": result.FailedFiles,
		"details":      result.ProcessDetails,
	})
}

// GetCombinedStats 获取合并后的统计数据
// GET /api/etl/stats
func (h *ETLHandler) GetCombinedStats(c *gin.Context) {
	stats, err := h.etlService.CombineAllStats()
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{
			"error": err.Error(),
		})
		return
	}

	c.JSON(http.StatusOK, stats)
}
