<div align="center">

<img src="docs/nhai_logo.png" width="110" alt="NHAI Logo"/>

<h1>NHAI Face Auth</h1>

<p><strong>Offline-first biometric attendance for NHAI highway worksites</strong><br/>
National Highways Authority of India · Hackathon 7.0 · Datalake 3.0 Ready</p>

<p>
  <img src="https://img.shields.io/badge/LFW_Accuracy-99.28%25-00E676?style=for-the-badge&labelColor=0A0E1A" alt="LFW"/>
  <img src="https://img.shields.io/badge/Model-1.15_MB_INT8-FF6B35?style=for-the-badge&labelColor=0A0E1A" alt="Model"/>
  <img src="https://img.shields.io/badge/Inference-63_ms-00D4FF?style=for-the-badge&labelColor=0A0E1A" alt="Speed"/>
  <img src="https://img.shields.io/badge/Works-100%25_Offline-1F5FCB?style=for-the-badge&labelColor=0A0E1A" alt="Offline"/>
</p>
<p>
  <img src="https://img.shields.io/badge/Platform-Android-3DDC84?style=for-the-badge&logo=android&logoColor=white&labelColor=0A0E1A" alt="Android"/>
  <img src="https://img.shields.io/badge/React_Native-0.85-61DAFB?style=for-the-badge&logo=react&logoColor=white&labelColor=0A0E1A" alt="RN"/>
  <img src="https://img.shields.io/badge/Kotlin-Native_Module-7F52FF?style=for-the-badge&logo=kotlin&logoColor=white&labelColor=0A0E1A" alt="Kotlin"/>
  <img src="https://img.shields.io/badge/License-MIT-22c55e?style=for-the-badge&labelColor=0A0E1A" alt="License"/>
</p>

<p>
  <a href="https://eartherai.github.io/FaceAuthApp/"><strong>🌐 Full Demo Page</strong></a> &nbsp;·&nbsp;
  <a href="../../releases/latest"><strong>📥 Download APK</strong></a> &nbsp;·&nbsp;
  <a href="FaceAuthApp/notebook/mobilefacenet_training.ipynb"><strong>🧠 Training Notebook</strong></a> &nbsp;·&nbsp;
  <a href="docs/MODEL.md"><strong>📊 Model Details</strong></a> &nbsp;·&nbsp;
  <a href="docs/FEATURES.md"><strong>✨ All Features</strong></a>
</p>

</div>

---

## 📱 The App

<div align="center">

| Command Centre | Face Enrolment | Analytics Dashboard |
|:---:|:---:|:---:|
| <img src="docs/screenshots/home.png" width="220"/> | <img src="docs/screenshots/enroll.png" width="220"/> | <img src="docs/screenshots/dashboard.png" width="220"/> |
| *Live KPIs · Quick actions* | *CNN embed · BioHash protect* | *Security metrics · 7-day trend* |

| Attendance | Calendar | Worker Registry |
|:---:|:---:|:---:|
| <img src="docs/screenshots/attendance.png" width="220"/> | <img src="docs/screenshots/calendar.png" width="220"/> | <img src="docs/screenshots/people.png" width="220"/> |
| *Check-in / check-out* | *Monthly attendance view* | *Enrolled worker roster* |

| Auth History | Admin Console | System Settings |
|:---:|:---:|:---:|
| <img src="docs/screenshots/history.png" width="220"/> | <img src="docs/screenshots/admin.png" width="220"/> | <img src="docs/screenshots/settings.png" width="220"/> |
| *Filterable auth log* | *2FA protected controls* | *Full configuration* |

</div>

---

## 🛣️ The Problem

NHAI manages **50,000+ construction workers** across remote highway stretches with **little or no connectivity**. Marking attendance reliably — and proving *who* was actually on-site — is hard:

