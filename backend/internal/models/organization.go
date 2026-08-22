package models

import (
	"time"

	"go.mongodb.org/mongo-driver/v2/bson"
)

type Organization struct {
	ID        bson.ObjectID `json:"id" bson:"_id,omitempty"`
	Name      string        `json:"name" bson:"name"`
	Email     string        `json:"email" bson:"email"`
	Phone     string        `json:"phone" bson:"phone"`
	Address   string        `json:"address" bson:"address"`
	Logo      string        `json:"logo" bson:"logo,omitempty"`
	IsActive  bool          `json:"is_active" bson:"is_active"`
	CreatedAt time.Time     `json:"created_at" bson:"created_at"`
	UpdatedAt time.Time     `json:"updated_at" bson:"updated_at"`
}
