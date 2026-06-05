package com.faceauthapp.faceprocessor

import android.graphics.Bitmap
import android.graphics.BitmapFactory
import android.graphics.Color
import android.graphics.Matrix
import android.net.Uri
import androidx.exifinterface.media.ExifInterface
import com.facebook.react.bridge.*
import com.google.mlkit.vision.common.InputImage
import com.google.mlkit.vision.face.Face
import com.google.mlkit.vision.face.FaceDetection
import com.google.mlkit.vision.face.FaceDetectorOptions
import com.google.mlkit.vision.face.FaceLandmark
import java.io.File
import kotlin.math.atan2
import kotlin.math.cos
import kotlin.math.sin
import kotlin.math.sqrt

class FaceProcessorModule(private val reactContext: ReactApplicationContext) :
    ReactContextBaseJavaModule(reactContext) {

    override fun getName() = "FaceProcessor"

    /* ── Detectors (async ML Kit — the proven, reliable usage) ───────── */

    private val fastDetector = FaceDetection.getClient(
        FaceDetectorOptions.Builder()
            .setPerformanceMode(FaceDetectorOptions.PERFORMANCE_MODE_ACCURATE)
            .setClassificationMode(FaceDetectorOptions.CLASSIFICATION_MODE_ALL)
            .setLandmarkMode(FaceDetectorOptions.LANDMARK_MODE_ALL)
            .setMinFaceSize(0.10f)
            .build()
    )

    /* ── Image loading (EXIF rotation only — no blocking detection) ──── */

    private fun resolvePath(imagePath: String): String {
        var p = imagePath
        if (p.startsWith("file://")) p = p.removePrefix("file://")
        if (p.startsWith("file:")) p = p.removePrefix("file:")
        return p
    }

    private fun loadBitmap(imagePath: String): Bitmap? {
        return try {
            val path = resolvePath(imagePath)

            if (imagePath.startsWith("content://")) {
                val s = reactContext.contentResolver.openInputStream(Uri.parse(imagePath)) ?: return null
                return BitmapFactory.decodeStream(s)
            }

            val file = File(path)
            if (!file.exists()) { android.util.Log.e("FP", "Not found: $path"); return null }

            val bo = BitmapFactory.Options().apply { inJustDecodeBounds = true }
            BitmapFactory.decodeFile(file.absolutePath, bo)
            var ss = 1
            while (bo.outWidth / ss > 1280 || bo.outHeight / ss > 1280) ss *= 2

            val bmp = BitmapFactory.decodeFile(
                file.absolutePath,
                BitmapFactory.Options().apply { inPreferredConfig = Bitmap.Config.ARGB_8888; inSampleSize = ss }
            ) ?: return null

            val rot = try {
                val exif = ExifInterface(file.absolutePath)
                when (exif.getAttributeInt(ExifInterface.TAG_ORIENTATION, ExifInterface.ORIENTATION_NORMAL)) {
                    ExifInterface.ORIENTATION_ROTATE_90  -> 90f
                    ExifInterface.ORIENTATION_ROTATE_180 -> 180f
                    ExifInterface.ORIENTATION_ROTATE_270 -> 270f
                    ExifInterface.ORIENTATION_FLIP_HORIZONTAL -> -1f
                    else -> 0f
                }
            } catch (_: Exception) { 0f }

            when {
                rot > 0f -> { val m = Matrix(); m.postRotate(rot); val r = Bitmap.createBitmap(bmp, 0, 0, bmp.width, bmp.height, m, true); if (r !== bmp) bmp.recycle(); r }
                rot == -1f -> { val m = Matrix(); m.preScale(-1f, 1f); val r = Bitmap.createBitmap(bmp, 0, 0, bmp.width, bmp.height, m, true); if (r !== bmp) bmp.recycle(); r }
                else -> bmp
            }
        } catch (e: Throwable) {
            android.util.Log.e("FP", "loadBitmap error: ${e.message}", e)
            null
        }
    }

    /* ── Anti-spoof (Laplacian variance) ─────────────────────────────── */

    private fun computeSpoofScore(bitmap: Bitmap, left: Int, top: Int, w: Int, h: Int): Double {
        val l = maxOf(0, left); val t = maxOf(0, top)
        val r = minOf(bitmap.width, left + w); val b = minOf(bitmap.height, top + h)
        val cw = r - l; val ch = b - t
        if (cw < 20 || ch < 20) return 0.5

        val face = Bitmap.createBitmap(bitmap, l, t, cw, ch)
        val sc = Bitmap.createScaledBitmap(face, 64, 64, true)
        if (sc !== face) face.recycle()

        val gray = Array(64) { y -> IntArray(64) { x ->
            val p = sc.getPixel(x, y)
            (Color.red(p) * 299 + Color.green(p) * 587 + Color.blue(p) * 114) / 1000
        }}
        sc.recycle()

        var sum = 0.0; var sumSq = 0.0; var cnt = 0
        for (y in 1 until 63) for (x in 1 until 63) {
            val lap = -4 * gray[y][x] + gray[y-1][x] + gray[y+1][x] + gray[y][x-1] + gray[y][x+1]
            sum += lap; sumSq += lap.toDouble() * lap; cnt++
        }
        val mean = sum / cnt
        val variance = (sumSq / cnt) - (mean * mean)
        return 1.0 / (1.0 + Math.exp(-(variance - 100.0) / 40.0))
    }

    /* ── Eye-aligned landmark 128-D embedding ────────────────────────── */
    //  Coordinate frame anchored to the eyes:
    //    • origin = eye midpoint   • x-axis = eye line (cancels head roll)
    //    • scale  = inter-ocular distance (cancels camera distance)
    //  → same person produces a near-identical vector across captures.

    private data class Frame(val mx: Float, val my: Float, val cosA: Float, val sinA: Float, val iod: Float)

    private fun buildFrame(face: Face): Frame {
        val le = face.getLandmark(FaceLandmark.LEFT_EYE)?.position
        val re = face.getLandmark(FaceLandmark.RIGHT_EYE)?.position
        if (le != null && re != null) {
            val mx = (le.x + re.x) / 2f
            val my = (le.y + re.y) / 2f
            val dx = re.x - le.x
            val dy = re.y - le.y
            val iod = maxOf(sqrt(dx * dx + dy * dy), 1f)
            val angle = atan2(dy, dx)
            return Frame(mx, my, cos(-angle), sin(-angle), iod)
        }
        val b = face.boundingBox
        return Frame(b.centerX().toFloat(), b.centerY().toFloat(), 1f, 0f, maxOf(b.width().toFloat(), 1f))
    }

    private fun tx(px: Float, py: Float, fr: Frame): Pair<Float, Float> {
        val dx = px - fr.mx
        val dy = py - fr.my
        val rx = dx * fr.cosA - dy * fr.sinA
        val ry = dx * fr.sinA + dy * fr.cosA
        return Pair(rx / fr.iod, ry / fr.iod)
    }

    // Landmark-ONLY embedding (no contours) so the vector is identical
    // whether the contour or basic detector produced the face → enroll and
    // scan always match. Enriched with pairwise distances for discrimination.
    private fun extractLandmarkEmbedding(face: Face): FloatArray {
        val fr = buildFrame(face)
        val f = mutableListOf<Float>()

        // Collect eye-aligned positions of the 10 distinct landmarks
        val types = intArrayOf(
            FaceLandmark.LEFT_EYE, FaceLandmark.RIGHT_EYE,
            FaceLandmark.NOSE_BASE,
            FaceLandmark.MOUTH_LEFT, FaceLandmark.MOUTH_RIGHT, FaceLandmark.MOUTH_BOTTOM,
            FaceLandmark.LEFT_CHEEK, FaceLandmark.RIGHT_CHEEK,
            FaceLandmark.LEFT_EAR, FaceLandmark.RIGHT_EAR
        )
        val pos = ArrayList<Pair<Float, Float>>()
        for (t in types) {
            val lm = face.getLandmark(t)?.position
            pos.add(if (lm != null) tx(lm.x, lm.y, fr) else Pair(0f, 0f))
        }

        // 1) Eye-aligned positions (10 × 2 = 20 dims)
        for (p in pos) { f.add(p.first); f.add(p.second) }

        // 2) All pairwise distances (C(10,2) = 45 dims) — rich shape signature
        fun dist(a: Pair<Float, Float>, b: Pair<Float, Float>): Float {
            val dx = a.first - b.first; val dy = a.second - b.second
            return sqrt(dx * dx + dy * dy)
        }
        for (i in pos.indices) for (j in i + 1 until pos.size) f.add(dist(pos[i], pos[j]))

        // 3) Derived facial ratios (stable per person)
        val noseBase = pos[2]; val mouthB = pos[5]
        f.add(noseBase.second)                       // eyes→nose span
        f.add(mouthB.second)                          // eyes→mouth span
        f.add(dist(pos[3], pos[4]))                   // mouth width
        f.add(dist(pos[6], pos[7]))                   // cheek width
        f.add(dist(pos[8], pos[9]))                   // ear-to-ear width
        f.add(dist(noseBase, mouthB))                 // nose→mouth distance
        val faceB = face.boundingBox
        f.add(faceB.width().toFloat() / maxOf(faceB.height().toFloat(), 1f)) // aspect

        // Pad / truncate to exactly 128
        while (f.size < 128) f.add(0f)
        val out = FloatArray(128) { f[it] }

        // L2-normalize for cosine similarity
        var norm = 0f; for (v in out) norm += v * v; norm = sqrt(norm)
        if (norm > 0f) for (i in out.indices) out[i] /= norm
        return out
    }

    /* ── detectFace (ASYNC — used for liveness + spoof) ──────────────── */

    @ReactMethod
    fun detectFace(imagePath: String, promise: Promise) {
        try {
            val bitmap = loadBitmap(imagePath)
            if (bitmap == null) {
                promise.resolve(Arguments.createMap().apply { putBoolean("found", false); putString("error", "Could not load image") })
                return
            }

            val image = InputImage.fromBitmap(bitmap, 0)
            fastDetector.process(image)
                .addOnSuccessListener { faces ->
                    if (faces.isEmpty()) {
                        bitmap.recycle()
                        promise.resolve(Arguments.createMap().apply { putBoolean("found", false); putString("error", "No face") })
                        return@addOnSuccessListener
                    }
                    val face = faces[0]; val bounds = face.boundingBox
                    val spoof = try { computeSpoofScore(bitmap, bounds.left, bounds.top, bounds.width(), bounds.height()) } catch (_: Throwable) { 0.5 }
                    bitmap.recycle()
                    promise.resolve(Arguments.createMap().apply {
                        putBoolean("found", true)
                        putInt("x", bounds.left); putInt("y", bounds.top)
                        putInt("width", bounds.width()); putInt("height", bounds.height())
                        putDouble("smilingProbability", (face.smilingProbability ?: -1f).toDouble())
                        putDouble("leftEyeOpenProbability", (face.leftEyeOpenProbability ?: -1f).toDouble())
                        putDouble("rightEyeOpenProbability", (face.rightEyeOpenProbability ?: -1f).toDouble())
                        putDouble("headEulerAngleY", face.headEulerAngleY.toDouble())
                        putDouble("headEulerAngleZ", face.headEulerAngleZ.toDouble())
                        putDouble("spoofScore", spoof)
                    })
                }
                .addOnFailureListener { e ->
                    bitmap.recycle()
                    promise.resolve(Arguments.createMap().apply { putBoolean("found", false); putString("error", "ML Kit: ${e.message}") })
                }
        } catch (e: Throwable) {
            promise.reject("DETECT_ERROR", e.message, e)
        }
    }

    /* ── getEmbedding (ASYNC — eye-aligned landmark embedding) ─────────
     *  Robust two-stage detection:
     *    1) contourDetector  → richest features (landmarks + contours)
     *    2) if it finds nothing, fall back to fastDetector (landmarks only)
     *  The fastDetector is the same one detectFace used, so if a face was
     *  just detected, embedding generation can never fail with "no face".
     */

    private fun resolveEmbedding(bitmap: Bitmap, face: Face, promise: Promise) {
        try {
            val emb = extractLandmarkEmbedding(face)
            val arr = Arguments.createArray(); for (v in emb) arr.pushDouble(v.toDouble())
            promise.resolve(Arguments.createMap().apply { putArray("embedding", arr); putString("method", "landmark") })
        } catch (e: Throwable) {
            promise.reject("EMBEDDING_ERROR", "Failed: ${e.message}")
        }
    }

    @ReactMethod
    fun getEmbedding(imagePath: String, promise: Promise) {
        try {
            val bitmap = loadBitmap(imagePath)
            if (bitmap == null) { promise.reject("NO_IMAGE", "Could not load image"); return }
            val image = InputImage.fromBitmap(bitmap, 0)

            // Use the SAME basic detector that detectFace uses, so if a face
            // was just detected, embedding generation can never fail.
            fastDetector.process(image)
                .addOnSuccessListener { faces ->
                    if (faces.isNotEmpty()) resolveEmbedding(bitmap, faces[0], promise)
                    else promise.reject("NO_FACE", "No face detected")
                    bitmap.recycle()
                }
                .addOnFailureListener { e ->
                    bitmap.recycle()
                    promise.reject("DETECT_ERROR", "Detection failed: ${e.message}")
                }
        } catch (e: Throwable) {
            promise.reject("ERROR", e.message)
        }
    }
}
