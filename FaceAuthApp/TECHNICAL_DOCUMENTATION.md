# FaceAuth — Technical Documentation
## NHAI Hackathon 7.0 | Offline Facial Recognition & Liveness Detection for Datalake 3.0

---

## 1. Problem Statement

NHAI's Datalake 3.0 mobile app is used daily by field engineers, contractors, and officials at highway construction sites. The app's existing facial recognition for attendance is **cloud-dependent and breaks completely in zero-network zones** — mountains, forests, and rural highways where internet is nonexistent.

Field workers report: *"The app requires a very high-speed internet connection... it takes around 20 minutes just to raise a single point."*

**Our solution**: A fully offline, on-device facial recognition + liveness detection module that plugs into the existing Datalake 3.0 React Native app, enabling secure attendance even with zero connectivity.

---

## 2. System Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                    REACT NATIVE APP LAYER                     │
│  ┌──────────┐ ┌───────────┐ ┌─────────┐ ┌─────────────────┐│
│  │  Enroll   │ │Authenticate│ │ History │ │   Settings      ││
│  │  Screen   │ │  Screen    │ │ Screen  │ │ (Sync/Purge)    ││
│  └─────┬─────┘ └─────┬─────┘ └────┬────┘ └────────┬────────┘│
│        │              │            │               │          │
│  ┌─────┴──────────────┴────────────┴───────────────┴────────┐│
│  │              SERVICE LAYER (TypeScript)                    ││
│  │  Database · EmbeddingUtils · SyncService · FaceProcessor  ││
│  │  DatalakeIntegration API (startFaceAuth / syncToServer)   ││
│  └─────────────────────────┬─────────────────────────────────┘│
│                            │ Native Bridge                    │
│  ┌─────────────────────────┴─────────────────────────────────┐│
│  │           NATIVE MODULE (Kotlin - FaceProcessorModule)     ││
│  │                                                            ││
│  │  ┌──────────────────┐    ┌────────────────────────────┐   ││
│  │  │  Google ML Kit    │    │    ONNX Runtime Android     │   ││
│  │  │  Face Detection   │───▶│    MobileFaceNet FP32      │   ││
│  │  │  (Bundled/Offline)│    │    128-d Embeddings         │   ││
│  │  │                   │    │    3.81 MB model            │   ││
│  │  │  • Face bbox      │    └────────────────────────────┘   ││
│  │  │  • Smile prob     │                                     ││
│  │  │  • Eye open prob  │    ┌────────────────────────────┐   ││
│  │  │  • Head euler     │    │    EXIF Rotation Handler    │   ││
│  │  │  • Landmarks      │    │    (fixes Android camera    │   ││
│  │  └──────────────────┘    │     orientation issues)     │   ││
│  │                           └────────────────────────────┘   ││
│  └────────────────────────────────────────────────────────────┘│
│                                                                │
│  ┌────────────────────────────────────────────────────────────┐│
│  │              LOCAL STORAGE + SYNC ENGINE                    ││
│  │  AsyncStorage → Face Embeddings + Auth Logs + GPS coords   ││
│  │  NetInfo → Connectivity Detection                          ││
│  │  POST /api/sync → AWS Batch Upload → Purge Synced Data     ││
│  └────────────────────────────────────────────────────────────┘│
└─────────────────────────────────────────────────────────────────┘
```

---

## 3. AI Model — MobileFaceNet

### Architecture
MobileFaceNet uses **Inverted Residual blocks** with **Depthwise Separable Convolutions**, optimized for mobile inference. The architecture includes:

| Block | Configuration |
|-------|---------------|
| Conv1 | 3×3, stride 2, 64 channels |
| Conv2 | 3×3 depthwise, 64 channels |
| Bottleneck ×5 | t=2, c=64, stride 2 |
| Bottleneck ×1 | t=4, c=128, stride 2 |
| Bottleneck ×6 | t=2, c=128, stride 1 |
| Bottleneck ×1 | t=4, c=128, stride 2 |
| Bottleneck ×2 | t=2, c=128, stride 1 |
| Separable Conv | 1×1, 512 channels |
| Global Depthwise | 7×7, 512 channels |
| Linear | 1×1, 128-d output |
| BatchNorm | 128-d embedding |

**Total parameters**: 1,003,136 (~1M)

### Training Configuration
| Parameter | Value |
|-----------|-------|
| Dataset | CASIA-WebFace (490,623 images, 10,572 identities) |
| Input size | 112×112 RGB |
| Embedding | 128-dimensional, L2-normalized |
| Loss | ArcFace (s=64, m=0.50) — Additive Angular Margin |
| Optimizer | SGD (lr=0.1, momentum=0.9, weight_decay=5e-4) |
| Schedule | Cosine annealing with 500-iteration warmup |
| Epochs | 40 (with time budget of 8 hours) |
| Precision | Mixed precision (AMP FP16) |
| Hardware | Tesla T4 GPU |
| Evaluation | LFW 6,000 pairs, 10-fold cross-validation |

### Performance Benchmarks

| Metric | Achieved | Hackathon Target | Margin |
|--------|----------|-----------------|--------|
| **LFW Accuracy** | **99.28%** | >95% | +4.28% |
| **Model Size (FP32)** | **3.81 MB** | <20 MB | 5.2× under |
| **Inference Latency** | **63 ms** | <1000 ms | 16× faster |
| **Parameters** | **1.0M** | Lightweight | Ultra-light |

### Preprocessing Pipeline (must match training exactly)
```
Camera Photo → EXIF Rotation Fix → ML Kit Face Detection → Bounding Box
→ Crop + 25% Expansion → Resize 112×112 (bilinear)
→ Normalize: pixel/127.5 - 1.0 (range [-1, 1])
→ NCHW format [1, 3, 112, 112]
→ ONNX Runtime Inference → 128-d vector
→ L2 Normalize → Unit embedding
→ Cosine Similarity matching (threshold: 0.45)
```

---

## 4. Liveness Detection — Dual-Layer Anti-Spoofing

### Layer 1: Active Liveness Challenges
The system uses **randomized 3-of-4 challenge sequences** to prevent replay attacks:

| Challenge | ML Kit Feature | Detection Method |
|-----------|---------------|-----------------|
| **Blink** | eyeOpenProbability | State-transition: eyes-open→eyes-closed (catches 300ms natural blinks) |
| **Smile** | smilingProbability | Threshold >50% |
| **Turn Left** | headEulerAngleY | >12° yaw rotation |
| **Turn Right** | headEulerAngleY | <-12° yaw rotation |

**Smart blink detection** uses state transitions instead of single-frame thresholds:
```
Frame N:   Eyes open (92%) → Record "eyes were open"
Frame N+1: Eyes open (88%) → Still open
Frame N+2: Eyes closed (12%) → TRANSITION DETECTED → ✅ Blink confirmed!
```
This catches natural fast blinks that single-frame approaches miss.

### Layer 2: Passive Anti-Spoofing Properties
ML Kit's face detection inherently provides passive anti-spoofing:
- **3D depth estimation** via face landmark geometry
- **Texture analysis** through classification confidence scores
- **Temporal consistency** — printed photos produce static landmark positions

### Why This Defeats Common Attacks
| Attack | How It's Defeated |
|--------|------------------|
| Printed photo | Cannot blink, smile, or turn head |
| Screen replay | Static landmarks, no depth variation |
| Pre-recorded video | Randomized challenge order — video can't predict sequence |
| Deepfake | Requires real-time generation of all 4 actions — computationally infeasible on playback device |

---

## 5. Offline-First Data Architecture

### Local Storage Schema
```typescript
// Enrolled users with face embeddings
interface EnrolledUser {
  id: string;           // Unique identifier
  name: string;         // Full name
  employeeId: string;   // NHAI employee/contractor ID
  embedding: number[];  // 128-d face embedding (L2-normalized)
  createdAt: number;    // Unix timestamp
  synced: boolean;      // Sync status flag
}

