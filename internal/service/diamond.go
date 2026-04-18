package service

import (
	"encoding/json"
	"fmt"
	"os"
	"path/filepath"
	"strings"

	"github.com/gin-gonic/gin"
)

// DiamondService 钻石数据服务
type DiamondService struct {
	dataDir string
}

// NewDiamondService 创建钻石服务
func NewDiamondService(dataDir string) *DiamondService {
	return &DiamondService{dataDir: dataDir}
}

// GetStats 读取 diamond_stats.json
func (s *DiamondService) GetStats(diamondStatsPath string) ([]byte, error) {
	absPath, _ := filepath.Abs(diamondStatsPath)
	return os.ReadFile(absPath)
}

// GetAllDiamonds 获取所有账号最新数据
func (s *DiamondService) GetAllDiamonds() ([]byte, error) {
	return os.ReadFile(filepath.Join(s.dataDir, "mmth_diamonds.json"))
}

// GetAccountHistory 获取单个账号历史
func (s *DiamondService) GetAccountHistory(server, account string) ([]byte, error) {
	filepath := filepath.Join(s.dataDir, "history", server+"-"+account+"-diamonds.json")
	if _, err := os.Stat(filepath); os.IsNotExist(err) {
		return nil, fmt.Errorf("history not found")
	}
	return os.ReadFile(filepath)
}

// HistoryRecord 历史记录
type HistoryRecord struct {
	Timestamp string `json:"timestamp"`
	Total     int    `json:"total"`
	Free      int    `json:"free"`
	Paid      int    `json:"paid"`
	Server    string `json:"server,omitempty"`
	Account   string `json:"account,omitempty"`
}

// GetAllHistory 获取所有账号历史
func (s *DiamondService) GetAllHistory() (map[string][]gin.H, error) {
	historyDir := filepath.Join(s.dataDir, "history")

	files, err := os.ReadDir(historyDir)
	if err != nil {
		return nil, err
	}

	result := make(map[string][]gin.H)
	for _, file := range files {
		if file.IsDir() || !strings.HasSuffix(file.Name(), "-diamonds.json") {
			continue
		}

		name := strings.TrimSuffix(file.Name(), "-diamonds.json")
		parts := strings.SplitN(name, "-", 2)
		if len(parts) != 2 {
			continue
		}
		server, account := parts[0], parts[1]

		data, err := os.ReadFile(filepath.Join(historyDir, file.Name()))
		if err != nil {
			continue
		}

		var records []gin.H
		if err := json.Unmarshal(data, &records); err != nil {
			continue
		}

		for i := range records {
			records[i]["server"] = server
			records[i]["account"] = account
		}

		result[server+"/"+account] = records
	}

	return result, nil
}
