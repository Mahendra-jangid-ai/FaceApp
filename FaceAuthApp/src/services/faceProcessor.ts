import { NativeModules } from 'react-native';
import type { FaceDetectionResult } from '../types';

const { FaceProcessor } = NativeModules;

export async function detectFace(imagePath: string): Promise<FaceDetectionResult & { error?: string }> {
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

// DO NOT swallow errors - throw them so the UI can display them
export async function getFaceEmbedding(imagePath: string): Promise<number[]> {
  const result = await FaceProcessor.getEmbedding(imagePath);
  if (result && result.embedding) {
    return result.embedding as number[];
  }
  throw new Error('getEmbedding returned no embedding data');
}
