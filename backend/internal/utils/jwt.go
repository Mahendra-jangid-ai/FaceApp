package utils

import (
	"crypto/rand"
	"encoding/hex"
	"errors"
	"fmt"
	"time"

	"faceapp/backend/internal/config"

	"github.com/golang-jwt/jwt/v5"
)

// Claims is the canonical JWT payload for this app.
type Claims struct {
	UserID string `json:"uid"`
	Role   string `json:"role"`
	jwt.RegisteredClaims
}

// GenerateToken creates a signed HS256 JWT.
// All config comes from a single *config.Config — no os.Getenv calls here.
func GenerateToken(cfg *config.Config, subjectID, role string) (string, error) {
	secret := cfg.JWTSecret
	if secret == "" {
		return "", errors.New("JWT_SECRET is not configured")
	}

	ttl, err := time.ParseDuration(cfg.AccessTokenTTL)
	if err != nil {
		ttl = 24 * time.Hour
	}

	jti, err := generateJTI()
	if err != nil {
		return "", fmt.Errorf("failed to generate token id: %w", err)
	}

	now := time.Now().UTC()
	claims := Claims{
		UserID: subjectID,
		Role:   role,
		RegisteredClaims: jwt.RegisteredClaims{
			Issuer:    cfg.JWTIssuer,
			Audience:  jwt.ClaimStrings{cfg.JWTAudience},
			Subject:   subjectID,
			IssuedAt:  jwt.NewNumericDate(now),
			NotBefore: jwt.NewNumericDate(now),
			ExpiresAt: jwt.NewNumericDate(now.Add(ttl)),
			ID:        jti,
		},
	}

	token := jwt.NewWithClaims(jwt.SigningMethodHS256, claims)
	return token.SignedString([]byte(secret))
}

// ParseToken validates a token string and returns the claims.
// Enforces algorithm, issuer, and audience.
func ParseToken(cfg *config.Config, tokenStr string) (*Claims, error) {
	secret := cfg.JWTSecret
	if secret == "" {
		return nil, errors.New("JWT_SECRET is not configured")
	}

	token, err := jwt.ParseWithClaims(
		tokenStr,
		&Claims{},
		func(t *jwt.Token) (interface{}, error) {
			// ── Algorithm confusion guard ──────────────────────────
			if _, ok := t.Method.(*jwt.SigningMethodHMAC); !ok {
				return nil, fmt.Errorf("unexpected signing method: %v", t.Header["alg"])
			}
			return []byte(secret), nil
		},
		jwt.WithIssuer(cfg.JWTIssuer),
		jwt.WithAudience(cfg.JWTAudience),
		jwt.WithExpirationRequired(),
		jwt.WithIssuedAt(),
	)
	if err != nil {
		return nil, err
	}

	claims, ok := token.Claims.(*Claims)
	if !ok || !token.Valid {
		return nil, errors.New("invalid token claims")
	}
	return claims, nil
}

// generateJTI returns a cryptographically random 16-byte hex string.
func generateJTI() (string, error) {
	b := make([]byte, 16)
	if _, err := rand.Read(b); err != nil {
		return "", err
	}
	return hex.EncodeToString(b), nil
}
