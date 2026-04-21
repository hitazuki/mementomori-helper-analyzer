package scraper

import (
	"context"
	"encoding/json"
	"fmt"
	"os"
	"os/exec"
	"path/filepath"
	"regexp"
	"strconv"
	"strings"
	"time"

	"github.com/chromedp/chromedp"
)

// AccountDiamondData 单个账号的钻石数据
type AccountDiamondData struct {
	Timestamp string `json:"timestamp"`
	Server    string `json:"server"`
	Account   string `json:"account"`
	Total     int    `json:"total"`
	Free      int    `json:"free"`
	Paid      int    `json:"paid"`
	Error     string `json:"error,omitempty"`
}

// ScrapeResult 单个账号抓取结果
type ScrapeResult struct {
	Success bool                 `json:"success"`
	Data    []AccountDiamondData `json:"data"`
	Message string               `json:"message"`
}

// MultiScrapeResult 多账号批量抓取结果
type MultiScrapeResult struct {
	ScrapeTime string               `json:"scrape_time"`
	Results    []AccountDiamondData `json:"results"`
}

// ServerConfig 服务器配置
type ServerConfig struct {
	Name     string   `json:"name"`
	BaseURL  string   `json:"base_url"`
	Accounts []string `json:"accounts"`
	LogPath  string   `json:"log_path,omitempty"` // 该服务器的日志文件路径
}

// ScrapeConfig 抓取配置
type ScrapeConfig struct {
	Servers []ServerConfig `json:"servers"`
}

// CheckChrome 检查 Chrome/Chromium 是否可用
func CheckChrome() error {
	// 检查环境变量指定的 Chrome
	if chromePath := os.Getenv("CHROME_BIN"); chromePath != "" {
		if _, err := exec.LookPath(chromePath); err == nil {
			return nil
		}
	}

	// 检查常见的 Chrome/Chromium 路径
	chromePaths := []string{
		"chromium-browser",
		"chromium",
		"google-chrome",
		"chrome",
		// Windows
		"C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe",
		"C:\\Program Files (x86)\\Google\\Chrome\\Application\\chrome.exe",
		// macOS
		"/Applications/Google Chrome.app/Contents/MacOS/Google Chrome",
		// Linux common paths
		"/usr/bin/chromium-browser",
		"/usr/bin/chromium",
		"/usr/bin/google-chrome",
		"/usr/bin/chrome",
	}

	for _, path := range chromePaths {
		if _, err := exec.LookPath(path); err == nil {
			return nil
		}
		// 检查绝对路径
		if _, err := os.Stat(path); err == nil {
			return nil
		}
	}

	return fmt.Errorf("未找到 Chrome/Chromium 浏览器，请安装后再使用抓取功能")
}

// isChromeNotFoundError 检查错误是否为 Chrome 未找到
func isChromeNotFoundError(err error) bool {
	if err == nil {
		return false
	}
	errStr := err.Error()
	return strings.Contains(errStr, "exec:") &&
		strings.Contains(errStr, "executable file not found")
}

// ScrapeAccount 抓取单个账号的钻石数据
func ScrapeAccount(mmthUrl, account, serverName string) (*AccountDiamondData, error) {
	// 检查 Chrome/Chromium 是否可用
	if err := CheckChrome(); err != nil {
		return nil, err
	}

	// 配置 Chrome 选项（支持无头/容器环境）
	opts := append(chromedp.DefaultExecAllocatorOptions[:],
		chromedp.Flag("headless", true),
		chromedp.Flag("no-sandbox", true),
		chromedp.Flag("disable-dev-shm-usage", true),
		chromedp.Flag("disable-gpu", true),
		chromedp.Flag("disable-setuid-sandbox", true),
	)

	// 创建 allocator
	allocCtx, cancel := chromedp.NewExecAllocator(context.Background(), opts...)
	defer cancel()

	// 创建 chromedp 上下文
	ctx, cancel := chromedp.NewContext(allocCtx)
	defer cancel()

	// 设置超时（90秒）
	ctx, cancel = context.WithTimeout(ctx, 90*time.Second)
	defer cancel()

	var pageContent string

	// 抓取主页
	err := chromedp.Run(ctx,
		chromedp.Navigate(mmthUrl),
		chromedp.WaitReady("body"),
		chromedp.Sleep(5*time.Second),
	)
	if err != nil {
		// 检查是否是 Chrome 未找到错误
		if isChromeNotFoundError(err) {
			return nil, fmt.Errorf("未找到 Chrome/Chromium 浏览器，请安装后再使用抓取功能")
		}
		return nil, fmt.Errorf("navigate failed: %w", err)
	}

	// 点击下拉框展开选项
	err = chromedp.Run(ctx,
		chromedp.Click(".mud-select", chromedp.ByQuery),
		chromedp.Sleep(2*time.Second),
	)
	if err != nil {
		return nil, fmt.Errorf("click dropdown failed: %w", err)
	}

	// 点击指定账号
	err = chromedp.Run(ctx,
		chromedp.Click(fmt.Sprintf("//p[contains(text(), '%s')]", account), chromedp.BySearch),
		chromedp.Sleep(5*time.Second),
		chromedp.WaitReady("body"),
		chromedp.Sleep(3*time.Second),
	)
	if err != nil {
		return nil, fmt.Errorf("select account %s failed: %w", account, err)
	}

	// 获取页面内容
	err = chromedp.Run(ctx, chromedp.OuterHTML("body", &pageContent))
	if err != nil {
		return nil, fmt.Errorf("get html failed: %w", err)
	}

	// 解析钻石数据
	total, free, paid, parseErr := parseDiamonds(pageContent)
	if parseErr != nil {
		return nil, fmt.Errorf("parse diamonds failed for account %s: %w", account, parseErr)
	}

	return &AccountDiamondData{
		Timestamp: time.Now().Format("2006-01-02 15:04:05"),
		Server:    serverName,
		Account:   account,
		Total:     total,
		Free:      free,
		Paid:      paid,
	}, nil
}

