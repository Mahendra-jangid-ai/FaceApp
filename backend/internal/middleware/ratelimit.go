package middleware

import (
	"net/http"
	"strconv"
	"sync"
	"time"

	"github.com/gin-gonic/gin"
)

// bucket holds a sliding-window token bucket for one IP.
type bucket struct {
	mu       sync.Mutex
	tokens   int
	lastFill time.Time
	maxRPM   int
}

func (b *bucket) allow() bool {
	b.mu.Lock()
	defer b.mu.Unlock()

	now := time.Now()
	// Refill: add tokens proportional to elapsed time
	elapsed := now.Sub(b.lastFill)
	refill := int(elapsed.Seconds() * float64(b.maxRPM) / 60.0)
	if refill > 0 {
		b.tokens += refill
		if b.tokens > b.maxRPM {
			b.tokens = b.maxRPM
		}
		b.lastFill = now
	}

	if b.tokens <= 0 {
		return false
	}
	b.tokens--
	return true
}

var (
	buckets   = make(map[string]*bucket)
	bucketsMu sync.Mutex
)

func getBucket(ip string, maxRPM int) *bucket {
	bucketsMu.Lock()
	defer bucketsMu.Unlock()
	if b, ok := buckets[ip]; ok {
		return b
	}
	b := &bucket{tokens: maxRPM, lastFill: time.Now(), maxRPM: maxRPM}
	buckets[ip] = b
	return b
}

// RateLimit limits requests to maxRPM per IP per minute.
// Pass rpmStr as a string (from config) — defaults to 10 if unparseable.
func RateLimit(rpmStr string) gin.HandlerFunc {
	maxRPM, err := strconv.Atoi(rpmStr)
	if err != nil || maxRPM <= 0 {
		maxRPM = 10
	}

	return func(c *gin.Context) {
		ip := c.ClientIP()
		b := getBucket(ip, maxRPM)
		if !b.allow() {
			c.Header("Retry-After", "60")
			c.AbortWithStatusJSON(http.StatusTooManyRequests, gin.H{
				"error": "Too many requests. Please try again in a minute.",
			})
			return
		}
		c.Next()
	}
}
