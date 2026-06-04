# FaceAuth Pro v2.0 | NHAI Hackathon 7.0

**Offline Face Recognition, Liveness Detection, Anti-Spoofing & Geofenced Attendance for Datalake 3.0**

---

## Problem Statement

NHAI manages 50,000+ highway construction workers across remote sites with poor/no internet connectivity. Current attendance systems rely on manual registers or online biometric devices -- both unreliable in field conditions. Workers can proxy-attend for others, and there is no way to verify someone is at the correct work site.

## Our Solution

FaceAuth Pro is a **100% offline-capable** mobile face authentication system:

- **Custom-trained MobileFaceNet** (99.28% LFW accuracy, just 1.15 MB)
- **3-layer anti-spoofing** (Liveness challenges + Laplacian texture analysis)
- **GPS geofencing** to verify workers are at their assigned site
- **Automatic attendance** with check-in/check-out workflow
- **Encrypted biometric storage** (AES-256)
- **Hindi/English** localization for field workers
- **Duplicate enrollment detection** prevents multi-registration
- **Analytics dashboard** with security metrics and weekly trends

All biometric processing happens on-device. Data syncs to AWS when connectivity restores.

---

## Architecture

```
 React Native App (TypeScript)
 +-- HomeScreen .............. Dashboard with KPIs and quick actions
 +-- AuthScreen .............. Liveness + anti-spoof + face recognition
 +-- EnrollScreen ............ Camera capture + duplicate detection
 +-- AttendanceScreen ........ Check-in/check-out records
 +-- DashboardScreen ......... Analytics, trends, security metrics
 +-- HistoryScreen ........... Filterable auth logs
 +-- SettingsScreen .......... Sync, geofence sites, user mgmt

 Services Layer
 +-- faceProcessor.ts ........ Native bridge to ML Kit + ONNX
 +-- embeddingUtils.ts ....... Cosine similarity, L2 norm, duplicate check
 +-- geofencing.ts ........... Haversine GPS, work site CRUD
 +-- encryption.ts ........... AES-256 embedding encryption
 +-- database.ts ............. AsyncStorage CRUD (users, logs, attendance)
 +-- syncService.ts .......... AWS sync with attendance payload
 +-- datalakeIntegration.ts .. Clean API for Datalake 3.0
 +-- i18n.ts ................. Hindi/English localization

 Native Layer (Kotlin)
 +-- FaceProcessorModule ..... ML Kit face detection + ONNX inference
 +-- Anti-spoof .............. Laplacian variance texture analysis
 +-- Bitmap management ....... Downsampled, recycled, OOM-safe
```

## Security Stack

| Layer | Technology | Purpose |
|-------|-----------|---------|
| Liveness | State-machine blink/smile/turn | Defeats static photo attacks |
| Anti-Spoof | Laplacian variance (native Kotlin) | Detects printed photos and screens |
| Geofence | Haversine GPS validation | Verifies physical presence at work site |
| Encryption | AES-256 at rest | Protects stored face embeddings |
| Duplicate Check | Cosine similarity > 0.75 | Prevents multi-registration fraud |

## Tech Stack

| Component | Technology |
|-----------|-----------|
| Framework | React Native 0.85.3, TypeScript 5.8 |
| Camera | react-native-vision-camera 5.0 |
| ML Runtime | ONNX Runtime Android 1.18 |
| Face Detection | Google ML Kit 16.1.7 |
| Recognition Model | Custom MobileFaceNet (ArcFace, CASIA-WebFace) |
| Storage | AsyncStorage (encrypted) |
| Navigation | React Navigation 7.x |
| Localization | Custom i18n (Hindi/English) |

## Model Training

| Metric | Value |
|--------|-------|
| Architecture | MobileFaceNet (1M params, 128-dim) |
| Loss | ArcFace (s=64, m=0.50) |
| Dataset | CASIA-WebFace (490K images, 10.5K IDs) |
| LFW Accuracy | **99.28%** |
| Model Size (INT8) | **1.15 MB** |
| Inference Latency | **63 ms** (single thread CPU) |

## Datalake 3.0 Integration

```typescript
import { FaceAuthModule } from './faceauth/datalakeIntegration';

// Single API call: face auth + geofence + attendance
const result = await FaceAuthModule.markAttendance(imagePath);
// result.authenticated, result.withinGeofence, result.attendanceAction

// Sync pending data when online
await FaceAuthModule.syncToServer();
```

## Setup

```bash
cd FaceAuthApp && npm install
npx react-native run-android
```

## Tests

```bash
npx jest          # 17 tests, all passing
npx tsc --noEmit  # Zero type errors
```

---

NHAI Hackathon 7.0 -- Datalake 3.0 Integration Module