// ScrapeAllServers 抓取所有配置的账号（顺序执行，失败延长等待）
func ScrapeAllServers(servers []ServerConfig, dataDir string) error {
	allResults := MultiScrapeResult{
		ScrapeTime: time.Now().Format("2006-01-02 15:04:05"),
		Results:    []AccountDiamondData{},
	}

	// 基础延迟配置
	const (
		baseAccountDelay   = 3 * time.Second  // 基础账号间延迟
		baseServerDelay    = 5 * time.Second  // 基础服务器间延迟
		failDelayIncrement = 15 * time.Second // 失败重试间隔（给足恢复时间）
		maxRetryAttempts   = 1                // 最大重试次数
	)

	consecutiveFailures := 0 // 连续失败计数

	for _, server := range servers {
		fmt.Printf("Scraping server: %s (%s)\n", server.Name, server.BaseURL)

		for _, account := range server.Accounts {
			fmt.Printf("  Scraping account: %s\n", account)

			// 尝试抓取（带重试）
			var data *AccountDiamondData
			var err error
			attempt := 0

			for attempt <= maxRetryAttempts {
				data, err = ScrapeAccount(server.BaseURL, account, server.Name)
				if err == nil {
					break // 成功，跳出重试循环
				}

				attempt++
				fmt.Printf("  Attempt %d/%d failed: %v\n", attempt, maxRetryAttempts, err)

				if attempt <= maxRetryAttempts {
					// 固定间隔重试
					fmt.Printf("  Waiting %v before retry...\n", failDelayIncrement)
					time.Sleep(failDelayIncrement)
				}
			}

			if err != nil {
				// 所有重试都失败，记录错误信息
				fmt.Printf("  All attempts failed for %s: %v\n", account, err)
				allResults.Results = append(allResults.Results, AccountDiamondData{
					Timestamp: time.Now().Format("2006-01-02 15:04:05"),
					Server:    server.Name,
					Account:   account,
					Error:     err.Error(),
				})
				consecutiveFailures++
			} else {
				fmt.Printf("  Success: total=%d, free=%d, paid=%d\n", data.Total, data.Free, data.Paid)
				allResults.Results = append(allResults.Results, *data)
				consecutiveFailures = 0 // 重置连续失败计数
			}

			// 计算下一次抓取的延迟（根据失败次数动态调整）
			delay := baseAccountDelay
			if consecutiveFailures > 0 {
				// 有连续失败，增加延迟
				delay += time.Duration(consecutiveFailures) * failDelayIncrement
				fmt.Printf("  Increasing delay to %v (consecutive failures: %d)\n", delay, consecutiveFailures)
			}

			time.Sleep(delay)
		}

		// 服务器间延迟（也根据失败情况调整）
		serverDelay := baseServerDelay
		if consecutiveFailures > 0 {
			serverDelay += time.Duration(consecutiveFailures) * failDelayIncrement * 2
		}
		fmt.Printf("  Server delay: %v\n", serverDelay)
		time.Sleep(serverDelay)
	}

	// 保存最新结果（覆盖写入）
	if err := saveLatestData(dataDir, allResults); err != nil {
		return fmt.Errorf("save results failed: %w", err)
	}

	// 同时保存历史记录（按账号分文件）
	if err := saveAccountHistories(dataDir, allResults); err != nil {
		fmt.Printf("Warning: save account histories failed: %v\n", err)
	}

	return nil
}

