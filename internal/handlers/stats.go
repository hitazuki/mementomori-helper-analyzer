package handlers

import (
	"net/http"

	"mmth-analyzer/internal/service"

	"github.com/gin-gonic/gin"
)

// StatsHandler 统计数据处理器
type StatsHandler struct {
	diamondService *service.DiamondService
	statsPath      string
}

// NewStatsHandler 创建统计处理器
func NewStatsHandler(diamondService *service.DiamondService, statsPath string) *StatsHandler {
	return &StatsHandler{
		diamondService: diamondService,
		statsPath:      statsPath,
	}
}

// GetStats 返回 diamond_stats.json 内容
func (h *StatsHandler) GetStats(c *gin.Context) {
	data, err := h.diamondService.GetStats(h.statsPath)
	if err != nil {
		c.JSON(http.StatusNotFound, gin.H{"error": "diamond_stats.json not found"})
		return
	}

	c.Data(http.StatusOK, "application/json", data)
}

// GetAllDiamonds 获取所有账号最新数据
func (h *StatsHandler) GetAllDiamonds(c *gin.Context) {
	data, err := h.diamondService.GetAllDiamonds()
	if err != nil {
		c.JSON(http.StatusNotFound, gin.H{"error": "data not found"})
		return
	}

	c.Data(http.StatusOK, "application/json", data)
}
