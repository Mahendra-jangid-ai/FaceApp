# FaceAuth - NHAI Biometric Authentication System
## Technical Document - NHAI Hackathon 7.0

---

## 1. System Overview

FaceAuth is an offline-first biometric authentication and attendance management system designed for NHAI highway construction sites. It uses on-device face recognition with MobileFaceNet INT8, multi-factor liveness detection, and privacy-preserving BioHash templates to provide secure, real-time worker verification even in remote areas with no internet connectivity.

### Key Capabilities
- Face enrollment with 128-dimensional embedding vectors
- 3-challenge liveness detection (blink, smile, head turn)
- Anti-spoof scoring via Laplacian variance analysis
- BioHash ISO/IEC 24745 cancellable biometric templates
- GPS geofencing for site-based check-in/check-out
- PPE compliance verification (helmet and vest detection)
- Offline-first with background sync to NHAI Datalake 3.0
- Aadhaar integration with Verhoeff checksum validation

---

## 2. Architecture

### Tech Stack
| Layer | Technology |
|-------|-----------|
| Framework | React Native 0.85, New Architecture (Hermes) |
| Camera | VisionCamera v5.0.11 (Nitro modules) |
| Face Detection | Google ML Kit Face Detection (offline, bundled) |
| Embeddings | Eye-aligned 128-D facial-geometry signature (ML Kit landmarks + contours) |
| Storage | AsyncStorage (encrypted at rest) |
| Encryption | AES-256-GCM via react-native-aes-crypto |
| Navigation | React Navigation 7 (native stack) |
| Sync | Fetch API + retry policy + connectivity watcher |

### Module Architecture
```
src/
  App.tsx                    # Navigation + theme provider
  screens/
    HomeScreen.tsx           # Dashboard with stats + quick actions
    EnrollScreen.tsx         # Face capture + enrollment pipeline
    AuthScreen.tsx           # Liveness + face recognition
    PPECheckScreen.tsx       # Helmet/vest compliance check
    DashboardScreen.tsx      # Analytics overview
    AttendanceScreen.tsx     # Check-in/out + Mark Attendance
    HistoryScreen.tsx        # Auth log history
    WorkerListScreen.tsx     # Enrolled workers management
    CalendarScreen.tsx       # Attendance calendar view
    AdminLoginScreen.tsx     # Admin 2FA access
    AdminDashboardScreen.tsx # Admin controls + system health
    SettingsScreen.tsx       # System configuration
  services/
    faceProcessor.ts         # ML Kit detection + eye-aligned embedding pipeline
    embeddingUtils.ts        # Cosine similarity + matching
    bioHash.ts               # ISO/IEC 24745 cancellable templates
    encryption.ts            # AES-256-GCM encryption
    differentialPrivacy.ts   # Laplacian noise injection
    qualityGate.ts           # Face quality checks
    adaptiveThreshold.ts     # Environment-adaptive thresholds
    database.ts              # Encrypted local storage
    geofencing.ts            # GPS site boundary checks
    datalakeIntegration.ts   # NHAI Datalake 3.0 sync
    syncService.ts           # Background sync engine
    ppeDetection.ts          # PPE compliance detection
    aadharValidator.ts       # Aadhaar Verhoeff validation
    voicePrompts.ts          # TTS audio feedback
    connectivityWatcher.ts   # Network state monitoring
    retryPolicy.ts           # Exponential backoff retry
    playIntegrity.ts         # Google Play Integrity API
    otaUpdater.ts            # OTA model update support
    dataRetention.ts         # GDPR-compliant data lifecycle
    i18n.ts                  # Hindi/English localization
  auth/
    sessionStore.ts          # Session management
  theme/
    index.ts                 # Dark theme + design tokens
  types/
    index.ts                 # TypeScript type definitions
```

---

## 3. Face Recognition Pipeline

### Enrollment Flow
```
Camera Capture (VisionCamera v5)
    |
    v
ML Kit Face Detection (classification mode)
    |-- Eye open probability
    |-- Smile probability
    |-- Head Euler angles (Y, Z)
    |
    v
Quality Gate
    |-- Minimum face size: 100x100px
    |-- Brightness: 50-200 range
    |-- Blur: Laplacian variance > 100
    |-- Head angle: |Y| < 15, |Z| < 10
    |
    v
Eye-Aligned Geometry Embedding
    |-- Anchor frame: eye midpoint origin, eye-line x-axis,
    |   inter-ocular distance scale (pose/scale/roll invariant)
    |-- 128D L2-normalized signature from landmarks + contours
    |-- On-device, no model download, runs on every phone
    |
    v
Duplicate Check (cosine similarity > 0.88)
    |
    v
BioHash Generation (ISO/IEC 24745)
    |-- Random projection matrix from salt
    |-- Binarization of projected embedding
    |-- Original embedding discarded
    |
    v
Differential Privacy (Laplacian noise, epsilon=1.0)
    |
    v
AES-256-GCM Encryption -> AsyncStorage
```