// AccountHistoryRecord 单个账号历史记录中的数据（简化版，不含server/account）
type AccountHistoryRecord struct {
	Timestamp string `json:"timestamp"`
	Total     int    `json:"total"`
	Free      int    `json:"free"`
	Paid      int    `json:"paid"`
}

// saveLatestData 保存最新数据（覆盖写入）
func saveLatestData(dataDir string, result MultiScrapeResult) error {
	saveDir := filepath.Join(dataDir, "scrape", "diamonds")
	if err := os.MkdirAll(saveDir, 0755); err != nil {
		return fmt.Errorf("create scrape dir failed: %w", err)
	}
	savePath := filepath.Join(saveDir, "mmth_diamonds.json")
	data, _ := json.MarshalIndent(result, "", "  ")
	return os.WriteFile(savePath, data, 0644)
}

// saveAccountHistories 按账号保存历史记录到独立文件
func saveAccountHistories(dataDir string, result MultiScrapeResult) error {
	historyDir := filepath.Join(dataDir, "scrape", "diamonds", "history")
	if err := os.MkdirAll(historyDir, 0755); err != nil {
		return fmt.Errorf("create history dir failed: %w", err)
	}

	for _, r := range result.Results {
		// 跳过错误记录
		if r.Error != "" || r.Total == 0 {
			continue
		}

		// 文件名格式：服务器-账号-diamonds.json
		filename := fmt.Sprintf("%s-%s-diamonds.json", r.Server, r.Account)
		filepath_ := filepath.Join(historyDir, filename)

		// 读取现有历史
		var history []AccountHistoryRecord
		if data, err := os.ReadFile(filepath_); err == nil {
			json.Unmarshal(data, &history)
		}

		// 追加新记录
		record := AccountHistoryRecord{
			Timestamp: r.Timestamp,
			Total:     r.Total,
			Free:      r.Free,
			Paid:      r.Paid,
		}
		history = append(history, record)

		// 限制历史记录数量（保留最近200条）
		if len(history) > 200 {
			history = history[len(history)-200:]
		}

		// 保存
		data, _ := json.MarshalIndent(history, "", "  ")
		if err := os.WriteFile(filepath_, data, 0644); err != nil {
			return fmt.Errorf("save history for %s failed: %w", r.Account, err)
		}
	}

	return nil
}

// parseDiamonds 从 HTML 解析钻石数据（支持英文、繁体中文、日语、韩语）
func parseDiamonds(html string) (total, free, paid int, err error) {
	// 支持四种语言格式：
	// 英文：Diamonds : X, Free Diamonds Y, Paid Diamonds Z
	// 繁中：鑽石 : X, 免費鑽石 Y, 付費鑽石 Z
	// 日语：ダイヤ : X, 無償ダイヤ Y, 有償ダイヤ Z
	// 韩语：다이아 : X, 무료 다이아 Y, 유료 다이아 Z
	re := regexp.MustCompile(`(?:Diamonds|鑽石|ダイヤ|다이아)\s*:\s*(\d+)\s*,\s*(?:Free Diamonds|免費鑽石|無償ダイヤ|무료 다이아)\s+(\d+)\s*,\s*(?:Paid Diamonds|付費鑽石|有償ダイヤ|유료 다이아)\s+(\d+)`)
	matches := re.FindStringSubmatch(html)

	if len(matches) < 4 {
		return 0, 0, 0, fmt.Errorf("failed to parse diamond data from HTML")
	}

	total, _ = strconv.Atoi(matches[1])
	free, _ = strconv.Atoi(matches[2])
	paid, _ = strconv.Atoi(matches[3])

	return total, free, paid, nil
}

// ScrapeMmthDiamonds 兼容旧接口 - 抓取默认账号
func ScrapeMmthDiamonds(mmthUrl, dataDir string) (*ScrapeResult, error) {
	data, err := ScrapeAccount(mmthUrl, "", "default")
	if err != nil {
		return &ScrapeResult{Success: false, Message: err.Error()}, err
	}

	result := &ScrapeResult{
		Success: true,
		Data:    []AccountDiamondData{*data},
		Message: "Scraped 1 account",
	}

	// 保存到文件（兼容旧格式）
	saveDir := filepath.Join(dataDir, "scrape", "diamonds")
	os.MkdirAll(saveDir, 0755)
	savePath := filepath.Join(saveDir, "mmth_diamonds.json")
	jsonData, _ := json.MarshalIndent(result.Data, "", "  ")
	os.WriteFile(savePath, jsonData, 0644)

	return result, nil
}