- 📋 Paper registers are tampered with — proxy punching is widespread
- 🌐 Cloud biometric APIs are useless without a signal
- 📍 No way to prove a worker is physically at the *correct* site
- ⛑️ No enforcement of safety gear (helmet, hi-vis vest) at entry

## 💡 Our Solution

A **fully offline** Android app that solves all four problems at once:

```
Face detected → 3 liveness challenges → anti-spoof check → CNN match (99.28% LFW)
     → GPS geofence check → PPE compliance check → attendance logged → sync to Datalake 3.0
```

> **Everything runs on-device.** No server. No internet. No cloud. Works in the most remote highway stretch in India.

---

## 🧠 The Custom Model — 99.28% LFW

> We did **not** use an off-the-shelf API. We trained **MobileFaceNet + ArcFace** from scratch.

<div align="center">

| Metric | Our Result | Hackathon Constraint | Verdict |
|:---:|:---:|:---:|:---:|
| **LFW 10-fold Accuracy** | **99.28%** | > 95% | ✅ **+4.28% above requirement** |
| **Model Size (INT8)** | **1.15 MB** | < 20 MB | ✅ **17× smaller than limit** |
| **CPU Latency/Face** | **63 ms** | < 1000 ms | ✅ **16× faster than limit** |
| **Self-trained** | MobileFaceNet + ArcFace | Required | ✅ **100% custom** |

</div>

### Training Details

| Setting | Value |
|---|---|
| **Dataset** | CASIA-WebFace — 490,623 images / 10,572 identities |
| **Backbone** | MobileFaceNet (~1.0 M params, 128-D embedding) |
| **Loss** | ArcFace (`s=64`, `m=0.50`) |
| **Optimizer** | SGD momentum=0.9, wd=5e-4 + warmup + cosine LR |
| **Precision** | AMP mixed fp16 |
| **Hardware** | Kaggle Tesla T4 GPU |
| **Best checkpoint** | Epoch 36 — 99.28% LFW |
| **Training time** | ~6.6 hours |
| **Export** | PyTorch → ONNX FP32 → dynamic INT8 (parity-checked) |

<details>
<summary><strong>📈 Full training curve (click to expand)</strong></summary>

| Epoch | LFW Acc | | Epoch | LFW Acc |
|:---:|:---:|---|:---:|:---:|
| 1 | 85.90% | | 20 | 98.18% |
| 2 | 94.47% | | 24 | 98.57% |
| 4 | 96.43% | | 28 | 98.83% |
| 7 | 97.22% | | 31 | 99.07% |
| 10 | 97.78% | | 33 | 99.13% |
| 12 | 98.07% | | **36** | **99.28% ★ BEST** |
| 17 | 98.47% | | 40 | 99.15% |

</details>

**On-device resilience:** the app runs the ONNX FP32 model with an **eye-aligned geometric landmark fallback** — recognition works on *every* Android phone, even those whose ONNX runtime lacks the quantized operator set.

📓 **Reproduce it yourself:** [`FaceAuthApp/notebook/mobilefacenet_training.ipynb`](FaceAuthApp/notebook/mobilefacenet_training.ipynb) — open on Kaggle, attach CASIA-WebFace, set GPU T4, Run All.

📦 **Trained weights:** [`FaceAuthApp/artifacts/`](FaceAuthApp/artifacts/) — `mobilefacenet_fp32.pt` · `mobilefacenet_fp32.onnx` · `mobilefacenet_int8.onnx`

---

## ✨ Features

<details open>
<summary><strong>🧠 Face Recognition & Matching</strong></summary>

- Custom MobileFaceNet CNN — 128-D L2-normalised embeddings, 99.28% LFW
- Eye-aligned ArcFace 112×112 similarity transform (matches training exactly)
- Cosine similarity matching with **method-adaptive thresholds** (CNN: 0.42, geometric: 0.80)
- Duplicate enrolment detection — blocks re-registration of the same person
- Geometric landmark fallback — eye-aligned, pose/scale invariant, runs on every device

</details>

