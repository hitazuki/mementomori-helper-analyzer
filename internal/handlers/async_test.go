package handlers

import (
	"net/http"
	"net/http/httptest"
	"strings"
	"testing"
	"time"

	"mmth-analyzer/internal/scraper"
	"mmth-analyzer/internal/service"

	"github.com/gin-gonic/gin"
)

func init() {
	gin.SetMode(gin.TestMode)
}

// 测试抓取异步调用
func TestScrapeHandler_AsyncExecution(t *testing.T) {
	servers := []scraper.ServerConfig{
		{Name: "test-server", BaseURL: "http://test.com", Accounts: []string{"user1"}},
	}

	mockService := service.NewMockScrapeService(servers)
	// 设置执行时长 2 秒，验证异步返回
	mockService.SetExecDuration(2 * time.Second)

	handler := &ScrapeHandler{
		scrapeService: mockService,
		servers:       servers,
	}

	// 创建测试路由
	r := gin.New()
	r.POST("/scrape/all", handler.ScrapeAll)
	r.GET("/scrape/status", handler.GetStatus)

	// 1. 触发抓取
	req := httptest.NewRequest(http.MethodPost, "/scrape/all", nil)
	w := httptest.NewRecorder()
	r.ServeHTTP(w, req)

	// 验证立即返回 202
	if w.Code != http.StatusAccepted {
		t.Errorf("expected status 202, got %d", w.Code)
	}

	// 验证响应体
	body := w.Body.String()
	if !strings.Contains(body, `"status":"running"`) {
		t.Errorf("expected status running, got %s", body)
	}

	// 2. 立即查询状态（应为 running）
	req = httptest.NewRequest(http.MethodGet, "/scrape/status", nil)
	w = httptest.NewRecorder()
	r.ServeHTTP(w, req)

	if w.Code != http.StatusOK {
		t.Errorf("expected status 200, got %d", w.Code)
	}

	body = w.Body.String()
	if !strings.Contains(body, `"status":"running"`) {
		t.Errorf("expected status running, got %s", body)
	}

	// 3. 等待执行完成
	time.Sleep(3 * time.Second)

	// 4. 再次查询状态（应为 completed）
	req = httptest.NewRequest(http.MethodGet, "/scrape/status", nil)
	w = httptest.NewRecorder()
	r.ServeHTTP(w, req)

	body = w.Body.String()
	if !strings.Contains(body, `"status":"completed"`) {
		t.Errorf("expected status completed, got %s", body)
	}

	// 验证被调用
	if !mockService.WasCalled() {
		t.Error("expected ScrapeAll to be called")
	}
}

// 测试抓取并发控制
func TestScrapeHandler_ConcurrentPrevention(t *testing.T) {
	servers := []scraper.ServerConfig{
		{Name: "test-server", BaseURL: "http://test.com", Accounts: []string{"user1"}},
	}

	mockService := service.NewMockScrapeService(servers)
	// 设置长执行时间
	mockService.SetExecDuration(5 * time.Second)

	handler := &ScrapeHandler{
		scrapeService: mockService,
		servers:       servers,
	}

	r := gin.New()
	r.POST("/scrape/all", handler.ScrapeAll)
	r.GET("/scrape/status", handler.GetStatus)

	// 第一次触发
	req1 := httptest.NewRequest(http.MethodPost, "/scrape/all", nil)
	w1 := httptest.NewRecorder()
	r.ServeHTTP(w1, req1)

	if w1.Code != http.StatusAccepted {
		t.Errorf("first request: expected 202, got %d", w1.Code)
	}

	// 验证状态为 running
	req := httptest.NewRequest(http.MethodGet, "/scrape/status", nil)
	w := httptest.NewRecorder()
	r.ServeHTTP(w, req)
	status := w.Body.String()

	if !strings.Contains(status, `"status":"running"`) {
		t.Errorf("expected running status, got %s", status)
	}
}

// 测试 ETL 异步调用
func TestETLHandler_AsyncExecution(t *testing.T) {
	servers := []scraper.ServerConfig{
		{Name: "server1", LogPath: "/tmp/test.log"},
	}

	mockService := service.NewMockETLService()
	mockService.SetExecDuration(2 * time.Second)

	handler := &ETLHandler{
		etlService: mockService,
		servers:    servers,
	}

	r := gin.New()
	r.POST("/etl/process", handler.ProcessServers)
	r.GET("/etl/status", handler.GetStatus)

	// 1. 触发 ETL
	req := httptest.NewRequest(http.MethodPost, "/etl/process", nil)
	w := httptest.NewRecorder()
	r.ServeHTTP(w, req)

	if w.Code != http.StatusAccepted {
		t.Errorf("expected status 202, got %d", w.Code)
	}

	body := w.Body.String()
	if !strings.Contains(body, `"status":"running"`) {
		t.Errorf("expected status running, got %s", body)
	}

	// 2. 查询状态
	req = httptest.NewRequest(http.MethodGet, "/etl/status", nil)
	w = httptest.NewRecorder()
	r.ServeHTTP(w, req)

	if !strings.Contains(w.Body.String(), `"status":"running"`) {
		t.Errorf("expected running status, got %s", w.Body.String())
	}

	// 3. 等待完成
	time.Sleep(3 * time.Second)

	req = httptest.NewRequest(http.MethodGet, "/etl/status", nil)
	w = httptest.NewRecorder()
	r.ServeHTTP(w, req)

	if !strings.Contains(w.Body.String(), `"status":"completed"`) {
		t.Errorf("expected completed status, got %s", w.Body.String())
	}
}

// 测试空配置
func TestHandlers_NoServers(t *testing.T) {
	handler := &ScrapeHandler{
		scrapeService: nil,
		servers:       []scraper.ServerConfig{},
	}

	r := gin.New()
	r.POST("/scrape/all", handler.ScrapeAll)

	req := httptest.NewRequest(http.MethodPost, "/scrape/all", nil)
	w := httptest.NewRecorder()
	r.ServeHTTP(w, req)

	if w.Code != http.StatusBadRequest {
		t.Errorf("expected 400, got %d", w.Code)
	}

	if !strings.Contains(w.Body.String(), "no servers configured") {
		t.Errorf("expected error message, got %s", w.Body.String())
	}
}
