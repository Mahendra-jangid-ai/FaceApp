import React, { useCallback, useEffect, useRef, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  TextInput,
  Alert,
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  NativeModules,
} from 'react-native';
import { Camera, useCameraDevice, useCameraPermission } from 'react-native-vision-camera';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import { colors, spacing, borderRadius, typography, shadows } from '../theme';
import { detectFace, getFaceEmbedding } from '../services/faceProcessor';
import { saveUser, getEnrolledUsers } from '../services/database';
import { checkDuplicateEnrollment, prepareEmbeddingForStorage } from '../services/embeddingUtils';
import { checkFaceQuality, getQualityFeedback } from '../services/qualityGate';
import { validateAadhar, maskAadhar } from '../services/aadharValidator';
import { speak } from '../services/voicePrompts';
import type { RootStackParamList, EnrolledUser } from '../types';

type Props = NativeStackScreenProps<RootStackParamList, 'Enroll'>;
type Step = 'camera' | 'details' | 'done';

export default function EnrollScreen({ navigation, route }: Props) {
  const role = route.params?.role || 'worker';
  const [cameraPosition, setCameraPosition] = useState<'front' | 'back'>('front');
  const device = useCameraDevice(cameraPosition);
  const { hasPermission, requestPermission } = useCameraPermission();
  const cameraRef = useRef<any>(null);
  const [step, setStep] = useState<Step>('camera');
  const [processing, setProcessing] = useState(false);
  const [photoPath, setPhotoPath] = useState('');
  const [embedding, setEmbedding] = useState<number[]>([]);
  const [bioHashStr, setBioHashStr] = useState('');
  const [bioHashSalt, setBioHashSalt] = useState('');
  const [name, setName] = useState('');
  const [employeeId, setEmployeeId] = useState('');
  const [aadhar, setAadhar] = useState('');
  const [aadharError, setAadharError] = useState('');
  const [faceStatus, setFaceStatus] = useState('Position your face in the frame');
  const [qualityInfo, setQualityInfo] = useState('');

  useEffect(() => {
    speak('position_face');
    if (!NativeModules.FaceProcessor) {
      Alert.alert('Error', 'FaceProcessor native module not loaded. Reinstall app.');
    }
  }, []);

  const flipCamera = useCallback(() => {
    setCameraPosition(prev => (prev === 'front' ? 'back' : 'front'));
  }, []);

  const captureAndProcess = useCallback(async () => {
    if (!cameraRef.current || processing) return;
    setProcessing(true);
    setFaceStatus('Capturing photo...');

    try {
      const photo = await cameraRef.current.takePhoto({ flash: 'off' });
      if (!photo?.path) {
        Alert.alert('Error', 'Photo capture returned empty. Try again.');
        setProcessing(false);
        setFaceStatus('Capture failed. Try again.');
        return;
      }

      const filePath = photo.path.startsWith('/') ? photo.path : `/${photo.path}`;

      setFaceStatus('Detecting face...');
      const face = await detectFace(filePath);

      if (!face.found) {
        setFaceStatus('No face detected. Adjust position and try again.');
        speak('poor_quality');
        Alert.alert(
          'No Face Detected',
          'Make sure:\n\n- Your face is clearly visible\n- Good lighting (no backlight)\n- Face centered in the oval\n- Hold phone steady',
        );
        setProcessing(false);
        return;
      }

      // Quality gate
      const quality = checkFaceQuality(face);
      setQualityInfo(`Quality: ${(quality.score * 100).toFixed(0)}%`);
      if (!quality.passed) {
        setFaceStatus(getQualityFeedback(quality));
        speak('poor_quality');
        Alert.alert('Poor Quality', `${quality.reasons.join('\n')}\n\nPlease adjust and try again.`);
        setProcessing(false);
        return;
      }

      setFaceStatus('Generating face embedding...');
      let emb: number[];
      try {
        emb = await getFaceEmbedding(filePath);
      } catch (embError: any) {
        Alert.alert('Embedding Error', `Failed to generate face embedding.\n\nError: ${embError?.message || 'Unknown'}`);
        setProcessing(false);
        setFaceStatus('Embedding failed. Try again.');
        return;
      }

      if (!emb || emb.length === 0) {
        Alert.alert('Error', 'Embedding returned empty. Try again.');
        setProcessing(false);
        return;
      }

      // Check for duplicates
      setFaceStatus('Checking for duplicates...');
      const existingUsers = await getEnrolledUsers();
      const duplicate = checkDuplicateEnrollment(
        emb,
        existingUsers.map(u => ({ id: u.id, name: u.name, embedding: u.embedding })),
      );
      if (duplicate) {
        Alert.alert(
          'Duplicate Face Detected',
          `This face matches "${duplicate.name}" (${(duplicate.score * 100).toFixed(1)}% similarity).\n\nEach person should only be enrolled once.`,
        );
        setProcessing(false);
        setFaceStatus('Duplicate detected. Try a different person.');
        return;
      }

      // Generate BioHash + differential privacy
      setFaceStatus('Securing biometric template...');
      const { embedding: privatizedEmb, hash, salt } = prepareEmbeddingForStorage(emb);

      setPhotoPath(filePath);
      setEmbedding(privatizedEmb);
      setBioHashStr(hash);
      setBioHashSalt(salt);
      setStep('details');
    } catch (e: any) {
      Alert.alert('Error', `${e.message || 'Unknown error'}`);
      setFaceStatus('Error. Try again.');
    }
    setProcessing(false);
  }, [processing]);

  const handleAadharChange = (text: string) => {
    setAadhar(text);
    if (text.replace(/[\s-]/g, '').length === 12) {
      const result = validateAadhar(text);
      setAadharError(result.valid ? '' : result.error || 'Invalid');
      if (result.valid) setAadhar(result.formatted);
    } else {
      setAadharError('');
    }
  };

  const handleSave = useCallback(async () => {
    if (!name.trim()) {
      Alert.alert('Required', "Please enter the person's name");
      return;
    }
    if (!employeeId.trim()) {
      Alert.alert('Required', 'Please enter the Employee ID');
      return;
    }
    if (aadhar.trim()) {
      const aadharResult = validateAadhar(aadhar);
      if (!aadharResult.valid) {
        Alert.alert('Invalid Aadhaar', aadharResult.error || 'Check Aadhaar number');
        return;
      }
    }

    const user: EnrolledUser = {
      id: `${role}-` + Date.now().toString(36) + Math.random().toString(36).slice(2, 8),
      name: name.trim(),
      employeeId: employeeId.trim(),
      aadhar: aadhar.trim() || undefined,
      embedding,
      bioHash: bioHashStr,
      bioHashSalt: bioHashSalt,
      photoUri: photoPath,
      createdAt: Date.now(),
      synced: false,
      role,
    };
    await saveUser(user);
    speak('enrollment_complete');
    setStep('done');
  }, [name, employeeId, aadhar, embedding, photoPath, bioHashStr, bioHashSalt, role]);

  if (!hasPermission) {
    return (
      <View style={styles.centered}>
        <Text style={styles.permText}>Camera permission is required</Text>
        <TouchableOpacity style={styles.permButton} onPress={requestPermission}>
          <Text style={styles.permButtonText}>Grant Camera Permission</Text>
        </TouchableOpacity>
      </View>
    );
  }

  if (!device) {
    return (
      <View style={styles.centered}>
        <Text style={styles.permText}>No camera found</Text>
      </View>
    );
  }

  if (step === 'done') {
    return (
      <View style={styles.centered}>
        <View style={styles.successCircle}>
          <Text style={styles.successIcon}>{'V'}</Text>
        </View>
        <Text style={[styles.title, { marginTop: spacing.lg }]}>Enrolled Successfully!</Text>
        <Text style={styles.subtitle}>{name} has been registered</Text>
        <View style={styles.securityBadges}>
          <View style={styles.secBadge}><Text style={styles.secBadgeText}>BioHash Protected</Text></View>
          <View style={styles.secBadge}><Text style={styles.secBadgeText}>Diff Privacy</Text></View>
          <View style={styles.secBadge}><Text style={styles.secBadgeText}>AES-256</Text></View>
        </View>
        <TouchableOpacity
          style={[styles.button, { marginTop: spacing.xl }]}
          onPress={() => navigation.goBack()}>
          <Text style={styles.buttonText}>Back to Home</Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.buttonOutline, { marginTop: spacing.md }]}
          onPress={() => {
            setStep('camera');
            setName('');
            setEmployeeId('');
            setAadhar('');
            setEmbedding([]);
            setPhotoPath('');
            setBioHashStr('');
            setBioHashSalt('');
            setFaceStatus('Position your face in the frame');
            speak('position_face');
          }}>
          <Text style={styles.buttonOutlineText}>Enroll Another</Text>
        </TouchableOpacity>
      </View>
    );
  }

  if (step === 'details') {
    return (
      <KeyboardAvoidingView
        style={styles.container}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        <ScrollView contentContainerStyle={styles.formContainer}>
          <View style={styles.successCircle}>
            <Text style={styles.successIcon}>{'O'}</Text>
          </View>
          <Text style={styles.title}>Face Captured</Text>
          <Text style={styles.subtitle}>Enter details to complete enrollment</Text>
          {qualityInfo ? <Text style={styles.qualityText}>{qualityInfo}</Text> : null}

          <View style={styles.inputGroup}>
            <Text style={styles.label}>Full Name *</Text>
            <TextInput
              style={styles.input}
              value={name}
              onChangeText={setName}
              placeholder="e.g., Rajesh Kumar"
              placeholderTextColor={colors.textLight}
              autoFocus
            />
          </View>
          <View style={styles.inputGroup}>
            <Text style={styles.label}>Employee ID *</Text>
            <TextInput
              style={styles.input}
              value={employeeId}
              onChangeText={setEmployeeId}
              placeholder="e.g., NHAI-2024-001"
              placeholderTextColor={colors.textLight}
            />
          </View>
          <View style={styles.inputGroup}>
            <Text style={styles.label}>Aadhaar Number (optional)</Text>
            <TextInput
              style={[styles.input, aadharError ? styles.inputError : null]}
              value={aadhar}
              onChangeText={handleAadharChange}
              placeholder="XXXX XXXX XXXX"
              placeholderTextColor={colors.textLight}
              keyboardType="number-pad"
              maxLength={14}
            />
            {aadharError ? <Text style={styles.errorText}>{aadharError}</Text> : null}
          </View>

          <View style={styles.securityNote}>
            <Text style={styles.securityNoteTitle}>Security</Text>
            <Text style={styles.securityNoteText}>
              Face data protected with BioHash (ISO/IEC 24745),
              differential privacy, and AES-256 encryption.
              Original embedding cannot be recovered.
            </Text>
          </View>

          <TouchableOpacity style={styles.button} onPress={handleSave}>
            <Text style={styles.buttonText}>Save Enrollment</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.buttonOutline, { marginTop: spacing.md }]}
            onPress={() => {
              setStep('camera');
              setFaceStatus('Position your face in the frame');
            }}>
            <Text style={styles.buttonOutlineText}>Retake Photo</Text>
          </TouchableOpacity>
        </ScrollView>
      </KeyboardAvoidingView>
    );
  }

  return (
    <View style={styles.container}>
      <View style={styles.cameraContainer}>
        <Camera
          ref={cameraRef}
          style={StyleSheet.absoluteFill}
          device={device}
          isActive={step === 'camera'}
          photo={true}
          onError={(error: any) => {
            Alert.alert('Camera Error', error.message || 'Camera failed');
          }}
        />
        <View style={styles.faceGuide}>
          <View style={styles.faceOval} />
        </View>
        <View style={styles.cameraOverlay}>
          <Text style={styles.cameraHint}>{faceStatus}</Text>
        </View>
        <TouchableOpacity style={styles.flipButton} onPress={flipCamera}>
          <Text style={styles.flipLabel}>
            {cameraPosition === 'front' ? 'Front' : 'Back'}
          </Text>
        </TouchableOpacity>
      </View>

      <View style={styles.bottomPanel}>
        <TouchableOpacity
          style={[styles.captureButton, processing && styles.captureButtonDisabled]}
          onPress={captureAndProcess}
          disabled={processing}
          activeOpacity={0.7}>
          {processing ? (
            <ActivityIndicator color={colors.white} size="large" />
          ) : (
            <View style={styles.captureInner} />
          )}
        </TouchableOpacity>
        <Text style={styles.captureHint}>
          {processing ? 'Processing...' : 'Tap to capture face'}
        </Text>
      </View>
    </View>
  );
}

