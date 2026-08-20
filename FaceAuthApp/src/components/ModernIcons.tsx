import React from 'react';
import { View, Text, StyleSheet } from 'react-native';

interface IconProps {
  size?: number;
  color?: string;
}

/** Modern Attendance / Chart Icon */
export function IconAttendance({ size = 24, color = '#2C3540' }: IconProps) {
  return (
    <View style={[styles.center, { width: size, height: size }]}>
      <View style={styles.chartWrap}>
        <View style={[styles.chartBar1, { backgroundColor: color }]} />
        <View style={[styles.chartBar2, { backgroundColor: color }]} />
        <View style={[styles.chartBar3, { backgroundColor: color }]} />
        <View style={[styles.chartDot, { backgroundColor: color }]} />
      </View>
    </View>
  );
}

/** Modern Safety / Hard Hat / Shield Icon */
export function IconSafety({ size = 24, color = '#2C3540' }: IconProps) {
  return (
    <View style={[styles.center, { width: size, height: size }]}>
      <View style={[styles.shieldOuter, { borderColor: color }]}>
        <View style={[styles.shieldInner, { backgroundColor: color }]} />
      </View>
    </View>
  );
}

/** Modern Leave / Plane Icon — points right */
export function IconLeave({ size = 24, color = '#1B4F72' }: IconProps) {
  return (
    <View style={[styles.center, { width: size, height: size }]}>
      <View style={styles.planeWrap}>
        <View style={[styles.planeBody, { backgroundColor: color }]} />
        <View style={[styles.planeWing, { backgroundColor: color }]} />
        <View style={[styles.planeTail, { backgroundColor: color }]} />
        <View style={[styles.planeNose, { borderLeftColor: color }]} />
      </View>
    </View>
  );
}

/** Modern Holidays / Sunset Icon */
export function IconHolidays({ size = 24, color = '#2C3540' }: IconProps) {
  return (
    <View style={[styles.center, { width: size, height: size }]}>
      <View style={styles.sunWrap}>
        <View style={[styles.sunHalf, { backgroundColor: color }]} />
        <View style={[styles.sunLine1, { backgroundColor: color }]} />
        <View style={[styles.sunLine2, { backgroundColor: color }]} />
      </View>
    </View>
  );
}

/** Modern Dashboard / Grid Tab Icon — clean 2x2, no overflow dots */
export function IconDashboard({ size = 22, color = '#2C3540' }: IconProps) {
  const gap = 2.5;
  const box = Math.max(5, (size - gap) / 2);
  const cell = { width: box, height: box, borderRadius: 2, backgroundColor: color };
  return (
    <View style={{ width: size, height: size, justifyContent: 'space-between' }}>
      <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
        <View style={cell} />
        <View style={cell} />
      </View>
      <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
        <View style={cell} />
        <View style={cell} />
      </View>
    </View>
  );
}

/** Modern Profile / User Tab Icon */
export function IconProfile({ size = 22, color = '#2C3540' }: IconProps) {
  return (
    <View style={[styles.center, { width: size, height: size }]}>
      <View style={[styles.userHead, { backgroundColor: color }]} />
      <View style={[styles.userBody, { backgroundColor: color }]} />
    </View>
  );
}

/** Modern More / Options Tab Icon */
export function IconMore({ size = 22, color = '#2C3540' }: IconProps) {
  return (
    <View style={[styles.moreWrap, { width: size, height: size }]}>
      <View style={[styles.moreDot, { backgroundColor: color }]} />
      <View style={[styles.moreDot, { backgroundColor: color }]} />
      <View style={[styles.moreDot, { backgroundColor: color }]} />
    </View>
  );
}

/** Modern Scan / Face Biometrics Icon */
export function IconFaceScan({ size = 24, color = '#FFFFFF' }: IconProps) {
  return (
    <View style={[styles.faceWrap, { width: size, height: size, borderColor: color }]}>
      <View style={[styles.faceCornerTL, { borderColor: color }]} />
      <View style={[styles.faceCornerTR, { borderColor: color }]} />
      <View style={[styles.faceCornerBL, { borderColor: color }]} />
      <View style={[styles.faceCornerBR, { borderColor: color }]} />
      <View style={[styles.faceScanLine, { backgroundColor: color }]} />
    </View>
  );
}

/** Modern Bell Icon */
export function IconBell({ size = 20, color = '#2C3540' }: IconProps) {
  return (
    <View style={[styles.center, { width: size, height: size }]}>
      <View style={[styles.bellDome, { backgroundColor: color }]} />
      <View style={[styles.bellBase, { backgroundColor: color }]} />
      <View style={[styles.bellClapper, { backgroundColor: color }]} />
    </View>
  );
}

/** Modern Lock / Security Icon */
export function IconLock({ size = 16, color = '#1B4F72' }: IconProps) {
  return (
    <View style={[styles.center, { width: size, height: size }]}>
      <View style={[styles.lockShackle, { borderColor: color }]} />
      <View style={[styles.lockBody, { backgroundColor: color }]} />
    </View>
  );
}

/** Modern Check In / Check Out Arrow */
export function IconArrowIn({ size = 16, color = '#4F6B52' }: IconProps) {
  return (
    <View style={{ width: size, height: size, alignItems: 'center', justifyContent: 'center' }}>
      <Text style={{ fontSize: size - 2, fontWeight: '900', color }}>↙</Text>
    </View>
  );
}

