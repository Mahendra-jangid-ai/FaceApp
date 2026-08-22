package handlers

import (
	"context"
	"net/http"
	"time"

	"faceapp/backend/internal/config"
	"faceapp/backend/internal/database"
	"faceapp/backend/internal/models"
	"faceapp/backend/internal/utils"

	"github.com/gin-gonic/gin"
	"go.mongodb.org/mongo-driver/v2/bson"
	"golang.org/x/crypto/bcrypt"
)

// ── Create Organization (public — first-time onboarding) ──────────────────────
type CreateOrganizationRequest struct {
	Name             string `json:"name"              binding:"required"`
	Email            string `json:"email"             binding:"required,email"`
	Phone            string `json:"phone"             binding:"required"`
	AlternatePhone   string `json:"alternate_phone"`
	Website          string `json:"website"`
	Industry         string `json:"industry"          binding:"required"`
	OrganizationType string `json:"organization_type" binding:"required"`
	WorkerRange      string `json:"worker_range"      binding:"required"`
	Address          string `json:"address"           binding:"required"`
	City             string `json:"city"              binding:"required"`
	State            string `json:"state"             binding:"required"`
	Pincode          string `json:"pincode"           binding:"required"`
	Country          string `json:"country"`
	ContactPerson    string `json:"contact_person"    binding:"required"`
	ContactRole      string `json:"contact_role"      binding:"required"`
}

func CreateOrganization(c *gin.Context) {
	var req CreateOrganizationRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	col := database.GetCollection("organizations")
	ctx, cancel := context.WithTimeout(context.Background(), 5*time.Second)
	defer cancel()

	var existing models.Organization
	if err := col.FindOne(ctx, bson.M{"name": req.Name}).Decode(&existing); err == nil {
		c.JSON(http.StatusConflict, gin.H{"error": "Organization with this name already exists"})
		return
	}

	country := req.Country
	if country == "" {
		country = "India"
	}

	now := time.Now().UTC()
	org := models.Organization{
		ID:               bson.NewObjectID(),
		Name:             req.Name,
		Email:            req.Email,
		Phone:            req.Phone,
		AlternatePhone:   req.AlternatePhone,
		Website:          req.Website,
		Industry:         req.Industry,
		OrganizationType: req.OrganizationType,
		WorkerRange:      req.WorkerRange,
		Address:          req.Address,
		City:             req.City,
		State:            req.State,
		Pincode:          req.Pincode,
		Country:          country,
		ContactPerson:    req.ContactPerson,
		ContactRole:      req.ContactRole,
		Password:         "", // set via SetOrgPassword
		IsActive:         true,
		CreatedAt:        now,
		UpdatedAt:        now,
	}

	if _, err := col.InsertOne(ctx, org); err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to create organization"})
		return
	}

	c.JSON(http.StatusCreated, gin.H{
		"message": "Organization created successfully",
		"organization": gin.H{
			"id":    org.ID.Hex(),
			"name":  org.Name,
			"email": org.Email,
		},
	})
}

// ── Set Password (public — only usable once; blocked if password already set) ──
type SetPasswordRequest struct {
	OrgName  string `json:"org_name"  binding:"required"`
	Password string `json:"password"  binding:"required,min=6"`
}

