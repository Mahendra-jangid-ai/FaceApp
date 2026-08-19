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
import { colors, spacing, borderRadius, typography, shadows, MONO } from '../theme';
import { detectPPE, getPPEConfig, type PPEResult, type PPEConfig } from '../services/ppeDetection';
import { speak } from '../services/voicePrompts';
import type { RootStackParamList } from '../types';

type Props = NativeStackScreenProps<RootStackParamList, 'PPECheck'>;
type Step = 'ready' | 'checking' | 'pass' | 'fail';

export default function PPECheckScreen({ navigation }: Props) {
  const frontDevice = useCameraDevice('front');
  const backDevice = useCameraDevice('back');
  const [cameraPosition, setCameraPosition] = useState<'front' | 'back'>('front');
  const device = cameraPosition === 'front' ? (frontDevice ?? backDevice) : (backDevice ?? frontDevice);
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
        <Text style={styles.permIcon}>🛡️</Text>
        <Text style={styles.infoTitle}>Camera Permission Required</Text>
        <Text style={styles.infoSub}>PPE audit needs camera access to inspect safety equipment.</Text>
        <TouchableOpacity style={styles.button} onPress={requestPermission} activeOpacity={0.85}>
          <Text style={styles.buttonText}>Grant Camera Access</Text>
        </TouchableOpacity>
      </View>
    );
  }

  if (!device) {
    return (
      <View style={styles.centered}>
        <Text style={styles.infoTitle}>No Camera Found</Text>
      </View>
    );
  }

  if (step === 'pass' || step === 'fail') {
    const passed = step === 'pass';
    return (
      <View style={styles.centered}>
        <View style={[styles.resultCircle, { borderColor: passed ? colors.success : colors.danger, backgroundColor: passed ? colors.successDim : colors.dangerDim }]}>
          <Text style={[styles.resultIcon, { color: passed ? colors.success : colors.danger }]}>
            {passed ? '✓' : '⚠️'}
          </Text>
        </View>
        
        <Text style={[styles.resultTitle, { color: passed ? colors.success : colors.danger }]}>
          {passed ? 'PPE Compliant' : 'Safety Gear Missing'}
        </Text>
        <Text style={styles.resultSub}>
          {passed ? 'Worker has verified helmet and reflective vest' : 'Mandatory safety helmet or vest not detected'}
        </Text>

        {result && (
          <View style={styles.detailsCard}>
            <View style={styles.detailRow}>
              <View style={styles.itemRow}>
                <Text style={styles.itemIcon}>⛑️</Text>
                <Text style={styles.detailLabel}>Safety Helmet</Text>
              </View>
              <View style={[styles.badge, { backgroundColor: result.helmetDetected ? colors.successDim : colors.dangerDim, borderColor: result.helmetDetected ? '#BBF7D0' : '#FECACA' }]}>
                <Text style={[styles.badgeText, { color: result.helmetDetected ? colors.success : colors.danger }]}>
                  {result.helmetDetected ? `Detected (${(result.helmetConfidence * 100).toFixed(0)}%)` : 'Not Detected'}
                </Text>
              </View>
            </View>

            <View style={styles.cardDivider} />

            <View style={styles.detailRow}>
              <View style={styles.itemRow}>
                <Text style={styles.itemIcon}>🦺</Text>
                <Text style={styles.detailLabel}>High-Vis Vest</Text>
              </View>
              <View style={[styles.badge, { backgroundColor: result.vestDetected ? colors.successDim : colors.dangerDim, borderColor: result.vestDetected ? '#BBF7D0' : '#FECACA' }]}>
                <Text style={[styles.badgeText, { color: result.vestDetected ? colors.success : colors.danger }]}>
                  {result.vestDetected ? `Detected (${(result.vestConfidence * 100).toFixed(0)}%)` : 'Not Detected'}
                </Text>
              </View>
            </View>

            <View style={styles.cardDivider} />
            <Text style={styles.latency}>Inference Time: {result.detectionTimeMs}ms</Text>
          </View>
        )}

        <TouchableOpacity
          style={[styles.button, { marginTop: spacing.xl, backgroundColor: passed ? colors.success : colors.accent }]}
          onPress={() => {
            setStep('ready');
            setResult(null);
          }}
          activeOpacity={0.85}>
          <Text style={styles.buttonText}>{passed ? 'Audit Next Worker' : 'Try Again'}</Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.buttonOutline, { marginTop: spacing.md }]}
          onPress={() => navigation.goBack()}
          activeOpacity={0.85}>
          <Text style={styles.buttonOutlineText}>Return to Home</Text>
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
        
        {/* Safety Guide Frame */}
        <View style={styles.overlay}>
          <View style={styles.targetBox}>
            <View style={styles.headMarker}>
              <Text style={styles.markerText}>⛑️ Helmet</Text>
            </View>
            <View style={styles.torsoMarker}>
              <Text style={styles.markerText}>🦺 Vest</Text>
            </View>
          </View>
        </View>

        <View style={styles.hintContainer}>
          <View style={styles.hintPill}>
            <Text style={styles.hintText}>
              {step === 'checking' ? 'Analyzing safety gear...' : 'Stand facing camera with helmet & vest'}
            </Text>
          </View>
        </View>

        <TouchableOpacity style={styles.flipBtn} onPress={() => setCameraPosition(p => p === 'front' ? 'back' : 'front')} activeOpacity={0.75}>
          <Text style={styles.flipText}>🔄 {cameraPosition === 'front' ? 'Front' : 'Back'}</Text>
        </TouchableOpacity>
      </View>

      <View style={styles.bottomPanel}>
        <TouchableOpacity
          style={[styles.captureBtn, step === 'checking' && styles.captureBtnDisabled]}
          onPress={handleCheck}
          disabled={step === 'checking'}
          activeOpacity={0.85}>
          {step === 'checking' ? (
            <ActivityIndicator color="#FFFFFF" size="small" />
          ) : (
            <Text style={styles.captureBtnText}>Check PPE Safety Gear</Text>
          )}
        </TouchableOpacity>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.bg },
  centered: {
    flex: 1, alignItems: 'center', justifyContent: 'center',
    padding: spacing.xl, backgroundColor: colors.bg,
  },
  permIcon: { fontSize: 44, marginBottom: spacing.md },
  infoTitle: { fontSize: 20, fontWeight: '700', textAlign: 'center', color: colors.text },
  infoSub: { fontSize: 13, textAlign: 'center', marginTop: spacing.xs, color: colors.textDim },

  cameraContainer: { flex: 1 },
  overlay: {
    position: 'absolute', top: 0, left: 0, right: 0, bottom: 0,
    alignItems: 'center', justifyContent: 'center',
  },
  targetBox: {
    width: 270, height: 380,
    borderWidth: 2, borderColor: '#FFFFFF', borderStyle: 'dashed',
    borderRadius: borderRadius.lg,
    backgroundColor: 'rgba(0, 0, 0, 0.1)',
    alignItems: 'center', justifyContent: 'space-between',
    paddingVertical: spacing.lg,
  },

  headMarker: { backgroundColor: 'rgba(15, 23, 42, 0.8)', paddingHorizontal: spacing.md, paddingVertical: 4, borderRadius: borderRadius.full },
  torsoMarker: { backgroundColor: 'rgba(15, 23, 42, 0.8)', paddingHorizontal: spacing.md, paddingVertical: 4, borderRadius: borderRadius.full },
  markerText: { fontSize: 11, fontWeight: '700', color: '#FFFFFF' },

  hintContainer: {
    position: 'absolute', top: spacing.xxl, left: 0, right: 0,
    alignItems: 'center',
  },
  hintPill: {
    backgroundColor: 'rgba(15, 23, 42, 0.85)', paddingHorizontal: spacing.lg,
    paddingVertical: spacing.sm, borderRadius: borderRadius.full,
  },
  hintText: {
    color: '#FFFFFF', fontSize: 12.5, fontWeight: '700',
  },
  flipBtn: {
    position: 'absolute', top: spacing.xxl, right: spacing.lg,
    backgroundColor: 'rgba(15, 23, 42, 0.8)', borderRadius: borderRadius.full,
    paddingHorizontal: spacing.md, paddingVertical: 6,
  },
  flipText: { fontSize: 12, fontWeight: '700', color: '#FFFFFF' },

  bottomPanel: {
    backgroundColor: '#FFFFFF', padding: spacing.lg, alignItems: 'center',
    borderTopWidth: 1, borderTopColor: colors.line,
  },
  captureBtn: {
    backgroundColor: colors.accent, paddingVertical: spacing.md,
    paddingHorizontal: spacing.xxl, borderRadius: borderRadius.md, width: '100%',
    alignItems: 'center', ...shadows.sm,
  },
  captureBtnDisabled: { opacity: 0.5 },
  captureBtnText: { ...typography.button, color: '#FFFFFF', fontSize: 14.5 },

  resultCircle: {
    width: 80, height: 80, borderRadius: 40,
    alignItems: 'center', justifyContent: 'center', borderWidth: 3,
  },
  resultIcon: { fontSize: 36, fontWeight: '800' },
  resultTitle: { fontSize: 20, fontWeight: '800', marginTop: spacing.lg },
  resultSub: { fontSize: 13, color: colors.textDim, marginTop: spacing.xs, textAlign: 'center' },
  
  detailsCard: {
    backgroundColor: '#FFFFFF', borderRadius: borderRadius.md,
    padding: spacing.lg, marginTop: spacing.lg, width: '100%', borderWidth: 1, borderColor: colors.line,
    ...shadows.sm,
  },
  detailRow: {
    flexDirection: 'row', justifyContent: 'space-between',
    alignItems: 'center', paddingVertical: spacing.xs,
  },
  itemRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm },
  itemIcon: { fontSize: 18 },
  detailLabel: { fontSize: 14, fontWeight: '600', color: colors.text },
  badge: {
    paddingHorizontal: spacing.md, paddingVertical: 4,
    borderRadius: borderRadius.sm, borderWidth: 1,
  },
  badgeText: { fontSize: 11, fontWeight: '700' },
  cardDivider: { height: 1, backgroundColor: colors.line, marginVertical: spacing.sm },
  latency: { fontSize: 11, textAlign: 'center', color: colors.textDim },

  button: {
    backgroundColor: colors.accent, paddingVertical: spacing.md,
    paddingHorizontal: spacing.xxl, borderRadius: borderRadius.md, width: '100%',
    alignItems: 'center', ...shadows.sm,
  },
  buttonText: { ...typography.button, color: colors.onAccent },
  buttonOutline: {
    borderWidth: 1, borderColor: colors.lineBright, paddingVertical: spacing.md,
    paddingHorizontal: spacing.xxl, borderRadius: borderRadius.md, width: '100%',
    alignItems: 'center', backgroundColor: '#FFFFFF',
  },
  buttonOutlineText: { ...typography.button, color: colors.textDim },
});
