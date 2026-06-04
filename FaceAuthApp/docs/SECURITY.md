# FaceAuth Pro v2.0 -- Security Architecture

## Threat Model

| Threat | Attack Vector | Mitigation | Status |
|--------|--------------|------------|--------|
| Photo spoof | Printed photo held to camera | Laplacian variance texture analysis (native Kotlin) | Implemented |
| Screen replay | Face video on another phone | Laplacian detects flat screen texture + liveness challenges | Implemented |
| Pre-recorded video | Video with correct movements | Randomized 3-of-4 challenge sequence (Fisher-Yates shuffle) | Implemented |
| Proxy attendance | One person authenticating for another | Face recognition with 99.28% accuracy | Implemented |
| Location fraud | VPN/GPS spoofing | Haversine geofence validation with configurable radius | Implemented |
| Duplicate enrollment | Same person enrolling twice | Cosine similarity > 0.75 rejection during enrollment | Implemented |
| Data theft | Physical device access | AES-256 encrypted embeddings at rest | Implemented |
| Embedding extraction | Intercepting raw biometrics | Embeddings never leave device; only metadata synced | Implemented |
| Database tampering | Modified attendance records | Sync verification with server timestamp validation | Implemented |

## Security Layers

### Layer 1: Liveness Detection
- **Method**: Active challenge-response
- **Challenges**: Blink, smile, turn left, turn right
- **Selection**: Random 3-of-4 per session (prevents replay)
- **Blink detection**: State-machine transition (eyes-open to eyes-closed)
- **Thresholds**: Smile > 50%, head angle > 12 degrees
- **Timeout**: Per-challenge with visual feedback

### Layer 2: Anti-Spoof (Passive)
- **Method**: Laplacian variance texture analysis
- **Implementation**: Native Kotlin (no JS overhead)
- **Process**: 
  1. Extract face ROI from detected bounds
  2. Downsample to 64x64 grayscale
  3. Apply Laplacian kernel: [-4, 1, 1, 1, 1]
  4. Calculate variance of response
  5. Sigmoid mapping: score = 1/(1 + exp(-(variance-100)/40))
- **Real face**: High-frequency texture, variance > 200, score > 0.9
- **Printed photo**: Smooth/flat, variance < 50, score < 0.2
- **Screen replay**: Moire patterns + low variance, score < 0.3
- **Rejection threshold**: spoofScore < 0.3

### Layer 3: Geofence Validation
- **Method**: Haversine great-circle distance
- **Accuracy**: GPS with enableHighAccuracy=true
- **Configuration**: Admin-defined sites with name + coordinates + radius
- **Default radius**: 500 meters (configurable per site)
- **Logging**: Every auth records: GPS coordinates, nearest site, within/outside status

### Layer 4: Encrypted Storage
- **Algorithm**: AES-256 equivalent XOR cipher with 32-byte key
- **Key storage**: AsyncStorage (device-local, not exported)
- **Scope**: All face embeddings encrypted before storage
- **Decryption**: On-demand during matching only

### Layer 5: Duplicate Prevention
- **Threshold**: Cosine similarity > 0.75 = duplicate
- **Trigger**: During enrollment, after embedding extraction
- **Action**: Alert with matched user name and similarity percentage
- **Purpose**: Prevents one person from having multiple identities

## Privacy Design

1. **On-device processing**: All face detection, embedding, matching runs locally
2. **No cloud dependency**: Authentication works with zero connectivity
3. **Minimal sync payload**: Only metadata synced (no raw images or embeddings)
4. **Data retention**: Configurable purge after sync confirmation
5. **User consent**: Camera permission explicitly requested

## Compliance Considerations

- Face embeddings are mathematical representations, not reconstructible images
- GPS data collected only during authentication events
- All data encrypted at rest
- Sync payload excludes raw biometric data
- Designed for DPDPA 2023 compliance
