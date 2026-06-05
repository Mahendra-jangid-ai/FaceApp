import { NativeModules } from 'react-native';
import type { FaceDetectionResult } from '../types';

const FaceProcessor = NativeModules.FaceProcessor;

export async function detectFace(imagePath: string): Promise<FaceDetectionResult & { error?: string }> {
  if (!FaceProcessor || typeof FaceProcessor.detectFace !== 'function') {
    return {
      found: false,
      smilingProbability: -1,
      leftEyeOpenProbability: -1,
      rightEyeOpenProbability: -1,
      headEulerAngleY: 0,
      headEulerAngleZ: 0,
      error: 'FaceProcessor native module not available',
    };
  }
  try {
    const result = await FaceProcessor.detectFace(imagePath);
    return {
      found: result.found,
      bounds: result.found
        ? { x: result.x, y: result.y, width: result.width, height: result.height }
        : undefined,
      smilingProbability: result.smilingProbability ?? -1,
      leftEyeOpenProbability: result.leftEyeOpenProbability ?? -1,
      rightEyeOpenProbability: result.rightEyeOpenProbability ?? -1,
      headEulerAngleY: result.headEulerAngleY ?? 0,
      headEulerAngleZ: result.headEulerAngleZ ?? 0,
      spoofScore: result.spoofScore ?? 0.5,
      error: result.error,
    };
  } catch (e: any) {
    return {
      found: false,
      smilingProbability: -1,
      leftEyeOpenProbability: -1,
      rightEyeOpenProbability: -1,
      headEulerAngleY: 0,
      headEulerAngleZ: 0,
      error: e.message || 'detectFace exception',
    };
  }
}

export type EmbeddingResult = {
  embedding: number[];
  method: 'onnx' | 'landmark';
};

export async function getFaceEmbedding(imagePath: string): Promise<number[]> {
  if (!FaceProcessor || typeof FaceProcessor.getEmbedding !== 'function') {
    throw new Error('FaceProcessor native module not available. Reinstall the app.');
  }
  const result = await FaceProcessor.getEmbedding(imagePath);
  if (result && result.embedding) {
    return result.embedding as number[];
  }
  throw new Error('getEmbedding returned no embedding data');
}

/** Same as getFaceEmbedding but also returns which method was used */
export async function getFaceEmbeddingWithMethod(imagePath: string): Promise<EmbeddingResult> {
  if (!FaceProcessor || typeof FaceProcessor.getEmbedding !== 'function') {
    throw new Error('FaceProcessor native module not available. Reinstall the app.');
  }
  const result = await FaceProcessor.getEmbedding(imagePath);
  if (result && result.embedding) {
    return {
      embedding: result.embedding as number[],
      method: result.method === 'onnx' ? 'onnx' : 'landmark',
    };
  }
  throw new Error('getEmbedding returned no embedding data');
}
