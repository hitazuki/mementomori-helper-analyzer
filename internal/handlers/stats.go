package handlers

import (
	"net/http"

	"mmth-analyzer/internal/service"

	"github.com/gin-gonic/gin"
)

// StatsHandler 统计数据处理器
type StatsHandler struct {
	diamondService *service.DiamondService
	etlService     *service.ETLService
}

// NewStatsHandler 创建统计处理器
func NewStatsHandler(diamondService *service.DiamondService, etlService *service.ETLService) *StatsHandler {
	return &StatsHandler{
		diamondService: diamondService,
		etlService:     etlService,
	}
}

// GetStats 返回合并后的统计数据
// 如果只有一个服务器，直接返回该服务器的角色数据
// 如果有多个服务器，合并所有角色数据（同名角色数据会合并）
func (h *StatsHandler) GetStats(c *gin.Context) {
	stats, err := h.etlService.CombineAllStats()
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}

	// 如果只有一个服务器，扁平化返回
	if len(stats) == 1 {
		for _, serverData := range stats {
			c.JSON(http.StatusOK, serverData)
			return
		}
	}

	// 多服务器：合并所有角色数据
	merged := make(map[string]interface{})
	for _, serverData := range stats {
		if characters, ok := serverData.(map[string]interface{}); ok {
			for charName, charData := range characters {
				merged[charName] = charData
			}
		}
	}

	c.JSON(http.StatusOK, merged)
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
