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
import { checkDuplicateEnrollment, prepareEmbeddingForStorage, MATCH_THRESHOLD, DUPLICATE_THRESHOLD } from '../services/embeddingUtils';
import { checkFaceQuality, getQualityFeedback } from '../services/qualityGate';
import { validateAadhar, maskAadhar } from '../services/aadharValidator';
import type { RootStackParamList, EnrolledUser } from '../types';

type Props = NativeStackScreenProps<RootStackParamList, 'Enroll'>;
type Step = 'camera' | 'details' | 'done';

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
  const [name, setName] = useState('');
  const [employeeId, setEmployeeId] = useState('');
  const [department, setDepartment] = useState('');
  const [aadhar, setAadhar] = useState('');
  const [aadharError, setAadharError] = useState('');
  const [faceStatus, setFaceStatus] = useState('POSITION FACE IN OVAL');
  const [modelReady, setModelReady] = useState(false);
  const [embeddingDims, setEmbeddingDims] = useState(0);
  const [processTimeMs, setProcessTimeMs] = useState(0);

  const [modelMethod, setModelMethod] = useState('');

  useEffect(() => {
    if (!NativeModules.FaceProcessor) {
      Alert.alert('ERROR', 'FaceProcessor native module not loaded.');
    } else {
      setModelReady(true);
    }
  }, []);

  const captureAndProcess = useCallback(async () => {
    if (!photoOutput || processing) return;
    const t0 = Date.now();
    setProcessing(true);
    setFaceStatus('CAPTURING...');
    try {
      const photoFile = await photoOutput.capturePhotoToFile({ flashMode: 'off' }, {});
      if (!photoFile?.filePath) { setProcessing(false); setFaceStatus('CAPTURE FAILED'); return; }
      const filePath = photoFile.filePath.startsWith('/') ? photoFile.filePath : `/${photoFile.filePath}`;

      setFaceStatus('DETECTING FACE...');
      const face = await detectFace(filePath);
      if (!face.found) {
        setFaceStatus('NO FACE — ADJUST POSITION');
        Alert.alert('NO FACE DETECTED', 'Ensure good lighting, face centered, hold steady.');
        setProcessing(false); return;
      }

      const quality = checkFaceQuality(face);
      if (!quality.passed) {
        setFaceStatus(getQualityFeedback(quality).toUpperCase());
        Alert.alert('POOR QUALITY', quality.reasons.join('\n'));
        setProcessing(false); return;
      }

      setFaceStatus('GENERATING EMBEDDING...');
      let emb: number[];
      let method: 'onnx' | 'landmark' = 'onnx';
      try {
        const embResult = await getFaceEmbeddingWithMethod(filePath);
        emb = embResult.embedding;
        method = embResult.method;
        setModelMethod(embResult.method);
      } catch (e: any) {
        Alert.alert('EMBEDDING ERROR', e?.message || 'Unknown');
        setProcessing(false); setFaceStatus('FAILED — RETRY'); return;
      }
      if (!emb || emb.length === 0) { setProcessing(false); return; }
      setEmbeddingDims(emb.length);

      setFaceStatus('CHECKING DUPLICATES...');
      const existing = await getEnrolledUsers();
      const dup = checkDuplicateEnrollment(emb, existing.map(u => ({ id: u.id, name: u.name, embedding: u.embedding })), method);
      if (dup) {
        Alert.alert('DUPLICATE', `Matches "${dup.name}" at ${(dup.score * 100).toFixed(1)}%`);
        setProcessing(false); setFaceStatus('DUPLICATE — TRY DIFFERENT PERSON'); return;
      }

      setFaceStatus('SECURING TEMPLATE...');
      const { embedding: priv, hash, salt } = prepareEmbeddingForStorage(emb);
      setPhotoPath(filePath); setEmbedding(priv); setBioHashStr(hash); setBioHashSalt(salt);
      setProcessTimeMs(Date.now() - t0);
      setStep('details');
    } catch (e: any) {
      Alert.alert('ERROR', e.message || 'Unknown');
      setFaceStatus('ERROR — RETRY');
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

  const handleSave = useCallback(async () => {
    if (!name.trim()) { Alert.alert('REQUIRED', 'Enter name'); return; }
    if (!employeeId.trim()) { Alert.alert('REQUIRED', 'Enter Employee ID'); return; }
    if (aadhar.trim()) { const r = validateAadhar(aadhar); if (!r.valid) { Alert.alert('INVALID AADHAAR', r.error || ''); return; } }
    const user: EnrolledUser = {
      id: `${role}-` + Date.now().toString(36) + Math.random().toString(36).slice(2, 8),
      name: name.trim(), employeeId: employeeId.trim(), aadhar: aadhar.trim() || undefined,
      embedding, bioHash: bioHashStr, bioHashSalt, photoUri: photoPath,
      createdAt: Date.now(), synced: false, role,
    };
    await saveUser(user);
    setStep('done');
  }, [name, employeeId, aadhar, embedding, photoPath, bioHashStr, bioHashSalt, role]);

  if (!hasPermission) return (
    <View style={s.center}>
      <Text style={s.centerIcon}>{'◎'}</Text>
      <Text style={s.centerTitle}>CAMERA REQUIRED</Text>
      <TouchableOpacity style={s.btn} onPress={requestPermission}><Text style={s.btnText}>GRANT</Text></TouchableOpacity>
    </View>
  );
  if (!device) return <View style={s.center}><Text style={s.centerTitle}>NO CAMERA</Text></View>;

  if (step === 'done') return (
    <View style={s.center}>
      <View style={[s.doneCircle, { borderColor: colors.success }]}><Text style={s.doneGlyph}>{'✓'}</Text></View>
      <Text style={[s.doneTitle, { color: colors.success }]}>ENROLLED</Text>
      <Text style={s.doneName}>{name}</Text>
      <View style={s.doneStats}>
        <Text style={s.doneStat}>{embeddingDims}D {modelMethod || 'embedding'} | {processTimeMs}ms | BioHash secured</Text>
      </View>
      <View style={s.tagRow}>
        {[
          { t: 'BIOHASH', c: colors.cyan },
          { t: 'DIFF PRIVACY', c: colors.success },
          { t: 'AES-256', c: colors.accent },
        ].map((tag, i) => (
          <View key={i} style={[s.tag, { borderColor: tag.c }]}>
            <Text style={[s.tagText, { color: tag.c }]}>{tag.t}</Text>
          </View>
        ))}
      </View>
      <TouchableOpacity style={[s.btn, { marginTop: spacing.xl }]} onPress={() => navigation.goBack()}><Text style={s.btnText}>DONE</Text></TouchableOpacity>
      <TouchableOpacity style={[s.btnOutline, { marginTop: spacing.md }]} onPress={() => { setStep('camera'); setName(''); setEmployeeId(''); setDepartment(''); setAadhar(''); setEmbedding([]); setFaceStatus('POSITION FACE IN OVAL'); }}>
        <Text style={s.btnOutlineText}>ENROL ANOTHER</Text>
      </TouchableOpacity>
    </View>
  );

  if (step === 'details') return (
    <KeyboardAvoidingView style={s.root} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
      <ScrollView contentContainerStyle={s.form}>
        <View style={[s.doneCircle, { borderColor: colors.accent }]}><Text style={[s.doneGlyph, { color: colors.accent }]}>{'◎'}</Text></View>
        <Text style={s.formTitle}>FACE CAPTURED</Text>
        <Text style={s.formSub}>Enter details to complete enrolment</Text>
        <View style={s.captureInfo}>
          <Text style={s.captureInfoText}>{embeddingDims}D vector | {processTimeMs}ms | Dup threshold: {(DUPLICATE_THRESHOLD * 100).toFixed(0)}%</Text>
        </View>
        {[
          { label: 'FULL NAME', val: name, set: setName, ph: 'Rajesh Kumar' },
          { label: 'EMPLOYEE ID', val: employeeId, set: setEmployeeId, ph: 'NHAI-2024-001' },
          { label: 'DEPARTMENT', val: department, set: setDepartment, ph: 'Highway Division' },
        ].map((f, i) => (
          <View key={i} style={s.fieldGroup}>
            <Text style={s.fieldLabel}>{f.label}</Text>
            <TextInput style={s.input} value={f.val} onChangeText={f.set} placeholder={f.ph} placeholderTextColor={colors.textFaint} />
          </View>
        ))}
        <View style={s.fieldGroup}>
          <Text style={s.fieldLabel}>AADHAAR (OPTIONAL)</Text>
          <TextInput style={[s.input, aadharError ? s.inputErr : null]} value={aadhar} onChangeText={handleAadharChange} placeholder="XXXX XXXX XXXX" placeholderTextColor={colors.textFaint} keyboardType="number-pad" maxLength={14} />
          {aadharError ? <Text style={s.errText}>{aadharError}</Text> : null}
        </View>
        <View style={s.secNote}>
          <Text style={s.secNoteTitle}>SECURITY</Text>
          <Text style={s.secNoteText}>BioHash (ISO/IEC 24745) + differential privacy + AES-256. Original embedding irrecoverable.</Text>
        </View>
        <TouchableOpacity style={s.btn} onPress={handleSave}><Text style={s.btnText}>SAVE ENROLMENT</Text></TouchableOpacity>
        <TouchableOpacity style={[s.btnOutline, { marginTop: spacing.md }]} onPress={() => { setStep('camera'); setFaceStatus('POSITION FACE IN OVAL'); }}>
          <Text style={s.btnOutlineText}>RETAKE</Text>
        </TouchableOpacity>
      </ScrollView>
    </KeyboardAvoidingView>
  );

  return (
    <View style={s.root}>
      <View style={s.cameraWrap}>
        <Camera style={StyleSheet.absoluteFill} device={device} isActive={step === 'camera'} outputs={[photoOutput]} />
        <View style={s.ovalWrap}><View style={s.oval} /></View>
        <View style={s.hintWrap}><Text style={s.hint}>{faceStatus}</Text></View>
        <TouchableOpacity style={s.flipBtn} onPress={() => setCameraPosition(p => p === 'front' ? 'back' : 'front')}>
          <Text style={s.flipText}>{cameraPosition === 'front' ? 'FRONT' : 'BACK'}</Text>
        </TouchableOpacity>
        {/* Model status indicator */}
        <View style={s.modelStatus}>
          <View style={[s.modelDot, { backgroundColor: modelReady ? colors.success : colors.warn }]} />
          <Text style={s.modelText}>
            {modelReady
              ? modelMethod === 'landmark' ? 'ML Kit Landmark Ready'
              : modelMethod === 'onnx' ? 'MobileFaceNet ONNX Ready'
              : 'Face Engine Ready'
              : 'Loading...'}
          </Text>
        </View>
      </View>
      <View style={s.bottomPanel}>
        <TouchableOpacity style={[s.captureBtn, processing && s.captureBtnOff]} onPress={captureAndProcess} disabled={processing} activeOpacity={0.7}>
          {processing ? <ActivityIndicator color={colors.onAccent} size="large" /> : <View style={s.captureInner} />}
        </TouchableOpacity>
        <Text style={s.captureHint}>{processing ? 'PROCESSING...' : 'TAP TO CAPTURE'}</Text>
      </View>
    </View>
  );
}

const OVAL = 240;
const s = StyleSheet.create({
  root: { flex: 1, backgroundColor: colors.bg },
  center: { flex: 1, backgroundColor: colors.bg, alignItems: 'center', justifyContent: 'center', padding: spacing.xl },
  centerIcon: { fontSize: 48, color: colors.accent },
  centerTitle: { ...typography.h2, marginTop: spacing.lg, letterSpacing: 2 },
  cameraWrap: { flex: 1 },
  ovalWrap: { position: 'absolute', left: 0, right: 0, top: 0, bottom: 0, alignItems: 'center', justifyContent: 'center' },
  oval: { width: OVAL, height: OVAL * 1.3, borderRadius: OVAL * 0.65, borderWidth: 2, borderColor: colors.accent, borderStyle: 'dashed' },
  hintWrap: { position: 'absolute', top: spacing.xxl, left: 0, right: 0, alignItems: 'center' },
  hint: { ...typography.caption, backgroundColor: 'rgba(10,14,26,0.88)', paddingHorizontal: spacing.lg, paddingVertical: spacing.sm, borderRadius: borderRadius.full, overflow: 'hidden', color: colors.accent },
  flipBtn: { position: 'absolute', top: spacing.xxl, right: spacing.lg, backgroundColor: 'rgba(10,14,26,0.7)', borderRadius: borderRadius.full, paddingHorizontal: spacing.lg, paddingVertical: spacing.sm },
  flipText: { ...typography.caption, color: colors.text },
  modelStatus: {
    position: 'absolute', bottom: spacing.lg, left: spacing.lg,
    flexDirection: 'row', alignItems: 'center', gap: spacing.xs,
    backgroundColor: 'rgba(10,14,26,0.8)', paddingHorizontal: spacing.md,
    paddingVertical: spacing.xs, borderRadius: borderRadius.full,
  },
  modelDot: { width: 6, height: 6, borderRadius: 3 },
  modelText: { fontFamily: MONO, fontSize: 9, color: colors.textDim },
  bottomPanel: { backgroundColor: colors.surface, paddingVertical: spacing.xl, alignItems: 'center', borderTopWidth: 1, borderTopColor: colors.line },
  captureBtn: { width: 72, height: 72, borderRadius: 36, backgroundColor: colors.accent, alignItems: 'center', justifyContent: 'center', borderWidth: 3, borderColor: colors.text },
  captureBtnOff: { opacity: 0.4 },
  captureInner: { width: 56, height: 56, borderRadius: 28, backgroundColor: colors.text },
  captureHint: { ...typography.caption, color: colors.textFaint, marginTop: spacing.sm },

  form: { flexGrow: 1, backgroundColor: colors.bg, padding: spacing.xl, alignItems: 'center' },
  formTitle: { ...typography.h1, letterSpacing: 3, marginTop: spacing.lg },
  formSub: { ...typography.bodySmall, marginTop: spacing.xs },
  captureInfo: {
    marginTop: spacing.md, backgroundColor: colors.surfaceAlt, borderRadius: borderRadius.sm,
    paddingVertical: spacing.xs, paddingHorizontal: spacing.md, borderWidth: 1, borderColor: colors.line,
  },
  captureInfoText: { fontFamily: MONO, fontSize: 10, color: colors.textDim },
  fieldGroup: { width: '100%', marginTop: spacing.lg },
  fieldLabel: { ...typography.caption, color: colors.accent, marginBottom: spacing.xs },
  input: { backgroundColor: colors.surface, borderWidth: 1, borderColor: colors.line, borderRadius: borderRadius.md, padding: spacing.lg, fontSize: 15, color: colors.text, fontFamily: MONO },
  inputErr: { borderColor: colors.danger },
  errText: { ...typography.bodySmall, color: colors.danger, marginTop: spacing.xs },
  secNote: { width: '100%', backgroundColor: colors.accentDim, padding: spacing.lg, borderRadius: borderRadius.md, marginTop: spacing.lg, borderWidth: 1, borderColor: colors.accent },
  secNoteTitle: { ...typography.caption, color: colors.accent },
  secNoteText: { fontFamily: MONO, fontSize: 11, color: colors.textDim, marginTop: spacing.xs, lineHeight: 18 },

  doneCircle: { width: 80, height: 80, borderRadius: 40, borderWidth: 3, alignItems: 'center', justifyContent: 'center' },
  doneGlyph: { fontSize: 36, fontWeight: '700', color: colors.success },
  doneTitle: { fontSize: 24, fontWeight: '800', marginTop: spacing.lg, letterSpacing: 3 },
  doneName: { ...typography.h1, marginTop: spacing.sm },
  doneStats: {
    marginTop: spacing.sm, backgroundColor: colors.surfaceAlt, borderRadius: borderRadius.sm,
    paddingVertical: spacing.xs, paddingHorizontal: spacing.md,
  },
  doneStat: { fontFamily: MONO, fontSize: 10, color: colors.textDim },
  tagRow: { flexDirection: 'row', gap: spacing.sm, marginTop: spacing.lg },
  tag: { borderWidth: 1, paddingHorizontal: spacing.sm, paddingVertical: 3, borderRadius: borderRadius.sm },
  tagText: { fontSize: 10, fontWeight: '700', letterSpacing: 0.5 },

  btn: { backgroundColor: colors.accent, paddingVertical: spacing.lg, paddingHorizontal: spacing.xxl, borderRadius: borderRadius.md, width: '100%', alignItems: 'center', marginTop: spacing.xl, ...shadows.md },
  btnText: { ...typography.button, color: colors.onAccent },
  btnOutline: { borderWidth: 1.5, borderColor: colors.accent, paddingVertical: spacing.lg, paddingHorizontal: spacing.xxl, borderRadius: borderRadius.md, width: '100%', alignItems: 'center' },
  btnOutlineText: { ...typography.button, color: colors.accent },
});
