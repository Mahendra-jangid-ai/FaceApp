package middleware

import "github.com/gin-gonic/gin"

// SecurityHeaders sets OWASP-recommended HTTP security headers.
func SecurityHeaders() gin.HandlerFunc {
	return func(c *gin.Context) {
		// Prevent MIME-type sniffing
		c.Header("X-Content-Type-Options", "nosniff")
		// Prevent clickjacking
		c.Header("X-Frame-Options", "DENY")
		// Enable XSS protection in older browsers
		c.Header("X-XSS-Protection", "1; mode=block")
		// Strict Transport Security (1 year)
		c.Header("Strict-Transport-Security", "max-age=31536000; includeSubDomains")
		// Remove server fingerprint
		c.Header("Server", "")
		c.Header("X-Powered-By", "")
		// Content Security Policy — API only, no browser rendering needed
		c.Header("Content-Security-Policy", "default-src 'none'")
		// Referrer policy
		c.Header("Referrer-Policy", "no-referrer")
		// Permissions policy
		c.Header("Permissions-Policy", "geolocation=(), camera=(), microphone=()")

		c.Next()
	}
}
