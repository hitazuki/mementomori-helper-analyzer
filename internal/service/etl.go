package service

import (
	"encoding/json"
	"fmt"
	"os"
	"os/exec"
	"path/filepath"
	"regexp"
	"strings"

	"mmth-analyzer/internal/scraper"
)

// logRotationPattern 匹配日志轮转文件名 (.log.1, .log.2, ...)
var logRotationPattern = regexp.MustCompile(`\.log\.\d+$`)

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
// logPath 可以是文件路径或目录路径
// 如果是目录，将遍历目录下的所有 .log 文件进行处理
func (s *ETLService) ProcessServerLogs(serverName, logPath string) error {
	// 为该服务器创建独立的输出目录
	outputDir := filepath.Join(s.outputDir, serverName)
	if err := os.MkdirAll(outputDir, 0755); err != nil {
		return fmt.Errorf("创建输出目录失败: %w", err)
	}

	// 判断路径是文件还是目录
	info, err := os.Stat(logPath)
	if err != nil {
		return fmt.Errorf("无法访问路径 %s: %w", logPath, err)
	}

	if info.IsDir() {
		// 目录：遍历处理所有日志文件
		return s.processLogDirectory(outputDir, logPath)
	}

	// 文件：直接处理
	return s.processLogFile(outputDir, logPath)
}

// processLogDirectory 处理目录下的所有日志文件
func (s *ETLService) processLogDirectory(outputDir, dirPath string) error {
	entries, err := os.ReadDir(dirPath)
	if err != nil {
		return fmt.Errorf("读取目录失败: %w", err)
	}

	hasError := false
	for _, entry := range entries {
		if entry.IsDir() {
			continue // 跳过子目录
		}

		// 处理 .log 文件及其轮转文件 (.log.1, .log.2, ...)
		name := entry.Name()
		if !strings.HasSuffix(strings.ToLower(name), ".log") &&
			!logRotationPattern.MatchString(strings.ToLower(name)) {
			continue
		}

		logFile := filepath.Join(dirPath, entry.Name())
		fmt.Printf("处理日志文件: %s\n", logFile)
		if err := s.processLogFile(outputDir, logFile); err != nil {
			fmt.Printf("处理日志文件失败 %s: %v\n", logFile, err)
			hasError = true
		}
	}

	if hasError {
		return fmt.Errorf("部分日志文件处理失败")
	}
	return nil
}

// processLogFile 处理单个日志文件
func (s *ETLService) processLogFile(outputDir, logFile string) error {
	cmd := exec.Command(s.binaryPath, "-output", outputDir, logFile)
	cmd.Stdout = os.Stdout
	cmd.Stderr = os.Stderr
	if err := cmd.Run(); err != nil {
		return fmt.Errorf("ETL处理失败: %w", err)
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

	fmt.Printf("开始 ETL 处理 %d 个服务器\n", len(servers))

	for _, server := range servers {
		if server.LogPath == "" {
			result.FailedCount++
			result.FailedFiles = append(result.FailedFiles, server.Name)
			result.ProcessDetails = append(result.ProcessDetails,
				fmt.Sprintf("[%s] 跳过: 未配置 log_path", server.Name))
			fmt.Printf("[%s] 跳过: 未配置 log_path\n", server.Name)
			continue
		}

		fmt.Printf("[%s] 开始处理: %s\n", server.Name, server.LogPath)
		err := s.ProcessServerLogs(server.Name, server.LogPath)
		if err != nil {
			result.FailedCount++
			result.FailedFiles = append(result.FailedFiles, server.Name)
			result.ProcessDetails = append(result.ProcessDetails,
				fmt.Sprintf("[%s] 失败: %v", server.Name, err))
			fmt.Printf("[%s] 失败: %v\n", server.Name, err)
		} else {
			result.SuccessCount++
			result.ProcessDetails = append(result.ProcessDetails,
				fmt.Sprintf("[%s] 成功处理: %s", server.Name, server.LogPath))
			fmt.Printf("[%s] 成功处理完成\n", server.Name)
		}
	}

	fmt.Printf("ETL 处理完成: 总计 %d, 成功 %d, 失败 %d\n",
		result.TotalFiles, result.SuccessCount, result.FailedCount)

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
