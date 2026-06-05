# Build &amp; Run Guide

A clean, reproducible path from a fresh clone to a working APK on a phone.

---

## 1. Prerequisites

| Tool | Version | Notes |
|---|---|---|
| **Node.js** | ≥ 18 LTS | `node -v` |
| **npm** | ≥ 9 | ships with Node |
| **JDK** | 17 | Temurin/Adoptium recommended |
| **Android SDK** | Platform **35**, Build-Tools **35.x** | via Android Studio |
| **Android NDK** | as pinned by RN 0.85 | installed through SDK Manager |
| **ADB** | latest | for installing to a device |

Set environment variables:

```bash
# macOS / Linux
export ANDROID_HOME=$HOME/Library/Android/sdk      # or ~/Android/Sdk on Linux
export PATH=$PATH:$ANDROID_HOME/platform-tools

# Windows (PowerShell)
$env:ANDROID_HOME = "$env:LOCALAPPDATA\Android\Sdk"
$env:Path += ";$env:ANDROID_HOME\platform-tools"
```

> Easiest setup: install **Android Studio**, open the SDK Manager, and install *Android 15 (API 35)* SDK Platform + *Android SDK Build-Tools 35* + *NDK* + *CMake*.

---

## 2. Clone &amp; install

```bash
git clone https://github.com/Eartherai/FaceAuthApp.git
cd FaceAuthApp
npm install
```

`android/local.properties` is created automatically by Android Studio, or create it manually:

```
sdk.dir=/absolute/path/to/Android/Sdk
```

---

## 3. Build a standalone debug APK

This APK **bundles the JS and ML models** — it runs without Metro and without a server.

```bash
cd android
./gradlew assembleDebug          # Windows: .\gradlew.bat assembleDebug
```

Output:
```
FaceAuthApp/android/app/build/outputs/apk/debug/app-debug.apk
```

Install to a connected phone:
```bash
adb install -r app/build/outputs/apk/debug/app-debug.apk
```

> First Gradle run downloads dependencies and may take several minutes. Subsequent builds are incremental.

---

## 4. Run in development (optional)

```bash
# Terminal 1 — Metro bundler
cd FaceAuthApp
npm start

# Terminal 2 — install & launch the debug build on a device/emulator
npm run android
```

---

## 5. Tests &amp; type-check

```bash
cd FaceAuthApp
npx jest          # unit tests (bioHash, embeddings, quality gate, Aadhaar, …)
npx tsc --noEmit  # TypeScript type-check
```

---

## 6. Permissions on device

The app requests these at runtime / declares them in the manifest:

- **Camera** — capture for enrol/auth (required)
- **Location** (fine/coarse) — geofencing
- **Vibrate** — haptic feedback
- **Internet / Network state** — background sync only

If you reinstall and the camera shows "no permission", grant it in **Settings → Apps → NHAI Face Auth → Permissions**, or:
```bash
adb shell pm grant com.faceauthapp android.permission.CAMERA
```

---

## 7. Troubleshooting

| Symptom | Fix |
|---|---|
| `SDK location not found` | Create `android/local.properties` with `sdk.dir=...` |
| Gradle can't find NDK/CMake | Install **NDK** + **CMake** via Android Studio SDK Manager |
| `JAVA_HOME` / wrong JDK | Use **JDK 17**; set `JAVA_HOME` to its path |
| Old launcher icon after reinstall | Uninstall first, then install; or reboot the phone |
| "No face detected" right after enrol | Do a clean install (old enrolments use an incompatible format), then re-enrol |
| APK too large for GitHub | It's expected (~159 MB, bundles ML models) — distribute via **Releases**, not the repo |

---

## 8. Reproduce the model

See [MODEL.md](MODEL.md) — open the Kaggle notebook with the CASIA-WebFace `.rec` dataset and a GPU T4, run all cells, and drop the exported `mobilefacenet_int8.onnx` into `FaceAuthApp/android/app/src/main/assets/`.
