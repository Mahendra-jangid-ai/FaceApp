package models

import "time"

type Attendance struct {
	ID        uint      `json:"id" gorm:"primaryKey;autoIncrement"`
	UserID    uint      `json:"user_id" gorm:"not null;index"`
	User      User      `json:"user" gorm:"foreignKey:UserID"`
	CheckIn   time.Time `json:"check_in"`
	CheckOut  *time.Time `json:"check_out"`
	Date      string    `json:"date" gorm:"not null;index"` // format: YYYY-MM-DD
	Status    string    `json:"status" gorm:"default:present"` // present, absent, late
	CreatedAt time.Time `json:"created_at"`
	UpdatedAt time.Time `json:"updated_at"`
}
