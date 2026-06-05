# Features — Complete Notes

Every capability in **NHAI Face Auth**, what it does, how it works, and why it matters in the field. All of it runs **on-device** and works **offline**.

---

## 1. Custom Face Recognition 🧠
**What:** Identifies an enrolled worker from their face in ~0.3–0.5 s end-to-end.
**How:** A MobileFaceNet network (trained by us — see [MODEL.md](MODEL.md)) produces a 128-dimensional embedding; identity is decided by **cosine similarity** against enrolled templates.
**Details:**
- Match threshold: **0.80** cosine similarity (configurable / adaptive).
- Duplicate-enrolment threshold: **0.88** — blocks the same person registering twice.
- On-device ONNX inference with an **eye-aligned geometric landmark fallback** so it runs on any phone.
**Why it matters:** Eliminates proxy attendance — the worker must physically present their face.

## 2. Active Liveness Detection 👁️
**What:** Confirms a *live* person is in front of the camera, not a photo or video.
**How:** Three **randomized** challenges from {blink, smile, turn left, turn right}, evaluated in real time from ML Kit face classification (eye-open probability, smile probability, head Euler angles).
**Details:**
- Head-turn is measured **relative to a baseline** captured on first detection, so it works at any camera angle.
- A live **progress bar** guides the user; challenges advance only when satisfied.
- Randomized order defeats pre-recorded "challenge" videos.
**Why it matters:** Defeats the most common spoof — holding up a photo or playing a video.

## 3. Anti-Spoofing 🛡️
**What:** Rejects printed photos and phone/tablet screens.
**How:** Native **Laplacian-variance texture analysis** on the face crop — flat/printed surfaces have a distinct sharpness signature versus a real face.
**Details:** Spoof score in [0,1]; auth aborts below 0.30. Runs in native Kotlin for speed.
**Why it matters:** Adds a passive layer on top of active liveness.

## 4. BioHash Privacy (ISO/IEC 24745) 🔐
**What:** Stores a **cancellable** biometric template instead of the raw face.
**How:** A salted random projection transforms the embedding into a BioHash; the original 128-D vector is discarded.
**Details:**
- Templates can be **revoked and re-issued** without re-enrolling the worker.
- Dual verification: cosine match **and** BioHash check.
**Why it matters:** Even a full database breach leaks no usable biometric — a hard requirement for government-scale deployments.

## 5. Encryption & Account Protection 🔒
**What:** Protects all stored data and throttles attackers.
**How:** **AES-256-GCM** encryption at rest; **3-attempt lockout** with a 30-second cooldown.
**Details:** GDPR-style retention with automatic purge of expired records.
**Why it matters:** Defense-in-depth for sensitive worker data on a shared/lost device.

## 6. GPS Geofencing 📍
**What:** Confirms the worker is physically at their assigned site.
**How:** **Haversine** distance from the device's GPS fix to configured site boundaries, with a configurable radius.
**Details:** Each check-in/out records coordinates, nearest site, and an in/out-of-bounds flag.
**Why it matters:** Stops "attendance from home" — presence is tied to the worksite.

## 7. PPE Compliance 🦺
**What:** Verifies safety gear (helmet + hi-vis vest) before allowing site entry.
**How:** On-device detection of helmet and vest with confidence scores; a pass requires both.
**Why it matters:** Turns the daily check-in into a **safety checkpoint**, reducing incidents.

## 8. Attendance Workflow 🕒
**What:** One face scan handles **check-in or check-out** automatically.
**How:** If an open check-in exists for the worker, the scan closes it (check-out); otherwise it opens a new record. Each record carries time, GPS, site, and match confidence.
**Why it matters:** Zero training for supervisors — one button, the app figures out the rest.

## 9. Aadhaar Linkage 🆔
**What:** Optional Aadhaar number tied to a worker.
**How:** **Verhoeff checksum** validation on entry; the number is **masked** (`XXXX XXXX 1234`) in the UI.
**Why it matters:** Identity assurance aligned with Indian government ID standards.

## 10. Offline-First Sync 📡
**What:** Full functionality with **zero connectivity**; syncs when a signal returns.
**How:** All reads/writes hit an encrypted local store. A background sync engine pushes pending records to **NHAI Datalake 3.0** with **exponential-backoff retry** and a connectivity watcher.
**Why it matters:** Remote highway stretches have no reliable network — the app simply doesn't depend on one.

## 11. Live Analytics Dashboard 📊
**What:** On-device security and attendance metrics.
**How:** Aggregates auth logs and attendance into KPIs — liveness pass rate, average match confidence, spoof blocks, geofence compliance, PPE compliance, pipeline latency, adaptive threshold — plus a **7-day trend**.
**Why it matters:** Gives site managers instant operational visibility, even offline.

## 12. Worker Registry & History 👥
**What:** Manage enrolled workers and review every authentication.
**How:** Searchable people list with roles; filterable, timestamped auth history with outcome and confidence.
**Why it matters:** Auditability and easy roster management.

## 13. Calendar View 📅
**What:** Month view of attendance per worker/site.
**Why it matters:** Quick visual confirmation of presence over time.

## 14. Admin Console 🛠️
**What:** Protected administrative controls.
**How:** **2FA admin login**, system health, configuration of sites, thresholds, and sync.
**Why it matters:** Separates privileged operations from day-to-day supervisor use.

## 15. Localization & Accessibility 🗣️
**What:** Usable by field workers across languages and conditions.
**How:** **Hindi / English** voice prompts (TTS) for liveness steps; high-contrast dark UI tuned for outdoor sunlight; large touch targets.
**Why it matters:** Real adoption depends on usability for the actual workforce.

---

### Feature → Hackathon Criterion Map

| Criterion | Covered by |
|---|---|
| Offline operation | #10 Offline-first, all on-device processing |
| Accurate recognition | #1 Custom model (99.28% LFW) |
| Anti-spoofing / liveness | #2 Liveness, #3 Anti-spoof |
| Privacy & security | #4 BioHash, #5 Encryption |
| Field practicality | #6 Geofence, #7 PPE, #8 Attendance, #15 Localization |
| Datalake 3.0 integration | #10 Sync engine |
| Identity assurance | #9 Aadhaar |
| Manageability | #11 Analytics, #12 Registry/History, #13 Calendar, #14 Admin |
