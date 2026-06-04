import React, { useCallback, useEffect, useRef, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ActivityIndicator,
  Alert,
  Animated,
  Vibration,
} from 'react-native';
import { Camera, useCameraDevice, useCameraPermission } from 'react-native-vision-camera';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import { colors, spacing, borderRadius, typography, shadows } from '../theme';
import { detectFace, getFaceEmbedding } from '../services/faceProcessor';
import { findBestMatch } from '../services/embeddingUtils';
import { getEnrolledUsers, saveAuthLog, getOpenCheckIn, saveAttendance, updateAttendance } from '../services/database';
import { checkGeofence, type GeofenceCheck } from '../services/geofencing';
import type { RootStackParamList, FaceDetectionResult } from '../types';

type Props = NativeStackScreenProps<RootStackParamList, 'Authenticate'>;

type ChallengeType = 'blink' | 'smile' | 'turnLeft' | 'turnRight';

interface Challenge {
  type: ChallengeType;
  instruction: string;
  icon: string;
}

const ALL_CHALLENGES: Challenge[] = [
  { type: 'blink', instruction: 'Blink your eyes', icon: '👁️' },
  { type: 'smile', instruction: 'Smile', icon: '😊' },
  { type: 'turnLeft', instruction: 'Turn head left', icon: '↩️' },
  { type: 'turnRight', instruction: 'Turn head right', icon: '↪️' },
];

function pickChallenges(): Challenge[] {
  const shuffled = [...ALL_CHALLENGES].sort(() => Math.random() - 0.5);
  return shuffled.slice(0, 3);
}

/**
 * Smart challenge checker that uses STATE TRANSITIONS instead of single-frame thresholds.
 * This makes detection much more natural:
 * - Blink: tracks eyes-open → eyes-closed transition (catches fast natural blinks)
 * - Smile: checks if smile probability crosses threshold
 * - Head turn: checks if head angle crosses threshold
 */
function createChallengeChecker() {
  // Track previous frame state for transition-based detection
  let prevEyesOpen = true;
  let blinkDetected = false;

  return {
    reset() {
      prevEyesOpen = true;
      blinkDetected = false;
    },

    check(type: ChallengeType, face: FaceDetectionResult): boolean {
      switch (type) {
        case 'blink': {
          // State-machine blink detection:
          // Frame N: eyes open (prob > 0.5) → Frame N+1: eyes closed (prob < 0.45)
          const leftOpen = face.leftEyeOpenProbability;
          const rightOpen = face.rightEyeOpenProbability;
          if (leftOpen < 0 || rightOpen < 0) return false; // ML Kit didn't detect eyes

          const eyesCurrentlyOpen = leftOpen > 0.5 && rightOpen > 0.5;
          const eyesCurrentlyClosed = leftOpen < 0.45 && rightOpen < 0.45;

          if (prevEyesOpen && eyesCurrentlyClosed) {
            blinkDetected = true;
          }
          prevEyesOpen = eyesCurrentlyOpen;
          return blinkDetected;
        }
        case 'smile':
          return face.smilingProbability > 0.5;
        case 'turnLeft':
          return face.headEulerAngleY > 12;
        case 'turnRight':
          return face.headEulerAngleY < -12;
        default:
          return false;
      }
    },

    getProgressText(type: ChallengeType, face: FaceDetectionResult): string {
      switch (type) {
        case 'blink': {
          const avg = ((face.leftEyeOpenProbability + face.rightEyeOpenProbability) / 2 * 100).toFixed(0);
          return `Eyes: ${avg}% open ${blinkDetected ? '— BLINK DETECTED!' : '— blink now'}`;
        }
        case 'smile':
          return `Smile: ${(face.smilingProbability * 100).toFixed(0)}% ${face.smilingProbability > 0.5 ? '— GOT IT!' : '(need 50%+)'}`;
        case 'turnLeft':
          return `Head angle: ${face.headEulerAngleY.toFixed(1)}° ${face.headEulerAngleY > 12 ? '— GOT IT!' : '(turn more left)'}`;
        case 'turnRight':
          return `Head angle: ${face.headEulerAngleY.toFixed(1)}° ${face.headEulerAngleY < -12 ? '— GOT IT!' : '(turn more right)'}`;
        default:
          return '';
      }
    },
  };
}

