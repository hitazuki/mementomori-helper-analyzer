package handlers

import (
	"net/http"

	"mmth-analyzer/internal/service"

	"github.com/gin-gonic/gin"
)

// CaveHandler 洞穴统计处理器
type CaveHandler struct {
	etlService *service.ETLService
}

// NewCaveHandler 创建洞穴统计处理器实例
func NewCaveHandler(etlService *service.ETLService) *CaveHandler {
	return &CaveHandler{etlService: etlService}
}

// GetCaveStats 获取洞穴统计数据
// GET /api/cave/stats
func (h *CaveHandler) GetCaveStats(c *gin.Context) {
	stats, err := h.etlService.CombineAllCaveStats()
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{
			"error": err.Error(),
		})
		return
	}

	c.JSON(http.StatusOK, stats)
}