<details open>
<summary><strong>👁️ Liveness + Anti-Spoofing (3-layer)</strong></summary>

- **Layer 1:** Active liveness — 3 randomized challenges (blink / smile / head-turn)
  - Baseline-relative head-turn detection — works at any camera angle
  - Live progress bar guides the user in real time
  - Randomized order every session — defeats pre-recorded video attacks
- **Layer 2:** Passive anti-spoof — Laplacian-variance texture analysis (native Kotlin, <10 ms)
  - Printed photos and phone screens blocked before matching begins
- **Layer 3:** Face classification quality — eye-open probability + smile probability gating

</details>

<details open>
<summary><strong>🔐 Privacy & Security</strong></summary>

- **BioHash** (ISO/IEC 24745) — raw face embedding never stored, cancellable templates
- **AES-256-GCM** encryption at rest for all biometric data
- 3-attempt lockout + 30 s cooldown against brute-force
- GDPR-style data retention with automatic purge of expired records
- Aadhaar Verhoeff checksum validation + masked display (`XXXX XXXX 1234`)

</details>

<details open>
<summary><strong>📍 Field Features</strong></summary>

- **GPS Geofencing** — Haversine distance vs configured site radius; check-in outside the site fails
- **PPE Compliance** — helmet + hi-vis vest detection gates site entry (configurable: warn or hard-block)
- **Offline-first sync** — all writes to encrypted local store; background push to Datalake 3.0 with exponential-backoff retry
- **Live analytics** — liveness pass rate, match confidence, spoof blocks, geofence compliance, 7-day trend
- **Hindi / English** voice prompts (TTS) + high-contrast outdoor UI

</details>

---

## 🏗️ Architecture

```
┌────────────────────────────────────────────────────────────────┐
│                   React Native 0.85  (Hermes, New Arch)         │
│   Home · Enrol · Authenticate · PPE · Dashboard · Admin · …     │
└─────────────────┬──────────────────────────────┬───────────────┘
                  │                              │
     ┌────────────▼────────────┐    ┌────────────▼──────────────┐
     │  Kotlin Native Module    │    │  TypeScript Services       │
     │  FaceProcessor           │    │  embeddingUtils (cosine)   │
     │  • ML Kit async detect   │    │  bioHash (ISO/IEC 24745)   │
     │  • MobileFaceNet FP32    │    │  encryption (AES-256-GCM)  │
     │  • Eye-aligned crop      │    │  geofencing · ppeDetection │
     │  • Laplacian anti-spoof  │    │  syncService · datalake    │
     │  • Geometric fallback    │    │  adaptiveThreshold · i18n  │
     └────────────┬────────────┘    └────────────┬──────────────┘
                  │                              │
     ┌────────────▼──────────────────────────────▼──────────────┐
     │   Encrypted local store (AsyncStorage + AES-256-GCM)      │
     │   Background sync → NHAI Datalake 3.0 API                 │
     └───────────────────────────────────────────────────────────┘
```

**End-to-end pipeline latency: 300–500 ms** (capture 50ms + detect 100ms + embed 63ms + match <10ms + record <50ms)

---

## 🛡️ Security — Every Attack, Every Mitigation

| Threat | Attack | Mitigation | Status |
|---|---|---|:---:|
| Photo spoof | Printed photo to camera | Laplacian-variance texture (native Kotlin) | ✅ |
| Screen replay | Video on another phone | Laplacian flat-texture detection + liveness | ✅ |
| Pre-recorded video | Video with correct moves | Randomized 3-of-4 challenge order | ✅ |
| Proxy attendance | Person A for person B | CNN recognition 99.28% + liveness | ✅ |
| Location fraud | Remote / GPS spoof | Haversine geofence vs site boundary | ✅ |
| Duplicate enrolment | Re-register same person | Cosine similarity ≥ 0.55 rejection | ✅ |
| Device theft | Physical access | AES-256-GCM encrypted store + lockout | ✅ |
| Biometric extraction | Steal template | BioHash ISO/IEC 24745 — raw never stored | ✅ |
| Brute force | Repeated attempts | 3-attempt lockout + 30 s cooldown | ✅ |
| Record tampering | Edit attendance | Server-timestamp validation + audit trail | ✅ |

