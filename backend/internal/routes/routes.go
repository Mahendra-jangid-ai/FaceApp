package routes

import (
	"os"

	"faceapp/backend/internal/handlers"
	"faceapp/backend/internal/middleware"

	"github.com/gin-gonic/gin"
)

func SetupRouter() *gin.Engine {
	r := gin.Default()

	// Global middleware
	r.Use(middleware.CORSMiddleware())

	// Health check
	r.GET("/health", handlers.HealthCheck)

	jwtSecret := os.Getenv("JWT_SECRET")
	if jwtSecret == "" {
		jwtSecret = "change-me-in-production"
	}

	// API v1
	v1 := r.Group("/api/v1")
	{
		// Auth routes (public)
		auth := v1.Group("/auth")
		{
			auth.POST("/register", handlers.Register)
			auth.POST("/login", handlers.Login)
		}

		// Organization routes (public — app setup ke time)
		orgs := v1.Group("/organizations")
		{
			orgs.POST("", handlers.CreateOrganization)
			orgs.GET("", handlers.GetOrganizations)
			orgs.POST("/set-password", handlers.SetOrgPassword)
			orgs.POST("/login", handlers.OrgLogin)
		}

		// Protected routes
		protected := v1.Group("/")
		protected.Use(middleware.AuthRequired(jwtSecret))
		{
			_ = protected // future protected routes yahan aayenge
		}
	}

	return r
}
