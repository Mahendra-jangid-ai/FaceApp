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
        <View style={styles.permCircle}>
          <Text style={styles.permIcon}>🛡️</Text>
        </View>
        <Text style={styles.infoTitle}>CAMERA PERMISSION REQUIRED</Text>
        <Text style={styles.infoSub}>PPE audit requires camera to detect safety gear.</Text>
        <TouchableOpacity style={styles.button} onPress={requestPermission} activeOpacity={0.85}>
          <Text style={styles.buttonText}>GRANT CAMERA ACCESS</Text>
        </TouchableOpacity>
      </View>
    );
  }

  if (!device) {
    return (
      <View style={styles.centered}>
        <Text style={styles.infoTitle}>NO CAMERA DETECTED</Text>
      </View>
    );
  }

  if (step === 'pass' || step === 'fail') {
    const passed = step === 'pass';
    return (
      <View style={[styles.centered, { backgroundColor: passed ? '#061710' : '#1A080C' }]}>
        <View style={[styles.resultCircle, { borderColor: passed ? colors.success : colors.danger, backgroundColor: passed ? colors.successDim : colors.dangerDim }]}>
          <Text style={[styles.resultIcon, { color: passed ? colors.success : colors.danger }]}>
            {passed ? '✓' : '⚠️'}
          </Text>
        </View>
        
        <Text style={[styles.resultTitle, { color: passed ? colors.success : colors.danger }]}>
          {passed ? 'SAFETY COMPLIANT' : 'PPE NON-COMPLIANT'}
        </Text>
        <Text style={styles.resultSub}>
          {passed ? 'Worker has verified mandatory safety gear' : 'Mandatory safety gear missing or obscured'}
        </Text>

        {result && (
          <View style={styles.detailsCard}>
            <View style={styles.detailRow}>
              <View style={styles.itemRow}>
                <Text style={styles.itemIcon}>⛑️</Text>
                <Text style={styles.detailLabel}>Safety Helmet</Text>
              </View>
              <View style={[styles.badge, { backgroundColor: result.helmetDetected ? colors.successDim : colors.dangerDim, borderColor: result.helmetDetected ? colors.success : colors.danger }]}>
                <Text style={[styles.badgeText, { color: result.helmetDetected ? colors.success : colors.danger }]}>
                  {result.helmetDetected ? `DETECTED (${(result.helmetConfidence * 100).toFixed(0)}%)` : 'NOT DETECTED'}
                </Text>
              </View>
            </View>

            <View style={styles.cardDivider} />

            <View style={styles.detailRow}>
              <View style={styles.itemRow}>
                <Text style={styles.itemIcon}>🦺</Text>
                <Text style={styles.detailLabel}>High-Vis Vest</Text>
              </View>
              <View style={[styles.badge, { backgroundColor: result.vestDetected ? colors.successDim : colors.dangerDim, borderColor: result.vestDetected ? colors.success : colors.danger }]}>
                <Text style={[styles.badgeText, { color: result.vestDetected ? colors.success : colors.danger }]}>
                  {result.vestDetected ? `DETECTED (${(result.vestConfidence * 100).toFixed(0)}%)` : 'NOT DETECTED'}
                </Text>
              </View>
            </View>

            <View style={styles.cardDivider} />
            <Text style={styles.latency}>AI Inference Time: {result.detectionTimeMs}ms</Text>
          </View>
        )}

        <TouchableOpacity
          style={[styles.button, { marginTop: spacing.xl, backgroundColor: passed ? colors.success : colors.accent }]}
          onPress={() => {
            setStep('ready');
            setResult(null);
          }}
          activeOpacity={0.85}>
          <Text style={styles.buttonText}>{passed ? 'AUDIT NEXT WORKER' : 'RE-SCAN SAFETY GEAR'}</Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.buttonOutline, { marginTop: spacing.md }]}
          onPress={() => navigation.goBack()}
          activeOpacity={0.85}>
          <Text style={styles.buttonOutlineText}>RETURN</Text>
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
        
        {/* Safety Silhouette Reticle */}
        <View style={styles.overlay}>
          <View style={styles.targetBox}>
            <View style={[styles.cornerTick, styles.tickTL]} />
            <View style={[styles.cornerTick, styles.tickTR]} />
            <View style={[styles.cornerTick, styles.tickBL]} />
            <View style={[styles.cornerTick, styles.tickBR]} />
            <View style={styles.headMarker}>
              <Text style={styles.markerText}>⛑️ HELMET ZONE</Text>
            </View>
            <View style={styles.torsoMarker}>
              <Text style={styles.markerText}>🦺 VEST ZONE</Text>
            </View>
          </View>
        </View>

        <View style={styles.hintContainer}>
          <View style={styles.hintPill}>
            <Text style={styles.hintText}>
              {step === 'checking' ? 'ANALYZING SAFETY GEAR...' : 'STAND IN FRAME WITH HELMET & VEST'}
            </Text>
          </View>
        </View>

        <TouchableOpacity style={styles.flipBtn} onPress={() => setCameraPosition(p => p === 'front' ? 'back' : 'front')} activeOpacity={0.75}>
          <Text style={styles.flipText}>🔄 {cameraPosition === 'front' ? 'FRONT' : 'BACK'}</Text>
        </TouchableOpacity>
      </View>

      <View style={styles.bottomPanel}>
        <TouchableOpacity
          style={[styles.captureBtn, step === 'checking' && styles.captureBtnDisabled]}
          onPress={handleCheck}
          disabled={step === 'checking'}
          activeOpacity={0.85}>
          {step === 'checking' ? (
            <ActivityIndicator color={colors.onAccent} size="large" />
          ) : (
            <Text style={styles.captureBtnText}>SCAN PPE COMPLIANCE</Text>
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
  permCircle: { width: 72, height: 72, borderRadius: 36, backgroundColor: colors.surfaceAlt, alignItems: 'center', justifyContent: 'center', borderWidth: 1, borderColor: colors.line, marginBottom: spacing.lg },
  permIcon: { fontSize: 32 },
  infoTitle: { ...typography.h2, textAlign: 'center', letterSpacing: 1.5 },
  infoSub: { ...typography.bodySmall, textAlign: 'center', marginTop: spacing.xs, color: colors.textDim },

  cameraContainer: { flex: 1 },
  overlay: {
    position: 'absolute', top: 0, left: 0, right: 0, bottom: 0,
    alignItems: 'center', justifyContent: 'center',
  },
  targetBox: {
    width: 270, height: 380,
    borderWidth: 2, borderColor: colors.warn,
    borderRadius: borderRadius.lg,
    backgroundColor: 'rgba(245, 158, 11, 0.04)',
    alignItems: 'center', justifyContent: 'space-between',
    paddingVertical: spacing.lg,
  },
  cornerTick: { position: 'absolute', width: 14, height: 14, borderColor: colors.cyan },
  tickTL: { top: -2, left: -2, borderTopWidth: 3, borderLeftWidth: 3 },
  tickTR: { top: -2, right: -2, borderTopWidth: 3, borderRightWidth: 3 },
  tickBL: { bottom: -2, left: -2, borderBottomWidth: 3, borderLeftWidth: 3 },
  tickBR: { bottom: -2, right: -2, borderBottomWidth: 3, borderRightWidth: 3 },

  headMarker: { backgroundColor: 'rgba(8, 12, 20, 0.85)', paddingHorizontal: spacing.md, paddingVertical: 3, borderRadius: borderRadius.full, borderWidth: 1, borderColor: colors.lineBright },
  torsoMarker: { backgroundColor: 'rgba(8, 12, 20, 0.85)', paddingHorizontal: spacing.md, paddingVertical: 3, borderRadius: borderRadius.full, borderWidth: 1, borderColor: colors.lineBright },
  markerText: { fontSize: 9.5, fontWeight: '800', color: colors.text, letterSpacing: 0.8 },

  hintContainer: {
    position: 'absolute', top: spacing.xxl + spacing.sm, left: 0, right: 0,
    alignItems: 'center',
  },
  hintPill: {
    backgroundColor: 'rgba(8, 12, 20, 0.90)', paddingHorizontal: spacing.lg,
    paddingVertical: spacing.sm, borderRadius: borderRadius.full,
    borderWidth: 1, borderColor: colors.lineBright,
  },
  hintText: {
    color: colors.warn, fontSize: 11, fontWeight: '800', letterSpacing: 1.2,
  },
  flipBtn: {
    position: 'absolute', top: spacing.xxl + spacing.sm, right: spacing.lg,
    backgroundColor: 'rgba(8, 12, 20, 0.85)', borderRadius: borderRadius.full,
    paddingHorizontal: spacing.md, paddingVertical: spacing.xs + 2,
    borderWidth: 1, borderColor: colors.line,
  },
  flipText: { fontSize: 10, fontWeight: '800', color: colors.text },

  bottomPanel: {
    backgroundColor: colors.surface, padding: spacing.xl, alignItems: 'center',
    borderTopWidth: 1, borderTopColor: colors.line,
  },
  captureBtn: {
    backgroundColor: colors.warn, paddingVertical: spacing.md + 2,
    paddingHorizontal: spacing.xxl, borderRadius: borderRadius.md, width: '100%',
    alignItems: 'center', ...shadows.md,
  },
  captureBtnDisabled: { opacity: 0.5 },
  captureBtnText: { ...typography.button, color: '#000000', fontSize: 15, fontWeight: '800' },

  resultCircle: {
    width: 88, height: 88, borderRadius: 44,
    alignItems: 'center', justifyContent: 'center', borderWidth: 3,
  },
  resultIcon: { fontSize: 44, fontWeight: '900' },
  resultTitle: { fontSize: 20, fontWeight: '800', marginTop: spacing.lg, letterSpacing: 2 },
  resultSub: { ...typography.bodySmall, color: colors.textDim, marginTop: spacing.xs, textAlign: 'center' },
  
  detailsCard: {
    backgroundColor: colors.surface, borderRadius: borderRadius.lg,
    padding: spacing.lg, marginTop: spacing.lg, width: '100%', borderWidth: 1, borderColor: colors.line,
    ...shadows.sm,
  },
  detailRow: {
    flexDirection: 'row', justifyContent: 'space-between',
    alignItems: 'center', paddingVertical: spacing.xs,
  },
  itemRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm },
  itemIcon: { fontSize: 20 },
  detailLabel: { ...typography.body, fontWeight: '700', fontSize: 14 },
  badge: {
    paddingHorizontal: spacing.sm + 2, paddingVertical: 4,
    borderRadius: borderRadius.xs, borderWidth: 1,
  },
  badgeText: { fontSize: 10, fontWeight: '800', letterSpacing: 0.5 },
  cardDivider: { height: 1, backgroundColor: colors.line, marginVertical: spacing.sm },
  latency: { fontFamily: MONO, fontSize: 11, textAlign: 'center', color: colors.textDim },

  button: {
    backgroundColor: colors.accent, paddingVertical: spacing.md + 2,
    paddingHorizontal: spacing.xxl, borderRadius: borderRadius.md, width: '100%',
    alignItems: 'center', ...shadows.md,
  },
  buttonText: { ...typography.button, color: colors.onAccent },
  buttonOutline: {
    borderWidth: 1.5, borderColor: colors.lineBright, paddingVertical: spacing.md,
    paddingHorizontal: spacing.xxl, borderRadius: borderRadius.md, width: '100%',
    alignItems: 'center', backgroundColor: colors.surface,
  },
  buttonOutlineText: { ...typography.button, color: colors.textDim },
});
