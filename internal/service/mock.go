package service

import (
	"sync"
	"time"

	"mmth-analyzer/internal/scraper"
)

// MockScrapeService mock 抓取服务
type MockScrapeService struct {
	taskManager   *ScrapeTaskManager
	servers       []scraper.ServerConfig
	execDuration  time.Duration
	shouldFail    bool
	called        bool
	callCount     int
	mu            sync.Mutex
}

// NewMockScrapeService 创建 mock 抓取服务
func NewMockScrapeService(servers []scraper.ServerConfig) *MockScrapeService {
	return &MockScrapeService{
		taskManager: NewScrapeTaskManager(),
		servers:     servers,
	}
}

// SetExecDuration 设置模拟执行时长
func (m *MockScrapeService) SetExecDuration(d time.Duration) {
	m.mu.Lock()
	defer m.mu.Unlock()
	m.execDuration = d
}

// SetShouldFail 设置是否模拟失败
func (m *MockScrapeService) SetShouldFail(fail bool) {
	m.mu.Lock()
	defer m.mu.Unlock()
	m.shouldFail = fail
}

// GetCallCount 获取调用次数
func (m *MockScrapeService) GetCallCount() int {
	m.mu.Lock()
	defer m.mu.Unlock()
	return m.callCount
}

// WasCalled 检查是否被调用
func (m *MockScrapeService) WasCalled() bool {
	m.mu.Lock()
	defer m.mu.Unlock()
	return m.called
}

// GetTaskManager 实现 ScrapeServiceInterface
func (m *MockScrapeService) GetTaskManager() *ScrapeTaskManager {
	return m.taskManager
}

// GetServers 实现 ScrapeServiceInterface
func (m *MockScrapeService) GetServers() []scraper.ServerConfig {
	return m.servers
}

// ScrapeAll 实现 ScrapeServiceInterface（模拟异步执行）
func (m *MockScrapeService) ScrapeAll() error {
	m.mu.Lock()
	m.callCount++
	m.called = true
	duration := m.execDuration
	shouldFail := m.shouldFail
	m.mu.Unlock()

	if len(m.servers) == 0 {
		return nil
	}

	if err := m.taskManager.TryStart(len(m.servers)); err != nil {
		return err
	}

	// 模拟执行时长
	if duration > 0 {
		time.Sleep(duration)
	}

	if shouldFail {
		m.taskManager.Fail(ErrTaskAlreadyRunning)
		return ErrTaskAlreadyRunning
	}

	m.taskManager.Complete()
	return nil
}

// ScrapeAccount 实现 ScrapeServiceInterface
func (m *MockScrapeService) ScrapeAccount(url, account, server string) (*scraper.AccountDiamondData, error) {
	return &scraper.AccountDiamondData{
		Timestamp: time.Now().Format("2006-01-02 15:04:05"),
		Server:    server,
		Account:   account,
		Total:     100,
		Free:      50,
		Paid:      50,
	}, nil
}

// MockETLService mock ETL 服务
type MockETLService struct {
	taskManager  *ETLTaskManager
	execDuration time.Duration
	shouldFail   bool
	called       bool
	callCount    int
	mu           sync.Mutex
}

// NewMockETLService 创建 mock ETL 服务
func NewMockETLService() *MockETLService {
	return &MockETLService{
		taskManager: NewETLTaskManager(),
	}
}

// SetExecDuration 设置模拟执行时长
func (m *MockETLService) SetExecDuration(d time.Duration) {
	m.mu.Lock()
	defer m.mu.Unlock()
	m.execDuration = d
}

// SetShouldFail 设置是否模拟失败
func (m *MockETLService) SetShouldFail(fail bool) {
	m.mu.Lock()
	defer m.mu.Unlock()
	m.shouldFail = fail
}

// GetCallCount 获取调用次数
func (m *MockETLService) GetCallCount() int {
	m.mu.Lock()
	defer m.mu.Unlock()
	return m.callCount
}

// WasCalled 检查是否被调用
func (m *MockETLService) WasCalled() bool {
	m.mu.Lock()
	defer m.mu.Unlock()
	return m.called
}

// GetTaskManager 实现 ETLServiceInterface
func (m *MockETLService) GetTaskManager() *ETLTaskManager {
	return m.taskManager
}

// ProcessAllServers 实现 ETLServiceInterface（模拟异步执行）
func (m *MockETLService) ProcessAllServers(servers []scraper.ServerConfig) error {
	m.mu.Lock()
	m.callCount++
	m.called = true
	duration := m.execDuration
	shouldFail := m.shouldFail
	m.mu.Unlock()

	if len(servers) == 0 {
		return nil
	}

	if err := m.taskManager.TryStart(len(servers)); err != nil {
		return err
	}

	// 模拟执行时长
	if duration > 0 {
		time.Sleep(duration)
	}

	if shouldFail {
		m.taskManager.Fail(ErrTaskAlreadyRunning)
		return ErrTaskAlreadyRunning
	}

	m.taskManager.Complete()
	return nil
}

// CombineAllStats 实现 ETLServiceInterface
func (m *MockETLService) CombineAllStats() (map[string]interface{}, error) {
	return map[string]interface{}{
		"mock": true,
	}, nil
}
