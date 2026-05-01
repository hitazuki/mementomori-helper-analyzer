package handlers

import (
	"net/http"
	"sync"

	"mmth-analyzer/internal/scraper"
	"mmth-analyzer/internal/service"

	"github.com/gin-gonic/gin"
)

// ETLHandler ETL处理器
type ETLHandler struct {
	etlService *service.ETLService
	servers    []scraper.ServerConfig
	mu         *sync.Mutex // 防止并发执行
}

// NewETLHandler 创建ETL处理器实例
func NewETLHandler(etlService *service.ETLService, servers []scraper.ServerConfig) *ETLHandler {
	return &ETLHandler{
		etlService: etlService,
		servers:    servers,
		mu:         &sync.Mutex{},
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

	// 检查是否已有任务在运行
	if h.etlService.GetTaskManager().IsRunning() {
		c.JSON(http.StatusConflict, gin.H{
			"error": "ETL task already running",
		})
		return
	}

	// 异步执行 ETL 处理
	go func() {
		h.mu.Lock()
		defer h.mu.Unlock()
		_, _ = h.etlService.ProcessAllServers(h.servers)
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
