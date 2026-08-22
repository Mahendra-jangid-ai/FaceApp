package config

import (
	"log"
	"os"

	"github.com/joho/godotenv"
)

type Config struct {
	Port           string
	Env            string
	MongoURI       string
	DBName         string
	JWTSecret      string
	JWTIssuer      string
	JWTAudience    string
	AccessTokenTTL string // e.g. "24h"
	CORSOrigins    string // comma-separated, "*" for dev
	RateLimitRPM   string // requests per minute per IP
}

func Load() *Config {
	if err := godotenv.Load(); err != nil {
		log.Println("No .env file found, reading from environment variables")
	}

	return &Config{
		Port:           getEnv("PORT", "8080"),
		Env:            getEnv("ENV", "development"),
		MongoURI:       getEnv("MONGO_URI", "mongodb://localhost:27017"),
		DBName:         getEnv("DB_NAME", "faceapp"),
		JWTSecret:      getEnv("JWT_SECRET", ""),
		JWTIssuer:      getEnv("JWT_ISSUER", "faceapp-api"),
		JWTAudience:    getEnv("JWT_AUDIENCE", "faceapp-client"),
		AccessTokenTTL: getEnv("ACCESS_TOKEN_TTL", "24h"),
		CORSOrigins:    getEnv("CORS_ORIGINS", "*"),
		RateLimitRPM:   getEnv("RATE_LIMIT_RPM", "10"),
	}
}

func getEnv(key, fallback string) string {
	if val := os.Getenv(key); val != "" {
		return val
	}
	return fallback
}