export function IconArrowOut({ size = 16, color = '#A35448' }: IconProps) {
  return (
    <View style={{ width: size, height: size, alignItems: 'center', justifyContent: 'center' }}>
      <Text style={{ fontSize: size - 2, fontWeight: '900', color }}>↗</Text>
    </View>
  );
}

export function IconClock({ size = 14, color = '#94A3B8' }: IconProps) {
  return (
    <View style={[styles.clockCircle, { width: size, height: size, borderColor: color }]}>
      <View style={[styles.clockHandH, { backgroundColor: color }]} />
      <View style={[styles.clockHandV, { backgroundColor: color }]} />
    </View>
  );
}

const styles = StyleSheet.create({
  center: { alignItems: 'center', justifyContent: 'center' },

  /* Chart Icon */
  chartWrap: { width: 18, height: 16, flexDirection: 'row', alignItems: 'flex-end', gap: 2.5, position: 'relative' },
  chartBar1: { width: 3, height: 6, borderRadius: 1.5 },
  chartBar2: { width: 3, height: 11, borderRadius: 1.5 },
  chartBar3: { width: 3, height: 15, borderRadius: 1.5 },
  chartDot: { position: 'absolute', top: 0, right: -1, width: 4, height: 4, borderRadius: 2 },

  /* Safety Shield */
  shieldOuter: { width: 16, height: 18, borderWidth: 2, borderRadius: 4, borderBottomLeftRadius: 9, borderBottomRightRadius: 9, alignItems: 'center', justifyContent: 'center' },
  shieldInner: { width: 6, height: 7, borderRadius: 2 },

  /* Plane — 45° up-right */
  planeWrap: {
    width: 18,
    height: 18,
    alignItems: 'center',
    justifyContent: 'center',
    transform: [{ rotate: '-45deg' }],
  },
  planeBody: { width: 14, height: 3.5, borderRadius: 2, marginRight: 3 },
  planeWing: { position: 'absolute', left: 5, top: 2, width: 3.5, height: 12, borderRadius: 1.5 },
  planeTail: { position: 'absolute', left: 1, top: 4, width: 2.5, height: 8, borderRadius: 1 },
  planeNose: {
    position: 'absolute',
    right: 0,
    top: 5,
    width: 0,
    height: 0,
    borderTopWidth: 3.5,
    borderBottomWidth: 3.5,
    borderLeftWidth: 5,
    borderTopColor: 'transparent',
    borderBottomColor: 'transparent',
  },

  /* Sun Icon */
  sunWrap: { width: 18, height: 16, alignItems: 'center', justifyContent: 'center' },
  sunHalf: { width: 12, height: 6, borderTopLeftRadius: 6, borderTopRightRadius: 6, marginBottom: 2 },
  sunLine1: { width: 16, height: 2, borderRadius: 1, marginBottom: 1.5 },
  sunLine2: { width: 10, height: 2, borderRadius: 1 },

  /* Dashboard Grid (layout handled inline) */

  /* Profile User */
  userHead: { width: 8, height: 8, borderRadius: 4, marginBottom: 1.5 },
  userBody: { width: 15, height: 7, borderTopLeftRadius: 7, borderTopRightRadius: 7 },

  /* More Dots */
  moreWrap: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 3 },
  moreDot: { width: 4.5, height: 4.5, borderRadius: 2.5 },

  /* Face Scan */
  faceWrap: { position: 'relative', alignItems: 'center', justifyContent: 'center' },
  faceCornerTL: { position: 'absolute', top: 0, left: 0, width: 6, height: 6, borderTopWidth: 2, borderLeftWidth: 2 },
  faceCornerTR: { position: 'absolute', top: 0, right: 0, width: 6, height: 6, borderTopWidth: 2, borderRightWidth: 2 },
  faceCornerBL: { position: 'absolute', bottom: 0, left: 0, width: 6, height: 6, borderBottomWidth: 2, borderLeftWidth: 2 },
  faceCornerBR: { position: 'absolute', bottom: 0, right: 0, width: 6, height: 6, borderBottomWidth: 2, borderRightWidth: 2 },
  faceScanLine: { width: 12, height: 1.5, borderRadius: 1 },

  /* Bell */
  bellDome: { width: 12, height: 10, borderTopLeftRadius: 6, borderTopRightRadius: 6 },
  bellBase: { width: 16, height: 2, borderRadius: 1, marginTop: 1 },
  bellClapper: { width: 4, height: 2, borderBottomLeftRadius: 2, borderBottomRightRadius: 2, marginTop: 0.5 },

  /* Lock */
  lockShackle: { width: 8, height: 7, borderTopWidth: 2, borderLeftWidth: 2, borderRightWidth: 2, borderTopLeftRadius: 4, borderTopRightRadius: 4, marginBottom: -1 },
  lockBody: { width: 12, height: 9, borderRadius: 2 },

  /* Clock */
  clockCircle: { borderWidth: 1.5, borderRadius: 10, alignItems: 'center', justifyContent: 'center', position: 'relative' },
  clockHandH: { position: 'absolute', width: 3.5, height: 1.5, left: 4.5, top: 4.5, borderRadius: 1 },
  clockHandV: { position: 'absolute', width: 1.5, height: 4, top: 2.5, left: 4.5, borderRadius: 1 },
});
