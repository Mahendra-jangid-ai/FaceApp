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
	// Load config from .env
	cfg := config.Load()

	// Connect to MongoDB
	database.Connect(cfg)
	defer database.Disconnect()

	// Setup router
	r := routes.SetupRouter()

	// Graceful shutdown on Ctrl+C
	quit := make(chan os.Signal, 1)
	signal.Notify(quit, os.Interrupt, syscall.SIGTERM)

	go func() {
		log.Printf("Server starting on port %s", cfg.Port)
		if err := r.Run(":" + cfg.Port); err != nil {
			log.Fatalf("Server error: %v", err)
		}
	}()

	<-quit
	log.Println("Shutting down server...")
}
