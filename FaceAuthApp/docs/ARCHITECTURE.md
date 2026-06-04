# FaceAuth Pro v2.0 -- System Architecture

## Overview

FaceAuth Pro is a mobile-first offline face authentication system designed for NHAI's Datalake 3.0. The architecture prioritizes: (1) zero-connectivity operation, (2) multi-layer security, (3) sub-second inference, and (4) minimal storage footprint.

## Pipeline: Authentication Flow

```
Camera Frame
    |
    v
[1] Photo Capture (Vision Camera) .................. ~50ms
    |
    v
[2] Image Preprocessing (Kotlin native)
    +-- EXIF rotation correction
    +-- Downsample to max 1280px (OOM prevention)
    +-- Bitmap.Config.ARGB_8888 .................... ~20ms
    |
    v
[3] Face Detection (ML Kit, bundled offline)
    +-- PERFORMANCE_MODE_ACCURATE
    +-- Classification: smile, eye open probs
    +-- Landmarks: 132 points
    +-- Euler angles: Y (yaw), Z (roll) ........... ~80ms
    |
    v
[4] Anti-Spoof Analysis (Laplacian variance)
    +-- Extract face ROI from bitmap
    +-- Convert to 64x64 grayscale
    +-- 3x3 Laplacian kernel convolution
    +-- Variance > 100 = real face
    +-- Sigmoid mapping to 0..1 score ............. ~5ms
    |
    v
[5] Liveness Challenges (3 randomized)
    +-- State-machine blink detection
    +-- Smile probability threshold
    +-- Head Euler angle threshold
    +-- 400ms polling interval .................... ~3-10s user time
    |
    v
[6] Face Embedding (ONNX Runtime, MobileFaceNet)
    +-- Crop face with 25% expansion
    +-- Resize to 112x112
    +-- Normalize: pixel/127.5 - 1.0
    +-- NCHW tensor layout
    +-- 128-dim L2-normalized output .............. ~63ms
    |
    v
[7] Template Matching (cosine similarity)
    +-- Compare against enrolled database
    +-- Threshold: 0.45 for match
    +-- Best-match selection ...................... ~1ms
    |
    v
[8] Geofence Validation (Haversine)
    +-- GPS location capture
    +-- Distance to nearest work site
    +-- Within radius = compliant ................. ~100ms
    |
    v
[9] Auto-Attendance
    +-- Open check-in? -> Check Out
    +-- No open check-in? -> Check In
    +-- Log with GPS + site + scores .............. ~5ms
    |
    v
[10] Encrypted Storage + Sync Queue
     +-- AES-256 encrypted embeddings
     +-- AsyncStorage persistence
     +-- Auto-sync on connectivity ................ ~10ms
```

**Total pipeline: ~400ms compute + user liveness time**

## Data Model

### EnrolledUser
- id, name, employeeId
- embedding (128-dim float array, encrypted)
- photoUri, createdAt, synced

### AuthLog
- userId, userName, timestamp
- livenessPassed, matchScore, authenticated
- spoofScore, siteId, siteName, withinGeofence
- latitude, longitude, synced

### AttendanceRecord
- userId, userName, employeeId
- siteId, siteName
- checkInTime, checkOutTime
- checkInLocation, checkOutLocation
- checkInScore, checkOutScore
- withinGeofence, synced

### WorkSite
- id, name, latitude, longitude, radiusMeters

## Offline-First Design

1. All ML models bundled in APK (ONNX + ML Kit)
2. All data stored locally in AsyncStorage
3. No network calls during authentication
4. Sync engine with automatic retry on connectivity
5. Attendance records queue until server ACK

## Model Details

| Property | Value |
|----------|-------|
| Architecture | MobileFaceNet (inverted residual blocks) |
| Parameters | 1,003,136 |
| Embedding | 128-dim, L2-normalized |
| Training Loss | ArcFace (s=64, m=0.50) |
| Optimizer | SGD (LR=0.1, cosine anneal, 500-iter warmup) |
| Dataset | CASIA-WebFace (490,623 images, 10,572 identities) |
| Quantization | INT8 dynamic (ONNX Runtime) |
| LFW Accuracy | 99.28% (10-fold cross-validation) |
| FP32 Size | 4.00 MB |
| INT8 Size | 1.15 MB |
| CPU Latency | 63 ms (single-thread) |