func SetOrgPassword(cfg *config.Config) gin.HandlerFunc {
	return func(c *gin.Context) {
		var req SetPasswordRequest
		if err := c.ShouldBindJSON(&req); err != nil {
			c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
			return
		}

		col := database.GetCollection("organizations")
		ctx, cancel := context.WithTimeout(context.Background(), 5*time.Second)
		defer cancel()

		var org models.Organization
		if err := col.FindOne(ctx, bson.M{"name": req.OrgName, "is_active": true}).Decode(&org); err != nil {
			// Generic message — avoids org enumeration
			c.JSON(http.StatusNotFound, gin.H{"error": "Organization not found"})
			return
		}

		// ── One-time set guard: block if password already exists ──────────
		if org.Password != "" {
			c.JSON(http.StatusForbidden, gin.H{
				"error": "Password already set. Use the login endpoint.",
			})
			return
		}

		hashed, err := bcrypt.GenerateFromPassword([]byte(req.Password), bcrypt.DefaultCost)
		if err != nil {
			c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to hash password"})
			return
		}

		_, err = col.UpdateOne(ctx,
			bson.M{"_id": org.ID},
			bson.M{"$set": bson.M{
				"password":   string(hashed),
				"updated_at": time.Now().UTC(),
			}},
		)
		if err != nil {
			c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to set password"})
			return
		}

		token, err := utils.GenerateToken(cfg, org.ID.Hex(), "org_admin")
		if err != nil {
			c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to generate token"})
			return
		}

		c.JSON(http.StatusOK, gin.H{
			"message": "Password set successfully",
			"token":   token,
			"org": gin.H{
				"id":   org.ID.Hex(),
				"name": org.Name,
			},
		})
	}
}

// ── Organization Login ─────────────────────────────────────────────────────────
type OrgLoginRequest struct {
	OrgName  string `json:"org_name"  binding:"required"`
	Password string `json:"password"  binding:"required"`
}

func OrgLogin(cfg *config.Config) gin.HandlerFunc {
	return func(c *gin.Context) {
		var req OrgLoginRequest
		if err := c.ShouldBindJSON(&req); err != nil {
			c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
			return
		}

		col := database.GetCollection("organizations")
		ctx, cancel := context.WithTimeout(context.Background(), 5*time.Second)
		defer cancel()

		var org models.Organization
		if err := col.FindOne(ctx, bson.M{"name": req.OrgName, "is_active": true}).Decode(&org); err != nil {
			// Generic — avoids org enumeration
			c.JSON(http.StatusUnauthorized, gin.H{"error": "Invalid credentials"})
			return
		}

		if org.Password == "" {
			c.JSON(http.StatusUnauthorized, gin.H{"error": "Password not set. Please complete onboarding first."})
			return
		}

		if err := bcrypt.CompareHashAndPassword([]byte(org.Password), []byte(req.Password)); err != nil {
			c.JSON(http.StatusUnauthorized, gin.H{"error": "Invalid credentials"})
			return
		}

		token, err := utils.GenerateToken(cfg, org.ID.Hex(), "org_admin")
		if err != nil {
			c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to generate token"})
			return
		}

		c.JSON(http.StatusOK, gin.H{
			"message": "Login successful",
			"token":   token,
			"org": gin.H{
				"id":                org.ID.Hex(),
				"name":              org.Name,
				"email":             org.Email,
				"phone":             org.Phone,
				"industry":          org.Industry,
				"organization_type": org.OrganizationType,
				"worker_range":      org.WorkerRange,
				"city":              org.City,
				"state":             org.State,
				"contact_person":    org.ContactPerson,
				"contact_role":      org.ContactRole,
			},
		})
	}
}

// ── Get Organizations (protected — org_admin only) ────────────────────────────
func GetOrganizations(c *gin.Context) {
	col := database.GetCollection("organizations")
	ctx, cancel := context.WithTimeout(context.Background(), 5*time.Second)
	defer cancel()

	// Return only own org: filter by the uid in the JWT
	uid, _ := c.Get("uid")
	oidHex, ok := uid.(string)
	if !ok || oidHex == "" {
		c.JSON(http.StatusUnauthorized, gin.H{"error": "Unauthorized"})
		return
	}

	oid, err := bson.ObjectIDFromHex(oidHex)
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Invalid organization ID in token"})
		return
	}

	var org models.Organization
	if err := col.FindOne(ctx, bson.M{"_id": oid, "is_active": true}).Decode(&org); err != nil {
		c.JSON(http.StatusNotFound, gin.H{"error": "Organization not found"})
		return
	}

	c.JSON(http.StatusOK, gin.H{"organization": org})
}
