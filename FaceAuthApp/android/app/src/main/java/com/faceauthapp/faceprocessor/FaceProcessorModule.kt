package com.faceauthapp.faceprocessor

import android.graphics.Bitmap
import android.graphics.BitmapFactory
import android.graphics.Color
import android.graphics.Matrix
import android.net.Uri
import androidx.exifinterface.media.ExifInterface
import ai.onnxruntime.OnnxTensor
import ai.onnxruntime.OrtEnvironment
import ai.onnxruntime.OrtSession
import com.facebook.react.bridge.*
import com.google.mlkit.vision.common.InputImage
import com.google.mlkit.vision.face.FaceDetection
import com.google.mlkit.vision.face.FaceDetectorOptions
import java.io.File
import java.nio.FloatBuffer
import kotlin.math.abs

class FaceProcessorModule(private val reactContext: ReactApplicationContext) :
    ReactContextBaseJavaModule(reactContext) {

    override fun getName() = "FaceProcessor"

    private val faceDetectorOptions = FaceDetectorOptions.Builder()
        .setPerformanceMode(FaceDetectorOptions.PERFORMANCE_MODE_ACCURATE)
        .setClassificationMode(FaceDetectorOptions.CLASSIFICATION_MODE_ALL)
        .setLandmarkMode(FaceDetectorOptions.LANDMARK_MODE_ALL)
        .setMinFaceSize(0.10f)
        .build()

    private val faceDetector = FaceDetection.getClient(faceDetectorOptions)

    private var ortEnv: OrtEnvironment? = null
    private var ortSession: OrtSession? = null

    private fun getOrtSession(): OrtSession {
        if (ortSession == null) {
            ortEnv = OrtEnvironment.getEnvironment()
            // Try INT8 first (1.15 MB, faster), fall back to FP32
            val modelName = try {
                reactContext.assets.open("mobilefacenet_int8.onnx").close()
                "mobilefacenet_int8.onnx"
            } catch (e: Exception) {
                "mobilefacenet_fp32.onnx"
            }
            android.util.Log.d("FaceProcessor", "Loading ONNX model: $modelName")
            val modelBytes = reactContext.assets.open(modelName).readBytes()
            ortSession = ortEnv!!.createSession(modelBytes)
        }
        return ortSession!!
    }

    private fun resolvePath(imagePath: String): String {
        var path = imagePath
        if (path.startsWith("file://")) path = path.removePrefix("file://")
        if (path.startsWith("file:")) path = path.removePrefix("file:")
        return path
    }

    /**
     * Read EXIF orientation and rotate bitmap so the face is upright.
     * This is the #1 reason ML Kit fails on Android camera photos.
     */
    private fun loadAndRotateBitmap(imagePath: String): Bitmap? {
        return try {
            val path = resolvePath(imagePath)

            // Handle content:// URIs
            if (imagePath.startsWith("content://")) {
                val uri = Uri.parse(imagePath)
                val inputStream = reactContext.contentResolver.openInputStream(uri)
                    ?: return null
                return BitmapFactory.decodeStream(inputStream)
            }

            val file = File(path)
            if (!file.exists()) {
                android.util.Log.e("FaceProcessor", "File not found: $path")
                return null
            }

            // Downsample large camera images to avoid OOM
            val boundsOpts = BitmapFactory.Options().apply { inJustDecodeBounds = true }
            BitmapFactory.decodeFile(file.absolutePath, boundsOpts)
            val imgWidth = boundsOpts.outWidth
            val imgHeight = boundsOpts.outHeight
            var sampleSize = 1
            while (imgWidth / sampleSize > 1280 || imgHeight / sampleSize > 1280) {
                sampleSize *= 2
            }

            val opts = BitmapFactory.Options().apply {
                inPreferredConfig = Bitmap.Config.ARGB_8888
                inSampleSize = sampleSize
            }
            val bitmap = BitmapFactory.decodeFile(file.absolutePath, opts)
                ?: return null

            // Read EXIF rotation
            val rotation = try {
                val exif = ExifInterface(file.absolutePath)
                when (exif.getAttributeInt(
                    ExifInterface.TAG_ORIENTATION,
                    ExifInterface.ORIENTATION_NORMAL
                )) {
                    ExifInterface.ORIENTATION_ROTATE_90 -> 90f
                    ExifInterface.ORIENTATION_ROTATE_180 -> 180f
                    ExifInterface.ORIENTATION_ROTATE_270 -> 270f
                    ExifInterface.ORIENTATION_FLIP_HORIZONTAL -> -1f  // special: flip
                    ExifInterface.ORIENTATION_FLIP_VERTICAL -> -2f    // special: flip
                    else -> 0f
                }
            } catch (e: Exception) {
                android.util.Log.w("FaceProcessor", "Could not read EXIF: ${e.message}")
                0f
            }

            android.util.Log.d("FaceProcessor", "Image: ${bitmap.width}x${bitmap.height}, EXIF rotation: $rotation, sampleSize: $sampleSize")

            // Apply rotation if needed
            if (rotation > 0f) {
                val matrix = Matrix()
                matrix.postRotate(rotation)
                val rotated = Bitmap.createBitmap(bitmap, 0, 0, bitmap.width, bitmap.height, matrix, true)
                if (rotated !== bitmap) bitmap.recycle()
                rotated
            } else if (rotation == -1f) {
                // Horizontal flip
                val matrix = Matrix()
                matrix.preScale(-1f, 1f)
                val flipped = Bitmap.createBitmap(bitmap, 0, 0, bitmap.width, bitmap.height, matrix, true)
                if (flipped !== bitmap) bitmap.recycle()
                flipped
            } else {
                bitmap
            }
        } catch (e: Throwable) {
            android.util.Log.e("FaceProcessor", "loadAndRotateBitmap error: ${e.message}", e)
            null
        }
    }

    /**
     * Laplacian variance — measures image sharpness in the face region.
     * Real faces have high-frequency texture; printed photos and screens are blurry/flat.
     * Returns 0..1 where higher = more likely real.
     */
    private fun computeSpoofScore(bitmap: Bitmap, faceLeft: Int, faceTop: Int, faceWidth: Int, faceHeight: Int): Double {
        val left = maxOf(0, faceLeft)
        val top = maxOf(0, faceTop)
        val right = minOf(bitmap.width, faceLeft + faceWidth)
        val bottom = minOf(bitmap.height, faceTop + faceHeight)
        val w = right - left
        val h = bottom - top
        if (w < 20 || h < 20) return 0.5

        val face = Bitmap.createBitmap(bitmap, left, top, w, h)
        val scaled = Bitmap.createScaledBitmap(face, 64, 64, true)
        if (scaled !== face) face.recycle()

        val gray = Array(64) { y -> IntArray(64) { x ->
            val p = scaled.getPixel(x, y)
            (Color.red(p) * 299 + Color.green(p) * 587 + Color.blue(p) * 114) / 1000
        }}
        scaled.recycle()

        // Laplacian kernel convolution
        var sum = 0.0
        var sumSq = 0.0
        var count = 0
        for (y in 1 until 63) {
            for (x in 1 until 63) {
                val lap = -4 * gray[y][x] + gray[y-1][x] + gray[y+1][x] + gray[y][x-1] + gray[y][x+1]
                sum += lap
                sumSq += lap.toDouble() * lap
                count++
            }
        }
        val mean = sum / count
        val variance = (sumSq / count) - (mean * mean)

        // Variance > 200 is very sharp (real face); < 50 is flat (printed/screen)
        // Map to 0..1 with sigmoid-like curve
        val score = 1.0 / (1.0 + Math.exp(-(variance - 100.0) / 40.0))
        android.util.Log.d("FaceProcessor", "spoofScore: variance=${"%.1f".format(variance)} score=${"%.3f".format(score)}")
        return score
    }

    @ReactMethod
    fun detectFace(imagePath: String, promise: Promise) {
        try {
            val bitmap = loadAndRotateBitmap(imagePath)
            if (bitmap == null) {
                promise.resolve(Arguments.createMap().apply {
                    putBoolean("found", false)
                    putString("error", "Could not load image: $imagePath")
                })
                return
            }

            android.util.Log.d("FaceProcessor", "detectFace: loaded ${bitmap.width}x${bitmap.height}")

            // Use InputImage.fromBitmap with rotation=0 since we already rotated
            val image = InputImage.fromBitmap(bitmap, 0)
            faceDetector.process(image)
                .addOnSuccessListener { faces ->
                    android.util.Log.d("FaceProcessor", "detectFace: found ${faces.size} faces")
                    if (faces.isEmpty()) {
                        bitmap.recycle()
                        promise.resolve(Arguments.createMap().apply {
                            putBoolean("found", false)
                            putString("error", "ML Kit found 0 faces in ${bitmap.width}x${bitmap.height} image")
                        })
                        return@addOnSuccessListener
                    }

                    val face = faces[0]
                    val bounds = face.boundingBox
                    val spoofScore = try {
                        computeSpoofScore(bitmap, bounds.left, bounds.top, bounds.width(), bounds.height())
                    } catch (e: Throwable) { 0.5 }
                    bitmap.recycle()
                    promise.resolve(Arguments.createMap().apply {
                        putBoolean("found", true)
                        putInt("x", bounds.left)
                        putInt("y", bounds.top)
                        putInt("width", bounds.width())
                        putInt("height", bounds.height())
                        putDouble("smilingProbability", (face.smilingProbability ?: -1f).toDouble())
                        putDouble("leftEyeOpenProbability", (face.leftEyeOpenProbability ?: -1f).toDouble())
                        putDouble("rightEyeOpenProbability", (face.rightEyeOpenProbability ?: -1f).toDouble())
                        putDouble("headEulerAngleY", face.headEulerAngleY.toDouble())
                        putDouble("headEulerAngleZ", face.headEulerAngleZ.toDouble())
                        putDouble("spoofScore", spoofScore)
                    })
                }
                .addOnFailureListener { e ->
                    bitmap.recycle()
                    android.util.Log.e("FaceProcessor", "ML Kit error: ${e.message}", e)
                    promise.resolve(Arguments.createMap().apply {
                        putBoolean("found", false)
                        putString("error", "ML Kit failed: ${e.message}")
                    })
                }
        } catch (e: Throwable) {
            promise.reject("DETECT_ERROR", e.message, e)
        }
    }

    @ReactMethod
    fun getEmbedding(imagePath: String, promise: Promise) {
        try {
            // Step 1: Load image
            android.util.Log.d("FaceProcessor", "getEmbedding: loading $imagePath")
            val bitmap = loadAndRotateBitmap(imagePath)
            if (bitmap == null) {
                promise.reject("NO_IMAGE", "Could not load image: $imagePath")
                return
            }
            android.util.Log.d("FaceProcessor", "getEmbedding: bitmap ${bitmap.width}x${bitmap.height}")

            // Step 2: Detect face
            val image = InputImage.fromBitmap(bitmap, 0)
            faceDetector.process(image)
                .addOnSuccessListener { faces ->
                    if (faces.isEmpty()) {
                        promise.reject("NO_FACE", "No face in ${bitmap.width}x${bitmap.height} image")
                        return@addOnSuccessListener
                    }

                    try {
                        // Step 3: Crop face
                        val face = faces[0]
                        val bounds = face.boundingBox
                        android.util.Log.d("FaceProcessor", "getEmbedding: face at ${bounds}")

                        val expandX = (bounds.width() * 0.25f).toInt()
                        val expandY = (bounds.height() * 0.25f).toInt()
                        val left = maxOf(0, bounds.left - expandX)
                        val top = maxOf(0, bounds.top - expandY)
                        val right = minOf(bitmap.width, bounds.right + expandX)
                        val bottom = minOf(bitmap.height, bounds.bottom + expandY)
                        val cropW = right - left
                        val cropH = bottom - top

                        if (cropW <= 0 || cropH <= 0) {
                            promise.reject("BAD_CROP", "Invalid crop: ${cropW}x${cropH}")
                            return@addOnSuccessListener
                        }

                        val faceBitmap = Bitmap.createBitmap(bitmap, left, top, cropW, cropH)
                        val resized = Bitmap.createScaledBitmap(faceBitmap, 112, 112, true)
                        android.util.Log.d("FaceProcessor", "getEmbedding: cropped & resized to 112x112")

                        // Step 4: Preprocess pixels
                        val floatBuffer = FloatBuffer.allocate(3 * 112 * 112)
                        val pixels = IntArray(112 * 112)
                        resized.getPixels(pixels, 0, 112, 0, 0, 112, 112)

                        for (c in 0..2) {
                            for (i in pixels.indices) {
                                val pixel = pixels[i]
                                val value = when (c) {
                                    0 -> ((pixel shr 16) and 0xFF) / 127.5f - 1f
                                    1 -> ((pixel shr 8) and 0xFF) / 127.5f - 1f
                                    2 -> (pixel and 0xFF) / 127.5f - 1f
                                    else -> 0f
                                }
                                floatBuffer.put(value)
                            }
                        }
                        floatBuffer.rewind()
                        android.util.Log.d("FaceProcessor", "getEmbedding: preprocessed ${floatBuffer.remaining()} floats")

                        // Step 5: Load ONNX model
                        val session: OrtSession
                        try {
                            session = getOrtSession()
                            android.util.Log.d("FaceProcessor", "getEmbedding: ONNX session ready")
                        } catch (onnxErr: Exception) {
                            android.util.Log.e("FaceProcessor", "ONNX load failed: ${onnxErr.message}", onnxErr)
                            promise.reject("ONNX_LOAD", "Failed to load ONNX model: ${onnxErr.message}", onnxErr)
                            return@addOnSuccessListener
                        }

                        // Step 6: Run inference
                        val env = ortEnv!!
                        val inputTensor = OnnxTensor.createTensor(env, floatBuffer, longArrayOf(1, 3, 112, 112))
                        android.util.Log.d("FaceProcessor", "getEmbedding: running inference...")

                        val output = session.run(mapOf("input" to inputTensor))
                        android.util.Log.d("FaceProcessor", "getEmbedding: inference done, output count=${output.size()}")

                        // Step 7: Extract embedding - handle both float[][] and float[] output
                        val rawValue = output[0].value
                        android.util.Log.d("FaceProcessor", "getEmbedding: output type=${rawValue?.javaClass?.name}")

                        val embedding: FloatArray = when (rawValue) {
                            is Array<*> -> {
                                // float[][] -> take first row
                                val firstRow = rawValue[0]
                                if (firstRow is FloatArray) firstRow
                                else throw Exception("Unexpected inner type: ${firstRow?.javaClass?.name}")
                            }
                            is FloatArray -> rawValue
                            else -> throw Exception("Unexpected output type: ${rawValue?.javaClass?.name}")
                        }

                        android.util.Log.d("FaceProcessor", "getEmbedding: embedding size=${embedding.size}")

                        // Step 8: L2 normalize
                        var norm = 0f
                        for (v in embedding) norm += v * v
                        norm = Math.sqrt(norm.toDouble()).toFloat()

                        val embeddingArray = Arguments.createArray()
                        for (v in embedding) {
                            embeddingArray.pushDouble((if (norm > 0f) v / norm else v).toDouble())
                        }

                        inputTensor.close()
                        output.close()
                        faceBitmap.recycle()
                        resized.recycle()

                        android.util.Log.d("FaceProcessor", "getEmbedding: SUCCESS, ${embeddingArray.size()} dims")
                        promise.resolve(Arguments.createMap().apply {
                            putArray("embedding", embeddingArray)
                        })
                    } catch (e: Exception) {
                        android.util.Log.e("FaceProcessor", "getEmbedding inference error: ${e.message}", e)
                        promise.reject("INFERENCE_ERROR", "Inference failed: ${e.message}", e)
                    }
                }
                .addOnFailureListener { e ->
                    android.util.Log.e("FaceProcessor", "getEmbedding ML Kit error: ${e.message}", e)
                    promise.reject("DETECT_ERROR", "Face detection failed: ${e.message}", e)
                }
        } catch (e: Exception) {
            android.util.Log.e("FaceProcessor", "getEmbedding error: ${e.message}", e)
            promise.reject("ERROR", "getEmbedding failed: ${e.message}", e)
        }
    }
}
