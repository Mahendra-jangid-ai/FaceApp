# System Architecture

NHAI Face Auth is a mobile-first, **offline-capable** face authentication system for NHAI's Datalake 3.0. The design prioritizes: (1) zero-connectivity operation, (2) multi-layer security, (3) sub-second recognition, and (4) a tiny on-device footprint.

---

## High-level layers

```
┌─────────────────────────────────────────────────────────────┐
│                  React Native 0.85 (Hermes, New Arch)        │
│   Home · Enrol · Authenticate · PPE · Attendance · Dashboard │
│   History · People · Calendar · Admin · Settings             │
└───────────────┬─────────────────────────────┬───────────────┘
                │                             │
   ┌────────────▼────────────┐   ┌────────────▼─────────────┐
   │  Native Kotlin module    │   │  Services (TypeScript)    │
   │  FaceProcessor           │   │  faceProcessor (bridge)   │
   │  • ML Kit detection      │   │  embeddingUtils (cosine)  │
   │  • MobileFaceNet (ONNX)  │   │  bioHash · encryption     │
   │  • eye-aligned 128-D     │   │  qualityGate · adaptive   │
   │  • Laplacian anti-spoof  │   │  geofencing · ppeDetection│
   └────────────┬────────────┘   │  syncService · datalake   │
                │                 └────────────┬─────────────┘
                │                              │
   ┌────────────▼──────────────────────────────▼────────────┐
   │  Encrypted local store (AES-256)  ·  offline-first       │
   │      → background sync → NHAI Datalake 3.0              │
   └──────────────────────────────────────────────────────────┘
```

---

## Authentication pipeline

```
Camera frame (VisionCamera v5)
   │  ~50 ms capture to file
   ▼
[1] Native preprocessing (Kotlin)
   ├─ EXIF rotation correction
   ├─ downsample to ≤1280 px (OOM-safe)
   └─ ARGB_8888 bitmap                          ~20 ms
   ▼
[2] ML Kit face detection + classification
   ├─ bounding box, landmarks, contours
   ├─ eye-open / smile probabilities
   └─ head Euler angles (Y, Z)                  ~100 ms
   ▼
[3] Liveness (3 randomized challenges)
   └─ blink / smile / head-turn (baseline-relative)
   ▼
[4] Anti-spoof (Laplacian variance) → score ≥ 0.30
   ▼
[5] Embedding
   ├─ ONNX MobileFaceNet 128-D, or
   └─ eye-aligned geometric fallback            ~30–63 ms
   ▼
[6] Match (cosine ≥ 0.80) + BioHash verify
   ▼
[7] Geofence check (Haversine vs site radius)
   ▼
[8] Attendance record (check-in/out) → local store → sync
```

Typical end-to-end: **~300–500 ms**.

---

## Enrolment pipeline

```
Capture → detect → quality gate → 128-D embedding
   → duplicate check (cosine ≥ 0.88 rejects)
   → BioHash (salted projection) + AES-256 encrypt
   → store locally (raw embedding never persisted as-is)
```

---

## Module map

| Module | Responsibility |
|---|---|
| `screens/` | 12 UI screens (RN + TypeScript) |
| `services/faceProcessor.ts` | Bridge to native detection + embedding |
| `services/embeddingUtils.ts` | Cosine similarity, L2 norm, match, duplicate, storage prep |
| `services/bioHash.ts` | ISO/IEC 24745 cancellable templates |
| `services/encryption.ts` | AES-256-GCM at rest |
| `services/qualityGate.ts` | Face acceptance checks |
| `services/adaptiveThreshold.ts` | Environment-aware match threshold |
| `services/geofencing.ts` | GPS + Haversine site validation |
| `services/ppeDetection.ts` | Helmet / vest compliance |
| `services/syncService.ts` + `datalakeIntegration.ts` | Offline-first sync to Datalake 3.0 |
| `services/aadharValidator.ts` | Verhoeff checksum + masking |
| `services/i18n.ts`, `voicePrompts.ts` | Hindi/English text + TTS |
| `android/.../FaceProcessorModule.kt` | ML Kit detect, ONNX embed, Laplacian spoof, eye-aligned fallback |

---

## Data flow & storage

- **Local store:** encrypted key-value (AsyncStorage) holding workers (BioHash + salt), auth logs, attendance, sites.
- **Sync:** delta push to Datalake 3.0 with exponential-backoff retry and a connectivity watcher; server-wins conflict policy with a local audit trail.
- **Never synced:** raw face images or raw embeddings — only protected templates and event metadata.

---

## Performance budget

| Stage | Budget |
|---|---|
| Capture | ~50 ms |
| Preprocess | ~20 ms |
| Detection (ML Kit) | ~100 ms |
| Embedding | 30–63 ms |
| Match + BioHash | < 10 ms |
| **End-to-end** | **~300–500 ms** |

---

## Platform notes

- React Native **0.85**, New Architecture, **Hermes** engine.
- Standalone APK: `debuggableVariants = []` embeds the JS bundle (no Metro at runtime).
- ABIs: `arm64-v8a`, `x86_64`.
- Min SDK 24 (Android 7.0), Target SDK 35 (Android 15).
