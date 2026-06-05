package com.faceauthapp.faceprocessor

import android.graphics.Bitmap
import android.graphics.BitmapFactory
import android.graphics.Canvas
import android.graphics.Color
import android.graphics.Matrix
import android.graphics.Paint
import android.net.Uri
import androidx.exifinterface.media.ExifInterface
import ai.onnxruntime.OnnxTensor
import ai.onnxruntime.OrtEnvironment
import ai.onnxruntime.OrtSession
import com.facebook.react.bridge.*
import com.google.mlkit.vision.common.InputImage
import com.google.mlkit.vision.face.Face
import com.google.mlkit.vision.face.FaceContour
import com.google.mlkit.vision.face.FaceDetection
import com.google.mlkit.vision.face.FaceDetectorOptions
import com.google.mlkit.vision.face.FaceLandmark
import java.io.File
import java.nio.FloatBuffer
import kotlin.math.atan2
import kotlin.math.cos
import kotlin.math.sin
import kotlin.math.sqrt

class FaceProcessorModule(private val reactContext: ReactApplicationContext) :
    ReactContextBaseJavaModule(reactContext) {

    override fun getName() = "FaceProcessor"

    /* ── Detector (async ML Kit, with landmarks) ─────────────────────── */
    private val detector = FaceDetection.getClient(
        FaceDetectorOptions.Builder()
            .setPerformanceMode(FaceDetectorOptions.PERFORMANCE_MODE_ACCURATE)
            .setClassificationMode(FaceDetectorOptions.CLASSIFICATION_MODE_ALL)
            .setLandmarkMode(FaceDetectorOptions.LANDMARK_MODE_ALL)
            .setMinFaceSize(0.10f)
            .build()
    )

    /* ── ONNX (custom-trained MobileFaceNet, FP32 — standard ops) ────── */
    private var ortEnv: OrtEnvironment? = null
    private var ortSession: OrtSession? = null
    @Volatile private var onnxFailed = false
    private val lock = Any()

    private fun ort(): OrtSession {
        synchronized(lock) {
            if (ortSession == null) {
                ortEnv = OrtEnvironment.getEnvironment()
                // FP32 model: only standard Conv/BN/PReLU ops → runs on every device.
                val bytes = reactContext.assets.open("mobilefacenet_fp32.onnx").readBytes()
                ortSession = ortEnv!!.createSession(bytes)
                android.util.Log.d("FP", "Loaded mobilefacenet_fp32.onnx (${bytes.size} bytes)")
            }
            return ortSession!!
        }
    }

    /* ── Image loading (EXIF rotation only) ──────────────────────────── */
    private fun resolvePath(p0: String): String {
        var p = p0
        if (p.startsWith("file://")) p = p.removePrefix("file://")
        if (p.startsWith("file:")) p = p.removePrefix("file:")
        return p
    }

    private fun loadBitmap(imagePath: String): Bitmap? {
        return try {
            if (imagePath.startsWith("content://")) {
                val s = reactContext.contentResolver.openInputStream(Uri.parse(imagePath)) ?: return null
                return BitmapFactory.decodeStream(s)
            }
            val file = File(resolvePath(imagePath))
            if (!file.exists()) { android.util.Log.e("FP", "Not found: ${file.absolutePath}"); return null }
            val bo = BitmapFactory.Options().apply { inJustDecodeBounds = true }
            BitmapFactory.decodeFile(file.absolutePath, bo)
            var ss = 1
            while (bo.outWidth / ss > 1280 || bo.outHeight / ss > 1280) ss *= 2
            val bmp = BitmapFactory.decodeFile(file.absolutePath,
                BitmapFactory.Options().apply { inPreferredConfig = Bitmap.Config.ARGB_8888; inSampleSize = ss }) ?: return null
            val rot = try {
                val e = ExifInterface(file.absolutePath)
                when (e.getAttributeInt(ExifInterface.TAG_ORIENTATION, ExifInterface.ORIENTATION_NORMAL)) {
                    ExifInterface.ORIENTATION_ROTATE_90 -> 90f
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
        } catch (e: Throwable) { android.util.Log.e("FP", "loadBitmap: ${e.message}", e); null }
    }

    /* ── Anti-spoof (Laplacian variance) ─────────────────────────────── */
    private fun computeSpoofScore(bitmap: Bitmap, left: Int, top: Int, w: Int, h: Int): Double {
        val l = maxOf(0, left); val t = maxOf(0, top)
        val r = minOf(bitmap.width, left + w); val b = minOf(bitmap.height, top + h)
        val cw = r - l; val ch = b - t
        if (cw < 20 || ch < 20) return 0.5
        val face = Bitmap.createBitmap(bitmap, l, t, cw, ch)
        val sc = Bitmap.createScaledBitmap(face, 64, 64, true); if (sc !== face) face.recycle()
        val gray = Array(64) { y -> IntArray(64) { x ->
            val p = sc.getPixel(x, y); (Color.red(p) * 299 + Color.green(p) * 587 + Color.blue(p) * 114) / 1000 } }
        sc.recycle()
        var sum = 0.0; var sumSq = 0.0; var cnt = 0
        for (y in 1 until 63) for (x in 1 until 63) {
            val lap = -4 * gray[y][x] + gray[y-1][x] + gray[y+1][x] + gray[y][x-1] + gray[y][x+1]
            sum += lap; sumSq += lap.toDouble() * lap; cnt++ }
        val mean = sum / cnt; val variance = (sumSq / cnt) - (mean * mean)
        return 1.0 / (1.0 + Math.exp(-(variance - 100.0) / 40.0))
    }

    /* ── Face alignment to ArcFace 112×112 canonical (eye-based) ─────── */
    // Maps the two detected eyes onto the standard ArcFace template eye
    // positions with a similarity transform (scale + rotation + translation),
    // matching how the model was trained. Falls back to an expanded-box crop.
    private fun alignFace(src: Bitmap, face: Face): Bitmap {
        val le = face.getLandmark(FaceLandmark.LEFT_EYE)?.position
        val re = face.getLandmark(FaceLandmark.RIGHT_EYE)?.position
        val out = Bitmap.createBitmap(112, 112, Bitmap.Config.ARGB_8888)
        val canvas = Canvas(out)
        canvas.drawColor(Color.BLACK)
        val paint = Paint(Paint.FILTER_BITMAP_FLAG or Paint.ANTI_ALIAS_FLAG)
        if (le != null && re != null) {
            // ArcFace canonical eye points on a 112×112 template
            val srcPts = floatArrayOf(le.x, le.y, re.x, re.y)
            val dstPts = floatArrayOf(38.2946f, 51.6963f, 73.5318f, 51.5014f)
            val m = Matrix()
            if (m.setPolyToPoly(srcPts, 0, dstPts, 0, 2)) {
                canvas.drawBitmap(src, m, paint)
                return out
            }
        }
        // Fallback: expanded bounding-box crop, centered
        val b = face.boundingBox
        val ex = (b.width() * 0.3f).toInt(); val ey = (b.height() * 0.3f).toInt()
        val l = maxOf(0, b.left - ex); val t = maxOf(0, b.top - ey)
        val r = minOf(src.width, b.right + ex); val bo = minOf(src.height, b.bottom + ey)
        val cw = r - l; val ch = bo - t
        if (cw > 0 && ch > 0) {
            val crop = Bitmap.createBitmap(src, l, t, cw, ch)
            val scaled = Bitmap.createScaledBitmap(crop, 112, 112, true)
            canvas.drawBitmap(scaled, 0f, 0f, paint)
            if (crop !== src) crop.recycle(); if (scaled !== crop) scaled.recycle()
        }
        return out
    }

    /* ── ONNX embedding from an aligned 112×112 face ─────────────────── */
    private fun onnxEmbedding(aligned: Bitmap): FloatArray {
        val px = IntArray(112 * 112)
        aligned.getPixels(px, 0, 112, 0, 0, 112, 112)
        val buf = FloatBuffer.allocate(3 * 112 * 112)
        // NCHW, RGB, normalized (x-127.5)/127.5 — exactly matches training
        for (c in 0..2) for (i in px.indices) {
            val v = when (c) {
                0 -> (px[i] shr 16) and 0xFF   // R
                1 -> (px[i] shr 8) and 0xFF    // G
                else -> px[i] and 0xFF         // B
            }
            buf.put(v / 127.5f - 1f)
        }
        buf.rewind()
        val session = ort(); val env = ortEnv!!
        val tensor = OnnxTensor.createTensor(env, buf, longArrayOf(1, 3, 112, 112))
        val output = session.run(mapOf("input" to tensor))
        val raw = output[0].value
        val emb: FloatArray = when (raw) {
            is Array<*> -> (raw[0] as? FloatArray) ?: throw Exception("bad output type")
            is FloatArray -> raw
            else -> throw Exception("unexpected output ${raw?.javaClass}")
        }
        tensor.close(); output.close()
        // L2-normalize
        var norm = 0f; for (v in emb) norm += v * v; norm = sqrt(norm)
        val out = FloatArray(emb.size)
        for (i in emb.indices) out[i] = if (norm > 0f) emb[i] / norm else emb[i]
        return out
    }

    /* ── Geometric landmark embedding (emergency fallback only) ──────── */
    private data class Frame(val mx: Float, val my: Float, val cosA: Float, val sinA: Float, val iod: Float)
    private fun buildFrame(face: Face): Frame {
        val le = face.getLandmark(FaceLandmark.LEFT_EYE)?.position
        val re = face.getLandmark(FaceLandmark.RIGHT_EYE)?.position
        if (le != null && re != null) {
            val mx = (le.x + re.x) / 2f; val my = (le.y + re.y) / 2f
            val dx = re.x - le.x; val dy = re.y - le.y
            val iod = maxOf(sqrt(dx * dx + dy * dy), 1f); val a = atan2(dy, dx)
            return Frame(mx, my, cos(-a), sin(-a), iod)
        }
        val b = face.boundingBox
        return Frame(b.centerX().toFloat(), b.centerY().toFloat(), 1f, 0f, maxOf(b.width().toFloat(), 1f))
    }
    private fun tx(px: Float, py: Float, fr: Frame): Pair<Float, Float> {
        val dx = px - fr.mx; val dy = py - fr.my
        return Pair((dx * fr.cosA - dy * fr.sinA) / fr.iod, (dx * fr.sinA + dy * fr.cosA) / fr.iod)
    }
    private fun landmarkEmbedding(face: Face): FloatArray {
        val fr = buildFrame(face); val f = mutableListOf<Float>()
        val types = intArrayOf(FaceLandmark.LEFT_EYE, FaceLandmark.RIGHT_EYE, FaceLandmark.NOSE_BASE,
            FaceLandmark.MOUTH_LEFT, FaceLandmark.MOUTH_RIGHT, FaceLandmark.MOUTH_BOTTOM,
            FaceLandmark.LEFT_CHEEK, FaceLandmark.RIGHT_CHEEK, FaceLandmark.LEFT_EAR, FaceLandmark.RIGHT_EAR)
        val pos = ArrayList<Pair<Float, Float>>()
        for (t in types) { val lm = face.getLandmark(t)?.position; pos.add(if (lm != null) tx(lm.x, lm.y, fr) else Pair(0f, 0f)) }
        for (p in pos) { f.add(p.first); f.add(p.second) }
        fun d(a: Pair<Float, Float>, b: Pair<Float, Float>) = sqrt((a.first-b.first)*(a.first-b.first)+(a.second-b.second)*(a.second-b.second))
        for (i in pos.indices) for (j in i+1 until pos.size) f.add(d(pos[i], pos[j]))
        while (f.size < 128) f.add(0f)
        val out = FloatArray(128) { f[it] }
        var n = 0f; for (v in out) n += v*v; n = sqrt(n); if (n>0f) for (i in out.indices) out[i] /= n
        return out
    }

    /* ── detectFace (async — liveness + spoof) ───────────────────────── */
    @ReactMethod
    fun detectFace(imagePath: String, promise: Promise) {
        try {
            val bitmap = loadBitmap(imagePath)
            if (bitmap == null) { promise.resolve(Arguments.createMap().apply { putBoolean("found", false); putString("error", "Could not load image") }); return }
            detector.process(InputImage.fromBitmap(bitmap, 0))
                .addOnSuccessListener { faces ->
                    if (faces.isEmpty()) { bitmap.recycle(); promise.resolve(Arguments.createMap().apply { putBoolean("found", false); putString("error", "No face") }); return@addOnSuccessListener }
                    val f = faces[0]; val b = f.boundingBox
                    val spoof = try { computeSpoofScore(bitmap, b.left, b.top, b.width(), b.height()) } catch (_: Throwable) { 0.5 }
                    bitmap.recycle()
                    promise.resolve(Arguments.createMap().apply {
                        putBoolean("found", true)
                        putInt("x", b.left); putInt("y", b.top); putInt("width", b.width()); putInt("height", b.height())
                        putDouble("smilingProbability", (f.smilingProbability ?: -1f).toDouble())
                        putDouble("leftEyeOpenProbability", (f.leftEyeOpenProbability ?: -1f).toDouble())
                        putDouble("rightEyeOpenProbability", (f.rightEyeOpenProbability ?: -1f).toDouble())
                        putDouble("headEulerAngleY", f.headEulerAngleY.toDouble())
                        putDouble("headEulerAngleZ", f.headEulerAngleZ.toDouble())
                        putDouble("spoofScore", spoof)
                    })
                }
                .addOnFailureListener { e -> bitmap.recycle(); promise.resolve(Arguments.createMap().apply { putBoolean("found", false); putString("error", "ML Kit: ${e.message}") }) }
        } catch (e: Throwable) { promise.reject("DETECT_ERROR", e.message, e) }
    }

    /* ── getEmbedding (async — custom CNN, eye-aligned) ──────────────── */
    @ReactMethod
    fun getEmbedding(imagePath: String, promise: Promise) {
        try {
            val bitmap = loadBitmap(imagePath)
            if (bitmap == null) { promise.reject("NO_IMAGE", "Could not load image"); return }
            detector.process(InputImage.fromBitmap(bitmap, 0))
                .addOnSuccessListener { faces ->
                    if (faces.isEmpty()) { bitmap.recycle(); promise.reject("NO_FACE", "No face detected"); return@addOnSuccessListener }
                    val face = faces[0]
                    // Heavy work off the main thread
                    Thread {
                        try {
                            if (!onnxFailed) {
                                try {
                                    val aligned = alignFace(bitmap, face)
                                    val emb = onnxEmbedding(aligned)
                                    aligned.recycle(); bitmap.recycle()
                                    val arr = Arguments.createArray(); for (v in emb) arr.pushDouble(v.toDouble())
                                    promise.resolve(Arguments.createMap().apply { putArray("embedding", arr); putString("method", "onnx") })
                                    return@Thread
                                } catch (e: Throwable) {
                                    android.util.Log.w("FP", "ONNX failed → landmark fallback: ${e.message}")
                                    onnxFailed = true
                                }
                            }
                            val emb = landmarkEmbedding(face); bitmap.recycle()
                            val arr = Arguments.createArray(); for (v in emb) arr.pushDouble(v.toDouble())
                            promise.resolve(Arguments.createMap().apply { putArray("embedding", arr); putString("method", "landmark") })
                        } catch (e: Throwable) {
                            try { bitmap.recycle() } catch (_: Throwable) {}
                            promise.reject("EMBEDDING_ERROR", e.message)
                        }
                    }.start()
                }
                .addOnFailureListener { e -> bitmap.recycle(); promise.reject("DETECT_ERROR", "Detection failed: ${e.message}") }
        } catch (e: Throwable) { promise.reject("ERROR", e.message) }
    }
}
