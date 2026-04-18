package handlers

import (
	"net/http"
	"os"
	"path/filepath"

	"github.com/gin-gonic/gin"
)

// Diamond stats 路径
const diamondStatsPath = "./data/diamond_stats.json"

// GetStats 返回 diamond_stats.json 内容
func GetStats(c *gin.Context) {
	absPath, _ := filepath.Abs(diamondStatsPath)
	data, err := os.ReadFile(absPath)
	if err != nil {
		c.JSON(http.StatusNotFound, gin.H{"error": "diamond_stats.json not found"})
		return
	}

	c.Data(http.StatusOK, "application/json", data)
}
