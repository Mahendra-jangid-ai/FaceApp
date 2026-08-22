package models

import (
	"time"

	"go.mongodb.org/mongo-driver/v2/bson"
)

type User struct {
	ID           bson.ObjectID `json:"id" bson:"_id,omitempty"`
	Name         string        `json:"name" bson:"name"`
	Email        string        `json:"email" bson:"email"`
	Password     string        `json:"-" bson:"password"`
	Role         string        `json:"role" bson:"role"`
	FaceEncoding []float64     `json:"-" bson:"face_encoding,omitempty"`
	IsActive     bool          `json:"is_active" bson:"is_active"`
	CreatedAt    time.Time     `json:"created_at" bson:"created_at"`
	UpdatedAt    time.Time     `json:"updated_at" bson:"updated_at"`
}