---

## 🆚 Why We Win

| Capability | ✅ NHAI Face Auth | ❌ Typical Systems |
|---|---|---|
| Offline operation | Full offline — every feature on-device | Requires connectivity |
| Recognition model | Self-trained 99.28% LFW, 1.15 MB | Cloud API or 10–50 MB models |
| Template protection | BioHash ISO/IEC 24745 — raw never stored | Raw embedding stored |
| Liveness | 3 randomized challenges + passive anti-spoof | Single factor or none |
| Device coverage | CNN + geometric fallback — every phone | Fails on unsupported ops |
| Safety gate | GPS geofence + PPE helmet/vest check | Attendance only |
| Privacy | ISO/IEC 24745, AES-256, GDPR retention | Varies / none |
| Identity | Aadhaar Verhoeff + masked display | Not integrated |
| Analytics | Live on-device dashboard — works offline | Cloud only |

---

## 🔌 Datalake 3.0 Integration

```typescript
import { FaceAuthModule } from './FaceAuthApp/src/services/datalakeIntegration';

// One call: face auth + liveness + geofence + attendance + sync
const result = await FaceAuthModule.markAttendance(imagePath);
// result.authenticated      → true / false
// result.withinGeofence     → true / false
// result.attendanceAction   → "CHECKED IN" / "CHECKED OUT"
// result.matchScore         → 0.0 – 1.0
// result.livenessPassed     → true / false
// result.bioHashVerified    → true / false

// Background sync when online
await FaceAuthModule.syncToServer();
```

**REST API endpoints:** `POST /enroll` · `POST /auth/verify` · `POST /attendance/sync` · `GET /sites` · `POST /ppe/report` · `GET /models/latest`

---

## 🚀 Quick Start

### A) Install APK (no build needed)
```bash
# Download from GitHub Releases, then:
adb install -r NHAI-FaceAuth.apk
# Open app → Enrol New Worker → Scan & Authenticate
```

### B) Build from source
```bash
git clone https://github.com/Eartherai/FaceAuthApp.git
cd FaceAuthApp/FaceAuthApp
npm install
cd android && ./gradlew assembleDebug
# → android/app/build/outputs/apk/debug/app-debug.apk
```

**Prerequisites:** Node ≥ 18, JDK 17, Android SDK 35 + NDK (via Android Studio)

### C) Reproduce the model
```
1. Open FaceAuthApp/notebook/mobilefacenet_training.ipynb on Kaggle
2. Attach CASIA-WebFace .rec dataset
3. Settings → Accelerator → GPU T4
4. Run All  →  exports fp32.pt / fp32.onnx / int8.onnx + constraints check
```

### D) Tests
```bash
cd FaceAuthApp
npx jest          # bioHash, embeddings, qualityGate, Aadhaar, retryPolicy…
npx tsc --noEmit  # TypeScript type-check
```

---

## 📂 Repository Structure

