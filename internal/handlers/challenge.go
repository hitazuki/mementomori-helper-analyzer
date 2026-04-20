package handlers

import (
	"net/http"

	"mmth-analyzer/internal/service"

	"github.com/gin-gonic/gin"
)

// ChallengeHandler 挑战统计处理器
type ChallengeHandler struct {
	etlService *service.ETLService
}

// NewChallengeHandler 创建挑战统计处理器实例
func NewChallengeHandler(etlService *service.ETLService) *ChallengeHandler {
	return &ChallengeHandler{etlService: etlService}
}

// GetChallengeStats 获取挑战统计数据
// GET /api/challenge/stats
func (h *ChallengeHandler) GetChallengeStats(c *gin.Context) {
	stats, err := h.etlService.CombineAllChallengeStats()
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{
			"error": err.Error(),
		})
		return
	}

	c.JSON(http.StatusOK, stats)
}