### Authentication Flow
```
Liveness Detection (3 random challenges)
    |-- Blink: both eyes < 0.45 then > 0.5
    |-- Smile: probability > 0.5
    |-- Turn Left: head Y > 12 degrees
    |-- Turn Right: head Y < -12 degrees
    |
    v
Anti-Spoof Check (Laplacian variance)
    |-- Score > 0.3 required
    |
    v
Face Embedding Generation
    |
    v
Cosine Similarity Matching
    |-- Threshold: 0.45 (adaptive)
    |-- Best match selected
    |
    v
BioHash Verification
    |-- Re-generate hash from embedding + stored salt
    |-- Compare with stored hash
    |
    v
Geofence Check (GPS boundary)
    |
    v
Attendance Record (check-in / check-out toggle)
```

---

## 4. Security Architecture

### Biometric Template Protection
- **BioHash (ISO/IEC 24745)**: Cancellable biometric templates using random projection with user-specific salts. Templates can be revoked and re-issued without re-enrollment.
- **Differential Privacy**: Calibrated Laplacian noise (epsilon=1.0, sensitivity=0.1) injected into embeddings before storage.
- **AES-256-GCM**: All biometric data encrypted at rest with device-specific keys.
- **Zero-Knowledge**: Original face embeddings are never stored; only transformed BioHash values persist.

### Anti-Spoofing
- Multi-challenge liveness detection with randomized order
- Laplacian variance-based texture analysis for print/screen detection
- 3-attempt lockout with 30-second cooldown
- Real-time face metrics HUD for operator verification

### Data Privacy
- GDPR-compliant data retention policies
- Configurable retention periods per data category
- Automatic purge of expired records
- Aadhaar numbers masked in UI (XXXX XXXX 1234)

---

## 5. Performance Metrics

| Metric | Value |
|--------|-------|
| Embedding | Eye-aligned 128-D facial geometry (no model download) |
| Embedding Dimensions | 128D L2-normalized float |
| Embedding Time | ~30ms (on-device, ML Kit landmarks/contours) |
| Face Detection | ~100ms (ML Kit) |
| Full Pipeline | ~300-500ms end-to-end |
| Match Threshold | 0.80 cosine similarity |
| Duplicate Threshold | 0.88 cosine similarity |
| Liveness Challenges | 3 per session (randomized) |
| Anti-Spoof Threshold | 0.30 Laplacian score |
| Lockout Policy | 3 failures -> 30s cooldown |
| Offline Storage | AsyncStorage (encrypted) |
| APK Size | ~158 MB (standalone, bundled JS + ML models) |

---

## 6. Datalake 3.0 Integration

### Sync Architecture
- Offline-first: all operations work without connectivity
- Background sync with exponential backoff retry
- Conflict resolution: server-wins with local audit trail
- Delta sync: only changed records transmitted

### API Endpoints
```
POST /api/v1/workers/enroll     # New worker enrollment
POST /api/v1/auth/verify        # Authentication event
POST /api/v1/attendance/sync    # Attendance records batch
GET  /api/v1/sites              # Site geofence boundaries
POST /api/v1/ppe/report         # PPE compliance events
GET  /api/v1/models/latest      # OTA model updates
```

### Data Schema
- Workers: id, name, employeeId, bioHash, site assignments
- Auth Events: timestamp, userId, matchScore, livenessPassed, spoofScore, geolocation
- Attendance: checkIn/Out times, GPS coordinates, site assignment, match confidence
- PPE Reports: helmet/vest detection, confidence scores, compliance status

---

## 7. Accessibility & Localization

- Voice prompts (TTS) for all liveness challenges
- Hindi and English language support
- High-contrast dark theme (WCAG AA compliant)
- Large touch targets (min 48dp)
- Screen reader compatible navigation

---

## 8. Deployment

### Build Configuration
- React Native 0.85 New Architecture (enabled by default)
- Hermes JS engine for optimal mobile performance
- `debuggableVariants = []` for standalone APK without Metro
- Min SDK: 24 (Android 7.0)
- Target SDK: 35 (Android 15)

### Device Requirements
- Android 7.0+ (API 24)
- Camera (front or back)
- 2GB+ RAM recommended
- GPS for geofencing features
- Internet for sync (not required for core operation)

---

## 9. Competitor Differentiation

| Feature | FaceAuth | Traditional Systems |
|---------|----------|-------------------|
| Offline Operation | Full offline support | Requires connectivity |
| Template Protection | BioHash + differential privacy | Raw biometric storage |
| Liveness Detection | 3-factor randomized challenges | Single factor or none |
| Anti-Spoof | Laplacian variance analysis | Basic or none |
| Footprint | No model download — runs on any phone | 10-50 MB models |
| Privacy Compliance | ISO/IEC 24745 + GDPR | Varies |
| PPE Integration | Built-in compliance check | Separate system |
| Adaptive Thresholds | Environment-aware scoring | Fixed thresholds |

---

*Document Version: 1.0 | NHAI Hackathon 7.0 | June 2026*
