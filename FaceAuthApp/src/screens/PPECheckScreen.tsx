import React, { useCallback, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ActivityIndicator,
} from 'react-native';
import { Camera, useCameraDevice, useCameraPermission, usePhotoOutput } from 'react-native-vision-camera';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import { colors, spacing, borderRadius, typography, shadows } from '../theme';
import { detectPPE, getPPEConfig, type PPEResult, type PPEConfig } from '../services/ppeDetection';
import { speak } from '../services/voicePrompts';
import type { RootStackParamList } from '../types';

type Props = NativeStackScreenProps<RootStackParamList, 'PPECheck'>;

type Step = 'ready' | 'checking' | 'pass' | 'fail';

export default function PPECheckScreen({ navigation }: Props) {
  const frontDevice = useCameraDevice('front');
  const backDevice = useCameraDevice('back');
  const device = frontDevice ?? backDevice;
  const { hasPermission, requestPermission } = useCameraPermission();
  const photoOutput = usePhotoOutput({});

  const [step, setStep] = useState<Step>('ready');
  const [result, setResult] = useState<PPEResult | null>(null);
  const [config, setConfig] = useState<PPEConfig | null>(null);

  const handleCheck = useCallback(async () => {
    if (!photoOutput) return;
    setStep('checking');

    try {
      const photoFile = await photoOutput.capturePhotoToFile({ flashMode: 'off' }, {});
      const filePath = photoFile.filePath.startsWith('/') ? photoFile.filePath : `/${photoFile.filePath}`;
      const ppeConfig = await getPPEConfig();
      setConfig(ppeConfig);
      const ppeResult = await detectPPE(filePath);
      setResult(ppeResult);

      if (ppeResult.compliant) {
        setStep('pass');
        speak('success');
      } else {
        setStep('fail');
        speak('ppe_missing');
      }
    } catch {
      setStep('fail');
    }
  }, [photoOutput]);

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
        <Text style={styles.infoText}>No camera found</Text>
      </View>
    );
  }

  if (step === 'pass' || step === 'fail') {
    const passed = step === 'pass';
    return (
      <View style={[styles.centered, { backgroundColor: passed ? colors.successLight : colors.errorLight }]}>
        <View style={[styles.resultCircle, { backgroundColor: passed ? colors.success : colors.error }]}>
          <Text style={styles.resultIcon}>{passed ? 'V' : '!'}</Text>
        </View>
        <Text style={[styles.resultTitle, { color: passed ? colors.success : colors.error }]}>
          {passed ? 'PPE Compliant' : 'PPE Non-Compliant'}
        </Text>

        {result && (
          <View style={styles.detailsCard}>
            <View style={styles.detailRow}>
              <Text style={styles.detailLabel}>Helmet</Text>
              <View style={[styles.badge, { backgroundColor: result.helmetDetected ? colors.successLight : colors.errorLight }]}>
                <Text style={[styles.badgeText, { color: result.helmetDetected ? colors.success : colors.error }]}>
                  {result.helmetDetected ? `Detected (${(result.helmetConfidence * 100).toFixed(0)}%)` : 'Not Detected'}
                </Text>
              </View>
            </View>
            <View style={styles.detailRow}>
              <Text style={styles.detailLabel}>Hi-Vis Vest</Text>
              <View style={[styles.badge, { backgroundColor: result.vestDetected ? colors.successLight : colors.errorLight }]}>
                <Text style={[styles.badgeText, { color: result.vestDetected ? colors.success : colors.error }]}>
                  {result.vestDetected ? `Detected (${(result.vestConfidence * 100).toFixed(0)}%)` : 'Not Detected'}
                </Text>
              </View>
            </View>
            <Text style={styles.latency}>Detection: {result.detectionTimeMs}ms</Text>
          </View>
        )}

        <TouchableOpacity
          style={[styles.button, { marginTop: spacing.xl }]}
          onPress={() => {
            setStep('ready');
            setResult(null);
          }}>
          <Text style={styles.buttonText}>{passed ? 'Done' : 'Try Again'}</Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.buttonOutline, { marginTop: spacing.md }]}
          onPress={() => navigation.goBack()}>
          <Text style={styles.buttonOutlineText}>Back</Text>
        </TouchableOpacity>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <View style={styles.cameraContainer}>
        <Camera
          style={StyleSheet.absoluteFill}
          device={device}
          isActive={step === 'ready' || step === 'checking'}
          outputs={[photoOutput]}
        />
        <View style={styles.overlay}>
          <View style={styles.targetBox} />
        </View>
        <View style={styles.hintContainer}>
          <Text style={styles.hintText}>
            {step === 'checking' ? 'Analyzing PPE...' : 'Stand facing the camera showing helmet and vest'}
          </Text>
        </View>
      </View>

      <View style={styles.bottomPanel}>
        <TouchableOpacity
          style={[styles.captureBtn, step === 'checking' && styles.captureBtnDisabled]}
          onPress={handleCheck}
          disabled={step === 'checking'}>
          {step === 'checking' ? (
            <ActivityIndicator color={colors.white} size="large" />
          ) : (
            <Text style={styles.captureBtnText}>Check PPE</Text>
          )}
        </TouchableOpacity>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.black },
  centered: {
    flex: 1, alignItems: 'center', justifyContent: 'center',
    padding: spacing.xl, backgroundColor: colors.background,
  },
  cameraContainer: { flex: 1 },
  overlay: {
    position: 'absolute', top: 0, left: 0, right: 0, bottom: 0,
    alignItems: 'center', justifyContent: 'center',
  },
  targetBox: {
    width: 260, height: 340, borderWidth: 3,
    borderColor: 'rgba(255,255,255,0.5)', borderStyle: 'dashed',
    borderRadius: borderRadius.lg,
  },
  hintContainer: {
    position: 'absolute', top: spacing.xxl, left: 0, right: 0,
    alignItems: 'center',
  },
  hintText: {
    color: colors.white, fontSize: 16, fontWeight: '600',
    backgroundColor: 'rgba(0,0,0,0.6)', paddingHorizontal: spacing.lg,
    paddingVertical: spacing.sm, borderRadius: borderRadius.full, overflow: 'hidden',
  },
  bottomPanel: {
    backgroundColor: 'rgba(0,0,0,0.8)', padding: spacing.xl, alignItems: 'center',
  },
  captureBtn: {
    backgroundColor: colors.warning, paddingVertical: spacing.md,
    paddingHorizontal: spacing.xxl, borderRadius: borderRadius.md, ...shadows.md,
  },
  captureBtnDisabled: { opacity: 0.5 },
  captureBtnText: { ...typography.button, color: colors.white, fontSize: 18 },
  resultCircle: {
    width: 96, height: 96, borderRadius: 48,
    alignItems: 'center', justifyContent: 'center',
  },
  resultIcon: { fontSize: 48, color: colors.white, fontWeight: '700' },
  resultTitle: { fontSize: 24, fontWeight: '700', marginTop: spacing.lg },
  detailsCard: {
    backgroundColor: colors.surface, borderRadius: borderRadius.lg,
    padding: spacing.lg, marginTop: spacing.lg, width: '100%', borderWidth: 1, borderColor: colors.line,
  },
  detailRow: {
    flexDirection: 'row', justifyContent: 'space-between',
    alignItems: 'center', marginBottom: spacing.md,
  },
  detailLabel: { ...typography.body, fontWeight: '600' },
  badge: {
    paddingHorizontal: spacing.md, paddingVertical: spacing.xs,
    borderRadius: borderRadius.full,
  },
  badgeText: { fontSize: 13, fontWeight: '600' },
  latency: { ...typography.caption, textAlign: 'center', marginTop: spacing.xs },
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
