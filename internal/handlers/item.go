package handlers

import (
	"net/http"

	"mmth-analyzer/internal/service"

	"github.com/gin-gonic/gin"
)

// ItemHandler 物品统计处理器
type ItemHandler struct {
	etlService *service.ETLService
}

// NewItemHandler 创建物品统计处理器实例
func NewItemHandler(etlService *service.ETLService) *ItemHandler {
	return &ItemHandler{etlService: etlService}
}

// GetRuneTicketStats 获取饼干统计数据
// GET /api/rune-ticket/stats
func (h *ItemHandler) GetRuneTicketStats(c *gin.Context) {
	stats, err := h.etlService.CombineAllRuneTicketStats()
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{
			"error": err.Error(),
		})
		return
	}

	c.JSON(http.StatusOK, stats)
}

// GetUpgradePanaceaStats 获取红水统计数据
// GET /api/upgrade-panacea/stats
func (h *ItemHandler) GetUpgradePanaceaStats(c *gin.Context) {
	stats, err := h.etlService.CombineAllUpgradePanaceaStats()
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{
			"error": err.Error(),
		})
		return
	}

	c.JSON(http.StatusOK, stats)
}
