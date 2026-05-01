package service

import (
	"errors"
	"sync"
	"time"
)

// ErrTaskAlreadyRunning 任务已在运行
var ErrTaskAlreadyRunning = errors.New("任务已在运行中")

// TaskStatus 任务状态
type TaskStatus string

const (
	TaskIdle      TaskStatus = "idle"
	TaskRunning   TaskStatus = "running"
	TaskCompleted TaskStatus = "completed"
	TaskFailed    TaskStatus = "failed"
)

// ETLTaskState ETL 任务状态
type ETLTaskState struct {
	Status        TaskStatus `json:"status"`
	StartTime     time.Time  `json:"start_time"`
	EndTime       *time.Time `json:"end_time,omitempty"`
	TotalServers  int        `json:"total_servers"`
	CurrentServer int        `json:"current_server"`
	CurrentName   string     `json:"current_name,omitempty"`
	SuccessCount  int        `json:"success_count"`
	FailedCount   int        `json:"failed_count"`
	FailedFiles   []string   `json:"failed_files,omitempty"`
	Error         string     `json:"error,omitempty"`
}

// ETLTaskManager ETL 任务管理器
type ETLTaskManager struct {
	mu    sync.RWMutex
	state ETLTaskState
}

// NewETLTaskManager 创建任务管理器
func NewETLTaskManager() *ETLTaskManager {
	return &ETLTaskManager{
		state: ETLTaskState{
			Status: TaskIdle,
		},
	}
}

// GetState 获取当前状态
func (m *ETLTaskManager) GetState() ETLTaskState {
	m.mu.RLock()
	defer m.mu.RUnlock()
	return m.state
}

// IsRunning 检查是否正在运行（用于外部状态查询）
func (m *ETLTaskManager) IsRunning() bool {
	m.mu.RLock()
	defer m.mu.RUnlock()
	return m.state.Status == TaskRunning
}

// TryStart 尝试开始任务（原子操作，如果已在运行则返回错误）
func (m *ETLTaskManager) TryStart(totalServers int) error {
	m.mu.Lock()
	defer m.mu.Unlock()

	if m.state.Status == TaskRunning {
		return ErrTaskAlreadyRunning
	}

	m.state = ETLTaskState{
		Status:       TaskRunning,
		StartTime:    time.Now(),
		TotalServers: totalServers,
		FailedFiles:  make([]string, 0),
	}
	return nil
}

// UpdateProgress 更新进度
func (m *ETLTaskManager) UpdateProgress(current int, serverName string) {
	m.mu.Lock()
	defer m.mu.Unlock()
	m.state.CurrentServer = current
	m.state.CurrentName = serverName
}

// IncrementSuccess 增加成功计数
func (m *ETLTaskManager) IncrementSuccess() {
	m.mu.Lock()
	defer m.mu.Unlock()
	m.state.SuccessCount++
}

// IncrementFailed 增加失败计数
func (m *ETLTaskManager) IncrementFailed(serverName string) {
	m.mu.Lock()
	defer m.mu.Unlock()
	m.state.FailedCount++
	m.state.FailedFiles = append(m.state.FailedFiles, serverName)
}

// Complete 完成任务
func (m *ETLTaskManager) Complete() {
	m.mu.Lock()
	defer m.mu.Unlock()
	m.state.Status = TaskCompleted
	now := time.Now()
	m.state.EndTime = &now
}

// Fail 任务失败
func (m *ETLTaskManager) Fail(err error) {
	m.mu.Lock()
	defer m.mu.Unlock()
	m.state.Status = TaskFailed
	now := time.Now()
	m.state.EndTime = &now
	if err != nil {
		m.state.Error = err.Error()
	}
}
