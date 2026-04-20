package handlers

import (
	"github.com/gin-gonic/gin"
)

// Router 路由注册器
type Router struct {
	statsHandler        *StatsHandler
	scrapeHandler       *ScrapeHandler
	historyHandler      *HistoryHandler
	etlHandler          *ETLHandler
	caveHandler         *CaveHandler
	challengeHandler    *ChallengeHandler
	itemHandler         *ItemHandler
}

// NewRouter 创建路由注册器
func NewRouter(stats *StatsHandler, scrape *ScrapeHandler, history *HistoryHandler, etl *ETLHandler, cave *CaveHandler, challenge *ChallengeHandler, item *ItemHandler) *Router {
	return &Router{
		statsHandler:     stats,
		scrapeHandler:    scrape,
		historyHandler:   history,
		etlHandler:       etl,
		caveHandler:      cave,
		challengeHandler: challenge,
		itemHandler:      item,
	}
}

// Register 注册所有路由
func (r *Router) Register(e *gin.Engine) {
	api := e.Group("/api")
	{
		// 健康检查
		api.GET("/health", func(c *gin.Context) {
			c.JSON(200, gin.H{"status": "ok"})
		})

		// 统计数据
		api.GET("/stats", r.statsHandler.GetStats)
		api.GET("/mmth-diamonds/all", r.statsHandler.GetAllDiamonds)

		// 历史数据
		api.GET("/mmth-diamonds/history", r.historyHandler.GetAllHistory)
		api.GET("/mmth-diamonds/history/:server/:account", r.historyHandler.GetAccountHistory)

		// 抓取
		api.POST("/scrape/all", r.scrapeHandler.ScrapeAll)
		api.POST("/scrape/account", r.scrapeHandler.ScrapeAccount)

		// ETL处理
		api.POST("/etl/process", r.etlHandler.ProcessServers)
		api.GET("/etl/stats", r.etlHandler.GetCombinedStats)

		// 洞穴统计
		api.GET("/cave/stats", r.caveHandler.GetCaveStats)

		// 挑战统计
		api.GET("/challenge/stats", r.challengeHandler.GetChallengeStats)

		// 物品统计
		api.GET("/rune-ticket/stats", r.itemHandler.GetRuneTicketStats)
		api.GET("/upgrade-panacea/stats", r.itemHandler.GetUpgradePanaceaStats)
	}
}
