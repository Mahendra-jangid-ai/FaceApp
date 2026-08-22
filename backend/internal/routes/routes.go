package routes

import (
	"faceapp/backend/internal/config"
	"faceapp/backend/internal/handlers"
	"faceapp/backend/internal/middleware"

	"github.com/gin-gonic/gin"
)

func SetupRouter(cfg *config.Config) *gin.Engine {
	if cfg.Env == "production" {
		gin.SetMode(gin.ReleaseMode)
	}

	r := gin.New()
	r.Use(gin.Logger())
	r.Use(gin.Recovery())

	// ── Global middleware ────────────────────────────────────────────
	r.Use(middleware.SecurityHeaders())
	r.Use(middleware.CORSMiddleware(cfg))

	// ── Health (no auth, no rate-limit) ─────────────────────────────
	r.GET("/health", handlers.HealthCheck)

	// ── API v1 ──────────────────────────────────────────────────────
	v1 := r.Group("/api/v1")

	// ── PUBLIC: Auth ─────────────────────────────────────────────────
	// Rate-limited: 10 req/min per IP by default
	auth := v1.Group("/auth")
	auth.Use(middleware.RateLimit(cfg.RateLimitRPM))
	{
		auth.POST("/register", handlers.Register(cfg))
		auth.POST("/login", handlers.Login(cfg))
	}

	// ── PUBLIC: Organization onboarding & login ───────────────────────
	orgPublic := v1.Group("/organizations")
	orgPublic.Use(middleware.RateLimit(cfg.RateLimitRPM))
	{
		orgPublic.POST("", handlers.CreateOrganization)           // Sign up
		orgPublic.POST("/set-password", handlers.SetOrgPassword(cfg)) // One-time password set
		orgPublic.POST("/login", handlers.OrgLogin(cfg))          // Login
	}

	// ── PROTECTED: Org admin routes (JWT required, org_admin role) ───
	orgAdmin := v1.Group("/organizations")
	orgAdmin.Use(middleware.AuthRequired(cfg))
	orgAdmin.Use(middleware.OrgAdminRequired())
	{
		orgAdmin.GET("/me", handlers.GetOrganizations) // Own org profile
	}

	// ── PROTECTED: Generic user routes ────────────────────────────────
	user := v1.Group("/")
	user.Use(middleware.AuthRequired(cfg))
	{
		// Future user-scoped routes here
		_ = user
	}

	return r
}