type Step = 'ready' | 'liveness' | 'recognizing' | 'success' | 'failure';

export default function AuthScreen({ navigation }: Props) {
  const device = useCameraDevice('front');
  const { hasPermission, requestPermission } = useCameraPermission();
  const cameraRef = useRef<any>(null);

  const [step, setStep] = useState<Step>('ready');
  const [challenges] = useState<Challenge[]>(pickChallenges);
  const [completedCount, setCompletedCount] = useState(0);
  const [statusText, setStatusText] = useState('');
  const [matchName, setMatchName] = useState('');
  const [matchScore, setMatchScore] = useState(0);
  const [debugInfo, setDebugInfo] = useState('');
  const [passedFlash, setPassedFlash] = useState(false);
  const [geoInfo, setGeoInfo] = useState('');
  const [attendanceAction, setAttendanceAction] = useState('');

  const challengeIndexRef = useRef(0);
  const runningRef = useRef(false);
  const timerRef = useRef<any>(null);
  const checkerRef = useRef(createChallengeChecker());
  const doCheckRef = useRef<(() => void) | undefined>(undefined);
  const pulseAnim = useRef(new Animated.Value(1)).current;

  useEffect(() => {
    if (step === 'liveness') {
      Animated.loop(
        Animated.sequence([
          Animated.timing(pulseAnim, { toValue: 1.08, duration: 1000, useNativeDriver: true }),
          Animated.timing(pulseAnim, { toValue: 1, duration: 1000, useNativeDriver: true }),
        ]),
      ).start();
    }
    return () => { pulseAnim.stopAnimation(); pulseAnim.setValue(1); };
  }, [step, pulseAnim]);

  useEffect(() => {
    return () => {
      runningRef.current = false;
      if (timerRef.current) clearTimeout(timerRef.current);
    };
  }, []);

  const flashPassed = useCallback(() => {
    setPassedFlash(true);
    Vibration.vibrate(100);
    setTimeout(() => setPassedFlash(false), 600);
  }, []);

  const scheduleNextCheck = useCallback(() => {
    if (!runningRef.current) return;
    timerRef.current = setTimeout(() => doCheckRef.current?.(), 400);
  }, []);

  const doCheck = useCallback(async () => {
    if (!runningRef.current || !cameraRef.current) {
      if (runningRef.current) scheduleNextCheck();
      return;
    }

    try {
      const photo = await cameraRef.current.takePhoto({ flash: 'off' });
      if (!photo?.path || !runningRef.current) {
        if (runningRef.current) scheduleNextCheck();
        return;
      }

      const filePath = photo.path.startsWith('/') ? photo.path : `/${photo.path}`;
      const face = await detectFace(filePath);
      if (!runningRef.current) return;

      if (!face || !face.found) {
        setDebugInfo('No face detected — look at camera');
        scheduleNextCheck();
        return;
      }

      const idx = challengeIndexRef.current;
      const challenge = challenges[idx];
      if (!challenge) {
        scheduleNextCheck();
        return;
      }

      const progressText = checkerRef.current.getProgressText(challenge.type, face);
      setDebugInfo(progressText);

      if (checkerRef.current.check(challenge.type, face)) {
        const nextIdx = idx + 1;
        challengeIndexRef.current = nextIdx;
        setCompletedCount(nextIdx);
        flashPassed();

        if (nextIdx >= challenges.length) {
          runningRef.current = false;
          setStatusText('All passed! Verifying...');
          setDebugInfo('Liveness confirmed — recognizing face...');
          setTimeout(() => handleRecognition(), 800);
          return;
        } else {
          checkerRef.current.reset();
          setStatusText(challenges[nextIdx].instruction);
        }
      }
    } catch (e: any) {
      setDebugInfo(`Error: ${e.message?.slice(0, 60)}`);
    }

    if (runningRef.current) scheduleNextCheck();
  }, [challenges, scheduleNextCheck, flashPassed]);

  doCheckRef.current = doCheck;

  const startLiveness = useCallback(() => {
    challengeIndexRef.current = 0;
    checkerRef.current.reset();
    setCompletedCount(0);
    setStep('liveness');
    setStatusText(challenges[0].instruction);
    setDebugInfo('Look at the camera...');
    setPassedFlash(false);
    runningRef.current = true;
    scheduleNextCheck();
  }, [challenges, scheduleNextCheck]);

  const logAndFail = useCallback(async (livenessPassed: boolean, score: number) => {
    setStep('failure');
    Vibration.vibrate(300);
    await saveAuthLog({
      id: Date.now().toString(36) + Math.random().toString(36).slice(2, 8),
      userId: null, userName: null,
      timestamp: Date.now(), livenessPassed,
      matchScore: score, authenticated: false, synced: false,
      latitude: null, longitude: null,
    });
  }, []);

  const handleRecognition = useCallback(async () => {
    setStep('recognizing');
    setStatusText('Checking location...');

    let geo: GeofenceCheck = { withinGeofence: false, nearestSite: null, distanceMeters: null, location: null };
    try {
      geo = await checkGeofence();
      if (geo.nearestSite) {
        setGeoInfo(geo.withinGeofence
          ? `At ${geo.nearestSite.name}`
          : `${geo.distanceMeters}m from ${geo.nearestSite.name}`);
      }
    } catch {}

    setStatusText('Running anti-spoof check...');

    try {
      if (!cameraRef.current) throw new Error('Camera not ready');
      const photo = await cameraRef.current.takePhoto({ flash: 'off' });
      const filePath = photo.path.startsWith('/') ? photo.path : `/${photo.path}`;

      // Anti-spoof check via face detection
      const spoofCheck = await detectFace(filePath);
      const spoofScore = spoofCheck.spoofScore ?? 0.5;
      if (spoofScore < 0.3) {
        Alert.alert('Spoof Detected', 'The system detected a potential spoof attempt (printed photo or screen). Please try again with your real face.');
        await logAndFail(true, 0);
        return;
      }

      setStatusText('Verifying identity...');

      let emb: number[];
      try {
        emb = await getFaceEmbedding(filePath);
      } catch (embErr: any) {
        Alert.alert('Embedding Error', embErr.message || 'Unknown');
        await logAndFail(true, 0);
        return;
      }

      const users = await getEnrolledUsers();
      if (users.length === 0) {
        Alert.alert('No Users', 'No enrolled users found. Please enroll first.');
        await logAndFail(true, 0);
        return;
      }

      const match = findBestMatch(
        emb,
        users.map(u => ({ id: u.id, name: u.name, embedding: u.embedding })),
      );

      if (match) {
        setMatchName(match.name);
        setMatchScore(match.score);
        setStep('success');
        Vibration.vibrate([0, 100, 100, 100]);

        await saveAuthLog({
          id: Date.now().toString(36) + Math.random().toString(36).slice(2, 8),
          userId: match.id, userName: match.name,
          timestamp: Date.now(), livenessPassed: true,
          matchScore: match.score, authenticated: true, synced: false,
          latitude: geo.location?.latitude ?? null,
          longitude: geo.location?.longitude ?? null,
          spoofScore,
          siteId: geo.nearestSite?.id ?? null,
          siteName: geo.nearestSite?.name ?? null,
          withinGeofence: geo.withinGeofence,
        });

        // Auto-attendance: check-in or check-out
        const matchedUser = users.find(u => u.id === match.id);
        if (matchedUser) {
          const openRecord = await getOpenCheckIn(match.id);
          if (openRecord) {
            await updateAttendance(openRecord.id, {
              checkOutTime: Date.now(),
              checkOutLocation: geo.location,
              checkOutScore: match.score,
            });
            setAttendanceAction('Checked Out');
          } else {
            await saveAttendance({
              id: Date.now().toString(36) + Math.random().toString(36).slice(2, 8),
              userId: match.id,
              userName: match.name,
              employeeId: matchedUser.employeeId,
              siteId: geo.nearestSite?.id ?? null,
              siteName: geo.nearestSite?.name ?? null,
              checkInTime: Date.now(),
              checkOutTime: null,
              checkInLocation: geo.location,
              checkOutLocation: null,
              checkInScore: match.score,
              checkOutScore: null,
              withinGeofence: geo.withinGeofence,
              synced: false,
            });
            setAttendanceAction('Checked In');
          }
        }
      } else {
        await logAndFail(true, 0);
      }
    } catch (e: any) {
      Alert.alert('Error', e.message || 'Recognition failed');
      await logAndFail(false, 0);
    }
  }, [logAndFail]);

  // --- RENDER ---

  if (!hasPermission) {
    return (
      <View style={styles.centered}>
        <Text style={styles.infoText}>Camera permission required</Text>
        <TouchableOpacity style={styles.button} onPress={requestPermission}>
          <Text style={styles.buttonText}>Grant Permission</Text>
        </TouchableOpacity>
      </View>
    );
  }

  if (!device) {
    return (
      <View style={styles.centered}>
        <Text style={styles.infoText}>No front camera found</Text>
      </View>
    );
  }

  if (step === 'success') {
    return (
      <View style={[styles.centered, { backgroundColor: colors.successLight }]}>
        <View style={[styles.resultCircle, { backgroundColor: colors.success }]}>
          <Text style={styles.resultIcon}>{'✓'}</Text>
        </View>
        <Text style={[styles.resultTitle, { color: colors.success }]}>Authenticated</Text>
        <Text style={styles.resultName}>{matchName}</Text>
        <Text style={styles.resultScore}>
          Confidence: {(matchScore * 100).toFixed(1)}%
        </Text>
        <View style={styles.badgeRow}>
          <View style={styles.resultBadge}>
            <Text style={styles.resultBadgeText}>Liveness Verified</Text>
          </View>
          <View style={styles.resultBadge}>
            <Text style={styles.resultBadgeText}>Anti-Spoof Passed</Text>
          </View>
        </View>
        {attendanceAction !== '' && (
          <View style={[styles.resultBadge, { backgroundColor: colors.primaryLight, marginTop: spacing.sm }]}>
            <Text style={[styles.resultBadgeText, { color: colors.primary }]}>
              {attendanceAction}
            </Text>
          </View>
        )}
        {geoInfo !== '' && (
          <Text style={[styles.resultScore, { marginTop: spacing.xs }]}>
            {geoInfo}
          </Text>
        )}
        <TouchableOpacity
          style={[styles.button, { marginTop: spacing.xl }]}
          onPress={() => navigation.goBack()}>
          <Text style={styles.buttonText}>Done</Text>
        </TouchableOpacity>
      </View>
    );
  }

  if (step === 'failure') {
    return (
      <View style={[styles.centered, { backgroundColor: colors.errorLight }]}>
        <View style={[styles.resultCircle, { backgroundColor: colors.error }]}>
          <Text style={styles.resultIcon}>{'✗'}</Text>
        </View>
        <Text style={[styles.resultTitle, { color: colors.error }]}>Not Recognized</Text>
        <Text style={styles.resultSubtitle}>Face did not match any enrolled user</Text>
        <TouchableOpacity
          style={[styles.button, { marginTop: spacing.xl }]}
          onPress={() => {
            setStep('ready');
            challengeIndexRef.current = 0;
            setCompletedCount(0);
            setDebugInfo('');
          }}>
          <Text style={styles.buttonText}>Try Again</Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.buttonOutline, { marginTop: spacing.md }]}
          onPress={() => navigation.goBack()}>
          <Text style={styles.buttonOutlineText}>Go Back</Text>
        </TouchableOpacity>
      </View>
    );
  }

  const currentChallenge = challenges[Math.min(completedCount, challenges.length - 1)];

  return (
    <View style={styles.container}>
      <View style={styles.cameraContainer}>
        <Camera
          ref={cameraRef}
          style={StyleSheet.absoluteFill}
          device={device}
          isActive={step === 'ready' || step === 'liveness' || step === 'recognizing'}
          // @ts-ignore
          photo={true}
        />

        {/* Green flash when challenge passes */}
        {passedFlash && (
          <View style={styles.flashOverlay} />
        )}

        {step === 'liveness' && (
          <View style={styles.livenessOverlay}>
            <Animated.View style={[
              styles.faceOval,
              { transform: [{ scale: pulseAnim }] },
              passedFlash && { borderColor: colors.success, borderWidth: 5 },
            ]} />
          </View>
        )}

        <View style={styles.topOverlay}>
          {step === 'liveness' && (
            <View style={styles.challengeCard}>
              <View style={styles.challengeHeader}>
                <Text style={styles.challengeIcon}>{currentChallenge?.icon}</Text>
                <Text style={styles.challengeStep}>
                  {completedCount + 1}/{challenges.length}
                </Text>
              </View>
              <Text style={styles.challengeText}>{statusText}</Text>
              <View style={styles.progressDots}>
                {challenges.map((_, i) => (
                  <View
                    key={i}
                    style={[
                      styles.progressDot,
                      i < completedCount && styles.progressDotDone,
                      i === completedCount && i < challenges.length && styles.progressDotActive,
                    ]}
                  />
                ))}
              </View>
              <Text style={styles.debugText}>{debugInfo}</Text>
            </View>
          )}

          {step === 'recognizing' && (
            <View style={styles.challengeCard}>
              <ActivityIndicator size="large" color={colors.primary} />
              <Text style={[styles.challengeText, { marginTop: spacing.md }]}>{statusText}</Text>
            </View>
          )}
        </View>
      </View>

      {step === 'ready' && (
        <View style={styles.readyPanel}>
          <Text style={styles.readyTitle}>Ready to Authenticate</Text>
          <Text style={styles.readySubtitle}>
            Perform {challenges.length} quick actions to verify you're real
          </Text>
          <View style={styles.challengePreview}>
            {challenges.map((c, i) => (
              <View key={i} style={styles.previewItem}>
                <Text style={styles.previewNum}>{i + 1}</Text>
                <Text style={styles.previewIcon}>{c.icon}</Text>
                <Text style={styles.previewText}>{c.instruction}</Text>
              </View>
            ))}
          </View>
          <TouchableOpacity style={styles.startButton} onPress={startLiveness}>
            <Text style={styles.startButtonText}>Start Verification</Text>
          </TouchableOpacity>
        </View>
      )}
    </View>
  );
}

