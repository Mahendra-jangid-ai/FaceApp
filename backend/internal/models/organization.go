package models

import (
	"time"

	"go.mongodb.org/mongo-driver/v2/bson"
)

type Organization struct {
	ID               bson.ObjectID `json:"id" bson:"_id,omitempty"`
	Name             string        `json:"name" bson:"name"`
	Email            string        `json:"email" bson:"email"`
	Phone            string        `json:"phone" bson:"phone"`
	AlternatePhone   string        `json:"alternate_phone" bson:"alternate_phone,omitempty"`
	Website          string        `json:"website" bson:"website,omitempty"`
	Industry         string        `json:"industry" bson:"industry"`
	OrganizationType string        `json:"organization_type" bson:"organization_type"`
	WorkerRange      string        `json:"worker_range" bson:"worker_range"`
	Address          string        `json:"address" bson:"address"`
	City             string        `json:"city" bson:"city"`
	State            string        `json:"state" bson:"state"`
	Pincode          string        `json:"pincode" bson:"pincode"`
	Country          string        `json:"country" bson:"country"`
	ContactPerson    string        `json:"contact_person" bson:"contact_person"`
	ContactRole      string        `json:"contact_role" bson:"contact_role"`
	Password         string        `json:"-" bson:"password"` // bcrypt hashed, never sent to client
	Logo             string        `json:"logo" bson:"logo,omitempty"`
	IsActive         bool          `json:"is_active" bson:"is_active"`
	CreatedAt        time.Time     `json:"created_at" bson:"created_at"`
	UpdatedAt        time.Time     `json:"updated_at" bson:"updated_at"`
}
