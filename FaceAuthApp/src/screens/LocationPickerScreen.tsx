import React, { useCallback, useEffect, useRef, useState } from 'react';
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
import MapView, { Marker, Circle, PROVIDER_GOOGLE } from 'react-native-maps';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import { colors, spacing, borderRadius, typography, shadows, MONO } from '../theme';
import { getCurrentLocation, getWorkSites, haversineDistance } from '../services/geofencing';
import type { RootStackParamList, AssignedLocation, WorkSite } from '../types';

type Props = NativeStackScreenProps<RootStackParamList, 'LocationPicker'>;

const RADIUS_OPTIONS = [50, 100, 200, 500];

export default function LocationPickerScreen({ navigation, route }: Props) {
  const { workerName, onConfirm } = route.params;

  const mapRef = useRef<MapView>(null);
  const [selectedLat, setSelectedLat] = useState<number | null>(null);
  const [selectedLon, setSelectedLon] = useState<number | null>(null);
  const [radius, setRadius] = useState<number>(100);
  const [label, setLabel] = useState<string>('');
  const [gettingLocation, setGettingLocation] = useState(false);
  const [workSites, setWorkSites] = useState<WorkSite[]>([]);
  const [initialRegion, setInitialRegion] = useState({
    latitude: 28.6139, longitude: 77.2090, // Delhi default
    latitudeDelta: 0.02, longitudeDelta: 0.02,
  });

  useEffect(() => {
    loadSites();
    getInitialLocation();
  }, []);

  const loadSites = async () => {
    const sites = await getWorkSites();
    setWorkSites(sites);
  };

  const getInitialLocation = async () => {
    const loc = await getCurrentLocation();
    if (loc) {
      setInitialRegion({
        latitude: loc.latitude,
        longitude: loc.longitude,
        latitudeDelta: 0.01,
        longitudeDelta: 0.01,
      });
    }
  };

  const handleUseCurrentLocation = async () => {
    setGettingLocation(true);
    const loc = await getCurrentLocation();
    setGettingLocation(false);
    if (!loc) {
      Alert.alert('GPS Error', 'Could not get current location. Please ensure GPS is enabled and permissions are granted.');
      return;
    }
    setSelectedLat(loc.latitude);
    setSelectedLon(loc.longitude);
    mapRef.current?.animateToRegion({
      latitude: loc.latitude,
      longitude: loc.longitude,
      latitudeDelta: 0.005,
      longitudeDelta: 0.005,
    }, 800);
    if (!label) setLabel(`Work Site near ${loc.latitude.toFixed(4)}, ${loc.longitude.toFixed(4)}`);
  };

  const handleMapPress = (e: any) => {
    const { latitude, longitude } = e.nativeEvent.coordinate;
    setSelectedLat(latitude);
    setSelectedLon(longitude);
    if (!label) setLabel(`Work Site at ${latitude.toFixed(4)}, ${longitude.toFixed(4)}`);
  };

  const handlePickSavedSite = (site: WorkSite) => {
    setSelectedLat(site.latitude);
    setSelectedLon(site.longitude);
    setLabel(site.name);
    mapRef.current?.animateToRegion({
      latitude: site.latitude,
      longitude: site.longitude,
      latitudeDelta: 0.008,
      longitudeDelta: 0.008,
    }, 800);
  };

  const handleConfirm = () => {
    if (selectedLat === null || selectedLon === null) {
      Alert.alert('No Location Selected', 'Please tap on the map or use current location to select a work site.');
      return;
    }
    if (!label.trim()) {
      Alert.alert('Label Required', 'Please enter a name for this work location.');
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

      {/* Map */}
      <View style={styles.mapContainer}>
        <MapView
          ref={mapRef}
          style={styles.map}
          provider={PROVIDER_GOOGLE}
          initialRegion={initialRegion}
          onPress={handleMapPress}
          showsUserLocation
          showsMyLocationButton={false}
          mapType="standard">

          {isSelected && (
            <>
              <Marker
                coordinate={{ latitude: selectedLat!, longitude: selectedLon! }}
                title={label || 'Work Site'}
                description={`Radius: ${radius}m`}
                pinColor={colors.accent}>
              </Marker>
              <Circle
                center={{ latitude: selectedLat!, longitude: selectedLon! }}
                radius={radius}
                fillColor="rgba(234, 88, 12, 0.12)"
                strokeColor="rgba(234, 88, 12, 0.55)"
                strokeWidth={2}
              />
            </>
          )}

          {/* Existing work sites as grey markers */}
          {workSites.map(site => (
            <React.Fragment key={site.id}>
              <Marker
                coordinate={{ latitude: site.latitude, longitude: site.longitude }}
                title={site.name}
                description={`Radius: ${site.radiusMeters}m`}
                pinColor="#64748B"
              />
              <Circle
                center={{ latitude: site.latitude, longitude: site.longitude }}
                radius={site.radiusMeters}
                fillColor="rgba(100, 116, 139, 0.08)"
                strokeColor="rgba(100, 116, 139, 0.35)"
                strokeWidth={1.5}
              />
            </React.Fragment>
          ))}
        </MapView>

        {/* Map hint overlay */}
        <View style={styles.mapHint}>
          <Text style={styles.mapHintText}>
            {isSelected ? `📍 ${selectedLat!.toFixed(5)}, ${selectedLon!.toFixed(5)}` : 'Tap on map to place pin'}
          </Text>
        </View>

        {/* My Location button */}
        <TouchableOpacity style={styles.myLocationBtn} onPress={handleUseCurrentLocation} disabled={gettingLocation} activeOpacity={0.85}>
          {gettingLocation
            ? <ActivityIndicator size="small" color={colors.accent} />
            : <Text style={styles.myLocationText}>📍</Text>}
        </TouchableOpacity>
      </View>

      {/* Controls Panel */}
      <ScrollView style={styles.panel} keyboardShouldPersistTaps="handled">
        {/* Location Name */}
        <View style={styles.fieldGroup}>
          <Text style={styles.fieldLabel}>LOCATION NAME</Text>
          <TextInput
            style={styles.input}
            value={label}
            onChangeText={setLabel}
            placeholder="e.g. NHAI Highway Site 4A, Bridge Section B"
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

        {/* Quick Pick from Saved Sites */}
        {workSites.length > 0 && (
          <View style={styles.fieldGroup}>
            <Text style={styles.fieldLabel}>OR PICK FROM SAVED SITES</Text>
            <View style={styles.sitesRow}>
              {workSites.map(site => (
                <TouchableOpacity
                  key={site.id}
                  style={[styles.siteChip, (selectedLat === site.latitude && selectedLon === site.longitude) && styles.siteChipActive]}
                  onPress={() => handlePickSavedSite(site)}
                  activeOpacity={0.75}>
                  <Text style={styles.siteChipText} numberOfLines={1}>{site.name}</Text>
                  <Text style={styles.siteChipRadius}>{site.radiusMeters}m</Text>
                </TouchableOpacity>
              ))}
            </View>
          </View>
        )}

        {/* Info Box */}
        {isSelected && (
          <View style={styles.infoBox}>
            <Text style={styles.infoTitle}>📌 Work Zone Configured</Text>
            <Text style={styles.infoText}>
              Worker <Text style={{ fontWeight: '700' }}>{workerName}</Text> must be within{' '}
              <Text style={{ fontWeight: '700', color: colors.accent }}>{radius}m</Text> of this
              location to mark attendance. Distance is checked each time they scan their face.
            </Text>
          </View>
        )}

        {/* Confirm Button */}
        <TouchableOpacity
          style={[styles.confirmBtn, !isSelected && styles.confirmBtnDisabled]}
          onPress={handleConfirm}
          disabled={!isSelected}
          activeOpacity={0.85}>
          <Text style={styles.confirmBtnText}>
            {isSelected ? `✓ Confirm Work Zone (${radius}m radius)` : 'Select a location on the map'}
          </Text>
        </TouchableOpacity>

        <View style={{ height: 80 }} />
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: colors.bg },
  header: {
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
    backgroundColor: '#FFFFFF', paddingTop: spacing.xl + spacing.lg,
    paddingBottom: spacing.md, paddingHorizontal: spacing.lg,
    borderBottomWidth: 1, borderBottomColor: colors.line,
  },
  headerTitle: { fontSize: 17, fontWeight: '800', color: colors.text },
  headerSub: { fontSize: 12, color: colors.textDim, marginTop: 2 },
  cancelBtn: { padding: spacing.sm },
  cancelText: { fontSize: 14, fontWeight: '600', color: colors.textDim },

  mapContainer: { height: 300, position: 'relative' },
  map: { flex: 1 },

  mapHint: {
    position: 'absolute', top: spacing.md, left: 0, right: 0, alignItems: 'center',
  },
  mapHintText: {
    backgroundColor: 'rgba(15, 23, 42, 0.85)', color: '#FFFFFF',
    fontSize: 12, fontWeight: '600', paddingHorizontal: spacing.md,
    paddingVertical: 5, borderRadius: borderRadius.full,
  },

  myLocationBtn: {
    position: 'absolute', bottom: spacing.md, right: spacing.md,
    width: 44, height: 44, borderRadius: 22,
    backgroundColor: '#FFFFFF', alignItems: 'center', justifyContent: 'center',
    ...shadows.md,
  },
  myLocationText: { fontSize: 20 },

  panel: { flex: 1, padding: spacing.md },

  fieldGroup: { marginBottom: spacing.md },
  fieldLabel: {
    fontSize: 10.5, fontWeight: '700', color: colors.textFaint,
    letterSpacing: 0.8, marginBottom: 6,
  },
  input: {
    backgroundColor: '#FFFFFF', borderWidth: 1, borderColor: colors.line,
    borderRadius: borderRadius.md, padding: spacing.md, fontSize: 14,
    color: colors.text,
  },

  radiusRow: { flexDirection: 'row', gap: spacing.sm },
  radiusChip: {
    flex: 1, paddingVertical: spacing.sm, borderRadius: borderRadius.md,
    backgroundColor: '#FFFFFF', alignItems: 'center', borderWidth: 1, borderColor: colors.line,
  },
  radiusChipActive: { backgroundColor: colors.accent, borderColor: colors.accent },
  radiusChipText: { fontSize: 13, fontWeight: '700', color: colors.textDim },
  radiusChipTextActive: { color: '#FFFFFF' },

  sitesRow: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm },
  siteChip: {
    paddingHorizontal: spacing.md, paddingVertical: spacing.xs + 2,
    borderRadius: borderRadius.md, backgroundColor: '#FFFFFF',
    borderWidth: 1, borderColor: colors.line, flexDirection: 'row', gap: 5, alignItems: 'center',
  },
  siteChipActive: { borderColor: colors.accent, backgroundColor: colors.accentDim },
  siteChipText: { fontSize: 12.5, fontWeight: '600', color: colors.text, maxWidth: 160 },
  siteChipRadius: { fontSize: 11, color: colors.textDim },

  infoBox: {
    backgroundColor: '#FFFBF7', borderRadius: borderRadius.md, padding: spacing.md,
    marginBottom: spacing.md, borderWidth: 1, borderColor: '#FED7AA',
  },
  infoTitle: { fontSize: 13, fontWeight: '700', color: colors.accent },
  infoText: { fontSize: 12.5, color: colors.textDim, marginTop: 4, lineHeight: 18 },

  confirmBtn: {
    backgroundColor: colors.accent, paddingVertical: spacing.md + 2,
    borderRadius: borderRadius.md, alignItems: 'center', ...shadows.sm,
  },
  confirmBtnDisabled: { backgroundColor: '#CBD5E1' },
  confirmBtnText: { ...typography.button, color: '#FFFFFF', fontSize: 14.5 },
});
