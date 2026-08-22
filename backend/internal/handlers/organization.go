package handlers

import (
	"context"
	"net/http"
	"time"

	"faceapp/backend/internal/database"
	"faceapp/backend/internal/models"

	"github.com/gin-gonic/gin"
	"go.mongodb.org/mongo-driver/v2/bson"
)

type CreateOrganizationRequest struct {
	Name    string `json:"name" binding:"required"`
	Email   string `json:"email" binding:"required,email"`
	Phone   string `json:"phone" binding:"required"`
	Address string `json:"address" binding:"required"`
}

// CreateOrganization — POST /api/v1/organizations
func CreateOrganization(c *gin.Context) {
	var req CreateOrganizationRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	col := database.GetCollection("organizations")
	ctx, cancel := context.WithTimeout(context.Background(), 5*time.Second)
	defer cancel()

	// Check duplicate name
	var existing models.Organization
	if err := col.FindOne(ctx, bson.M{"name": req.Name}).Decode(&existing); err == nil {
		c.JSON(http.StatusConflict, gin.H{"error": "Organization with this name already exists"})
		return
	}

	now := time.Now()
	org := models.Organization{
		ID:        bson.NewObjectID(),
		Name:      req.Name,
		Email:     req.Email,
		Phone:     req.Phone,
		Address:   req.Address,
		IsActive:  true,
		CreatedAt: now,
		UpdatedAt: now,
	}

	if _, err := col.InsertOne(ctx, org); err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to create organization"})
		return
	}

	c.JSON(http.StatusCreated, gin.H{
		"message":      "Organization created successfully",
		"organization": org,
	})
}

// GetOrganizations — GET /api/v1/organizations
func GetOrganizations(c *gin.Context) {
	col := database.GetCollection("organizations")
	ctx, cancel := context.WithTimeout(context.Background(), 5*time.Second)
	defer cancel()

	cursor, err := col.Find(ctx, bson.M{"is_active": true})
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to fetch organizations"})
		return
	}
	defer cursor.Close(ctx)

	var orgs []models.Organization
	if err := cursor.All(ctx, &orgs); err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to decode organizations"})
		return
	}

	if orgs == nil {
		orgs = []models.Organization{}
	}

	c.JSON(http.StatusOK, gin.H{
		"organizations": orgs,
		"total":         len(orgs),
	})
}
