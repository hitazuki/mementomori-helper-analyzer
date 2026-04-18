package service

import (
	"fmt"
	"os"
	"os/exec"
	"path/filepath"
)

// ETLService ETL处理服务
type ETLService struct {
	binaryPath string
	logsDir    string
	outputDir  string
}

// NewETLService 创建ETL服务实例
func NewETLService(binaryPath, logsDir, outputDir string) *ETLService {
	return &ETLService{
		binaryPath: binaryPath,
		logsDir:    logsDir,
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

// ProcessAllLogs 处理日志目录中所有日志文件
func (s *ETLService) ProcessAllLogs() (*ProcessResult, error) {
	// 确保输出目录存在
	if err := os.MkdirAll(s.outputDir, 0755); err != nil {
		return nil, fmt.Errorf("创建输出目录失败: %w", err)
	}

	// 获取所有日志文件（支持 .json 和 .log 扩展名）
	var files []string
	for _, ext := range []string{".json", ".log"} {
		matches, err := filepath.Glob(filepath.Join(s.logsDir, "*"+ext))
		if err != nil {
			return nil, fmt.Errorf("扫描日志目录失败: %w", err)
		}
		files = append(files, matches...)
	}

	if len(files) == 0 {
		return &ProcessResult{
			TotalFiles:   0,
			SuccessCount: 0,
			FailedCount:  0,
		}, nil
	}

	result := &ProcessResult{
		TotalFiles:     len(files),
		FailedFiles:    make([]string, 0),
		ProcessDetails: make([]string, 0),
	}

	for _, file := range files {
		fileName := filepath.Base(file)
		cmd := exec.Command(s.binaryPath, "-output", s.outputDir, file)
		output, err := cmd.CombinedOutput()

		if err != nil {
			result.FailedCount++
			result.FailedFiles = append(result.FailedFiles, fileName)
			result.ProcessDetails = append(result.ProcessDetails,
				fmt.Sprintf("[%s] 失败: %v", fileName, err))
		} else {
			result.SuccessCount++
			result.ProcessDetails = append(result.ProcessDetails,
				fmt.Sprintf("[%s] 成功: %s", fileName, string(output)))
		}
	}

	return result, nil
}