// Authentication attempt logs
interface AuthLog {
  id: string;
  userId: string | null;
  userName: string | null;
  timestamp: number;       // Unix timestamp
  livenessPassed: boolean; // Did liveness check pass?
  matchScore: number;      // Cosine similarity (0-1)
  authenticated: boolean;  // Final result
  synced: boolean;         // Sync status
  latitude: number | null; // GPS coordinate
  longitude: number | null;
}
```

### Sync & Purge Mechanism
```
Field Worker (Offline)          AWS Server
       │                            │
       ├── Enroll face ────────────▶ (stored locally)
       ├── Authenticate ───────────▶ (logged locally with GPS)
       ├── Authenticate ───────────▶ (logged locally)
       │                            │
       │    ─── Network Restored ── │
       │                            │
       ├── POST /api/sync ─────────▶ Receives batch JSON
       │   {enrollments, authLogs,  │ Confirms receipt
       │    deviceTimestamp}        │
       │                            │
       ◀── 200 OK ─────────────────┤
       │                            │
       ├── Mark records as synced   │
       ├── Purge synced records ───▶ (local storage freed)
       │                            │
```

---

## 6. Datalake 3.0 Integration API

The module exposes a clean API for the Datalake 3.0 app:

```typescript
import { FaceAuthModule } from './faceauth/datalakeIntegration';

