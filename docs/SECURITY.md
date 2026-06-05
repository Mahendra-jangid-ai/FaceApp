# Security &amp; Privacy

NHAI Face Auth is built so that **a stolen device or a breached database leaks no usable biometric**, and so that common spoofing attacks fail.

---

## Threat model &amp; mitigations

| Threat | Attack vector | Mitigation | Status |
|---|---|---|:---:|
| Photo spoof | Printed photo held to camera | Laplacian-variance texture analysis (native Kotlin) + liveness | ✅ |
| Screen replay | Face video on another phone | Laplacian flat-texture detection + active liveness | ✅ |
| Pre-recorded video | Video with correct movements | **Randomized** 3-of-4 challenge order (blink/smile/turn) | ✅ |
| Proxy attendance | One person punching for another | Face recognition (99.28% LFW) + liveness | ✅ |
| Location fraud | Faking presence | Haversine geofence vs configured site radius | ✅ |
| Duplicate enrolment | Same person registering twice | Cosine similarity ≥ 0.88 rejection at enrol | ✅ |
| Data theft | Physical device access | AES-256-GCM encrypted store at rest | ✅ |
| Biometric extraction | Stealing the template | **BioHash** (raw embedding never stored); cancellable | ✅ |
| Brute force | Repeated auth attempts | 3-attempt lockout + 30 s cooldown | ✅ |
| Record tampering | Editing attendance | Server-timestamp validation on sync; local audit trail | ✅ |

---

## Biometric template protection (ISO/IEC 24745)

- **BioHash:** the 128-D embedding is transformed by a salted random projection into a cancellable template. The original vector is **discarded** — only the BioHash + salt persist.
- **Cancellable & renewable:** if a template is ever compromised, change the salt and re-issue — no need to re-capture the worker.
- **Dual verification:** authentication checks **both** cosine similarity of the live embedding **and** the BioHash, reducing false accepts.

> Result: a database dump yields salted hashes, not faces — there is nothing to reconstruct a biometric from.

---

## Encryption &amp; data lifecycle

- **At rest:** AES-256-GCM for all stored templates and records.
- **In transit:** only protected templates and event **metadata** sync to Datalake 3.0 — never raw images or embeddings.
- **Retention:** GDPR-style policies with automatic purge of expired records.
- **Aadhaar:** validated via Verhoeff checksum and **masked** in the UI (`XXXX XXXX 1234`).

---

## Liveness &amp; anti-spoofing layers

1. **Active liveness** — 3 randomized challenges, evaluated from ML Kit eye/smile/head-angle signals; head-turn measured relative to a per-session baseline.
2. **Passive anti-spoof** — Laplacian-variance texture score on the face crop; auth aborts below 0.30.
3. **Match gating** — only after liveness + anti-spoof pass is identity matching attempted.

---

## Privacy principles

- **On-device by default** — recognition never requires the cloud.
- **Data minimization** — store the least needed; protect what's stored.
- **No raw biometrics off-device** — ever.
- **Transparency** — on-device analytics show exactly what was checked (liveness, spoof score, geofence, BioHash).

---

## Responsible disclosure

Found a vulnerability? Please open a private security advisory on the repository rather than a public issue, and allow reasonable time to remediate before disclosure.
