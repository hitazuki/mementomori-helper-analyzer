package handlers

import "github.com/gin-gonic/gin"

type Router struct {
	statsHandler     *StatsHandler
	scrapeHandler    *ScrapeHandler
	historyHandler   *HistoryHandler
	etlHandler       *ETLHandler
	caveHandler      *CaveHandler
	challengeHandler *ChallengeHandler
	itemHandler      *ItemHandler
	sourcesHandler   *SourcesHandler
	scheduleHandler  *ScheduleHandler
}

func NewRouter(stats *StatsHandler, scrape *ScrapeHandler, history *HistoryHandler, etl *ETLHandler, cave *CaveHandler, challenge *ChallengeHandler, item *ItemHandler, sources *SourcesHandler, schedule *ScheduleHandler) *Router {
	return &Router{
		statsHandler:     stats,
		scrapeHandler:    scrape,
		historyHandler:   history,
		etlHandler:       etl,
		caveHandler:      cave,
		challengeHandler: challenge,
		itemHandler:      item,
		sourcesHandler:   sources,
		scheduleHandler:  schedule,
	}
}

func (r *Router) Register(e *gin.Engine) {
	api := e.Group("/api")
	{
		api.GET("/health", func(c *gin.Context) {
			c.JSON(200, gin.H{"status": "ok"})
		})

		api.GET("/stats", r.statsHandler.GetStats)
		api.GET("/mmth-diamonds/all", r.statsHandler.GetAllDiamonds)

		api.GET("/mmth-diamonds/history", r.historyHandler.GetAllHistory)
		api.GET("/mmth-diamonds/history/:server/:account", r.historyHandler.GetAccountHistory)

		if r.scrapeHandler != nil {
			api.POST("/scrape/all", r.scrapeHandler.ScrapeAll)
			api.POST("/scrape/account", r.scrapeHandler.ScrapeAccount)
		} else {
			api.POST("/scrape/all", func(c *gin.Context) {
				c.JSON(400, gin.H{"error": "no servers configured"})
			})
			api.POST("/scrape/account", func(c *gin.Context) {
				c.JSON(400, gin.H{"error": "no servers configured"})
			})
		}

		api.POST("/etl/process", r.etlHandler.ProcessServers)
		api.GET("/etl/status", r.etlHandler.GetStatus)
		api.GET("/etl/stats", r.etlHandler.GetCombinedStats)

		api.GET("/cave/stats", r.caveHandler.GetCaveStats)
		api.GET("/challenge/stats", r.challengeHandler.GetChallengeStats)
		api.GET("/rune-ticket/stats", r.itemHandler.GetRuneTicketStats)
		api.GET("/upgrade-panacea/stats", r.itemHandler.GetUpgradePanaceaStats)
		api.GET("/sources", r.sourcesHandler.GetSources)

		api.GET("/config/schedule", r.scheduleHandler.GetSchedule)
		api.PUT("/config/schedule", r.scheduleHandler.UpdateSchedule)
	}
}
