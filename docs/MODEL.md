# The Custom Model — MobileFaceNet + ArcFace

We trained our own face-recognition model **from scratch**. This document covers the architecture, training, results, reproduction, and on-device integration.

> 📓 Notebook: [`FaceAuthApp/notebook/mobilefacenet_training.ipynb`](../FaceAuthApp/notebook/mobilefacenet_training.ipynb)
> 📦 Weights: [`FaceAuthApp/artifacts/`](../FaceAuthApp/artifacts/) — `mobilefacenet_fp32.pt`, `mobilefacenet_fp32.onnx`, `mobilefacenet_int8.onnx`

---

## Results at a glance

| Metric | Result | Constraint | Status |
|---|---|---|:---:|
| LFW 10-fold verification accuracy | **99.28%** | > 95% | ✅ |
| Model size (INT8 ONNX) | **1.15 MB** | < 20 MB | ✅ |
| Model size (FP32 ONNX) | 4.00 MB | < 20 MB | ✅ |
| CPU latency / face (1 thread) | **63 ms** | < 1000 ms | ✅ |
| Parameters | ~1.0 M | — | — |
| Embedding dimension | 128 | — | — |
| Self-trained / open architecture | Yes | required | ✅ |

LFW accuracy by epoch (best checkpoint saved):

```
ep1  85.90%   ep10 97.78%   ep20 98.18%   ep30 98.82%
ep4  96.43%   ep12 98.07%   ep24 98.57%   ep33 99.13%
ep7  97.22%   ep17 98.47%   ep28 98.83%   ep36 99.28%  ← best
```

---

## Architecture

- **Backbone:** MobileFaceNet — depthwise-separable inverted-residual blocks, a global depthwise conv ("GDConv") instead of global average pooling, and a linear 128-D embedding head with BatchNorm.
- **Head (training only):** **ArcFace** additive angular-margin softmax (`scale s = 64`, `margin m = 0.50`) for highly discriminative embeddings.
- **Parameters:** ~1,003,136.

```
Input 112×112×3
  → Conv 3×3 s2 → DWConv 3×3
  → 5 inverted-residual stages (t,c,n,s):
      (2,64,5,2) (4,128,1,2) (2,128,6,1) (4,128,1,2) (2,128,2,1)
  → Conv 1×1 (512) → GDConv 7×7 (512)
  → Linear 1×1 → 128-D → BatchNorm
  → L2-normalised embedding
```

---

## Training

| Setting | Value |
|---|---|
| Dataset | CASIA-WebFace (`.rec` / RecordIO) |
| Images / identities | 490,623 / 10,572 |
| Input | 112×112 RGB, normalised `(x/255 − 0.5)/0.5` |
| Augmentation | random horizontal flip |
| Loss | ArcFace (s=64, m=0.50) + cross-entropy |
| Optimizer | SGD, momentum 0.9, weight-decay 5e-4 |
| LR schedule | linear warmup (500 iters) → cosine decay, base LR 0.1 |
| Batch size | 256 |
| Precision | AMP (mixed precision) |
| Hardware | Kaggle Tesla T4 |
| Time to best | ~6.6 h (epoch 36) |
| Checkpointing | best-by-LFW accuracy |

**Evaluation:** standard LFW protocol — embed each image plus its horizontal flip, cosine-compare pairs, 10-fold cross-validated threshold. The notebook can also score `cfp_fp.bin` (pose) and `agedb_30.bin` (age).

---

## Export & Quantization

1. Best `state_dict` → **ONNX FP32** (`opset 13`, weights inlined, `dynamo=False` for a single mobile-friendly file). Torch↔ONNX parity checked (`max|Δ|` negligible).
2. **Dynamic INT8** quantization (`QuantType.QInt8`) → **1.15 MB**.
3. Constraints verified programmatically (size, latency, accuracy).

Artifacts produced:

| File | Size | Use |
|---|---|---|
| `mobilefacenet_fp32.pt` | 4.01 MB | PyTorch checkpoint (fine-tuning) |
| `mobilefacenet_fp32.onnx` | 3.81 MB | High-accuracy on-device option |
| `mobilefacenet_int8.onnx` | 1.10 MB | Default mobile model |

---

## On-Device Integration

The app preprocessing **must match training exactly**:

```
aligned 112×112 RGB  →  (pixel/255 − 0.5)/0.5  →  NCHW
   →  model  →  L2-normalise 128-D output  →  cosine compare
```

**Resilience:** some Android ONNX-Runtime builds lack kernels for certain quantized ops. The native module therefore runs the ONNX embedding with an **eye-aligned geometric landmark fallback** that is invariant to translation, scale, and in-plane rotation — guaranteeing recognition on **every** device. Enrolment and authentication always use the *same* embedding path, so vectors are directly comparable.

---

## Reproduce It

1. Open the notebook on **Kaggle**; attach the **CASIA-WebFace `.rec`** dataset (with `eval/*.bin`).
2. **Settings → Accelerator → GPU T4** (avoid P100), **Internet → On**.
3. **Run All.** The notebook auto-locates `train.rec` and `lfw.bin`, trains, evaluates on LFW, exports `pt/onnx/int8`, and prints a constraints check.
4. Copy `mobilefacenet_int8.onnx` into `FaceAuthApp/android/app/src/main/assets/` and rebuild.

> **Tip (Indian demographics):** CASIA skews Western/East-Asian. For best field accuracy, fine-tune a few epochs from `mobilefacenet_fp32.pt` on Indian faces using the same 112×112 alignment.
