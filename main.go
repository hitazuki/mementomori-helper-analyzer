package main

import (
	"encoding/json"
	"fmt"
	"os"
	"strings"
	"sync"

	"mmth-analyzer/handlers"
	"mmth-analyzer/scraper"

	"github.com/gin-contrib/cors"
	"github.com/gin-contrib/static"
	"github.com/gin-gonic/gin"
)

// scrapeMutex 全局互斥锁，防止并发抓取
var scrapeMutex sync.Mutex

// config 全局配置（供 handler 使用）
var config *Config

func main() {
	// 初始化配置
	config = LoadConfig()
	printConfig(config)

	// 启动定时任务
	scheduler := NewScheduler(config)
	scheduler.Start()
	defer scheduler.Stop()

	// 初始化 Gin
	r := gin.Default()
	r.Use(cors.New(cors.Config{
		AllowOrigins:     []string{"*"},
		AllowMethods:     []string{"GET", "POST", "OPTIONS"},
		AllowHeaders:     []string{"Origin", "Content-Type"},
		ExposeHeaders:    []string{"Content-Length"},
		AllowCredentials: true,
	}))

	// 静态文件服务
	r.Use(static.Serve("/", static.LocalFile("./static", false)))
	r.NoRoute(func(c *gin.Context) {
		c.File("./static/index.html")
	})

	// API 路由
	setupRoutes(r)

	r.Run(":" + config.Port)
}

func printConfig(cfg *Config) {
	fmt.Printf("Port: %s\n", cfg.Port)
	fmt.Printf("DataDir: %s\n", cfg.DataDir)
	fmt.Printf("ScrapeInterval: %v\n", cfg.ScrapeInterval)
	if cfg.ScrapeCfg != nil {
		fmt.Printf("ScrapeServers: %d\n", len(cfg.ScrapeCfg.Servers))
	}
}

func setupRoutes(r *gin.Engine) {
	api := r.Group("/api")
	{
		api.GET("/stats", handlers.GetStats)
		api.POST("/scrape/all", handleScrapeAll)
		api.GET("/mmth-diamonds/all", handleGetAllDiamonds)
		api.GET("/mmth-diamonds/history/:server/:account", handleGetAccountHistory)
		api.GET("/mmth-diamonds/history", handleGetAllHistory)
		api.POST("/scrape/account", handleScrapeAccount)
	}
}

func handleScrapeAll(c *gin.Context) {
	if config.ScrapeCfg == nil {
		c.JSON(500, gin.H{"error": "Scrape config not loaded"})
		return
	}

	if !scrapeMutex.TryLock() {
		c.JSON(429, gin.H{"error": "Another scrape is in progress, please try again later"})
		return
	}
	defer scrapeMutex.Unlock()

	if err := scraper.ScrapeAllServers(config.ScrapeCfg.Servers, config.DataDir); err != nil {
		c.JSON(500, gin.H{"error": err.Error()})
		return
	}

	c.JSON(200, gin.H{
		"success": true,
		"message": "All accounts scraped successfully",
	})
}

func handleGetAllDiamonds(c *gin.Context) {
	c.File(config.DataDir + "/mmth_diamonds.json")
}

func handleGetAccountHistory(c *gin.Context) {
	server := c.Param("server")
	account := c.Param("account")
	filepath := config.DataDir + "/history/" + server + "-" + account + "-diamonds.json"

	if _, err := os.Stat(filepath); os.IsNotExist(err) {
		c.JSON(404, gin.H{"error": "History not found for " + account})
		return
	}

	c.File(filepath)
}

func handleGetAllHistory(c *gin.Context) {
	historyDir := config.DataDir + "/history"

	files, err := os.ReadDir(historyDir)
	if err != nil {
		c.JSON(500, gin.H{"error": "Failed to read history directory"})
		return
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

		data, err := os.ReadFile(historyDir + "/" + file.Name())
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

	c.JSON(200, result)
}

func handleScrapeAccount(c *gin.Context) {
	var req struct {
		URL     string `json:"url" binding:"required"`
		Account string `json:"account" binding:"required"`
		Server  string `json:"server"`
	}

	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(400, gin.H{"error": err.Error()})
		return
	}

	if req.Server == "" {
		req.Server = "manual"
	}

	data, err := scraper.ScrapeAccount(req.URL, req.Account, req.Server)
	if err != nil {
		c.JSON(500, gin.H{"error": err.Error()})
		return
	}

	c.JSON(200, gin.H{
		"success": true,
		"data":    data,
	})
}
