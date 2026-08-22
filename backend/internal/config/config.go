package config

import (
	"log"
	"os"

	"github.com/joho/godotenv"
)

type Config struct {
	Port      string
	MongoURI  string
	DBName    string
	JWTSecret string
	Env       string
}

func Load() *Config {
	// Load .env file (ignore error in production)
	if err := godotenv.Load(); err != nil {
		log.Println("No .env file found, reading from environment variables")
	}

	return &Config{
		Port:      getEnv("PORT", "8080"),
		MongoURI:  getEnv("MONGO_URI", "mongodb://localhost:27017"),
		DBName:    getEnv("DB_NAME", "faceapp"),
		JWTSecret: getEnv("JWT_SECRET", "change-me-in-production"),
		Env:       getEnv("ENV", "development"),
	}
}

func getEnv(key, fallback string) string {
	if val := os.Getenv(key); val != "" {
		return val
	}
	return fallback
}