```
nhai-face-auth/
├── README.md                          ← you are here
├── LICENSE                            (MIT)
├── docs/                              GitHub Pages site
│   ├── index.html                     full interactive demo page
│   ├── nhai_logo.png
│   ├── screenshots/                   9 app screenshots
│   ├── MODEL.md                       model training deep-dive
│   ├── FEATURES.md                    complete feature notes
│   ├── ARCHITECTURE.md               system design
│   ├── SECURITY.md                    threat model
│   └── BUILD.md                       reproducible build guide
├── FaceAuthApp/                       React Native application
│   ├── src/
│   │   ├── screens/                   12 screens (Home, Enrol, Auth, PPE…)
│   │   └── services/                  bioHash · encryption · geofencing · sync…
│   ├── android/
│   │   └── app/src/main/java/…/
│   │       └── FaceProcessorModule.kt Kotlin: ML Kit + ONNX + anti-spoof
│   ├── notebook/
│   │   └── mobilefacenet_training.ipynb  full Kaggle training notebook
│   ├── artifacts/
│   │   ├── mobilefacenet_fp32.pt      PyTorch checkpoint
│   │   ├── mobilefacenet_fp32.onnx    FP32 ONNX (4.0 MB)
│   │   └── mobilefacenet_int8.onnx    INT8 ONNX (1.15 MB) ← used on device
│   ├── __tests__/                     unit tests
│   └── TECHNICAL_DOCUMENT.md         full technical reference
└── presentation/
    └── NHAI_FaceAuth_FINAL.pptx       hackathon pitch deck
```

---

## 🛠️ Tech Stack

<div align="center">

| Layer | Technology |
|---|---|
| **Framework** | React Native 0.85, New Architecture, Hermes |
| **Camera** | VisionCamera v5.0.11 |
| **Face Detection** | Google ML Kit (offline, bundled) |
| **Recognition Model** | Custom MobileFaceNet + ArcFace (self-trained) |
| **ML Runtime** | ONNX Runtime Android 1.18 |
| **Native Module** | Kotlin (FaceProcessorModule) |
| **Encryption** | AES-256-GCM |
| **Storage** | AsyncStorage (encrypted) |
| **Navigation** | React Navigation 7 |
| **Language** | TypeScript 5.8 |
| **Training** | PyTorch 2.x, ONNX, scikit-learn |
| **Platform** | Android 7.0+ (API 24), Target API 35 |

</div>

---

## 📚 Documentation

| Document | Description |
|---|---|
| [**🌐 Full Demo Page**](https://eartherai.github.io/FaceAuthApp/) | Interactive site: every feature, model details, architecture, comparison |
| [**📊 MODEL.md**](docs/MODEL.md) | Training setup, architecture, results, reproduction, integration |
| [**✨ FEATURES.md**](docs/FEATURES.md) | Every feature, how it works, why it matters, criterion map |
| [**🏗️ ARCHITECTURE.md**](docs/ARCHITECTURE.md) | Pipeline, modules, data flow, performance budget |
| [**🛡️ SECURITY.md**](docs/SECURITY.md) | Full threat model, mitigations, privacy guarantees |
| [**🔨 BUILD.md**](docs/BUILD.md) | Prerequisites, clean build, run, test, troubleshooting |
| [**📄 TECHNICAL_DOCUMENT.md**](FaceAuthApp/TECHNICAL_DOCUMENT.md) | Complete technical reference |
| [**🧠 Training Notebook**](FaceAuthApp/notebook/mobilefacenet_training.ipynb) | Kaggle notebook: train → evaluate → export |

---

<div align="center">

**NHAI Face Auth** — National Highways Authority of India · Hackathon 7.0

*Custom MobileFaceNet (99.28% LFW) · Offline-first · Privacy by design*

<br/>

<img src="https://img.shields.io/badge/99.28%25_LFW-Custom_CNN-00E676?style=flat-square&labelColor=0A0E1A"/>
<img src="https://img.shields.io/badge/1.15_MB-INT8_Model-FF6B35?style=flat-square&labelColor=0A0E1A"/>
<img src="https://img.shields.io/badge/63_ms-Inference-00D4FF?style=flat-square&labelColor=0A0E1A"/>
<img src="https://img.shields.io/badge/100%25-Offline-1F5FCB?style=flat-square&labelColor=0A0E1A"/>
<img src="https://img.shields.io/badge/ISO/IEC_24745-BioHash-A855F7?style=flat-square&labelColor=0A0E1A"/>
<img src="https://img.shields.io/badge/AES--256--GCM-Encrypted-22c55e?style=flat-square&labelColor=0A0E1A"/>

</div>
