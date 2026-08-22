package main

import (
	"log"

	"faceapp/backend/internal/config"
	"faceapp/backend/internal/database"
	"faceapp/backend/internal/routes"
)

func main() {
	// Load config from .env
	cfg := config.Load()

	// Connect to database
	database.Connect(cfg)

	// Setup router
	r := routes.SetupRouter()

	log.Printf("Server starting on port %s", cfg.Port)
	if err := r.Run(":" + cfg.Port); err != nil {
		log.Fatalf("Failed to start server: %v", err)
	}
}
