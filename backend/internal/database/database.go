package database

import (
	"context"
	"log"
	"time"

	"faceapp/backend/internal/config"

	"go.mongodb.org/mongo-driver/v2/mongo"
	"go.mongodb.org/mongo-driver/v2/mongo/options"
)

var Client *mongo.Client
var DB *mongo.Database

func Connect(cfg *config.Config) {
	ctx, cancel := context.WithTimeout(context.Background(), 10*time.Second)
	defer cancel()

	clientOptions := options.Client().ApplyURI(cfg.MongoURI)

	client, err := mongo.Connect(clientOptions)
	if err != nil {
		log.Fatalf("Failed to create MongoDB client: %v", err)
	}

	// Ping to verify connection
	if err := client.Ping(ctx, nil); err != nil {
		log.Fatalf("Failed to connect to MongoDB: %v", err)
	}

	Client = client
	DB = client.Database(cfg.DBName)

	log.Printf("MongoDB connected successfully — database: %s", cfg.DBName)
}

// GetCollection returns a MongoDB collection by name
func GetCollection(name string) *mongo.Collection {
	return DB.Collection(name)
}

// Disconnect closes the MongoDB connection gracefully
func Disconnect() {
	if Client != nil {
		ctx, cancel := context.WithTimeout(context.Background(), 5*time.Second)
		defer cancel()
		if err := Client.Disconnect(ctx); err != nil {
			log.Printf("Error disconnecting MongoDB: %v", err)
		} else {
			log.Println("MongoDB disconnected")
		}
	}
}