// When user taps "Mark Attendance" in Datalake 3.0
const result = await FaceAuthModule.authenticateFromPhoto(imagePath);
// Returns: { authenticated, userId, userName, employeeId,
//            matchScore, livenessPassed, timestamp, latitude, longitude }

// Check pending sync count
const pending = await FaceAuthModule.getPendingCount();
// Returns: { users: 3, logs: 47 }

// Sync when network available
await FaceAuthModule.syncToServer('https://datalake-api.nhai.org/sync');

// Sync and purge local data
await FaceAuthModule.syncAndPurge();
```

### Integration Steps for Datalake 3.0 Team
1. Copy `src/` directory into Datalake project
2. Add native module files to `android/app/src/main/java/com/faceauthapp/faceprocessor/`
3. Register `FaceProcessorPackage` in `MainApplication.kt`
4. Add to `build.gradle`:
   ```gradle
   implementation("com.google.mlkit:face-detection:16.1.7")
   implementation("com.microsoft.onnxruntime:onnxruntime-android:1.18.0")
   implementation("androidx.exifinterface:exifinterface:1.3.7")
   ```
5. Copy `mobilefacenet_fp32.onnx` to `android/app/src/main/assets/`
6. Configure sync endpoint URL in Settings screen

---

## 7. Testing Results

### Unit Tests: 17/17 Passing
| Suite | Tests | Coverage |
|-------|-------|----------|
| Embedding Utils | 8 | Cosine similarity, L2 normalize, match finding |
| Database | 7 | CRUD, sync marking, purge logic |
| App Core | 2 | Integration smoke tests |

### Device Testing
- **Tested on**: Mid-range Android device
- **Enrollment**: Face capture + embedding generation working
- **Authentication**: Liveness challenges + face matching working
- **Offline**: Complete operation without internet verified

---

## 8. Technology Stack

| Component | Technology | Why This Choice |
|-----------|-----------|----------------|
| Framework | React Native 0.85 | Required by hackathon (Datalake 3.0 compatibility) |
| Camera | react-native-vision-camera v4 | Best RN camera library, photo capture |
| Face Detection | Google ML Kit (bundled) | Works 100% offline, includes landmarks + classification |
| Face Recognition | MobileFaceNet + ONNX Runtime | 1M params, 99.28% accuracy, 63ms inference |
| Storage | AsyncStorage | Simple, reliable, works offline |
| Navigation | React Navigation v7 | Standard RN navigation |
| Networking | NetInfo + fetch | Connectivity detection + batch sync |
| Language | TypeScript + Kotlin | Type safety + native Android interop |

### Open-Source Compliance
All technologies used are **fully open-source** with no paid licenses required:
- MobileFaceNet — open architecture
- ArcFace loss — open training methodology
- ONNX Runtime — MIT License
- Google ML Kit — free, no API key needed
- React Native — MIT License

---

## 9. File Structure

```
FaceAuthApp/
├── src/
│   ├── App.tsx                              # Navigation setup
│   ├── screens/
│   │   ├── HomeScreen.tsx                   # Dashboard with stats
│   │   ├── EnrollScreen.tsx                 # Camera + face enrollment
│   │   ├── AuthScreen.tsx                   # Liveness + recognition
│   │   ├── HistoryScreen.tsx                # Auth log viewer
│   │   └── SettingsScreen.tsx               # Sync config, user mgmt
│   ├── services/
│   │   ├── database.ts                      # AsyncStorage CRUD
│   │   ├── embeddingUtils.ts                # Cosine similarity, L2 norm
│   │   ├── faceProcessor.ts                 # Native module bridge
│   │   ├── syncService.ts                   # AWS sync + purge
│   │   └── datalakeIntegration.ts           # Datalake 3.0 API
│   ├── theme/index.ts                       # Design system
│   └── types/index.ts                       # TypeScript interfaces
├── android/app/src/main/
│   ├── assets/mobilefacenet_fp32.onnx       # Model (3.81 MB)
│   └── java/com/faceauthapp/faceprocessor/
│       ├── FaceProcessorModule.kt           # ML Kit + ONNX bridge
│       └── FaceProcessorPackage.kt          # RN package
├── __tests__/                               # 17 unit tests
├── artifacts/                               # Model weights (FP32 + INT8)
└── training/notebook.ipynb                  # Full Kaggle training notebook
```
