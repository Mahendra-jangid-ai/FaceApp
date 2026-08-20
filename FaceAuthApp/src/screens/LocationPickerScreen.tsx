import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  TextInput,
  Alert,
  ActivityIndicator,
  ScrollView,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import { colors, spacing, borderRadius, typography, shadows, MONO } from '../theme';
import { getCurrentLocation, getWorkSites, haversineDistance } from '../services/geofencing';
import type { RootStackParamList, AssignedLocation, WorkSite } from '../types';

type Props = NativeStackScreenProps<RootStackParamList, 'LocationPicker'>;

const RADIUS_OPTIONS = [50, 100, 200, 500];

export default function LocationPickerScreen({ navigation, route }: Props) {
  const { workerName, onConfirm } = route.params;

  const [selectedLat, setSelectedLat] = useState<number | null>(null);
  const [selectedLon, setSelectedLon] = useState<number | null>(null);
  const [radius, setRadius] = useState<number>(100);
  const [label, setLabel] = useState<string>('');
  const [gettingLocation, setGettingLocation] = useState(false);
  const [workSites, setWorkSites] = useState<WorkSite[]>([]);
  const [customLatStr, setCustomLatStr] = useState<string>('');
  const [customLonStr, setCustomLonStr] = useState<string>('');

  useEffect(() => {
    loadSites();
    fetchCurrentLocationAuto();
  }, []);

  const loadSites = async () => {
    const sites = await getWorkSites();
    setWorkSites(sites);
  };

  const fetchCurrentLocationAuto = async () => {
    setGettingLocation(true);
    const loc = await getCurrentLocation();
    setGettingLocation(false);
    if (loc) {
      setSelectedLat(loc.latitude);
      setSelectedLon(loc.longitude);
      setCustomLatStr(loc.latitude.toFixed(6));
      setCustomLonStr(loc.longitude.toFixed(6));
      setLabel(`Site GPS (${loc.latitude.toFixed(4)}, ${loc.longitude.toFixed(4)})`);
    }
  };

  const handleUseCurrentLocation = async () => {
    setGettingLocation(true);
    const loc = await getCurrentLocation();
    setGettingLocation(false);
    if (!loc) {
      Alert.alert(
        'GPS Location Error',
        'Could not fetch device GPS. Please check location permissions and ensure GPS is turned on.',
      );
      return;
    }
    setSelectedLat(loc.latitude);
    setSelectedLon(loc.longitude);
    setCustomLatStr(loc.latitude.toFixed(6));
    setCustomLonStr(loc.longitude.toFixed(6));
    if (!label || label.startsWith('Site GPS')) {
      setLabel(`Site GPS (${loc.latitude.toFixed(4)}, ${loc.longitude.toFixed(4)})`);
    }
  };

  const handlePickSavedSite = (site: WorkSite) => {
    setSelectedLat(site.latitude);
    setSelectedLon(site.longitude);
    setCustomLatStr(site.latitude.toFixed(6));
    setCustomLonStr(site.longitude.toFixed(6));
    setRadius(site.radiusMeters);
    setLabel(site.name);
  };

  const handleManualCoordsApply = () => {
    const lat = parseFloat(customLatStr);
    const lon = parseFloat(customLonStr);
    if (isNaN(lat) || isNaN(lon) || lat < -90 || lat > 90 || lon < -180 || lon > 180) {
      Alert.alert('Invalid Coordinates', 'Please enter valid Latitude (-90 to 90) and Longitude (-180 to 180).');
      return;
    }
    setSelectedLat(lat);
    setSelectedLon(lon);
    if (!label) {
      setLabel(`Site at ${lat.toFixed(4)}, ${lon.toFixed(4)}`);
    }
  };

  const handleConfirm = () => {
    if (selectedLat === null || selectedLon === null) {
      Alert.alert('No Location Selected', 'Please capture GPS location or enter coordinates.');
      return;
    }
    if (!label.trim()) {
      Alert.alert('Location Name Required', 'Please enter a name for this work location.');
      return;
    }
    const assignedLocation: AssignedLocation = {
      latitude: selectedLat,
      longitude: selectedLon,
      radiusMeters: radius,
      label: label.trim(),
    };
    onConfirm(assignedLocation);
    navigation.goBack();
  };

  const isSelected = selectedLat !== null && selectedLon !== null;

  return (
    <KeyboardAvoidingView style={styles.root} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
      {/* Header */}
      <View style={styles.header}>
        <View>
          <Text style={styles.headerTitle}>Assign Work Location</Text>
          <Text style={styles.headerSub}>
            Worker: <Text style={{ fontWeight: '700', color: colors.accent }}>{workerName}</Text>
          </Text>
        </View>
        <TouchableOpacity style={styles.cancelBtn} onPress={() => navigation.goBack()} activeOpacity={0.75}>
          <Text style={styles.cancelText}>Cancel</Text>
        </TouchableOpacity>
      </View>

      <ScrollView style={styles.panel} keyboardShouldPersistTaps="handled" showsVerticalScrollIndicator={false}>
        {/* GPS Live Fetch Card */}
        <View style={styles.gpsCard}>
          <View style={styles.gpsCardHeader}>
            <Text style={styles.gpsCardTitle}>🛰️ GPS Work Zone Setup</Text>
            {gettingLocation && <ActivityIndicator size="small" color={colors.accent} />}
          </View>
          <Text style={styles.gpsCardDesc}>
            Pin the exact geographical work site where this worker is authorized to mark attendance.
          </Text>

          <TouchableOpacity
            style={styles.liveLocationBtn}
            onPress={handleUseCurrentLocation}
            disabled={gettingLocation}
            activeOpacity={0.85}>
            {gettingLocation ? (
              <ActivityIndicator size="small" color="#FFFFFF" />
            ) : (
              <Text style={styles.liveLocationBtnText}>📍 Use Current Device GPS Location</Text>
            )}
          </TouchableOpacity>
        </View>

        {/* Selected Coordinates Status / Radar Preview */}
        {isSelected ? (
          <View style={styles.activeZoneBox}>
            <View style={styles.activeZoneHeader}>
              <View style={styles.radarIcon}>
                <Text style={{ fontSize: 20 }}>🎯</Text>
              </View>
              <View style={{ flex: 1 }}>
                <Text style={styles.activeZoneTitle}>Active Work Zone Coordinates</Text>
                <Text style={styles.activeZoneCoords}>
                  LAT: {selectedLat!.toFixed(6)}  ·  LON: {selectedLon!.toFixed(6)}
                </Text>
              </View>
              <View style={styles.radiusBadge}>
                <Text style={styles.radiusBadgeText}>{radius}m Zone</Text>
              </View>
            </View>
            <View style={styles.zoneAccuracyBar}>
              <Text style={styles.zoneAccuracyText}>
                ✓ Geofence configured for <Text style={{ fontWeight: '700' }}>{workerName}</Text> (Attendance allowed only within {radius}m)
              </Text>
            </View>
          </View>
        ) : (
          <View style={styles.emptyZoneBox}>
            <Text style={styles.emptyZoneIcon}>🗺️</Text>
            <Text style={styles.emptyZoneTitle}>No Location Set Yet</Text>
            <Text style={styles.emptyZoneSub}>Tap 'Use Current Device GPS' or enter coordinates below.</Text>
          </View>
        )}

        {/* Location Name */}
        <View style={styles.fieldGroup}>
          <Text style={styles.fieldLabel}>LOCATION / WORK SITE NAME *</Text>
          <TextInput
            style={styles.input}
            value={label}
            onChangeText={setLabel}
            placeholder="e.g. Work Site 4A, Project Section B"
            placeholderTextColor={colors.textFaint}
          />
        </View>

        {/* Radius Selector */}
        <View style={styles.fieldGroup}>
          <Text style={styles.fieldLabel}>ATTENDANCE BOUNDARY RADIUS</Text>
          <View style={styles.radiusRow}>
            {RADIUS_OPTIONS.map(r => (
              <TouchableOpacity
                key={r}
                style={[styles.radiusChip, radius === r && styles.radiusChipActive]}
                onPress={() => setRadius(r)}
                activeOpacity={0.75}>
                <Text style={[styles.radiusChipText, radius === r && styles.radiusChipTextActive]}>
                  {r}m
                </Text>
              </TouchableOpacity>
            ))}
          </View>
        </View>

        {/* Manual Latitude / Longitude Inputs */}
        <View style={styles.fieldGroup}>
          <Text style={styles.fieldLabel}>MANUAL COORDINATES (OPTIONAL)</Text>
          <View style={styles.coordRow}>
            <TextInput
              style={[styles.input, styles.coordInput]}
              value={customLatStr}
              onChangeText={setCustomLatStr}
              placeholder="Latitude (e.g. 28.6139)"
              placeholderTextColor={colors.textFaint}
              keyboardType="numeric"
            />
            <TextInput
              style={[styles.input, styles.coordInput]}
              value={customLonStr}
              onChangeText={setCustomLonStr}
              placeholder="Longitude (e.g. 77.2090)"
              placeholderTextColor={colors.textFaint}
              keyboardType="numeric"
            />
            <TouchableOpacity style={styles.applyBtn} onPress={handleManualCoordsApply} activeOpacity={0.8}>
              <Text style={styles.applyBtnText}>Set</Text>
            </TouchableOpacity>
          </View>
        </View>

        {/* Quick Pick from Saved Sites */}
        {workSites.length > 0 && (
          <View style={styles.fieldGroup}>
            <Text style={styles.fieldLabel}>OR PICK FROM SAVED SITES</Text>
            <View style={styles.sitesRow}>
              {workSites.map(site => (
                <TouchableOpacity
                  key={site.id}
                  style={[
                    styles.siteChip,
                    selectedLat === site.latitude && selectedLon === site.longitude && styles.siteChipActive,
                  ]}
                  onPress={() => handlePickSavedSite(site)}
                  activeOpacity={0.75}>
                  <Text style={styles.siteChipText} numberOfLines={1}>{site.name}</Text>
                  <Text style={styles.siteChipRadius}>{site.radiusMeters}m</Text>
                </TouchableOpacity>
              ))}
            </View>
          </View>
        )}

        {/* Confirm Button */}
        <TouchableOpacity
          style={[styles.confirmBtn, !isSelected && styles.confirmBtnDisabled]}
          onPress={handleConfirm}
          disabled={!isSelected}
          activeOpacity={0.85}>
          <Text style={styles.confirmBtnText}>
            {isSelected ? `✓ Assign Location (${radius}m radius)` : 'Select Location to Continue'}
          </Text>
        </TouchableOpacity>

        <View style={{ height: 60 }} />
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: colors.bg },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    paddingTop: spacing.xl + spacing.md,
    paddingBottom: spacing.md,
    paddingHorizontal: spacing.lg,
    borderBottomWidth: 1,
    borderBottomColor: colors.line,
  },
  headerTitle: { fontSize: 17, fontWeight: '800', color: colors.text },
  headerSub: { fontSize: 12, color: colors.textDim, marginTop: 2 },
  cancelBtn: { padding: spacing.sm },
  cancelText: { fontSize: 14, fontWeight: '600', color: colors.textDim },

  panel: { flex: 1, padding: spacing.md },

  gpsCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: borderRadius.md,
    padding: spacing.md,
    borderWidth: 1,
    borderColor: colors.line,
    marginBottom: spacing.md,
    ...shadows.sm,
  },
  gpsCardHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  gpsCardTitle: { fontSize: 14, fontWeight: '700', color: colors.text },
  gpsCardDesc: { fontSize: 12, color: colors.textDim, marginTop: 4, marginBottom: spacing.md, lineHeight: 17 },
  liveLocationBtn: {
    backgroundColor: colors.accent,
    paddingVertical: spacing.md,
    borderRadius: borderRadius.md,
    alignItems: 'center',
    justifyContent: 'center',
  },
  liveLocationBtnText: { color: '#FFFFFF', fontSize: 13.5, fontWeight: '700' },

  activeZoneBox: {
    backgroundColor: '#FFFFFF',
    borderRadius: borderRadius.md,
    borderWidth: 1,
    borderColor: '#86EFAC',
    marginBottom: spacing.md,
    overflow: 'hidden',
    ...shadows.sm,
  },
  activeZoneHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: spacing.md,
    gap: spacing.sm,
  },
  radarIcon: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: colors.successDim,
    alignItems: 'center',
    justifyContent: 'center',
  },
  activeZoneTitle: { fontSize: 13, fontWeight: '700', color: colors.text },
  activeZoneCoords: { fontFamily: MONO, fontSize: 11, color: colors.textDim, marginTop: 2 },
  radiusBadge: {
    backgroundColor: colors.accentDim,
    paddingHorizontal: spacing.sm,
    paddingVertical: 4,
    borderRadius: borderRadius.xs,
  },
  radiusBadgeText: { fontSize: 11.5, fontWeight: '800', color: colors.accent },
  zoneAccuracyBar: {
    backgroundColor: colors.successDim,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.xs + 3,
    borderTopWidth: 1,
    borderTopColor: '#BBF7D0',
  },
  zoneAccuracyText: { fontSize: 11.5, color: colors.success, fontWeight: '600' },

  emptyZoneBox: {
    backgroundColor: '#FFFFFF',
    borderRadius: borderRadius.md,
    borderWidth: 1,
    borderColor: colors.line,
    borderStyle: 'dashed',
    padding: spacing.lg,
    alignItems: 'center',
    marginBottom: spacing.md,
  },
  emptyZoneIcon: { fontSize: 28, marginBottom: 4 },
  emptyZoneTitle: { fontSize: 13.5, fontWeight: '700', color: colors.text },
  emptyZoneSub: { fontSize: 11.5, color: colors.textDim, marginTop: 2, textAlign: 'center' },

  fieldGroup: { marginBottom: spacing.md },
  fieldLabel: {
    fontSize: 10.5,
    fontWeight: '700',
    color: colors.textFaint,
    letterSpacing: 0.8,
    marginBottom: 6,
  },
  input: {
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: colors.line,
    borderRadius: borderRadius.md,
    padding: spacing.md,
    fontSize: 14,
    color: colors.text,
  },

  radiusRow: { flexDirection: 'row', gap: spacing.sm },
  radiusChip: {
    flex: 1,
    paddingVertical: spacing.sm,
    borderRadius: borderRadius.md,
    backgroundColor: '#FFFFFF',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: colors.line,
  },
  radiusChipActive: { backgroundColor: colors.accent, borderColor: colors.accent },
  radiusChipText: { fontSize: 13, fontWeight: '700', color: colors.textDim },
  radiusChipTextActive: { color: '#FFFFFF' },

  coordRow: { flexDirection: 'row', gap: spacing.xs, alignItems: 'center' },
  coordInput: { flex: 1, paddingVertical: spacing.sm, fontSize: 12.5, fontFamily: MONO },
  applyBtn: {
    backgroundColor: colors.text,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm + 4,
    borderRadius: borderRadius.md,
  },
  applyBtnText: { color: '#FFFFFF', fontWeight: '700', fontSize: 12.5 },

  sitesRow: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm },
  siteChip: {
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.xs + 2,
    borderRadius: borderRadius.md,
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: colors.line,
    flexDirection: 'row',
    gap: 5,
    alignItems: 'center',
  },
  siteChipActive: { borderColor: colors.accent, backgroundColor: colors.accentDim },
  siteChipText: { fontSize: 12.5, fontWeight: '600', color: colors.text, maxWidth: 160 },
  siteChipRadius: { fontSize: 11, color: colors.textDim },

  confirmBtn: {
    backgroundColor: colors.accent,
    paddingVertical: spacing.md + 2,
    borderRadius: borderRadius.md,
    alignItems: 'center',
    marginTop: spacing.sm,
    ...shadows.sm,
  },
  confirmBtnDisabled: { backgroundColor: '#CBD5E1' },
  confirmBtnText: { ...typography.button, color: '#FFFFFF', fontSize: 14.5 },
});
