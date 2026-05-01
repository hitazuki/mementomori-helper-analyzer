package service

import (
	"sync"
	"time"
)

// ScrapeTaskStatus 任务状态
type ScrapeTaskStatus string

const (
	ScrapeTaskIdle      ScrapeTaskStatus = "idle"
	ScrapeTaskRunning   ScrapeTaskStatus = "running"
	ScrapeTaskCompleted ScrapeTaskStatus = "completed"
	ScrapeTaskFailed    ScrapeTaskStatus = "failed"
)

// ScrapeTaskState 抓取任务状态
type ScrapeTaskState struct {
	Status        ScrapeTaskStatus `json:"status"`
	StartTime     time.Time        `json:"start_time"`
	EndTime       *time.Time       `json:"end_time,omitempty"`
	TotalServers  int              `json:"total_servers"`
	CurrentServer int              `json:"current_server"`
	CurrentName   string           `json:"current_name,omitempty"`
	SuccessCount  int              `json:"success_count"`
	FailedCount   int              `json:"failed_count"`
	FailedFiles   []string         `json:"failed_files,omitempty"`
	Error         string           `json:"error,omitempty"`
}

// ScrapeTaskManager 抓取任务管理器
type ScrapeTaskManager struct {
	mu    sync.RWMutex
	state ScrapeTaskState
}

// NewScrapeTaskManager 创建任务管理器
func NewScrapeTaskManager() *ScrapeTaskManager {
	return &ScrapeTaskManager{
		state: ScrapeTaskState{
			Status: ScrapeTaskIdle,
		},
	}
}

// GetState 获取当前状态
func (m *ScrapeTaskManager) GetState() ScrapeTaskState {
	m.mu.RLock()
	defer m.mu.RUnlock()
	return m.state
}

// TryStart 尝试开始任务（原子操作，如果已在运行则返回错误）
func (m *ScrapeTaskManager) TryStart(totalServers int) error {
	m.mu.Lock()
	defer m.mu.Unlock()

	if m.state.Status == ScrapeTaskRunning {
		return ErrTaskAlreadyRunning
	}

	m.state = ScrapeTaskState{
		Status:       ScrapeTaskRunning,
		StartTime:    time.Now(),
		TotalServers: totalServers,
		FailedFiles:  make([]string, 0),
	}
	return nil
}

// UpdateProgress 更新进度
func (m *ScrapeTaskManager) UpdateProgress(current int, serverName string) {
	m.mu.Lock()
	defer m.mu.Unlock()
	m.state.CurrentServer = current
	m.state.CurrentName = serverName
}

// IncrementSuccess 增加成功计数
func (m *ScrapeTaskManager) IncrementSuccess() {
	m.mu.Lock()
	defer m.mu.Unlock()
	m.state.SuccessCount++
}

// IncrementFailed 增加失败计数
func (m *ScrapeTaskManager) IncrementFailed(serverName string) {
	m.mu.Lock()
	defer m.mu.Unlock()
	m.state.FailedCount++
	m.state.FailedFiles = append(m.state.FailedFiles, serverName)
}

// Complete 完成任务
func (m *ScrapeTaskManager) Complete() {
	m.mu.Lock()
	defer m.mu.Unlock()
	m.state.Status = ScrapeTaskCompleted
	now := time.Now()
	m.state.EndTime = &now
}

// Fail 任务失败
func (m *ScrapeTaskManager) Fail(err error) {
	m.mu.Lock()
	defer m.mu.Unlock()
	m.state.Status = ScrapeTaskFailed
	now := time.Now()
	m.state.EndTime = &now
	if err != nil {
		m.state.Error = err.Error()
	}
}
