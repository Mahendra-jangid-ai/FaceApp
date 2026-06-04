import AsyncStorage from '@react-native-async-storage/async-storage';

const STATS_KEY = '@faceauth_match_stats';
const MIN_SAMPLES = 10;

interface MatchStats {
  genuineScores: number[];
  impostorScores: number[];
  lastUpdated: number;
}

async function getStats(): Promise<MatchStats> {
  const raw = await AsyncStorage.getItem(STATS_KEY);
  if (raw) return JSON.parse(raw);
  return { genuineScores: [], impostorScores: [], lastUpdated: Date.now() };
}

async function saveStats(stats: MatchStats): Promise<void> {
  stats.lastUpdated = Date.now();
  // Keep last 200 samples of each type
  if (stats.genuineScores.length > 200) stats.genuineScores = stats.genuineScores.slice(-200);
  if (stats.impostorScores.length > 200) stats.impostorScores = stats.impostorScores.slice(-200);
  await AsyncStorage.setItem(STATS_KEY, JSON.stringify(stats));
}

export async function recordMatchScore(score: number, isGenuine: boolean): Promise<void> {
  const stats = await getStats();
  if (isGenuine) {
    stats.genuineScores.push(score);
  } else {
    stats.impostorScores.push(score);
  }
  await saveStats(stats);
}

function mean(arr: number[]): number {
  return arr.reduce((a, b) => a + b, 0) / arr.length;
}

function stddev(arr: number[]): number {
  const m = mean(arr);
  const variance = arr.reduce((acc, v) => acc + (v - m) ** 2, 0) / arr.length;
  return Math.sqrt(variance);
}

export const BASE_MATCH_THRESHOLD = 0.45;
export const BASE_DUPLICATE_THRESHOLD = 0.75;

export async function getAdaptiveMatchThreshold(): Promise<number> {
  const stats = await getStats();
  if (stats.genuineScores.length < MIN_SAMPLES || stats.impostorScores.length < MIN_SAMPLES) {
    return BASE_MATCH_THRESHOLD;
  }

  const genuineMean = mean(stats.genuineScores);
  const impostorMean = mean(stats.impostorScores);
  const genuineStd = stddev(stats.genuineScores);
  const impostorStd = stddev(stats.impostorScores);

  // Optimal threshold sits between distributions, biased toward security (lower FAR)
  const optimal = (genuineMean * impostorStd + impostorMean * genuineStd)
    / (genuineStd + impostorStd);

  // Clamp to reasonable range
  return Math.max(0.35, Math.min(0.65, optimal));
}

export async function getAdaptiveStats(): Promise<{
  threshold: number;
  genuineSamples: number;
  impostorSamples: number;
  genuineMean: number;
  impostorMean: number;
}> {
  const stats = await getStats();
  const threshold = await getAdaptiveMatchThreshold();
  return {
    threshold,
    genuineSamples: stats.genuineScores.length,
    impostorSamples: stats.impostorScores.length,
    genuineMean: stats.genuineScores.length > 0 ? mean(stats.genuineScores) : 0,
    impostorMean: stats.impostorScores.length > 0 ? mean(stats.impostorScores) : 0,
  };
}
