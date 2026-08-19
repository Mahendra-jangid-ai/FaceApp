import React, { useCallback, useEffect, useRef, useState } from 'react';
import {
  View, Text, StyleSheet, TouchableOpacity, TextInput, Alert,
  ActivityIndicator, KeyboardAvoidingView, Platform, ScrollView, NativeModules,
} from 'react-native';
import { Camera, useCameraDevice, useCameraPermission, usePhotoOutput } from 'react-native-vision-camera';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import { colors, spacing, borderRadius, typography, shadows, MONO } from '../theme';
import { detectFace, getFaceEmbeddingWithMethod } from '../services/faceProcessor';
import { saveUser, getEnrolledUsers } from '../services/database';
import { checkDuplicateEnrollment, prepareEmbeddingForStorage } from '../services/embeddingUtils';
import { checkFaceQuality, getQualityFeedback } from '../services/qualityGate';
import { validateAadhar } from '../services/aadharValidator';
import type { RootStackParamList, EnrolledUser, AssignedLocation } from '../types';

type Props = NativeStackScreenProps<RootStackParamList, 'Enroll'>;
// Step flow: camera -> details -> location -> done
type Step = 'camera' | 'details' | 'location' | 'done';

export default function EnrollScreen({ navigation, route }: Props) {
  const role = route.params?.role || 'worker';
  const [cameraPosition, setCameraPosition] = useState<'front' | 'back'>('front');
  const frontDevice = useCameraDevice('front');
  const backDevice = useCameraDevice('back');
  const device = cameraPosition === 'front' ? (frontDevice ?? backDevice) : (backDevice ?? frontDevice);
  const { hasPermission, requestPermission } = useCameraPermission();
  const photoOutput = usePhotoOutput({});

  const [step, setStep] = useState<Step>('camera');
  const [processing, setProcessing] = useState(false);
  const [photoPath, setPhotoPath] = useState('');
  const [embedding, setEmbedding] = useState<number[]>([]);
  const [bioHashStr, setBioHashStr] = useState('');
  const [bioHashSalt, setBioHashSalt] = useState('');

  // Worker Details
  const [name, setName] = useState('');
  const [employeeId, setEmployeeId] = useState('');
  const [department, setDepartment] = useState('');
  const [aadhar, setAadhar] = useState('');
  const [aadharError, setAadharError] = useState('');

  // Biometric metadata
  const [faceStatus, setFaceStatus] = useState('Position face inside oval');
  const [modelReady, setModelReady] = useState(false);
  const [embeddingDims, setEmbeddingDims] = useState(0);
  const [processTimeMs, setProcessTimeMs] = useState(0);

  // Location assignment
  const [assignedLocation, setAssignedLocation] = useState<AssignedLocation | null>(null);

  useEffect(() => {
    if (!NativeModules.FaceProcessor) {
      Alert.alert('Engine Error', 'FaceProcessor native module not loaded.');
    } else {
      setModelReady(true);
    }
  }, []);

  const captureAndProcess = useCallback(async () => {
    if (!photoOutput || processing) return;
    const t0 = Date.now();
    setProcessing(true);
    setFaceStatus('Capturing photo...');
    try {
      const photoFile = await photoOutput.capturePhotoToFile({ flashMode: 'off' }, {});
      if (!photoFile?.filePath) { setProcessing(false); setFaceStatus('Capture failed'); return; }
      const filePath = photoFile.filePath.startsWith('/') ? photoFile.filePath : `/${photoFile.filePath}`;

      setFaceStatus('Detecting face...');
      const face = await detectFace(filePath);
      if (!face.found) {
        setFaceStatus('No face found — adjust position');
        Alert.alert('No Face Detected', 'Ensure good lighting, center your face, and look directly at the camera.');
        setProcessing(false); return;
      }

      const quality = checkFaceQuality(face);
      if (!quality.passed) {
        setFaceStatus(getQualityFeedback(quality));
        Alert.alert('Quality Check Failed', quality.reasons.join('\n'));
        setProcessing(false); return;
      }

      setFaceStatus('Vectorizing face...');
      let emb: number[];
      let method: 'onnx' | 'landmark' = 'onnx';
      try {
        const embResult = await getFaceEmbeddingWithMethod(filePath);
        emb = embResult.embedding;
        method = embResult.method;
      } catch (e: any) {
        Alert.alert('Error', e?.message || 'Failed to extract face features');
        setProcessing(false); setFaceStatus('Failed — try again'); return;
      }
      if (!emb || emb.length === 0) { setProcessing(false); return; }
      setEmbeddingDims(emb.length);

      setFaceStatus('Checking duplicates...');
      const existing = await getEnrolledUsers();
      const dup = checkDuplicateEnrollment(emb, existing.map(u => ({ id: u.id, name: u.name, embedding: u.embedding })), method);
      if (dup) {
        Alert.alert('Duplicate Found', `Face matches "${dup.name}" (${(dup.score * 100).toFixed(0)}% similarity).`);
        setProcessing(false); setFaceStatus('Duplicate — already enrolled'); return;
      }

      setFaceStatus('Securing template...');
      const { embedding: priv, hash, salt } = prepareEmbeddingForStorage(emb);
      setPhotoPath(filePath); setEmbedding(priv); setBioHashStr(hash); setBioHashSalt(salt);
      setProcessTimeMs(Date.now() - t0);
      setStep('details');
    } catch (e: any) {
      Alert.alert('Error', e.message || 'Unknown error');
      setFaceStatus('Error — try again');
    }
    setProcessing(false);
  }, [processing, photoOutput]);

  const handleAadharChange = (text: string) => {
    setAadhar(text);
    if (text.replace(/[\s-]/g, '').length === 12) {
      const r = validateAadhar(text);
      setAadharError(r.valid ? '' : r.error || 'Invalid');
      if (r.valid) setAadhar(r.formatted);
    } else { setAadharError(''); }
  };

  const handleDetailsNext = () => {
    if (!name.trim()) { Alert.alert('Required', 'Please enter full name'); return; }
    if (!employeeId.trim()) { Alert.alert('Required', 'Please enter Employee ID'); return; }
    if (aadhar.trim()) { const r = validateAadhar(aadhar); if (!r.valid) { Alert.alert('Invalid Aadhaar', r.error || ''); return; } }
    setStep('location');
  };

  const openLocationPicker = () => {
    navigation.navigate('LocationPicker', {
      workerName: name.trim(),
      onConfirm: (loc: AssignedLocation) => {
        setAssignedLocation(loc);
      },
    });
  };

  const handleSave = useCallback(async () => {
    if (!assignedLocation) {
      Alert.alert('Location Required', 'Please assign a work location before saving. This is needed to verify attendance boundary.');
      return;
    }
    const user: EnrolledUser = {
      id: `${role}-` + Date.now().toString(36) + Math.random().toString(36).slice(2, 8),
      name: name.trim(),
      employeeId: employeeId.trim(),
      aadhar: aadhar.trim() || undefined,
      embedding,
      bioHash: bioHashStr,
      bioHashSalt,
      photoUri: photoPath,
      createdAt: Date.now(),
      synced: false,
      role,
      assignedLocation,
    };
    await saveUser(user);
    setStep('done');
  }, [name, employeeId, aadhar, embedding, photoPath, bioHashStr, bioHashSalt, role, assignedLocation]);

  /* ── Permission gate ──────────────────────────────────────────────── */
  if (!hasPermission) return (
    <View style={s.center}>
      <Text style={s.permIcon}>📷</Text>
      <Text style={s.centerTitle}>Camera Permission Required</Text>
      <Text style={s.permSub}>Face enrolment needs camera access.</Text>
      <TouchableOpacity style={s.btn} onPress={requestPermission} activeOpacity={0.85}>
        <Text style={s.btnText}>Grant Permission</Text>
      </TouchableOpacity>
    </View>
  );

  if (!device) return <View style={s.center}><Text style={s.centerTitle}>No camera found</Text></View>;

  /* ── SUCCESS ─────────────────────────────────────────────────────── */
  if (step === 'done') return (
    <View style={s.center}>
      <View style={[s.doneCircle, { borderColor: colors.success, backgroundColor: colors.successDim }]}>
        <Text style={[s.doneGlyph, { color: colors.success }]}>✓</Text>
      </View>
      <Text style={[s.doneTitle, { color: colors.success }]}>Enrolment Complete</Text>
      <Text style={s.doneName}>{name}</Text>
      <Text style={s.doneId}>{employeeId}</Text>

      {/* Location Summary */}
      <View style={s.doneSummaryCard}>
        <Text style={s.doneSummaryTitle}>📍 Work Zone Assigned</Text>
        <Text style={s.doneSummaryText}>{assignedLocation?.label}</Text>
        <Text style={s.doneSummaryDetail}>
          {assignedLocation?.radiusMeters}m radius ·{' '}
          {assignedLocation?.latitude.toFixed(5)}, {assignedLocation?.longitude.toFixed(5)}
        </Text>
      </View>

      <View style={s.doneStats}>
        <Text style={s.doneStat}>Vector: {embeddingDims}D · {processTimeMs}ms · BioHash Protected</Text>
      </View>

      <TouchableOpacity style={[s.btn, { marginTop: spacing.xl }]} onPress={() => navigation.goBack()} activeOpacity={0.85}>
        <Text style={s.btnText}>Done</Text>
      </TouchableOpacity>

      <TouchableOpacity
        style={[s.btnOutline, { marginTop: spacing.md }]}
        onPress={() => {
          setStep('camera'); setName(''); setEmployeeId(''); setDepartment('');
          setAadhar(''); setEmbedding([]); setAssignedLocation(null);
          setFaceStatus('Position face inside oval');
        }}
        activeOpacity={0.85}>
        <Text style={s.btnOutlineText}>Enrol Another Worker</Text>
      </TouchableOpacity>
    </View>
  );

  /* ── LOCATION STEP ─────────────────────────────────────────────── */
  if (step === 'location') return (
    <ScrollView contentContainerStyle={[s.form, { backgroundColor: colors.bg }]} showsVerticalScrollIndicator={false}>
      {/* Step indicator */}
      <View style={s.stepRow}>
        {['Face', 'Details', 'Location', 'Save'].map((label, i) => (
          <React.Fragment key={i}>
            <View style={[s.stepDot, i <= 2 && s.stepDotActive]}>
              <Text style={[s.stepDotText, i <= 2 && s.stepDotTextActive]}>{i + 1}</Text>
            </View>
            {i < 3 && <View style={[s.stepLine, i < 2 && s.stepLineActive]} />}
          </React.Fragment>
        ))}
      </View>

      <Text style={s.formTitle}>Assign Work Location</Text>
      <Text style={s.formSub}>Worker <Text style={{ fontWeight: '700' }}>{name}</Text> will only be able to mark attendance within this zone.</Text>

      {/* Current selection display */}
      {assignedLocation ? (
        <View style={s.locationAssigned}>
          <View style={s.locationAssignedTop}>
            <Text style={s.locationAssignedIcon}>📍</Text>
            <View style={{ flex: 1 }}>
              <Text style={s.locationAssignedLabel}>{assignedLocation.label}</Text>
              <Text style={s.locationAssignedCoords}>
                {assignedLocation.latitude.toFixed(5)}, {assignedLocation.longitude.toFixed(5)}
              </Text>
            </View>
            <View style={s.radiusBadge}>
              <Text style={s.radiusBadgeText}>{assignedLocation.radiusMeters}m</Text>
            </View>
          </View>
          <View style={s.locationAssignedCheck}>
            <Text style={s.locationAssignedCheckText}>✓ Location configured. Worker must be within {assignedLocation.radiusMeters}m to mark attendance.</Text>
          </View>
        </View>
      ) : (
        <View style={s.locationEmptyBox}>
          <Text style={s.locationEmptyIcon}>🗺️</Text>
          <Text style={s.locationEmptyText}>No location assigned yet</Text>
          <Text style={s.locationEmptySubtext}>Tap below to open the map and pin a work site.</Text>
        </View>
      )}

      {/* Open Map Button */}
      <TouchableOpacity style={s.openMapBtn} onPress={openLocationPicker} activeOpacity={0.85}>
        <Text style={s.openMapBtnText}>{assignedLocation ? '🗺️ Change Location on Map' : '🗺️ Open Map & Select Location'}</Text>
      </TouchableOpacity>

      {/* Info box */}
      <View style={s.infoBox}>
        <Text style={s.infoBoxTitle}>🔒 How Location-Based Attendance Works</Text>
        <Text style={s.infoBoxText}>
          Every time this worker scans their face, the app will check their real-time GPS position.{'\n\n'}
          If they are outside the assigned boundary, attendance will be <Text style={{ fontWeight: '700', color: colors.danger }}>blocked</Text> and they will see the exact distance they need to cover to get inside the zone.
        </Text>
      </View>

      <TouchableOpacity
        style={[s.btn, !assignedLocation && { backgroundColor: '#CBD5E1' }]}
        onPress={handleSave}
        disabled={!assignedLocation}
        activeOpacity={0.85}>
        <Text style={s.btnText}>
          {assignedLocation ? 'Save Worker Profile' : 'Select a Location First'}
        </Text>
      </TouchableOpacity>

      <TouchableOpacity
        style={[s.btnOutline, { marginTop: spacing.md }]}
        onPress={() => setStep('details')}
        activeOpacity={0.85}>
        <Text style={s.btnOutlineText}>← Back to Details</Text>
      </TouchableOpacity>

      <View style={{ height: spacing.xxl }} />
    </ScrollView>
  );

  /* ── DETAILS STEP ─────────────────────────────────────────────── */
  if (step === 'details') return (
    <KeyboardAvoidingView style={s.root} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
      <ScrollView contentContainerStyle={s.form} showsVerticalScrollIndicator={false}>
        {/* Step indicator */}
        <View style={s.stepRow}>
          {['Face', 'Details', 'Location', 'Save'].map((label, i) => (
            <React.Fragment key={i}>
              <View style={[s.stepDot, i <= 1 && s.stepDotActive]}>
                <Text style={[s.stepDotText, i <= 1 && s.stepDotTextActive]}>{i + 1}</Text>
              </View>
              {i < 3 && <View style={[s.stepLine, i < 1 && s.stepLineActive]} />}
            </React.Fragment>
          ))}
        </View>

        <Text style={s.formTitle}>Worker Information</Text>
        <Text style={s.formSub}>Face biometric captured ({embeddingDims}D vector · {processTimeMs}ms)</Text>

        {[
          { label: 'Full Name *', val: name, set: setName, ph: 'e.g. Rajesh Kumar' },
          { label: 'Employee ID *', val: employeeId, set: setEmployeeId, ph: 'e.g. NHAI-2024-001' },
          { label: 'Department / Section', val: department, set: setDepartment, ph: 'e.g. Highway Division 4' },
        ].map((f, i) => (
          <View key={i} style={s.fieldGroup}>
            <Text style={s.fieldLabel}>{f.label}</Text>
            <TextInput
              style={s.input}
              value={f.val}
              onChangeText={f.set}
              placeholder={f.ph}
              placeholderTextColor={colors.textFaint}
            />
          </View>
        ))}

        <View style={s.fieldGroup}>
          <Text style={s.fieldLabel}>Aadhaar Number (Optional)</Text>
          <TextInput
            style={[s.input, aadharError ? s.inputErr : null]}
            value={aadhar}
            onChangeText={handleAadharChange}
            placeholder="XXXX XXXX XXXX"
            placeholderTextColor={colors.textFaint}
            keyboardType="number-pad"
            maxLength={14}
          />
          {aadharError ? <Text style={s.errText}>{aadharError}</Text> : null}
        </View>

        <TouchableOpacity style={s.btn} onPress={handleDetailsNext} activeOpacity={0.85}>
          <Text style={s.btnText}>Next: Assign Work Location →</Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[s.btnOutline, { marginTop: spacing.md }]}
          onPress={() => { setStep('camera'); setFaceStatus('Position face inside oval'); }}
          activeOpacity={0.85}>
          <Text style={s.btnOutlineText}>Retake Photo</Text>
        </TouchableOpacity>

        <View style={{ height: spacing.xxl }} />
      </ScrollView>
    </KeyboardAvoidingView>
  );

  /* ── CAMERA STEP ─────────────────────────────────────────────── */
  return (
    <View style={s.root}>
      <View style={s.cameraWrap}>
        <Camera style={StyleSheet.absoluteFill} device={device} isActive={step === 'camera'} outputs={[photoOutput]} />

        {/* Oval Target Frame */}
        <View style={s.ovalWrap}>
          <View style={s.oval} />
        </View>

        {/* Live Status Hint */}
        <View style={s.hintWrap}>
          <View style={s.hintPill}>
            <Text style={s.hint}>{faceStatus}</Text>
          </View>
        </View>

        {/* Step label */}
        <View style={s.stepLabel}>
          <Text style={s.stepLabelText}>Step 1 of 3: Capture Face</Text>
        </View>

        {/* Camera Flip Button */}
        <TouchableOpacity style={s.flipBtn} onPress={() => setCameraPosition(p => p === 'front' ? 'back' : 'front')} activeOpacity={0.75}>
          <Text style={s.flipText}>🔄 {cameraPosition === 'front' ? 'Front' : 'Back'}</Text>
        </TouchableOpacity>

        {/* Engine status */}
        <View style={s.modelStatus}>
          <View style={[s.modelDot, { backgroundColor: modelReady ? colors.success : colors.warn }]} />
          <Text style={s.modelText}>{modelReady ? 'Engine Ready' : 'Loading...'}</Text>
        </View>
      </View>

      {/* Bottom Capture Panel */}
      <View style={s.bottomPanel}>
        <TouchableOpacity
          style={[s.captureBtn, processing && s.captureBtnOff]}
          onPress={captureAndProcess}
          disabled={processing}
          activeOpacity={0.8}>
          {processing ? (
            <ActivityIndicator color={colors.accent} size="large" />
          ) : (
            <View style={s.captureInner} />
          )}
        </TouchableOpacity>
        <Text style={s.captureHint}>
          {processing ? 'Processing face...' : 'Hold steady & tap to capture'}
        </Text>
      </View>
    </View>
  );
}

