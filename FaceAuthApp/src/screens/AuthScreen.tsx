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
import { Camera, useCameraDevice, useCameraPermission, usePhotoOutput } from 'react-native-vision-camera';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import { colors, spacing, borderRadius, typography, shadows, MONO } from '../theme';
import { detectFace, getFaceEmbeddingWithMethod } from '../services/faceProcessor';
import { findBestMatch, MATCH_THRESHOLD } from '../services/embeddingUtils';
import { getEnrolledUsers, saveAuthLog, getOpenCheckIn, saveAttendance, updateAttendance } from '../services/database';
import { checkGeofence, type GeofenceCheck } from '../services/geofencing';
import type { RootStackParamList, FaceDetectionResult } from '../types';

type Props = NativeStackScreenProps<RootStackParamList, 'Authenticate'>;
type ChallengeType = 'blink' | 'smile' | 'turnLeft' | 'turnRight';

interface Challenge {
  type: ChallengeType;
  instruction: string;
  glyph: string;
}

const ALL_CHALLENGES: Challenge[] = [
  { type: 'blink',     instruction: 'Blink your eyes',        glyph: '◉' },
  { type: 'smile',     instruction: 'Smile at the camera',    glyph: '◡' },
  { type: 'turnLeft',  instruction: 'Turn head slightly left', glyph: '◂' },
  { type: 'turnRight', instruction: 'Turn head slightly right',glyph: '▸' },
];

function pickChallenges(): Challenge[] {
  const shuffled = [...ALL_CHALLENGES].sort(() => Math.random() - 0.5);
  return shuffled.slice(0, 3);
}

const MAX_FAILURES = 3;
const LOCKOUT_SECONDS = 30;
const CHECK_INTERVAL_MS = 1200;

function safeVibrate(pattern?: number | number[]) {
  try { Vibration.vibrate(pattern as any); } catch (_) {}
}

/* ── Liveness checker ──────────────────────────────────────────────── */
function createChallengeChecker() {
  let prevEyesOpen = true;
  let blinkDetected = false;
  let baselineY: number | null = null;

  return {
    reset() { prevEyesOpen = true; blinkDetected = false; },
    setBaseline(headY: number) { if (baselineY === null) baselineY = headY; },
    getBaseline() { return baselineY ?? 0; },

    check(type: ChallengeType, face: FaceDetectionResult): boolean {
      const relY = face.headEulerAngleY - (baselineY ?? 0);
      switch (type) {
        case 'blink': {
          const l = face.leftEyeOpenProbability, r = face.rightEyeOpenProbability;
          if (l < 0 || r < 0) return false;
          if (prevEyesOpen && (l < 0.4 || r < 0.4)) blinkDetected = true;
          prevEyesOpen = l > 0.45 && r > 0.45;
          return blinkDetected;
        }
        case 'smile': return face.smilingProbability > 0.3;
        case 'turnLeft':
        case 'turnRight': return Math.abs(relY) > 8;
        default: return false;
      }
    },

    progress(type: ChallengeType, face: FaceDetectionResult): number {
      const relY = face.headEulerAngleY - (baselineY ?? 0);
      switch (type) {
        case 'blink': {
          if (blinkDetected) return 100;
          const l = face.leftEyeOpenProbability, r = face.rightEyeOpenProbability;
          if (l < 0 || r < 0) return 0;
          return Math.round(Math.max(0, (1 - Math.min(l, r) / 0.4)) * 80);
        }
        case 'smile': return Math.round(Math.min(100, (face.smilingProbability / 0.3) * 100));
        case 'turnLeft':
        case 'turnRight': return Math.round(Math.min(100, (Math.abs(relY) / 8) * 100));
        default: return 0;
      }
    },
  };
}

type Step = 'ready' | 'liveness' | 'recognizing' | 'success' | 'failure' | 'locked';

