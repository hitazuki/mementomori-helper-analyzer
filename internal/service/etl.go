package service

import (
	"encoding/json"
	"fmt"
	"os"
	"os/exec"
	"path/filepath"

	"mmth-analyzer/internal/scraper"
)

// ETLService ETL处理服务
type ETLService struct {
	binaryPath string
	outputDir  string
}

// NewETLService 创建ETL服务实例
func NewETLService(binaryPath, outputDir string) *ETLService {
	return &ETLService{
		binaryPath: binaryPath,
		outputDir:  outputDir,
	}
}

// ProcessResult 处理结果
type ProcessResult struct {
	TotalFiles     int      `json:"total_files"`
	SuccessCount   int      `json:"success_count"`
	FailedCount    int      `json:"failed_count"`
	FailedFiles    []string `json:"failed_files,omitempty"`
	ProcessDetails []string `json:"process_details,omitempty"`
}

// ProcessServerLogs 处理指定服务器的日志文件
func (s *ETLService) ProcessServerLogs(serverName, logPath string) error {
	// 为该服务器创建独立的输出目录
	outputDir := filepath.Join(s.outputDir, serverName)
	if err := os.MkdirAll(outputDir, 0755); err != nil {
		return fmt.Errorf("创建输出目录失败: %w", err)
	}

	// 调用 ETL，指定独立输出目录
	cmd := exec.Command(s.binaryPath, "-output", outputDir, logPath)
	output, err := cmd.CombinedOutput()
	if err != nil {
		return fmt.Errorf("ETL处理失败: %w, output: %s", err, string(output))
	}

	return nil
}

// ProcessAllServers 遍历所有服务器配置，独立处理每个服务器的日志
func (s *ETLService) ProcessAllServers(servers []scraper.ServerConfig) (*ProcessResult, error) {
	result := &ProcessResult{
		TotalFiles:     len(servers),
		FailedFiles:    make([]string, 0),
		ProcessDetails: make([]string, 0),
	}

	for _, server := range servers {
		if server.LogPath == "" {
			result.FailedCount++
			result.FailedFiles = append(result.FailedFiles, server.Name)
			result.ProcessDetails = append(result.ProcessDetails,
				fmt.Sprintf("[%s] 跳过: 未配置 log_path", server.Name))
			continue
		}

		err := s.ProcessServerLogs(server.Name, server.LogPath)
		if err != nil {
			result.FailedCount++
			result.FailedFiles = append(result.FailedFiles, server.Name)
			result.ProcessDetails = append(result.ProcessDetails,
				fmt.Sprintf("[%s] 失败: %v", server.Name, err))
		} else {
			result.SuccessCount++
			result.ProcessDetails = append(result.ProcessDetails,
				fmt.Sprintf("[%s] 成功处理: %s", server.Name, server.LogPath))
		}
	}

	return result, nil
}

// CombineAllStats 合并所有服务器的统计数据（带服务器标识）
func (s *ETLService) CombineAllStats() (map[string]interface{}, error) {
	result := make(map[string]interface{})

	// 读取输出目录下的所有子目录
	entries, err := os.ReadDir(s.outputDir)
	if err != nil {
		return nil, fmt.Errorf("读取输出目录失败: %w", err)
	}

	for _, entry := range entries {
		if !entry.IsDir() {
			continue
		}

		serverName := entry.Name()
		statsPath := filepath.Join(s.outputDir, serverName, "diamond_stats.json")

		data, err := os.ReadFile(statsPath)
		if err != nil {
			continue // 跳过不存在或读取失败的文件
		}

		var stats map[string]interface{}
		if err := json.Unmarshal(data, &stats); err != nil {
			continue // 跳过解析失败的文件
		}

		result[serverName] = stats
	}

	return result, nil
}


// CombineAllCaveStats 合并所有服务器的洞穴统计数据
func (s *ETLService) CombineAllCaveStats() (map[string]interface{}, error) {
	result := make(map[string]interface{})

	// 读取输出目录下的所有子目录
	entries, err := os.ReadDir(s.outputDir)
	if err != nil {
		return nil, fmt.Errorf("读取输出目录失败: %w", err)
	}

	for _, entry := range entries {
		if !entry.IsDir() {
			continue
		}

		serverName := entry.Name()
		caveStatsPath := filepath.Join(s.outputDir, serverName, "cave_stats.json")

		data, err := os.ReadFile(caveStatsPath)
		if err != nil {
			continue // 跳过不存在或读取失败的文件
		}

		var stats map[string]interface{}
		if err := json.Unmarshal(data, &stats); err != nil {
			continue // 跳过解析失败的文件
		}

		result[serverName] = stats
	}

	return result, nil
}

// CombineAllChallengeStats 合并所有服务器的挑战统计数据
func (s *ETLService) CombineAllChallengeStats() (map[string]interface{}, error) {
	result := make(map[string]interface{})

	// 读取输出目录下的所有子目录
	entries, err := os.ReadDir(s.outputDir)
	if err != nil {
		return nil, fmt.Errorf("读取输出目录失败: %w", err)
	}

	for _, entry := range entries {
		if !entry.IsDir() {
			continue
		}

		serverName := entry.Name()
		challengeStatsPath := filepath.Join(s.outputDir, serverName, "challenge_stats.json")

		data, err := os.ReadFile(challengeStatsPath)
		if err != nil {
			continue // 跳过不存在或读取失败的文件
		}

		var stats map[string]interface{}
		if err := json.Unmarshal(data, &stats); err != nil {
			continue // 跳过解析失败的文件
		}

		result[serverName] = stats
	}

	return result, nil
}

// CombineAllRuneTicketStats 合并所有服务器的饼干统计数据
func (s *ETLService) CombineAllRuneTicketStats() (map[string]interface{}, error) {
	result := make(map[string]interface{})

	entries, err := os.ReadDir(s.outputDir)
	if err != nil {
		return nil, fmt.Errorf("读取输出目录失败: %w", err)
	}

	for _, entry := range entries {
		if !entry.IsDir() {
			continue
		}

		serverName := entry.Name()
		statsPath := filepath.Join(s.outputDir, serverName, "rune_ticket_stats.json")

		data, err := os.ReadFile(statsPath)
		if err != nil {
			continue
		}

		var stats map[string]interface{}
		if err := json.Unmarshal(data, &stats); err != nil {
			continue
		}

		result[serverName] = stats
	}

	return result, nil
}

// CombineAllUpgradePanaceaStats 合并所有服务器的红水统计数据
func (s *ETLService) CombineAllUpgradePanaceaStats() (map[string]interface{}, error) {
	result := make(map[string]interface{})

	entries, err := os.ReadDir(s.outputDir)
	if err != nil {
		return nil, fmt.Errorf("读取输出目录失败: %w", err)
	}

	for _, entry := range entries {
		if !entry.IsDir() {
			continue
		}

		serverName := entry.Name()
		statsPath := filepath.Join(s.outputDir, serverName, "upgrade_panacea_stats.json")

		data, err := os.ReadFile(statsPath)
		if err != nil {
			continue
		}

		var stats map[string]interface{}
		if err := json.Unmarshal(data, &stats); err != nil {
			continue
		}

		result[serverName] = stats
	}

	return result, nil
}