const OVAL = 230;
const s = StyleSheet.create({
  root: { flex: 1, backgroundColor: colors.bg },
  center: { flex: 1, backgroundColor: colors.bg, alignItems: 'center', justifyContent: 'center', padding: spacing.xl },
  permIcon: { fontSize: 44, marginBottom: spacing.md },
  centerTitle: { fontSize: 20, fontWeight: '700', textAlign: 'center', color: colors.text },
  permSub: { fontSize: 13, textAlign: 'center', marginTop: spacing.sm, maxWidth: 280, color: colors.textDim },

  cameraWrap: { flex: 1 },
  ovalWrap: { position: 'absolute', left: 0, right: 0, top: 0, bottom: 0, alignItems: 'center', justifyContent: 'center' },
  oval: {
    width: OVAL, height: OVAL * 1.35, borderRadius: OVAL * 0.67,
    borderWidth: 2, borderColor: '#FFFFFF', borderStyle: 'dashed',
    backgroundColor: 'rgba(0, 0, 0, 0.1)',
  },
  hintWrap: { position: 'absolute', top: spacing.xxl, left: 0, right: 0, alignItems: 'center' },
  hintPill: {
    backgroundColor: 'rgba(15, 23, 42, 0.85)',
    paddingHorizontal: spacing.lg, paddingVertical: spacing.sm,
    borderRadius: borderRadius.full,
  },
  hint: { fontSize: 13, fontWeight: '700', color: '#FFFFFF' },
  stepLabel: {
    position: 'absolute', top: spacing.xxl + 48, left: 0, right: 0, alignItems: 'center',
  },
  stepLabelText: {
    backgroundColor: 'rgba(234, 88, 12, 0.85)',
    paddingHorizontal: spacing.md, paddingVertical: 4,
    borderRadius: borderRadius.full, fontSize: 11, fontWeight: '700', color: '#FFFFFF',
  },
  flipBtn: {
    position: 'absolute', top: spacing.xxl, right: spacing.lg,
    backgroundColor: 'rgba(15, 23, 42, 0.8)', borderRadius: borderRadius.full,
    paddingHorizontal: spacing.md, paddingVertical: 6,
  },
  flipText: { fontSize: 12, fontWeight: '700', color: '#FFFFFF' },
  modelStatus: {
    position: 'absolute', bottom: spacing.md, left: spacing.lg,
    flexDirection: 'row', alignItems: 'center', gap: spacing.xs,
    backgroundColor: 'rgba(15, 23, 42, 0.8)', paddingHorizontal: spacing.md,
    paddingVertical: 4, borderRadius: borderRadius.full,
  },
  modelDot: { width: 6, height: 6, borderRadius: 3 },
  modelText: { fontFamily: MONO, fontSize: 11, color: '#FFFFFF' },

  bottomPanel: {
    backgroundColor: '#FFFFFF', paddingVertical: spacing.lg,
    alignItems: 'center', borderTopWidth: 1, borderTopColor: colors.line,
  },
  captureBtn: {
    width: 72, height: 72, borderRadius: 36,
    backgroundColor: '#FFFFFF', alignItems: 'center', justifyContent: 'center',
    borderWidth: 4, borderColor: colors.accent, ...shadows.sm,
  },
  captureBtnOff: { opacity: 0.4 },
  captureInner: { width: 52, height: 52, borderRadius: 26, backgroundColor: colors.accent },
  captureHint: { fontSize: 12, fontWeight: '600', color: colors.textDim, marginTop: spacing.sm },

  form: { flexGrow: 1, backgroundColor: colors.bg, padding: spacing.xl },
  formTitle: { fontSize: 20, fontWeight: '800', textAlign: 'center', color: colors.text, marginBottom: 4 },
  formSub: { fontSize: 12, textAlign: 'center', color: colors.textDim, marginBottom: spacing.md },

  /* Step progress indicators */
  stepRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', marginBottom: spacing.lg },
  stepDot: {
    width: 28, height: 28, borderRadius: 14, borderWidth: 2, borderColor: colors.line,
    alignItems: 'center', justifyContent: 'center', backgroundColor: '#FFFFFF',
  },
  stepDotActive: { borderColor: colors.accent, backgroundColor: colors.accent },
  stepDotText: { fontSize: 12, fontWeight: '700', color: colors.textDim },
  stepDotTextActive: { color: '#FFFFFF' },
  stepLine: { flex: 1, height: 2, backgroundColor: colors.line, marginHorizontal: 2, maxWidth: 40 },
  stepLineActive: { backgroundColor: colors.accent },

  fieldGroup: { width: '100%', marginTop: spacing.md },
  fieldLabel: { fontSize: 12, fontWeight: '700', color: colors.text, marginBottom: 4 },
  input: {
    backgroundColor: '#FFFFFF', borderWidth: 1, borderColor: colors.line,
    borderRadius: borderRadius.md, padding: spacing.md, fontSize: 14.5, color: colors.text,
  },
  inputErr: { borderColor: colors.danger },
  errText: { fontSize: 12, color: colors.danger, marginTop: spacing.xs },

  /* Location assignment UI */
  locationAssigned: {
    backgroundColor: '#FFFFFF', borderRadius: borderRadius.md,
    borderWidth: 1, borderColor: '#BBF7D0', marginTop: spacing.md, overflow: 'hidden',
    ...shadows.sm,
  },
  locationAssignedTop: {
    flexDirection: 'row', alignItems: 'center', padding: spacing.md, gap: spacing.sm,
  },
  locationAssignedIcon: { fontSize: 24 },
  locationAssignedLabel: { fontSize: 14, fontWeight: '700', color: colors.text },
  locationAssignedCoords: { fontFamily: MONO, fontSize: 11, color: colors.textDim, marginTop: 2 },
  radiusBadge: {
    backgroundColor: colors.accentDim, paddingHorizontal: spacing.sm, paddingVertical: 4,
    borderRadius: borderRadius.xs, borderWidth: 1, borderColor: '#FED7AA',
  },
  radiusBadgeText: { fontSize: 12, fontWeight: '800', color: colors.accent },
  locationAssignedCheck: {
    backgroundColor: colors.successDim, paddingHorizontal: spacing.md, paddingVertical: spacing.sm,
    borderTopWidth: 1, borderTopColor: '#BBF7D0',
  },
  locationAssignedCheckText: { fontSize: 12, color: colors.success, fontWeight: '600' },

  locationEmptyBox: {
    backgroundColor: '#FFFFFF', borderRadius: borderRadius.md, borderWidth: 1,
    borderColor: colors.line, borderStyle: 'dashed', padding: spacing.xl,
    alignItems: 'center', marginTop: spacing.md,
  },
  locationEmptyIcon: { fontSize: 36, marginBottom: spacing.sm },
  locationEmptyText: { fontSize: 15, fontWeight: '700', color: colors.text },
  locationEmptySubtext: { fontSize: 12, color: colors.textDim, textAlign: 'center', marginTop: 4 },

  openMapBtn: {
    backgroundColor: colors.cyanDim, padding: spacing.md, borderRadius: borderRadius.md,
    alignItems: 'center', marginTop: spacing.md, borderWidth: 1, borderColor: '#BAE6FD',
  },
  openMapBtnText: { fontSize: 14, fontWeight: '700', color: colors.cyan },

  infoBox: {
    backgroundColor: '#FFFBF7', borderRadius: borderRadius.md, padding: spacing.md,
    marginTop: spacing.md, borderWidth: 1, borderColor: '#FED7AA',
  },
  infoBoxTitle: { fontSize: 12.5, fontWeight: '700', color: colors.accent },
  infoBoxText: { fontSize: 12, color: colors.textDim, marginTop: 4, lineHeight: 18 },

  /* Done screen */
  doneCircle: { width: 80, height: 80, borderRadius: 40, borderWidth: 3, alignItems: 'center', justifyContent: 'center' },
  doneGlyph: { fontSize: 36, fontWeight: '800' },
  doneTitle: { fontSize: 20, fontWeight: '800', marginTop: spacing.lg },
  doneName: { fontSize: 22, fontWeight: '800', color: colors.text, marginTop: spacing.xs, textAlign: 'center' },
  doneId: { fontFamily: MONO, fontSize: 13, color: colors.textDim, marginTop: 2 },
  doneSummaryCard: {
    backgroundColor: '#FFFFFF', borderRadius: borderRadius.md, padding: spacing.md,
    marginTop: spacing.lg, borderWidth: 1, borderColor: '#BBF7D0', width: '100%',
    ...shadows.sm,
  },
  doneSummaryTitle: { fontSize: 12.5, fontWeight: '700', color: colors.success },
  doneSummaryText: { fontSize: 14, fontWeight: '700', color: colors.text, marginTop: 4 },
  doneSummaryDetail: { fontFamily: MONO, fontSize: 11, color: colors.textDim, marginTop: 2 },
  doneStats: {
    marginTop: spacing.md, backgroundColor: '#FFFFFF', borderRadius: borderRadius.md,
    paddingVertical: spacing.sm, paddingHorizontal: spacing.md, borderWidth: 1, borderColor: colors.line,
  },
  doneStat: { fontSize: 12, color: colors.textDim, textAlign: 'center', fontWeight: '500' },

  btn: { backgroundColor: colors.accent, paddingVertical: spacing.md, paddingHorizontal: spacing.xxl, borderRadius: borderRadius.md, width: '100%', alignItems: 'center', marginTop: spacing.xl, ...shadows.sm },
  btnText: { ...typography.button, color: colors.onAccent },
  btnOutline: { borderWidth: 1, borderColor: colors.lineBright, paddingVertical: spacing.md, paddingHorizontal: spacing.xxl, borderRadius: borderRadius.md, width: '100%', alignItems: 'center', backgroundColor: '#FFFFFF' },
  btnOutlineText: { ...typography.button, color: colors.textDim },
});
