package handlers

import (
	"net/http"

	"mmth-analyzer/internal/service"

	"github.com/gin-gonic/gin"
)

// HistoryHandler 历史数据处理器
type HistoryHandler struct {
	diamondService *service.DiamondService
}

// NewHistoryHandler 创建历史处理器
func NewHistoryHandler(diamondService *service.DiamondService) *HistoryHandler {
	return &HistoryHandler{diamondService: diamondService}
}

// GetAccountHistory 获取单个账号历史
func (h *HistoryHandler) GetAccountHistory(c *gin.Context) {
	server := c.Param("server")
	account := c.Param("account")

	data, err := h.diamondService.GetAccountHistory(server, account)
	if err != nil {
		c.JSON(http.StatusNotFound, gin.H{"error": "History not found for " + account})
		return
	}

	c.Data(http.StatusOK, "application/json", data)
}

// GetAllHistory 获取所有账号历史
func (h *HistoryHandler) GetAllHistory(c *gin.Context) {
	result, err := h.diamondService.GetAllHistory()
	if err != nil {
		c.JSON(500, gin.H{"error": "Failed to read history directory"})
		return
	}

	c.JSON(200, result)
}
