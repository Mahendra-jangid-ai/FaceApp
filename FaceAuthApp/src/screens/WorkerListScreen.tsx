import React, { useCallback, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  FlatList,
  Alert,
  TextInput,
} from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import { colors, spacing, borderRadius, typography, shadows, MONO } from '../theme';
import { getEnrolledUsers, deleteUser } from '../services/database';
import { maskAadhar } from '../services/aadharValidator';
import type { RootStackParamList, EnrolledUser } from '../types';

type Props = NativeStackScreenProps<RootStackParamList, 'WorkerList'>;

export default function WorkerListScreen({ navigation }: Props) {
  const [users, setUsers] = useState<EnrolledUser[]>([]);
  const [search, setSearch] = useState('');
  const [filtered, setFiltered] = useState<EnrolledUser[]>([]);

  useFocusEffect(
    useCallback(() => {
      loadUsers();
    }, []),
  );

  const loadUsers = async () => {
    const all = await getEnrolledUsers();
    setUsers(all);
    setFiltered(all);
  };

  const handleSearch = (text: string) => {
    setSearch(text);
    if (!text.trim()) {
      setFiltered(users);
      return;
    }
    const lower = text.toLowerCase();
    setFiltered(
      users.filter(
        u =>
          u.name.toLowerCase().includes(lower) ||
          u.employeeId.toLowerCase().includes(lower),
      ),
    );
  };

  const handleDelete = (user: EnrolledUser) => {
    Alert.alert(
      'REMOVE WORKER',
      `Delete ${user.name} (${user.employeeId}) from local biometric database?\n\nThis action cannot be undone.`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Remove',
          style: 'destructive',
          onPress: async () => {
            await deleteUser(user.id);
            loadUsers();
          },
        },
      ],
    );
  };

  const formatDate = (ts: number) => {
    return new Date(ts).toLocaleDateString('en-IN', {
      day: '2-digit', month: 'short', year: 'numeric',
    });
  };

  const renderItem = ({ item }: { item: EnrolledUser }) => (
    <View style={styles.card}>
      <View style={styles.avatar}>
        <Text style={styles.avatarText}>{item.name.charAt(0).toUpperCase()}</Text>
      </View>
      <View style={styles.info}>
        <View style={styles.nameRow}>
          <Text style={styles.name}>{item.name}</Text>
          <View style={[styles.syncBadge, { backgroundColor: item.synced ? colors.successDim : colors.warnDim, borderColor: item.synced ? colors.success : colors.warn }]}>
            <Text style={[styles.syncText, { color: item.synced ? colors.success : colors.warn }]}>
              {item.synced ? 'SYNCED' : 'PENDING'}
            </Text>
          </View>
        </View>
        <Text style={styles.empId}>ID: {item.employeeId}</Text>
        {item.aadhar && (
          <Text style={styles.aadhar}>AADHAAR: {maskAadhar(item.aadhar)}</Text>
        )}
        <View style={styles.metaRow}>
          <Text style={styles.meta}>Enrolled: {formatDate(item.createdAt)}</Text>
          {item.bioHash && (
            <View style={styles.secBadge}>
              <Text style={styles.secBadgeText}>🛡️ BIOHASH SECURED</Text>
            </View>
          )}
        </View>
      </View>
      <TouchableOpacity
        style={styles.deleteBtn}
        onPress={() => handleDelete(item)}
        activeOpacity={0.75}>
        <Text style={styles.deleteIcon}>🗑️</Text>
      </TouchableOpacity>
    </View>
  );

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <View style={styles.countRow}>
          <Text style={styles.count}>{filtered.length}</Text>
          <Text style={styles.countLabel}>
            {filtered.length === users.length ? 'REGISTERED WORKERS' : `OF ${users.length} TOTAL WORKERS`}
          </Text>
        </View>
        <View style={styles.searchWrap}>
          <Text style={styles.searchIcon}>🔍</Text>
          <TextInput
            style={styles.searchInput}
            value={search}
            onChangeText={handleSearch}
            placeholder="Search worker by name or ID..."
            placeholderTextColor={colors.textFaint}
          />
          {search.length > 0 && (
            <TouchableOpacity onPress={() => handleSearch('')}>
              <Text style={styles.clearSearch}>✕</Text>
            </TouchableOpacity>
          )}
        </View>
      </View>

      <TouchableOpacity
        style={styles.addBtn}
        onPress={() => navigation.navigate('Enroll', { role: 'worker' })}
        activeOpacity={0.85}>
        <Text style={styles.addIcon}>＋</Text>
        <Text style={styles.addText}>ENROL NEW WORKER</Text>
      </TouchableOpacity>

      {filtered.length === 0 ? (
        <View style={styles.empty}>
          <View style={styles.emptyBadge}>
            <Text style={styles.emptyIcon}>👥</Text>
          </View>
          <Text style={styles.emptyText}>
            {search ? 'No workers match your search query' : 'No personnel registered yet'}
          </Text>
          <Text style={styles.emptySubtext}>
            Tap "Enrol New Worker" above to register facial biometric profiles.
          </Text>
        </View>
      ) : (
        <FlatList
          data={filtered}
          keyExtractor={item => item.id}
          renderItem={renderItem}
          contentContainerStyle={styles.list}
          showsVerticalScrollIndicator={false}
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.bg },
  header: {
    backgroundColor: colors.surface, padding: spacing.md, borderBottomWidth: 1, borderBottomColor: colors.line,
  },
  countRow: { flexDirection: 'row', alignItems: 'baseline', gap: spacing.sm, marginBottom: spacing.xs },
  count: { fontSize: 24, fontWeight: '800', color: colors.accent, fontFamily: MONO },
  countLabel: { ...typography.caption, letterSpacing: 1 },
  searchWrap: {
    flexDirection: 'row', alignItems: 'center', backgroundColor: colors.surfaceAlt,
    borderRadius: borderRadius.md, paddingHorizontal: spacing.md, borderWidth: 1, borderColor: colors.line,
    marginTop: spacing.xs,
  },
  searchIcon: { fontSize: 13, marginRight: spacing.sm },
  searchInput: {
    flex: 1, height: 40, fontSize: 13.5, color: colors.text, fontFamily: MONO,
  },
  clearSearch: { fontSize: 14, color: colors.textDim, padding: spacing.xs },
  addBtn: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
    backgroundColor: colors.accent, margin: spacing.md,
    paddingVertical: spacing.md, borderRadius: borderRadius.md,
    gap: spacing.sm, ...shadows.glowAccent,
  },
  addIcon: { fontSize: 20, color: colors.onAccent, fontWeight: '800' },
  addText: { ...typography.button, color: colors.onAccent, fontSize: 13 },
  list: { padding: spacing.md, paddingTop: 0 },
  card: {
    flexDirection: 'row', backgroundColor: colors.surface,
    borderRadius: borderRadius.lg, padding: spacing.md,
    marginBottom: spacing.sm, borderWidth: 1, borderColor: colors.line, ...shadows.sm,
  },
  avatar: {
    width: 44, height: 44, borderRadius: 22,
    backgroundColor: colors.surfaceAlt, alignItems: 'center',
    justifyContent: 'center', marginRight: spacing.md, borderWidth: 1, borderColor: colors.lineBright,
  },
  avatarText: { fontSize: 18, fontWeight: '800', color: colors.accent },
  info: { flex: 1 },
  nameRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  name: { ...typography.body, fontWeight: '700', fontSize: 14.5 },
  empId: { fontFamily: MONO, fontSize: 11, color: colors.textDim, marginTop: 1 },
  aadhar: { fontFamily: MONO, fontSize: 10.5, color: colors.textFaint, marginTop: 1 },
  metaRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm, marginTop: spacing.xs, flexWrap: 'wrap' },
  meta: { fontFamily: MONO, fontSize: 10, color: colors.textFaint },
  syncBadge: {
    paddingHorizontal: spacing.sm, paddingVertical: 2,
    borderRadius: borderRadius.xs, borderWidth: 1,
  },
  syncText: { fontSize: 8.5, fontWeight: '800', letterSpacing: 0.5 },
  secBadge: {
    backgroundColor: colors.cyanDim, paddingHorizontal: spacing.sm,
    paddingVertical: 2, borderRadius: borderRadius.xs, borderWidth: 1, borderColor: colors.cyan,
  },
  secBadgeText: { fontSize: 8.5, fontWeight: '800', color: colors.cyan, letterSpacing: 0.5 },
  deleteBtn: {
    width: 34, height: 34, borderRadius: 17,
    backgroundColor: colors.surfaceAlt, alignItems: 'center',
    justifyContent: 'center', alignSelf: 'center', marginLeft: spacing.sm,
    borderWidth: 1, borderColor: colors.line,
  },
  deleteIcon: { fontSize: 14 },
  empty: {
    flex: 1, alignItems: 'center', justifyContent: 'center', padding: spacing.xl,
  },
  emptyBadge: {
    width: 72, height: 72, borderRadius: 36,
    backgroundColor: colors.surface, alignItems: 'center', justifyContent: 'center',
    borderWidth: 1, borderColor: colors.line,
  },
  emptyIcon: { fontSize: 32 },
  emptyText: { ...typography.h3, marginTop: spacing.md, textAlign: 'center' },
  emptySubtext: { ...typography.bodySmall, marginTop: spacing.xs, textAlign: 'center', maxWidth: 260 },
});
