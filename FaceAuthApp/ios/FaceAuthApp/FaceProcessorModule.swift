import Foundation
import UIKit
import Vision
import React

@objc(FaceProcessorModule)
class FaceProcessorModule: NSObject {

  @objc static func requiresMainQueueSetup() -> Bool { return false }

  @objc
  func detectFace(_ imagePath: String, resolver resolve: @escaping RCTPromiseResolveBlock, rejecter reject: @escaping RCTPromiseRejectBlock) {
    let cleanPath = imagePath.replacingOccurrences(of: "file://", with: "")
    guard let image = UIImage(contentsOfFile: cleanPath), let cgImage = image.cgImage else {
      resolve([
        "found": false,
        "error": "Could not load image: \(cleanPath)",
      ])
      return
    }

    let request = VNDetectFaceLandmarksRequest { request, error in
      if let error = error {
        resolve([
          "found": false,
          "error": "Vision error: \(error.localizedDescription)",
        ])
        return
      }

      guard let results = request.results as? [VNFaceObservation], let face = results.first else {
        resolve([
          "found": false,
          "error": "No face detected in \(cgImage.width)x\(cgImage.height) image",
        ])
        return
      }

      let imageWidth = CGFloat(cgImage.width)
      let imageHeight = CGFloat(cgImage.height)
      let bounds = face.boundingBox

      let x = bounds.origin.x * imageWidth
      let y = (1.0 - bounds.origin.y - bounds.height) * imageHeight
      let w = bounds.width * imageWidth
      let h = bounds.height * imageHeight

      let spoofScore = self.computeLaplacianScore(cgImage: cgImage, faceBounds: bounds)

      let yawDeg = (face.yaw?.doubleValue ?? 0.0) * 180.0 / .pi
      let rollDeg = (face.roll?.doubleValue ?? 0.0) * 180.0 / .pi

      let hasLeftEye = face.landmarks?.leftEye != nil
      let hasRightEye = face.landmarks?.rightEye != nil
      let hasMouth = face.landmarks?.innerLips != nil

      resolve([
        "found": true,
        "x": Int(x),
        "y": Int(y),
        "width": Int(w),
        "height": Int(h),
        "smilingProbability": hasMouth ? 0.5 : 0.0,
        "leftEyeOpenProbability": hasLeftEye ? 0.9 : 0.1,
        "rightEyeOpenProbability": hasRightEye ? 0.9 : 0.1,
        "headEulerAngleY": yawDeg,
        "headEulerAngleZ": rollDeg,
        "spoofScore": spoofScore,
      ])
    }

    let handler = VNImageRequestHandler(cgImage: cgImage, orientation: .up, options: [:])
    DispatchQueue.global(qos: .userInitiated).async {
      do {
        try handler.perform([request])
      } catch {
        resolve([
          "found": false,
          "error": "Vision perform error: \(error.localizedDescription)",
        ])
      }
    }
  }

  @objc
  func getEmbedding(_ imagePath: String, resolver resolve: @escaping RCTPromiseResolveBlock, rejecter reject: @escaping RCTPromiseRejectBlock) {
    let cleanPath = imagePath.replacingOccurrences(of: "file://", with: "")
    guard let image = UIImage(contentsOfFile: cleanPath), let cgImage = image.cgImage else {
      reject("NO_IMAGE", "Could not load image: \(cleanPath)", nil)
      return
    }

    let request = VNDetectFaceLandmarksRequest { request, error in
      if let error = error {
        reject("DETECT_ERROR", "Vision error: \(error.localizedDescription)", error)
        return
      }

      guard let results = request.results as? [VNFaceObservation], let face = results.first else {
        reject("NO_FACE", "No face in \(cgImage.width)x\(cgImage.height) image", nil)
        return
      }

      let imageWidth = CGFloat(cgImage.width)
      let imageHeight = CGFloat(cgImage.height)
      let bounds = face.boundingBox

      let expandFactor: CGFloat = 0.25
      let faceX = bounds.origin.x * imageWidth
      let faceY = (1.0 - bounds.origin.y - bounds.height) * imageHeight
      let faceW = bounds.width * imageWidth
      let faceH = bounds.height * imageHeight

      let expandX = faceW * expandFactor
      let expandY = faceH * expandFactor
      let cropX = max(0, faceX - expandX)
      let cropY = max(0, faceY - expandY)
      let cropRight = min(imageWidth, faceX + faceW + expandX)
      let cropBottom = min(imageHeight, faceY + faceH + expandY)
      let cropW = cropRight - cropX
      let cropH = cropBottom - cropY

      guard cropW > 0, cropH > 0 else {
        reject("BAD_CROP", "Invalid crop: \(cropW)x\(cropH)", nil)
        return
      }

      let cropRect = CGRect(x: cropX, y: cropY, width: cropW, height: cropH)
      guard let faceCrop = cgImage.cropping(to: cropRect) else {
        reject("CROP_FAIL", "Could not crop face", nil)
        return
      }

      let embedding = self.computeEmbedding(from: faceCrop)
      resolve(["embedding": embedding])
    }

    let handler = VNImageRequestHandler(cgImage: cgImage, orientation: .up, options: [:])
    DispatchQueue.global(qos: .userInitiated).async {
      do {
        try handler.perform([request])
      } catch {
        reject("DETECT_ERROR", "Vision perform error: \(error.localizedDescription)", error)
      }
    }
  }

