package handlers

import (
	"net/http"

	"mmth-analyzer/internal/scraper"
	"mmth-analyzer/internal/service"

	"github.com/gin-gonic/gin"
)

// ETLHandler ETL处理器
type ETLHandler struct {
	etlService service.ETLServiceInterface
	servers    []scraper.ServerConfig
}

// NewETLHandler 创建ETL处理器实例
func NewETLHandler(etlService service.ETLServiceInterface, servers []scraper.ServerConfig) *ETLHandler {
	return &ETLHandler{
		etlService: etlService,
		servers:    servers,
	}
}

// ProcessServers 按服务器独立处理日志（异步）
// POST /api/etl/process
func (h *ETLHandler) ProcessServers(c *gin.Context) {
	if len(h.servers) == 0 {
		c.JSON(http.StatusBadRequest, gin.H{
			"error": "no servers configured",
		})
		return
	}

	// 异步执行，并发控制由 ProcessAllServers 内部处理
	go func() {
		_ = h.etlService.ProcessAllServers(h.servers)
	}()

	c.JSON(http.StatusAccepted, gin.H{
		"message": "ETL processing started",
		"status":  "running",
	})
}

// GetStatus 获取 ETL 任务状态
// GET /api/etl/status
func (h *ETLHandler) GetStatus(c *gin.Context) {
	state := h.etlService.GetTaskManager().GetState()
	c.JSON(http.StatusOK, state)
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