const OVAL_SIZE = 240;
const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.black },
  centered: {
    flex: 1, backgroundColor: colors.background,
    alignItems: 'center', justifyContent: 'center', padding: spacing.xl,
  },
  cameraContainer: { flex: 1, position: 'relative' },
  faceGuide: {
    position: 'absolute', left: 0, right: 0, top: 0, bottom: 0,
    alignItems: 'center', justifyContent: 'center',
  },
  faceOval: {
    width: OVAL_SIZE, height: OVAL_SIZE * 1.3,
    borderRadius: OVAL_SIZE * 0.65, borderWidth: 3,
    borderColor: 'rgba(255,255,255,0.6)', borderStyle: 'dashed',
  },
  cameraOverlay: {
    position: 'absolute', top: spacing.xxl, left: 0, right: 0,
    alignItems: 'center',
  },
  cameraHint: {
    color: colors.white, fontSize: 16, fontWeight: '600',
    backgroundColor: 'rgba(0,0,0,0.5)',
    paddingHorizontal: spacing.lg, paddingVertical: spacing.sm,
    borderRadius: borderRadius.full, overflow: 'hidden',
  },
  flipButton: {
    position: 'absolute', top: spacing.xxl, right: spacing.md,
    backgroundColor: 'rgba(0,0,0,0.6)', borderRadius: borderRadius.full,
    paddingHorizontal: spacing.md, paddingVertical: spacing.sm,
  },
  flipLabel: { color: colors.white, fontSize: 13, fontWeight: '600' },
  bottomPanel: {
    backgroundColor: 'rgba(0,0,0,0.8)', paddingVertical: spacing.xl,
    alignItems: 'center',
  },
  captureButton: {
    width: 72, height: 72, borderRadius: 36,
    backgroundColor: colors.primary, alignItems: 'center',
    justifyContent: 'center', borderWidth: 4, borderColor: colors.white,
  },
  captureButtonDisabled: { opacity: 0.5 },
  captureInner: { width: 56, height: 56, borderRadius: 28, backgroundColor: colors.white },
  captureHint: { color: 'rgba(255,255,255,0.7)', marginTop: spacing.sm, fontSize: 13 },
  formContainer: {
    flexGrow: 1, backgroundColor: colors.background, padding: spacing.xl,
    alignItems: 'center',
  },
  successCircle: {
    width: 80, height: 80, borderRadius: 40,
    backgroundColor: colors.successLight, alignItems: 'center', justifyContent: 'center',
  },
  successIcon: { fontSize: 36, fontWeight: '700', color: colors.success },
  title: { ...typography.h2, textAlign: 'center', marginTop: spacing.md },
  subtitle: { ...typography.bodySmall, textAlign: 'center', marginTop: spacing.xs },
  qualityText: { ...typography.caption, color: colors.success, marginTop: spacing.xs },
  inputGroup: { width: '100%', marginTop: spacing.lg },
  label: { ...typography.bodySmall, fontWeight: '600', marginBottom: spacing.xs },
  input: {
    backgroundColor: colors.white, borderWidth: 1, borderColor: colors.border,
    borderRadius: borderRadius.md, padding: spacing.md, fontSize: 16, color: colors.text,
  },
  inputError: { borderColor: colors.error },
  errorText: { ...typography.caption, color: colors.error, marginTop: spacing.xs },
  securityNote: {
    width: '100%', backgroundColor: colors.secondaryLight, padding: spacing.md,
    borderRadius: borderRadius.md, marginTop: spacing.lg,
  },
  securityNoteTitle: { ...typography.bodySmall, fontWeight: '700', color: colors.secondary },
  securityNoteText: { ...typography.caption, color: colors.secondary, marginTop: spacing.xs, lineHeight: 18 },
  securityBadges: { flexDirection: 'row', gap: spacing.sm, marginTop: spacing.md },
  secBadge: {
    backgroundColor: colors.secondaryLight, paddingHorizontal: spacing.sm,
    paddingVertical: spacing.xs, borderRadius: borderRadius.sm,
  },
  secBadgeText: { fontSize: 11, fontWeight: '600', color: colors.secondary },
  button: {
    backgroundColor: colors.primary, paddingVertical: spacing.md,
    paddingHorizontal: spacing.xl, borderRadius: borderRadius.md,
    marginTop: spacing.xl, width: '100%', alignItems: 'center', ...shadows.md,
  },
  buttonText: { ...typography.button, color: colors.white },
  buttonOutline: {
    borderWidth: 1.5, borderColor: colors.primary, paddingVertical: spacing.md,
    paddingHorizontal: spacing.xl, borderRadius: borderRadius.md,
    width: '100%', alignItems: 'center',
  },
  buttonOutlineText: { ...typography.button, color: colors.primary },
  permText: { ...typography.h3, textAlign: 'center', marginBottom: spacing.lg },
  permButton: {
    backgroundColor: colors.primary, paddingVertical: spacing.md,
    paddingHorizontal: spacing.xl, borderRadius: borderRadius.md,
  },
  permButtonText: { ...typography.button, color: colors.white },
});