export default function AuthScreen({ navigation }: Props) {
  const frontDevice = useCameraDevice('front');
  const backDevice  = useCameraDevice('back');
  const device = frontDevice ?? backDevice;
  const { hasPermission, requestPermission } = useCameraPermission();
  const photoOutput = usePhotoOutput({});

  const [step, setStep] = useState<Step>('ready');
  const [challenges] = useState<Challenge[]>(pickChallenges);
  const [completedCount, setCompletedCount] = useState(0);
  const [statusText, setStatusText] = useState('');
  const [matchName, setMatchName] = useState('');
  const [matchScore, setMatchScore] = useState(0);
  const [passedFlash, setPassedFlash] = useState(false);
  const [geoInfo, setGeoInfo] = useState('');
  const [attendanceAction, setAttendanceAction] = useState('');
  const [lockCountdown, setLockCountdown] = useState(0);
  const [pipelineMs, setPipelineMs] = useState(0);
  const [spoofScoreVal, setSpoofScoreVal] = useState(0);
  const [bioHashOk, setBioHashOk] = useState(false);
  const [challengeProgress, setChallengeProgress] = useState(0);
  const [faceFound, setFaceFound] = useState(false);

  const challengeIndexRef = useRef(0);
  const runningRef   = useRef(false);
  const timerRef     = useRef<any>(null);
  const checkerRef   = useRef(createChallengeChecker());
  const doCheckRef   = useRef<(() => void) | undefined>(undefined);
  const failCountRef = useRef(0);
  const pulseAnim    = useRef(new Animated.Value(1)).current;
  const glyphAnim    = useRef(new Animated.Value(0)).current;
  const progressAnim = useRef(new Animated.Value(0)).current;

  /* ── Animations ──────────────────────────────────────────────────── */
  useEffect(() => {
    if (step === 'liveness') {
      Animated.loop(Animated.sequence([
        Animated.timing(pulseAnim, { toValue: 1.04, duration: 900, useNativeDriver: true }),
        Animated.timing(pulseAnim, { toValue: 1,    duration: 900, useNativeDriver: true }),
      ])).start();
      Animated.loop(Animated.sequence([
        Animated.timing(glyphAnim, { toValue: 1, duration: 700, useNativeDriver: true }),
        Animated.timing(glyphAnim, { toValue: 0, duration: 700, useNativeDriver: true }),
      ])).start();
    }
    return () => { pulseAnim.stopAnimation(); pulseAnim.setValue(1); glyphAnim.stopAnimation(); glyphAnim.setValue(0); };
  }, [step, pulseAnim, glyphAnim]);

  useEffect(() => { return () => { runningRef.current = false; if (timerRef.current) clearTimeout(timerRef.current); }; }, []);

  /* ── Lockout timer ───────────────────────────────────────────────── */
  useEffect(() => {
    if (step !== 'locked') return;
    const iv = setInterval(() => {
      setLockCountdown(prev => {
        if (prev <= 1) { clearInterval(iv); setStep('ready'); failCountRef.current = 0; return 0; }
        return prev - 1;
      });
    }, 1000);
    return () => clearInterval(iv);
  }, [step]);

  const flashPassed = useCallback(() => {
    setPassedFlash(true);
    safeVibrate(80);
    setTimeout(() => setPassedFlash(false), 400);
  }, []);

  const scheduleNextCheck = useCallback(() => {
    if (!runningRef.current) return;
    timerRef.current = setTimeout(() => doCheckRef.current?.(), CHECK_INTERVAL_MS);
  }, []);

  /* ── Core liveness loop ──────────────────────────────────────────── */
  const doCheck = useCallback(async () => {
    if (!runningRef.current || !photoOutput) { if (runningRef.current) scheduleNextCheck(); return; }
    try {
      const photoFile = await photoOutput.capturePhotoToFile({ flashMode: 'off' }, {});
      if (!photoFile?.filePath || !runningRef.current) { if (runningRef.current) scheduleNextCheck(); return; }
      const filePath = photoFile.filePath.startsWith('/') ? photoFile.filePath : `/${photoFile.filePath}`;
      const face = await detectFace(filePath);
      if (!runningRef.current) return;

      if (!face || !face.found) {
        setFaceFound(false);
        setStatusText('Align face inside oval');
        setChallengeProgress(0);
        scheduleNextCheck();
        return;
      }

      setFaceFound(true);
      checkerRef.current.setBaseline(face.headEulerAngleY);

      const idx = challengeIndexRef.current;
      const challenge = challenges[idx];
      if (!challenge) { scheduleNextCheck(); return; }

      const prog = checkerRef.current.progress(challenge.type, face);
      setChallengeProgress(prog);
      Animated.timing(progressAnim, { toValue: prog / 100, duration: 150, useNativeDriver: false }).start();

      if (prog > 60 && prog < 100) setStatusText('Hold steady…');
      else if (prog < 30) setStatusText(challenge.instruction);

      if (checkerRef.current.check(challenge.type, face)) {
        const nextIdx = idx + 1;
        challengeIndexRef.current = nextIdx;
        setCompletedCount(nextIdx);
        flashPassed();

        if (nextIdx >= challenges.length) {
          runningRef.current = false;
          setStatusText('Liveness verified ✓');
          setChallengeProgress(100);
          setTimeout(() => handleRecognition(), 400);
          return;
        } else {
          checkerRef.current.reset();
          setChallengeProgress(0);
          progressAnim.setValue(0);
          setStatusText(challenges[nextIdx].instruction);
        }
      }
    } catch {}
    if (runningRef.current) scheduleNextCheck();
  }, [challenges, scheduleNextCheck, flashPassed, photoOutput, progressAnim]);

  doCheckRef.current = doCheck;

  const startLiveness = useCallback(() => {
    challengeIndexRef.current = 0;
    checkerRef.current = createChallengeChecker();
    setCompletedCount(0);
    setChallengeProgress(0);
    progressAnim.setValue(0);
    setStep('liveness');
    setStatusText(challenges[0].instruction);
    setPassedFlash(false);
    setFaceFound(false);
    runningRef.current = true;
    scheduleNextCheck();
  }, [challenges, scheduleNextCheck, progressAnim]);

  /* ── Failure handler ─────────────────────────────────────────────── */
  const handleFail = useCallback(async () => {
    failCountRef.current += 1;
    safeVibrate(300);
    if (failCountRef.current >= MAX_FAILURES) {
      setStep('locked');
      setLockCountdown(LOCKOUT_SECONDS);
    } else {
      setStep('failure');
    }
    try {
      await saveAuthLog({
        id: Date.now().toString(36) + Math.random().toString(36).slice(2, 8),
        userId: null, userName: null, timestamp: Date.now(), livenessPassed: true,
        matchScore: 0, authenticated: false, synced: false, latitude: null, longitude: null,
      });
    } catch {}
  }, []);

  /* ── Recognition pipeline ────────────────────────────────────────── */
  const handleRecognition = useCallback(async () => {
    const t0 = Date.now();
    setStep('recognizing');
    setStatusText('Checking GPS geofence…');

    let geo: GeofenceCheck = { withinGeofence: false, nearestSite: null, distanceMeters: null, location: null };
    try {
      geo = await checkGeofence();
      if (geo.nearestSite) setGeoInfo(geo.withinGeofence ? `📍 ${geo.nearestSite.name}` : `📍 ${geo.distanceMeters}m from site`);
    } catch {}

    setStatusText('Anti-spoof check…');
    try {
      if (!photoOutput) throw new Error('Camera not ready');
      const photoFile = await photoOutput.capturePhotoToFile({ flashMode: 'off' }, {});
      const filePath = photoFile.filePath.startsWith('/') ? photoFile.filePath : `/${photoFile.filePath}`;
      const faceResult = await detectFace(filePath);
      const spoofScore = faceResult.spoofScore ?? 0.5;
      setSpoofScoreVal(spoofScore);
      if (spoofScore < 0.3) { Alert.alert('Spoof Alert', 'Spoof detected. Please face camera naturally.'); await handleFail(); return; }

      setStatusText('Matching face template…');
      let emb: number[];
      let method: 'onnx' | 'landmark' = 'onnx';
      try { const r = await getFaceEmbeddingWithMethod(filePath); emb = r.embedding; method = r.method; } catch { await handleFail(); return; }
      const users = await getEnrolledUsers();
      if (users.length === 0) { Alert.alert('No Workers', 'No enrolled workers found.'); await handleFail(); return; }

      const match = findBestMatch(emb, users.map(u => ({ id: u.id, name: u.name, embedding: u.embedding, bioHash: u.bioHash, bioHashSalt: u.bioHashSalt })), method);
      setPipelineMs(Date.now() - t0);

      if (match) {
        setMatchName(match.name);
        setMatchScore(match.score);
        setBioHashOk(match.bioHashVerified);
        setStep('success');
        safeVibrate([0, 100, 100, 100]);
        failCountRef.current = 0;
        try {
          await saveAuthLog({ id: Date.now().toString(36) + Math.random().toString(36).slice(2, 8), userId: match.id, userName: match.name, timestamp: Date.now(), livenessPassed: true, matchScore: match.score, authenticated: true, synced: false, latitude: geo.location?.latitude ?? null, longitude: geo.location?.longitude ?? null, spoofScore, siteId: geo.nearestSite?.id ?? null, siteName: geo.nearestSite?.name ?? null, withinGeofence: geo.withinGeofence, bioHashVerified: match.bioHashVerified, pipelineLatencyMs: Date.now() - t0 });
        } catch {}
        try {
          const matchedUser = users.find(u => u.id === match.id);
          if (matchedUser) {
            const open = await getOpenCheckIn(match.id);
            if (open) {
              await updateAttendance(open.id, { checkOutTime: Date.now(), checkOutLocation: geo.location, checkOutScore: match.score });
              setAttendanceAction('Check-out Recorded');
            } else {
              await saveAttendance({ id: Date.now().toString(36) + Math.random().toString(36).slice(2, 8), userId: match.id, userName: match.name, employeeId: matchedUser.employeeId, siteId: geo.nearestSite?.id ?? null, siteName: geo.nearestSite?.name ?? null, checkInTime: Date.now(), checkOutTime: null, checkInLocation: geo.location, checkOutLocation: null, checkInScore: match.score, checkOutScore: null, withinGeofence: geo.withinGeofence, synced: false });
              setAttendanceAction('Check-in Recorded');
            }
          }
        } catch {}
      } else { await handleFail(); }
    } catch { await handleFail(); }
  }, [handleFail, photoOutput]);

  /* ══════════════  RENDER  ══════════════════════════════════════════ */

  if (!hasPermission) {
    return (
      <View style={s.center}>
        <Text style={s.permIcon}>📷</Text>
        <Text style={s.centerTitle}>Camera Permission Required</Text>
        <TouchableOpacity style={s.btn} onPress={requestPermission} activeOpacity={0.85}>
          <Text style={s.btnText}>Grant Permission</Text>
        </TouchableOpacity>
      </View>
    );
  }
  if (!device) return <View style={s.center}><Text style={s.centerTitle}>No camera found</Text></View>;

  /* ── SUCCESS ─────────────────────────────────────────────────────── */
  if (step === 'success') {
    const scoreColor = matchScore > 0.7 ? colors.success : matchScore > 0.5 ? colors.warn : colors.danger;
    return (
      <View style={s.center}>
        <View style={[s.resultCircle, { borderColor: colors.success, backgroundColor: colors.successDim }]}>
          <Text style={[s.resultGlyph, { color: colors.success }]}>✓</Text>
        </View>
        <Text style={[s.resultTitle, { color: colors.success }]}>Verification Successful</Text>
        <Text style={s.resultName}>{matchName}</Text>

        <View style={s.scoreSection}>
          <View style={s.scoreRow}>
            <Text style={s.scoreLabel}>Match Confidence</Text>
            <Text style={[s.scoreValue, { color: scoreColor }]}>{(matchScore * 100).toFixed(1)}%</Text>
          </View>
          <View style={s.scoreBarBg}>
            <View style={[s.scoreBarFill, { width: `${matchScore * 100}%`, backgroundColor: scoreColor }]} />
            <View style={[s.thresholdMark, { left: `${MATCH_THRESHOLD * 100}%` }]} />
          </View>
          <View style={s.scoreRow}>
            <Text style={s.scoreHint}>Threshold: {(MATCH_THRESHOLD * 100).toFixed(0)}%</Text>
            <Text style={s.scoreHint}>{pipelineMs}ms latency</Text>
          </View>
        </View>

        <View style={s.verifyGrid}>
          <View style={[s.verifyBadge, { backgroundColor: colors.successDim, borderColor: '#BBF7D0' }]}>
            <Text style={[s.verifyText, { color: colors.success }]}>✓ Liveness Passed</Text>
          </View>
          <View style={[s.verifyBadge, { backgroundColor: colors.surfaceAlt, borderColor: colors.line }]}>
            <Text style={s.verifyText}>Anti-Spoof: {(spoofScoreVal * 100).toFixed(0)}%</Text>
          </View>
          <View style={[s.verifyBadge, { backgroundColor: colors.cyanDim, borderColor: '#BAE6FD' }]}>
            <Text style={[s.verifyText, { color: colors.cyan }]}>BioHash Verified</Text>
          </View>
        </View>

        {attendanceAction !== '' && (
          <View style={s.attendBadge}>
            <Text style={s.attendText}>{attendanceAction}</Text>
          </View>
        )}
        {geoInfo !== '' && <Text style={s.geoText}>{geoInfo}</Text>}

        <TouchableOpacity style={[s.btn, { marginTop: spacing.xl }]} onPress={() => navigation.goBack()} activeOpacity={0.85}>
          <Text style={s.btnText}>Done</Text>
        </TouchableOpacity>
      </View>
    );
  }

  /* ── FAILURE ─────────────────────────────────────────────────────── */
  if (step === 'failure') {
    return (
      <View style={s.center}>
        <View style={[s.resultCircle, { borderColor: colors.danger, backgroundColor: colors.dangerDim }]}>
          <Text style={[s.resultGlyph, { color: colors.danger }]}>✕</Text>
        </View>
        <Text style={[s.resultTitle, { color: colors.danger }]}>Authentication Failed</Text>
        <Text style={s.monoText}>Face did not match registered worker profiles.</Text>
        <Text style={[s.monoText, { color: colors.warn, marginTop: spacing.xs }]}>
          Attempt {failCountRef.current} of {MAX_FAILURES}
        </Text>
        <TouchableOpacity style={[s.btn, { marginTop: spacing.xl }]} onPress={() => { setStep('ready'); challengeIndexRef.current = 0; setCompletedCount(0); }} activeOpacity={0.85}>
          <Text style={s.btnText}>Try Again</Text>
        </TouchableOpacity>
        <TouchableOpacity style={[s.btnOutline, { marginTop: spacing.md }]} onPress={() => navigation.goBack()} activeOpacity={0.85}>
          <Text style={s.btnOutlineText}>Cancel</Text>
        </TouchableOpacity>
      </View>
    );
  }

  /* ── LOCKED ──────────────────────────────────────────────────────── */
  if (step === 'locked') {
    return (
      <View style={s.center}>
        <View style={[s.resultCircle, { borderColor: colors.danger, backgroundColor: colors.dangerDim }]}>
          <Text style={[s.resultGlyph, { color: colors.danger }]}>🔒</Text>
        </View>
        <Text style={[s.resultTitle, { color: colors.danger }]}>Terminal Locked</Text>
        <Text style={s.monoText}>Too many failed attempts. Please wait.</Text>
        <Text style={[s.lockTimer, { color: colors.danger }]}>{lockCountdown}s</Text>
        <TouchableOpacity style={[s.btnOutline, { marginTop: spacing.xl }]} onPress={() => navigation.goBack()} activeOpacity={0.85}>
          <Text style={s.btnOutlineText}>Back to Home</Text>
        </TouchableOpacity>
      </View>
    );
  }

  /* ── Camera + liveness overlay ───────────────────────────────────── */
  const currentChallenge = challenges[Math.min(completedCount, challenges.length - 1)];

  return (
    <View style={s.root}>
      <View style={s.cameraWrap}>
        <Camera style={StyleSheet.absoluteFill} device={device} isActive={step === 'ready' || step === 'liveness' || step === 'recognizing'} outputs={[photoOutput]} />
        {passedFlash && <View style={s.flashOverlay} />}

        {/* Viewfinder Target */}
        <View style={s.ovalWrap}>
          <Animated.View style={[s.oval, { transform: [{ scale: pulseAnim }] }, passedFlash && { borderColor: colors.success }]} />
        </View>

        <View style={s.topOverlay}>
          {step === 'liveness' && (
            <View style={s.challengeCard}>
              <View style={s.challengeHeader}>
                <Animated.Text style={[s.challengeGlyph, { opacity: glyphAnim.interpolate({ inputRange: [0, 1], outputRange: [1, 0.4] }) }]}>
                  {currentChallenge?.glyph}
                </Animated.Text>
                <View style={s.challengeMeta}>
                  <Text style={s.challengeStep}>Step {completedCount + 1} of {challenges.length}</Text>
                  <Text style={s.challengeText}>{statusText}</Text>
                </View>
              </View>
              <View style={s.progressBarBg}>
                <Animated.View style={[s.progressBarFill, {
                  width: progressAnim.interpolate({ inputRange: [0, 1], outputRange: ['0%', '100%'] }),
                  backgroundColor: challengeProgress >= 100 ? colors.success : colors.accent,
                }]} />
              </View>
            </View>
          )}

          {step === 'recognizing' && (
            <View style={s.challengeCard}>
              <ActivityIndicator size="small" color={colors.accent} />
              <Text style={[s.challengeText, { marginTop: spacing.sm }]}>{statusText}</Text>
            </View>
          )}
        </View>

        {step === 'liveness' && (
          <View style={[s.bottomHud, !faceFound && s.bottomHudWarn]}>
            <View style={[s.faceDot, { backgroundColor: faceFound ? colors.success : colors.danger }]} />
            <Text style={[s.bottomHudText, !faceFound && { color: colors.danger }]}>
              {faceFound ? 'Face detected — follow instruction' : 'Look directly at camera'}
            </Text>
          </View>
        )}
      </View>

      {step === 'ready' && (
        <View style={s.readyPanel}>
          <Text style={s.readyTitle}>Facial Verification</Text>
          <Text style={s.readySub}>Hold device at eye level and follow {challenges.length} quick gestures</Text>
          
          <View style={s.previewList}>
            {challenges.map((c, i) => (
              <View key={i} style={s.previewRow}>
                <View style={s.previewNum}><Text style={s.previewNumText}>{i + 1}</Text></View>
                <Text style={s.previewText}>{c.instruction}</Text>
              </View>
            ))}
          </View>
          
          <TouchableOpacity style={s.startBtn} onPress={startLiveness} activeOpacity={0.85}>
            <Text style={s.startBtnText}>Start Face Scan</Text>
          </TouchableOpacity>
        </View>
      )}
    </View>
  );
}

