package handlers

import (
	"mmth-analyzer/internal/sources"
	"net/http"

	"github.com/gin-gonic/gin"
)

// SourcesHandler handles source translation API
type SourcesHandler struct{}

// NewSourcesHandler creates a new sources handler
func NewSourcesHandler() *SourcesHandler {
	return &SourcesHandler{}
}

// GetSources returns all source translations for frontend i18n
// GET /api/sources
func (h *SourcesHandler) GetSources(c *gin.Context) {
	sources := sources.GetAll()
	c.JSON(http.StatusOK, sources)
}
