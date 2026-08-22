package models

import (
	"time"

	"go.mongodb.org/mongo-driver/v2/bson"
)

type Attendance struct {
	ID        bson.ObjectID  `json:"id" bson:"_id,omitempty"`
	UserID    bson.ObjectID  `json:"user_id" bson:"user_id"`
	UserName  string         `json:"user_name" bson:"user_name"`
	CheckIn   time.Time      `json:"check_in" bson:"check_in"`
	CheckOut  *time.Time     `json:"check_out" bson:"check_out,omitempty"`
	Date      string         `json:"date" bson:"date"`     // format: YYYY-MM-DD
	Status    string         `json:"status" bson:"status"` // present, absent, late
	CreatedAt time.Time      `json:"created_at" bson:"created_at"`
	UpdatedAt time.Time      `json:"updated_at" bson:"updated_at"`
}
