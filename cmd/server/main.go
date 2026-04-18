package main

import (
	"fmt"
	"path/filepath"
	"sync"

	"mmth-analyzer/internal/config"
	"mmth-analyzer/internal/handlers"
	"mmth-analyzer/internal/scheduler"
	"mmth-analyzer/internal/service"

	"github.com/gin-contrib/cors"
	"github.com/gin-contrib/static"
	"github.com/gin-gonic/gin"
)

func main() {
	// 加载配置
	cfg := config.LoadConfig()
	printConfig(cfg)

	// 创建互斥锁（防止并发抓取）
	scrapeMutex := &sync.Mutex{}

	// 创建服务
	diamondService := service.NewDiamondService(cfg.DataDir)
	var scrapeService *service.ScrapeService
	if cfg.ScrapeCfg != nil {
		scrapeService = service.NewScrapeService(cfg.DataDir, cfg.ScrapeCfg.Servers, scrapeMutex)
	}
	etlService := service.NewETLService(cfg.EtlBinaryPath, cfg.MmthLogsDir, cfg.EtlOutputDir)

	// 创建处理器
	diamondStatsPath := filepath.Join(cfg.EtlOutputDir, "diamond_stats.json")
	statsHandler := handlers.NewStatsHandler(diamondService, diamondStatsPath)
	var scrapeHandler *handlers.ScrapeHandler
	if scrapeService != nil {
		scrapeHandler = handlers.NewScrapeHandler(scrapeService)
	}
	historyHandler := handlers.NewHistoryHandler(diamondService)
	etlHandler := handlers.NewETLHandler(etlService)

	// 启动定时任务
	if cfg.ScrapeCfg != nil && len(cfg.ScrapeCfg.Servers) > 0 {
		sch := scheduler.NewScheduler(cfg.ScrapeInterval, cfg.ScrapeCfg.Servers, cfg.DataDir, scrapeMutex)
		sch.Start()
		defer sch.Stop()
	}

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

	// 注册 API 路由
	router := handlers.NewRouter(statsHandler, scrapeHandler, historyHandler, etlHandler)
	router.Register(r)

	// 启动服务器
	r.Run(":" + cfg.Port)
}

func printConfig(cfg *config.Config) {
	fmt.Printf("Port: %s\n", cfg.Port)
	fmt.Printf("DataDir: %s\n", cfg.DataDir)
	fmt.Printf("ScrapeInterval: %v\n", cfg.ScrapeInterval)
	if cfg.ScrapeCfg != nil {
		fmt.Printf("ScrapeServers: %d\n", len(cfg.ScrapeCfg.Servers))
	}
}
