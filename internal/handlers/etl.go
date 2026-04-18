package handlers

import (
	"net/http"

	"mmth-analyzer/internal/service"

	"github.com/gin-gonic/gin"
)

// ETLHandler ETL处理器
type ETLHandler struct {
	etlService *service.ETLService
}

// NewETLHandler 创建ETL处理器实例
func NewETLHandler(etlService *service.ETLService) *ETLHandler {
	return &ETLHandler{etlService: etlService}
}

// ProcessAll 处理所有日志文件
// POST /api/etl/process
func (h *ETLHandler) ProcessAll(c *gin.Context) {
	result, err := h.etlService.ProcessAllLogs()
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
	})
}