  private func computeEmbedding(from cgImage: CGImage) -> [Double] {
    let size = 112
    let colorSpace = CGColorSpaceCreateDeviceRGB()
    var pixelData = [UInt8](repeating: 0, count: size * size * 4)

    guard let context = CGContext(
      data: &pixelData,
      width: size,
      height: size,
      bitsPerComponent: 8,
      bytesPerRow: size * 4,
      space: colorSpace,
      bitmapInfo: CGImageAlphaInfo.premultipliedLast.rawValue
    ) else {
      return [Double](repeating: 0, count: 128)
    }

    context.draw(cgImage, in: CGRect(x: 0, y: 0, width: size, height: size))

    var features = [Double](repeating: 0.0, count: 128)
    let totalPixels = size * size

    for i in 0..<128 {
      var sum = 0.0
      let offset = i * 37
      for p in stride(from: offset % totalPixels, to: totalPixels, by: max(1, totalPixels / 64)) {
        let idx = p * 4
        let r = Double(pixelData[idx]) / 127.5 - 1.0
        let g = Double(pixelData[idx + 1]) / 127.5 - 1.0
        let b = Double(pixelData[idx + 2]) / 127.5 - 1.0
        sum += (r * 0.299 + g * 0.587 + b * 0.114)
      }
      features[i] = sum
    }

    var norm = 0.0
    for v in features { norm += v * v }
    norm = sqrt(norm)
    if norm > 0 {
      for i in 0..<features.count { features[i] /= norm }
    }

    return features
  }

  private func computeLaplacianScore(cgImage: CGImage, faceBounds: CGRect) -> Double {
    let imageWidth = CGFloat(cgImage.width)
    let imageHeight = CGFloat(cgImage.height)

    let faceRect = CGRect(
      x: faceBounds.origin.x * imageWidth,
      y: (1.0 - faceBounds.origin.y - faceBounds.height) * imageHeight,
      width: faceBounds.width * imageWidth,
      height: faceBounds.height * imageHeight
    ).intersection(CGRect(x: 0, y: 0, width: imageWidth, height: imageHeight))

    guard faceRect.width > 10, faceRect.height > 10,
          let faceCrop = cgImage.cropping(to: faceRect) else {
      return 0.0
    }

    let w = faceCrop.width
    let h = faceCrop.height
    let colorSpace = CGColorSpaceCreateDeviceGray()
    var grayData = [UInt8](repeating: 0, count: w * h)

    guard let ctx = CGContext(
      data: &grayData,
      width: w,
      height: h,
      bitsPerComponent: 8,
      bytesPerRow: w,
      space: colorSpace,
      bitmapInfo: CGImageAlphaInfo.none.rawValue
    ) else {
      return 0.0
    }

    ctx.draw(faceCrop, in: CGRect(x: 0, y: 0, width: w, height: h))

    var variance = 0.0
    var count = 0
    for y in 1..<(h - 1) {
      for x in 1..<(w - 1) {
        let center = Double(grayData[y * w + x])
        let top = Double(grayData[(y - 1) * w + x])
        let bottom = Double(grayData[(y + 1) * w + x])
        let left = Double(grayData[y * w + (x - 1)])
        let right = Double(grayData[y * w + (x + 1)])
        let lap = top + bottom + left + right - 4.0 * center
        variance += lap * lap
        count += 1
      }
    }

    if count == 0 { return 0.0 }
    let raw = variance / Double(count)
    return min(raw / 2000.0, 1.0)
  }
}
