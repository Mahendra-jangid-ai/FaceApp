package middleware

import (
	"net/http"
	"strings"

	"faceapp/backend/internal/config"
	"faceapp/backend/internal/utils"

	"github.com/gin-gonic/gin"
)

// AuthRequired validates the Bearer JWT and sets uid + role in context.
func AuthRequired(cfg *config.Config) gin.HandlerFunc {
	return func(c *gin.Context) {
		header := c.GetHeader("Authorization")
		if header == "" {
			c.AbortWithStatusJSON(http.StatusUnauthorized, gin.H{"error": "Authorization header missing"})
			return
		}

		parts := strings.SplitN(header, " ", 2)
		if len(parts) != 2 || strings.ToLower(parts[0]) != "bearer" {
			c.AbortWithStatusJSON(http.StatusUnauthorized, gin.H{"error": "Invalid authorization format, expected: Bearer <token>"})
			return
		}

		claims, err := utils.ParseToken(cfg, parts[1])
		if err != nil {
			c.AbortWithStatusJSON(http.StatusUnauthorized, gin.H{"error": "Invalid or expired token"})
			return
		}

		// Inject validated claims into context
		c.Set("uid", claims.UserID)
		c.Set("role", claims.Role)
		c.Next()
	}
}

// OrgAdminRequired allows only org_admin role (must run after AuthRequired).
func OrgAdminRequired() gin.HandlerFunc {
	return func(c *gin.Context) {
		role, _ := c.Get("role")
		if role != "org_admin" {
			c.AbortWithStatusJSON(http.StatusForbidden, gin.H{"error": "Organization admin access required"})
			return
		}
		c.Next()
	}
}

// AdminRequired allows only admin role (must run after AuthRequired).
func AdminRequired() gin.HandlerFunc {
	return func(c *gin.Context) {
		role, _ := c.Get("role")
		if role != "admin" {
			c.AbortWithStatusJSON(http.StatusForbidden, gin.H{"error": "Admin access required"})
			return
		}
		c.Next()
	}
}
