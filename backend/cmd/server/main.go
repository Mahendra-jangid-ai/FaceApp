package main

import (
	"log"
	"os"
	"os/signal"
	"syscall"

	"faceapp/backend/internal/config"
	"faceapp/backend/internal/database"
	"faceapp/backend/internal/routes"
)

func main() {
	cfg := config.Load()

	// Hard-fail if JWT secret is missing or still default
	if cfg.JWTSecret == "" || cfg.JWTSecret == "change-me-in-production" {
		log.Fatal("FATAL: JWT_SECRET is not set or is using the default value. Set a strong secret in .env")
	}

	database.Connect(cfg)
	defer database.Disconnect()

	r := routes.SetupRouter(cfg)

	quit := make(chan os.Signal, 1)
	signal.Notify(quit, os.Interrupt, syscall.SIGTERM)

	go func() {
		log.Printf("[FaceApp] Server starting on port %s (env: %s)", cfg.Port, cfg.Env)
		if err := r.Run(":" + cfg.Port); err != nil {
			log.Fatalf("Server error: %v", err)
		}
	}()

	<-quit
	log.Println("[FaceApp] Shutting down gracefully...")
}