const OVAL_SIZE = 220;
const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.black },
  centered: {
    flex: 1, alignItems: 'center', justifyContent: 'center',
    padding: spacing.xl, backgroundColor: colors.background,
  },
  cameraContainer: { flex: 1 },
  livenessOverlay: {
    position: 'absolute', left: 0, right: 0, top: 0, bottom: 0,
    alignItems: 'center', justifyContent: 'center',
  },
  faceOval: {
    width: OVAL_SIZE, height: OVAL_SIZE * 1.3,
    borderRadius: OVAL_SIZE * 0.65, borderWidth: 3, borderColor: 'rgba(255,255,255,0.7)',
  },
  flashOverlay: {
    position: 'absolute', left: 0, right: 0, top: 0, bottom: 0,
    backgroundColor: 'rgba(0,200,83,0.25)',
  },
  topOverlay: {
    position: 'absolute', top: 0, left: 0, right: 0,
    paddingTop: spacing.xxl + spacing.md, paddingHorizontal: spacing.md,
  },
  challengeCard: {
    backgroundColor: 'rgba(0,0,0,0.8)', borderRadius: borderRadius.lg,
    padding: spacing.md, alignItems: 'center',
  },
  challengeHeader: {
    flexDirection: 'row', alignItems: 'center', gap: spacing.sm,
  },
  challengeIcon: { fontSize: 30 },
  challengeStep: { color: 'rgba(255,255,255,0.5)', fontSize: 14, fontWeight: '600' },
  challengeText: {
    color: colors.white, fontSize: 20, fontWeight: '700',
    marginTop: spacing.xs, textAlign: 'center',
  },
  debugText: {
    color: 'rgba(255,255,255,0.7)', fontSize: 12, marginTop: spacing.sm,
    textAlign: 'center', fontFamily: 'monospace',
  },
  progressDots: { flexDirection: 'row', gap: spacing.sm, marginTop: spacing.md },
  progressDot: {
    width: 14, height: 14, borderRadius: 7, backgroundColor: 'rgba(255,255,255,0.25)',
  },
  progressDotDone: { backgroundColor: colors.success },
  progressDotActive: { backgroundColor: colors.primary, width: 28, borderRadius: 7 },
  readyPanel: {
    backgroundColor: colors.white, borderTopLeftRadius: borderRadius.xl,
    borderTopRightRadius: borderRadius.xl, padding: spacing.xl, ...shadows.lg,
  },
  readyTitle: { ...typography.h2, textAlign: 'center' },
  readySubtitle: { ...typography.bodySmall, textAlign: 'center', marginTop: spacing.xs },
  challengePreview: { marginTop: spacing.lg },
  previewItem: {
    flexDirection: 'row', alignItems: 'center', paddingVertical: spacing.sm, gap: spacing.md,
  },
  previewNum: {
    width: 24, height: 24, borderRadius: 12, backgroundColor: colors.primaryLight,
    color: colors.primary, fontSize: 13, fontWeight: '700', textAlign: 'center', lineHeight: 24,
  },
  previewIcon: { fontSize: 20 },
  previewText: { ...typography.body, flex: 1 },
  startButton: {
    backgroundColor: colors.primary, paddingVertical: spacing.md,
    borderRadius: borderRadius.md, alignItems: 'center', marginTop: spacing.lg, ...shadows.md,
  },
  startButtonText: { ...typography.button, color: colors.white, fontSize: 18 },
  resultCircle: {
    width: 96, height: 96, borderRadius: 48, alignItems: 'center', justifyContent: 'center',
  },
  resultIcon: { fontSize: 48, color: colors.white },
  resultTitle: { fontSize: 28, fontWeight: '700', marginTop: spacing.lg },
  resultName: { ...typography.h2, marginTop: spacing.sm },
  resultSubtitle: { ...typography.bodySmall, marginTop: spacing.sm, textAlign: 'center' },
  badgeRow: { flexDirection: 'row', gap: spacing.sm, marginTop: spacing.md },
  resultScore: { ...typography.bodySmall, marginTop: spacing.xs },
  resultBadge: {
    backgroundColor: colors.successLight, paddingHorizontal: spacing.lg,
    paddingVertical: spacing.sm, borderRadius: borderRadius.full, marginTop: spacing.md,
  },
  resultBadgeText: { color: colors.success, fontWeight: '600', fontSize: 14 },
  button: {
    backgroundColor: colors.primary, paddingVertical: spacing.md,
    paddingHorizontal: spacing.xxl, borderRadius: borderRadius.md, ...shadows.md,
  },
  buttonText: { ...typography.button, color: colors.white },
  buttonOutline: {
    borderWidth: 1.5, borderColor: colors.primary, paddingVertical: spacing.md,
    paddingHorizontal: spacing.xxl, borderRadius: borderRadius.md,
  },
  buttonOutlineText: { ...typography.button, color: colors.primary },
  infoText: { ...typography.h3, textAlign: 'center', marginBottom: spacing.lg },
});