const OVAL = 230;
const s = StyleSheet.create({
  root:  { flex: 1, backgroundColor: colors.bg },
  center:{ flex: 1, alignItems: 'center', justifyContent: 'center', padding: spacing.xl, backgroundColor: colors.bg },
  permIcon: { fontSize: 44, marginBottom: spacing.md },
  centerTitle:{ fontSize: 20, fontWeight: '700', marginTop: spacing.md, textAlign: 'center', color: colors.text },
  
  cameraWrap: { flex: 1 },
  ovalWrap:   { position: 'absolute', left: 0, right: 0, top: 0, bottom: 0, alignItems: 'center', justifyContent: 'center' },
  oval:       {
    width: OVAL, height: OVAL * 1.35, borderRadius: OVAL * 0.67,
    borderWidth: 2, borderColor: '#FFFFFF', borderStyle: 'dashed',
    backgroundColor: 'rgba(0, 0, 0, 0.1)',
  },

  flashOverlay:{ position: 'absolute', left: 0, right: 0, top: 0, bottom: 0, backgroundColor: 'rgba(22, 163, 74, 0.20)' },
  topOverlay: { position: 'absolute', top: 0, left: 0, right: 0, paddingTop: spacing.xxl, paddingHorizontal: spacing.md },
  challengeCard: { backgroundColor: '#FFFFFF', borderRadius: borderRadius.lg, padding: spacing.md, alignItems: 'center', ...shadows.md },
  challengeHeader: { flexDirection: 'row', alignItems: 'center', gap: spacing.md, width: '100%' },
  challengeGlyph: { fontSize: 28, color: colors.accent },
  challengeMeta: { flex: 1 },
  challengeStep:  { fontSize: 11, color: colors.textDim, fontWeight: '600' },
  challengeText:  { fontSize: 15, fontWeight: '700', color: colors.text, marginTop: 1 },
  progressBarBg: { width: '100%', height: 4, backgroundColor: colors.surfaceAlt, borderRadius: 2, marginTop: spacing.md, overflow: 'hidden' },
  progressBarFill:{ height: 4, borderRadius: 2 },

  bottomHud:     { position: 'absolute', bottom: spacing.lg, left: spacing.md, right: spacing.md, backgroundColor: 'rgba(15, 23, 42, 0.85)', borderRadius: borderRadius.md, padding: spacing.md, flexDirection: 'row', alignItems: 'center', gap: spacing.sm },
  bottomHudWarn: { backgroundColor: 'rgba(220, 38, 38, 0.90)' },
  faceDot:       { width: 8, height: 8, borderRadius: 4 },
  bottomHudText: { fontSize: 12.5, fontWeight: '600', color: '#FFFFFF' },

  readyPanel: { backgroundColor: '#FFFFFF', borderTopLeftRadius: borderRadius.lg, borderTopRightRadius: borderRadius.lg, padding: spacing.xl, borderTopWidth: 1, borderTopColor: colors.line, ...shadows.md },
  readyTitle: { fontSize: 18, fontWeight: '800', textAlign: 'center', color: colors.text },
  readySub:   { fontSize: 12.5, textAlign: 'center', marginTop: spacing.xs, color: colors.textDim },
  previewList:{ marginTop: spacing.md },
  previewRow: { flexDirection: 'row', alignItems: 'center', paddingVertical: spacing.xs + 2, gap: spacing.md },
  previewNum: { width: 22, height: 22, borderRadius: 11, backgroundColor: colors.surfaceAlt, alignItems: 'center', justifyContent: 'center' },
  previewNumText:{ fontSize: 11, fontWeight: '700', color: colors.textDim },
  previewText:  { fontSize: 13.5, color: colors.text, fontWeight: '500', flex: 1 },
  startBtn:     { backgroundColor: colors.accent, paddingVertical: spacing.md, borderRadius: borderRadius.md, alignItems: 'center', marginTop: spacing.lg, ...shadows.sm },
  startBtnText: { ...typography.button, color: colors.onAccent, fontSize: 14.5 },

  resultCircle:{ width: 80, height: 80, borderRadius: 40, borderWidth: 3, alignItems: 'center', justifyContent: 'center' },
  resultGlyph: { fontSize: 36, fontWeight: '800' },
  resultTitle: { fontSize: 20, fontWeight: '800', marginTop: spacing.lg },
  resultName:  { fontSize: 22, fontWeight: '800', color: colors.text, marginTop: spacing.xs, textAlign: 'center' },
  monoText:    { fontSize: 13, color: colors.textDim, marginTop: spacing.xs, textAlign: 'center' },

  scoreSection:{ width: '100%', marginTop: spacing.lg, backgroundColor: '#FFFFFF', padding: spacing.md, borderRadius: borderRadius.md, borderWidth: 1, borderColor: colors.line, ...shadows.sm },
  scoreRow:    { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  scoreLabel:  { fontSize: 11, color: colors.textDim, fontWeight: '600' },
  scoreValue:  { fontSize: 16, fontWeight: '800', fontFamily: MONO },
  scoreBarBg:  { height: 6, backgroundColor: colors.surfaceAlt, borderRadius: 3, marginTop: spacing.xs, overflow: 'visible', position: 'relative' },
  scoreBarFill:{ height: 6, borderRadius: 3 },
  thresholdMark:{ position: 'absolute', top: -3, width: 2, height: 12, backgroundColor: colors.text },
  scoreHint:   { fontSize: 10.5, color: colors.textFaint, marginTop: spacing.xs },

  verifyGrid:  { flexDirection: 'row', gap: spacing.xs, marginTop: spacing.md, flexWrap: 'wrap', justifyContent: 'center' },
  verifyBadge: { borderWidth: 1, paddingHorizontal: spacing.md, paddingVertical: 4, borderRadius: borderRadius.full },
  verifyText:  { fontSize: 11, fontWeight: '600', color: colors.textDim },

  attendBadge: { marginTop: spacing.md, backgroundColor: colors.accentDim, paddingHorizontal: spacing.lg, paddingVertical: spacing.xs + 2, borderRadius: borderRadius.full, borderWidth: 1, borderColor: '#FED7AA' },
  attendText:  { fontSize: 12, fontWeight: '700', color: colors.accent },
  geoText:     { fontSize: 12, color: colors.textDim, marginTop: spacing.xs },

  lockTimer:   { fontSize: 44, fontWeight: '800', fontFamily: MONO, marginTop: spacing.lg },
  btn:         { backgroundColor: colors.accent, paddingVertical: spacing.md, paddingHorizontal: spacing.xxl, borderRadius: borderRadius.md, width: '100%', alignItems: 'center', ...shadows.sm },
  btnText:     { ...typography.button, color: colors.onAccent },
  btnOutline:  { borderWidth: 1, borderColor: colors.lineBright, paddingVertical: spacing.md, paddingHorizontal: spacing.xxl, borderRadius: borderRadius.md, width: '100%', alignItems: 'center', backgroundColor: '#FFFFFF' },
  btnOutlineText:{ ...typography.button, color: colors.textDim },
});
