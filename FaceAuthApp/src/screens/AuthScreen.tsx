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
  Platform,
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
  { type: 'blink',     instruction: 'Blink eyes naturally',    glyph: '◉' },
  { type: 'smile',     instruction: 'Give a slight smile',     glyph: '◡' },
  { type: 'turnLeft',  instruction: 'Turn head slowly left',   glyph: '◂' },
  { type: 'turnRight', instruction: 'Turn head slowly right',  glyph: '▸' },
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
    setStatusText('Verifying GPS geofence…');

    let geo: GeofenceCheck = { withinGeofence: false, nearestSite: null, distanceMeters: null, location: null };
    try {
      geo = await checkGeofence();
      if (geo.nearestSite) setGeoInfo(geo.withinGeofence ? `📍 ${geo.nearestSite.name}` : `📍 ${geo.distanceMeters}m outside site boundary`);
    } catch {}

    setStatusText('Anti-spoof Laplacian scan…');
    try {
      if (!photoOutput) throw new Error('Camera not ready');
      const photoFile = await photoOutput.capturePhotoToFile({ flashMode: 'off' }, {});
      const filePath = photoFile.filePath.startsWith('/') ? photoFile.filePath : `/${photoFile.filePath}`;
      const faceResult = await detectFace(filePath);
      const spoofScore = faceResult.spoofScore ?? 0.5;
      setSpoofScoreVal(spoofScore);
      if (spoofScore < 0.3) { Alert.alert('Spoof Alert', 'Spoof detected. Please authenticate with your real face.'); await handleFail(); return; }

      setStatusText('Vectorizing & matching template…');
      let emb: number[];
      let method: 'onnx' | 'landmark' = 'onnx';
      try { const r = await getFaceEmbeddingWithMethod(filePath); emb = r.embedding; method = r.method; } catch { await handleFail(); return; }
      const users = await getEnrolledUsers();
      if (users.length === 0) { Alert.alert('No Profiles', 'No enrolled workers found. Enrol someone first.'); await handleFail(); return; }

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
              setAttendanceAction('PUNCHED OUT (CHECK-OUT RECORDED)');
            } else {
              await saveAttendance({ id: Date.now().toString(36) + Math.random().toString(36).slice(2, 8), userId: match.id, userName: match.name, employeeId: matchedUser.employeeId, siteId: geo.nearestSite?.id ?? null, siteName: geo.nearestSite?.name ?? null, checkInTime: Date.now(), checkOutTime: null, checkInLocation: geo.location, checkOutLocation: null, checkInScore: match.score, checkOutScore: null, withinGeofence: geo.withinGeofence, synced: false });
              setAttendanceAction('PUNCHED IN (CHECK-IN RECORDED)');
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
        <View style={s.permCircle}>
          <Text style={s.permIcon}>📷</Text>
        </View>
        <Text style={s.centerTitle}>CAMERA ACCESS REQUIRED</Text>
        <TouchableOpacity style={s.btn} onPress={requestPermission} activeOpacity={0.85}>
          <Text style={s.btnText}>GRANT PERMISSION</Text>
        </TouchableOpacity>
      </View>
    );
  }
  if (!device) return <View style={s.center}><Text style={s.centerTitle}>NO CAMERA FOUND</Text></View>;

  /* ── SUCCESS ─────────────────────────────────────────────────────── */
  if (step === 'success') {
    const scoreColor = matchScore > 0.7 ? colors.success : matchScore > 0.5 ? colors.warn : colors.danger;
    return (
      <View style={[s.center, { backgroundColor: '#061710' }]}>
        <View style={[s.resultCircle, { borderColor: colors.success, backgroundColor: colors.successDim }]}>
          <Text style={[s.resultGlyph, { color: colors.success }]}>✓</Text>
        </View>
        <Text style={[s.resultTitle, { color: colors.success }]}>VERIFIED & AUTHENTICATED</Text>
        <Text style={s.resultName}>{matchName}</Text>

        <View style={s.scoreSection}>
          <View style={s.scoreRow}>
            <Text style={s.scoreLabel}>MATCH CONFIDENCE</Text>
            <Text style={[s.scoreValue, { color: scoreColor }]}>{(matchScore * 100).toFixed(1)}%</Text>
          </View>
          <View style={s.scoreBarBg}>
            <View style={[s.scoreBarFill, { width: `${matchScore * 100}%`, backgroundColor: scoreColor }]} />
            <View style={[s.thresholdMark, { left: `${MATCH_THRESHOLD * 100}%` }]} />
          </View>
          <View style={s.scoreRow}>
            <Text style={s.scoreHint}>Threshold: {(MATCH_THRESHOLD * 100).toFixed(0)}%</Text>
            <Text style={s.scoreHint}>Latency: {pipelineMs}ms</Text>
          </View>
        </View>

        <View style={s.verifyGrid}>
          <View style={[s.verifyBadge, { borderColor: colors.success, backgroundColor: colors.successDim }]}>
            <Text style={[s.verifyIcon, { color: colors.success }]}>✓</Text>
            <Text style={[s.verifyText, { color: colors.success }]}>LIVENESS PASSED</Text>
          </View>
          <View style={[s.verifyBadge, { borderColor: spoofScoreVal > 0.4 ? colors.success : colors.warn, backgroundColor: colors.surfaceAlt }]}>
            <Text style={[s.verifyIcon, { color: spoofScoreVal > 0.4 ? colors.success : colors.warn }]}>
              {spoofScoreVal > 0.4 ? '✓' : '~'}
            </Text>
            <Text style={[s.verifyText, { color: spoofScoreVal > 0.4 ? colors.success : colors.warn }]}>
              ANTI-SPOOF {(spoofScoreVal * 100).toFixed(0)}%
            </Text>
          </View>
          <View style={[s.verifyBadge, { borderColor: bioHashOk ? colors.cyan : colors.textFaint, backgroundColor: colors.surfaceAlt }]}>
            <Text style={[s.verifyIcon, { color: bioHashOk ? colors.cyan : colors.textFaint }]}>
              {bioHashOk ? '✓' : '-'}
            </Text>
            <Text style={[s.verifyText, { color: bioHashOk ? colors.cyan : colors.textFaint }]}>BIOHASH OK</Text>
          </View>
        </View>

        {attendanceAction !== '' && (
          <View style={s.attendBadge}>
            <Text style={s.attendText}>{attendanceAction}</Text>
          </View>
        )}
        {geoInfo !== '' && <Text style={s.geoText}>{geoInfo}</Text>}

        <TouchableOpacity style={[s.btn, { marginTop: spacing.xl }]} onPress={() => navigation.goBack()} activeOpacity={0.85}>
          <Text style={s.btnText}>FINISH & RETURN</Text>
        </TouchableOpacity>
      </View>
    );
  }

  /* ── FAILURE ─────────────────────────────────────────────────────── */
  if (step === 'failure') {
    return (
      <View style={[s.center, { backgroundColor: '#1A080C' }]}>
        <View style={[s.resultCircle, { borderColor: colors.danger, backgroundColor: colors.dangerDim }]}>
          <Text style={[s.resultGlyph, { color: colors.danger }]}>✕</Text>
        </View>
        <Text style={[s.resultTitle, { color: colors.danger }]}>AUTHENTICATION FAILED</Text>
        <Text style={s.monoText}>Face did not match any enrolled personnel</Text>
        <Text style={[s.monoText, { color: colors.warn, marginTop: spacing.xs }]}>
          Attempt {failCountRef.current} of {MAX_FAILURES} before temporary lockout
        </Text>
        <TouchableOpacity style={[s.btn, { marginTop: spacing.xl }]} onPress={() => { setStep('ready'); challengeIndexRef.current = 0; setCompletedCount(0); }} activeOpacity={0.85}>
          <Text style={s.btnText}>TRY SCAN AGAIN</Text>
        </TouchableOpacity>
        <TouchableOpacity style={[s.btnOutline, { marginTop: spacing.md }]} onPress={() => navigation.goBack()} activeOpacity={0.85}>
          <Text style={s.btnOutlineText}>GO BACK</Text>
        </TouchableOpacity>
      </View>
    );
  }

  /* ── LOCKED ──────────────────────────────────────────────────────── */
  if (step === 'locked') {
    return (
      <View style={[s.center, { backgroundColor: '#1A080C' }]}>
        <View style={[s.resultCircle, { borderColor: colors.danger, backgroundColor: colors.dangerDim }]}>
          <Text style={[s.resultGlyph, { color: colors.danger }]}>🔒</Text>
        </View>
        <Text style={[s.resultTitle, { color: colors.danger }]}>TERMINAL LOCKED</Text>
        <Text style={s.monoText}>Maximum failed verification attempts reached.</Text>
        <Text style={[s.lockTimer, { color: colors.danger }]}>{lockCountdown}s</Text>
        <TouchableOpacity style={[s.btnOutline, { marginTop: spacing.xl }]} onPress={() => navigation.goBack()} activeOpacity={0.85}>
          <Text style={s.btnOutlineText}>RETURN TO HOME</Text>
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

        {/* Viewfinder Reticle */}
        <View style={s.ovalWrap}>
          <Animated.View style={[s.oval, { transform: [{ scale: pulseAnim }] }, passedFlash && { borderColor: colors.success }]}>
            <View style={[s.cornerTick, s.tickTL]} />
            <View style={[s.cornerTick, s.tickTR]} />
            <View style={[s.cornerTick, s.tickBL]} />
            <View style={[s.cornerTick, s.tickBR]} />
          </Animated.View>
        </View>

        <View style={s.topOverlay}>
          {step === 'liveness' && (
            <View style={s.challengeCard}>
              <View style={s.challengeHeader}>
                <Animated.Text style={[s.challengeGlyph, { opacity: glyphAnim.interpolate({ inputRange: [0, 1], outputRange: [1, 0.4] }) }]}>
                  {currentChallenge?.glyph}
                </Animated.Text>
                <View style={s.challengeMeta}>
                  <Text style={s.challengeStep}>GESTURE CHALLENGE {completedCount + 1}/{challenges.length}</Text>
                  <Text style={s.challengeText}>{statusText}</Text>
                </View>
              </View>
              <View style={s.progressBarBg}>
                <Animated.View style={[s.progressBarFill, {
                  width: progressAnim.interpolate({ inputRange: [0, 1], outputRange: ['0%', '100%'] }),
                  backgroundColor: challengeProgress >= 100 ? colors.success : colors.accent,
                }]} />
              </View>
              <View style={s.dots}>
                {challenges.map((_, i) => (
                  <View key={i} style={[s.dot, i < completedCount && s.dotDone, i === completedCount && s.dotActive]} />
                ))}
              </View>
            </View>
          )}

          {step === 'recognizing' && (
            <View style={s.challengeCard}>
              <ActivityIndicator size="large" color={colors.accent} />
              <Text style={[s.challengeText, { marginTop: spacing.md }]}>{statusText}</Text>
            </View>
          )}
        </View>

        {step === 'liveness' && (
          <View style={[s.bottomHud, !faceFound && s.bottomHudWarn]}>
            <View style={[s.faceDot, { backgroundColor: faceFound ? colors.success : colors.danger }]} />
            <Text style={[s.bottomHudText, !faceFound && { color: colors.danger }]}>
              {faceFound ? 'Face in focus — follow gesture prompt' : 'No face detected — hold phone upright'}
            </Text>
          </View>
        )}
      </View>

      {step === 'ready' && (
        <View style={s.readyPanel}>
          <View style={s.readyHandle} />
          <Text style={s.readyTitle}>BIOMETRIC RECOGNITION</Text>
          <Text style={s.readySub}>Hold camera at eye level and follow {challenges.length} dynamic anti-spoof prompts</Text>
          
          <View style={s.previewList}>
            {challenges.map((c, i) => (
              <View key={i} style={s.previewRow}>
                <View style={s.previewNum}><Text style={s.previewNumText}>{i + 1}</Text></View>
                <Text style={s.previewGlyph}>{c.glyph}</Text>
                <Text style={s.previewText}>{c.instruction}</Text>
              </View>
            ))}
          </View>
          
          <TouchableOpacity style={s.startBtn} onPress={startLiveness} activeOpacity={0.85}>
            <Text style={s.startBtnText}>START SCAN & AUTHENTICATE</Text>
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
  permCircle: { width: 72, height: 72, borderRadius: 36, backgroundColor: colors.surfaceAlt, alignItems: 'center', justifyContent: 'center', borderWidth: 1, borderColor: colors.line, marginBottom: spacing.lg },
  permIcon: { fontSize: 32 },
  centerTitle:{ ...typography.h2, marginTop: spacing.md, letterSpacing: 1.5, textAlign: 'center' },
  
  cameraWrap: { flex: 1 },
  ovalWrap:   { position: 'absolute', left: 0, right: 0, top: 0, bottom: 0, alignItems: 'center', justifyContent: 'center' },
  oval:       {
    width: OVAL, height: OVAL * 1.35, borderRadius: OVAL * 0.67,
    borderWidth: 2, borderColor: colors.accent,
    backgroundColor: 'rgba(255, 122, 26, 0.04)',
    alignItems: 'center', justifyContent: 'center',
  },
  cornerTick: { position: 'absolute', width: 14, height: 14, borderColor: colors.cyan },
  tickTL: { top: -2, left: -2, borderTopWidth: 3, borderLeftWidth: 3 },
  tickTR: { top: -2, right: -2, borderTopWidth: 3, borderRightWidth: 3 },
  tickBL: { bottom: -2, left: -2, borderBottomWidth: 3, borderLeftWidth: 3 },
  tickBR: { bottom: -2, right: -2, borderBottomWidth: 3, borderRightWidth: 3 },

  flashOverlay:{ position: 'absolute', left: 0, right: 0, top: 0, bottom: 0, backgroundColor: 'rgba(16, 185, 129, 0.25)' },
  topOverlay: { position: 'absolute', top: 0, left: 0, right: 0, paddingTop: spacing.xxl + spacing.sm, paddingHorizontal: spacing.md },
  challengeCard: { backgroundColor: 'rgba(8, 12, 20, 0.94)', borderRadius: borderRadius.lg, padding: spacing.md + 2, alignItems: 'center', borderWidth: 1, borderColor: colors.accent, ...shadows.lg },
  challengeHeader: { flexDirection: 'row', alignItems: 'center', gap: spacing.md, width: '100%' },
  challengeGlyph: { fontSize: 34, color: colors.accent },
  challengeMeta: { flex: 1 },
  challengeStep:  { fontFamily: MONO, fontSize: 10, color: colors.textDim, letterSpacing: 1, fontWeight: '700' },
  challengeText:  { ...typography.h3, fontSize: 15, letterSpacing: 0.5, marginTop: 2 },
  progressBarBg: { width: '100%', height: 5, backgroundColor: colors.surfaceAlt, borderRadius: 3, marginTop: spacing.md, overflow: 'hidden' },
  progressBarFill:{ height: 5, borderRadius: 3 },
  dots:     { flexDirection: 'row', gap: spacing.sm, marginTop: spacing.sm },
  dot:      { width: 8, height: 8, borderRadius: 4, backgroundColor: colors.lineBright },
  dotDone:  { backgroundColor: colors.success },
  dotActive:{ backgroundColor: colors.accent, width: 22 },

  bottomHud:     { position: 'absolute', bottom: spacing.lg, left: spacing.md, right: spacing.md, backgroundColor: 'rgba(8, 12, 20, 0.90)', borderRadius: borderRadius.md, padding: spacing.md, flexDirection: 'row', alignItems: 'center', gap: spacing.sm, borderWidth: 1, borderColor: colors.lineBright },
  bottomHudWarn: { borderColor: colors.danger },
  faceDot:       { width: 8, height: 8, borderRadius: 4 },
  bottomHudText: { fontFamily: MONO, fontSize: 12, color: colors.textDim },

  readyPanel: { backgroundColor: colors.surface, borderTopLeftRadius: borderRadius.xl, borderTopRightRadius: borderRadius.xl, padding: spacing.xl, borderTopWidth: 1, borderTopColor: colors.line, ...shadows.lg },
  readyHandle: { width: 36, height: 4, borderRadius: 2, backgroundColor: colors.lineBright, alignSelf: 'center', marginBottom: spacing.md },
  readyTitle: { ...typography.h2, textAlign: 'center', letterSpacing: 1.5 },
  readySub:   { ...typography.bodySmall, textAlign: 'center', marginTop: spacing.xs, color: colors.textDim },
  previewList:{ marginTop: spacing.md },
  previewRow: { flexDirection: 'row', alignItems: 'center', paddingVertical: spacing.xs + 2, gap: spacing.md },
  previewNum: { width: 24, height: 24, borderRadius: 12, backgroundColor: colors.accentDim, alignItems: 'center', justifyContent: 'center', borderWidth: 1, borderColor: colors.accent },
  previewNumText:{ fontSize: 11, fontWeight: '800', color: colors.accent },
  previewGlyph: { fontSize: 18, color: colors.accent },
  previewText:  { ...typography.body, flex: 1, fontSize: 13.5 },
  startBtn:     { backgroundColor: colors.accent, paddingVertical: spacing.md + 2, borderRadius: borderRadius.md, alignItems: 'center', marginTop: spacing.lg, ...shadows.glowAccent },
  startBtnText: { ...typography.button, color: colors.onAccent, fontSize: 15 },

  resultCircle:{ width: 88, height: 88, borderRadius: 44, borderWidth: 3, alignItems: 'center', justifyContent: 'center', ...shadows.glowSuccess },
  resultGlyph: { fontSize: 44, fontWeight: '900' },
  resultTitle: { fontSize: 18, fontWeight: '800', marginTop: spacing.lg, letterSpacing: 2 },
  resultName:  { ...typography.h1, marginTop: spacing.xs, textAlign: 'center' },
  monoText:    { fontFamily: MONO, fontSize: 12.5, color: colors.textDim, marginTop: spacing.xs, textAlign: 'center' },

  scoreSection:{ width: '100%', marginTop: spacing.lg, backgroundColor: colors.surface, padding: spacing.md, borderRadius: borderRadius.md, borderWidth: 1, borderColor: colors.line },
  scoreRow:    { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  scoreLabel:  { fontFamily: MONO, fontSize: 10, color: colors.textFaint, letterSpacing: 1, fontWeight: '700' },
  scoreValue:  { fontFamily: MONO, fontSize: 18, fontWeight: '800' },
  scoreBarBg:  { height: 8, backgroundColor: colors.surfaceAlt, borderRadius: 4, marginTop: spacing.xs, overflow: 'visible', position: 'relative' },
  scoreBarFill:{ height: 8, borderRadius: 4 },
  thresholdMark:{ position: 'absolute', top: -3, width: 2, height: 14, backgroundColor: colors.text },
  scoreHint:   { fontFamily: MONO, fontSize: 10, color: colors.textFaint, marginTop: spacing.xs },

  verifyGrid:  { flexDirection: 'row', gap: spacing.xs, marginTop: spacing.md, flexWrap: 'wrap', justifyContent: 'center' },
  verifyBadge: { borderWidth: 1, paddingHorizontal: spacing.sm + 2, paddingVertical: 4, borderRadius: borderRadius.sm, flexDirection: 'row', alignItems: 'center', gap: spacing.xs },
  verifyIcon:  { fontSize: 11, fontWeight: '800' },
  verifyText:  { fontSize: 9.5, fontWeight: '800', letterSpacing: 0.5 },

  attendBadge: { marginTop: spacing.md, backgroundColor: colors.accentDim, paddingHorizontal: spacing.lg, paddingVertical: spacing.sm, borderRadius: borderRadius.full, borderWidth: 1, borderColor: colors.accent },
  attendText:  { fontSize: 11.5, fontWeight: '800', color: colors.accent, letterSpacing: 0.8 },
  geoText:     { fontFamily: MONO, fontSize: 11.5, color: colors.textDim, marginTop: spacing.xs },

  lockTimer:   { fontSize: 52, fontWeight: '800', fontFamily: MONO, marginTop: spacing.lg },
  btn:         { backgroundColor: colors.accent, paddingVertical: spacing.md + 2, paddingHorizontal: spacing.xxl, borderRadius: borderRadius.md, width: '100%', alignItems: 'center', ...shadows.glowAccent },
  btnText:     { ...typography.button, color: colors.onAccent },
  btnOutline:  { borderWidth: 1.5, borderColor: colors.lineBright, paddingVertical: spacing.md, paddingHorizontal: spacing.xxl, borderRadius: borderRadius.md, width: '100%', alignItems: 'center', backgroundColor: colors.surface },
  btnOutlineText:{ ...typography.button, color: colors.textDim },
});
