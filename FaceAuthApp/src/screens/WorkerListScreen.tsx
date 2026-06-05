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
import { colors, spacing, borderRadius, typography, shadows } from '../theme';
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
      'Remove Worker',
      `Remove ${user.name} (${user.employeeId})?\n\nThis will delete their face data and cannot be undone.`,
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
        <Text style={styles.name}>{item.name}</Text>
        <Text style={styles.empId}>{item.employeeId}</Text>
        {item.aadhar && (
          <Text style={styles.aadhar}>{maskAadhar(item.aadhar)}</Text>
        )}
        <View style={styles.metaRow}>
          <Text style={styles.meta}>Enrolled: {formatDate(item.createdAt)}</Text>
          <View style={[styles.syncBadge, { backgroundColor: item.synced ? colors.successLight : colors.warningLight }]}>
            <Text style={[styles.syncText, { color: item.synced ? colors.success : colors.warning }]}>
              {item.synced ? 'Synced' : 'Pending'}
            </Text>
          </View>
        </View>
        {item.bioHash && (
          <View style={styles.secBadge}>
            <Text style={styles.secBadgeText}>BioHash Protected</Text>
          </View>
        )}
      </View>
      <TouchableOpacity
        style={styles.deleteBtn}
        onPress={() => handleDelete(item)}>
        <Text style={styles.deleteIcon}>{'x'}</Text>
      </TouchableOpacity>
    </View>
  );

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <View style={styles.countRow}>
          <Text style={styles.count}>{filtered.length}</Text>
          <Text style={styles.countLabel}>
            {filtered.length === users.length ? 'Workers' : `of ${users.length}`}
          </Text>
        </View>
        <TextInput
          style={styles.searchInput}
          value={search}
          onChangeText={handleSearch}
          placeholder="Search by name or ID..."
          placeholderTextColor={colors.textLight}
        />
      </View>

      <TouchableOpacity
        style={styles.addBtn}
        onPress={() => navigation.navigate('Enroll', { role: 'worker' })}>
        <Text style={styles.addIcon}>+</Text>
        <Text style={styles.addText}>Add New Worker</Text>
      </TouchableOpacity>

      {filtered.length === 0 ? (
        <View style={styles.empty}>
          <Text style={styles.emptyIcon}>{'?'}</Text>
          <Text style={styles.emptyText}>
            {search ? 'No workers match your search' : 'No workers enrolled yet'}
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
  container: { flex: 1, backgroundColor: colors.background },
  header: {
    backgroundColor: colors.surface, padding: spacing.md, borderBottomWidth: 1, borderBottomColor: colors.line,
  },
  countRow: { flexDirection: 'row', alignItems: 'baseline', gap: spacing.sm },
  count: { fontSize: 28, fontWeight: '700', color: colors.primary },
  countLabel: { ...typography.bodySmall },
  searchInput: {
    backgroundColor: colors.background, borderRadius: borderRadius.md,
    padding: spacing.sm, paddingHorizontal: spacing.md, marginTop: spacing.sm,
    fontSize: 15, color: colors.text,
  },
  addBtn: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
    backgroundColor: colors.primary, margin: spacing.md,
    paddingVertical: spacing.md, borderRadius: borderRadius.md,
    gap: spacing.sm, ...shadows.md,
  },
  addIcon: { fontSize: 22, color: colors.white, fontWeight: '700' },
  addText: { ...typography.button, color: colors.white },
  list: { padding: spacing.md, paddingTop: 0 },
  card: {
    flexDirection: 'row', backgroundColor: colors.surface,
    borderRadius: borderRadius.md, padding: spacing.md,
    marginBottom: spacing.sm, ...shadows.sm,
  },
  avatar: {
    width: 48, height: 48, borderRadius: 24,
    backgroundColor: colors.primaryLight, alignItems: 'center',
    justifyContent: 'center', marginRight: spacing.md,
  },
  avatarText: { fontSize: 20, fontWeight: '600', color: colors.primary },
  info: { flex: 1 },
  name: { ...typography.body, fontWeight: '600' },
  empId: { ...typography.caption, marginTop: 1 },
  aadhar: { ...typography.caption, color: colors.textSecondary, marginTop: 1 },
  metaRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm, marginTop: spacing.xs },
  meta: { ...typography.caption },
  syncBadge: {
    paddingHorizontal: spacing.sm, paddingVertical: 1,
    borderRadius: borderRadius.sm,
  },
  syncText: { fontSize: 10, fontWeight: '600' },
  secBadge: {
    backgroundColor: colors.secondaryLight, paddingHorizontal: spacing.sm,
    paddingVertical: 1, borderRadius: borderRadius.sm, marginTop: spacing.xs,
    alignSelf: 'flex-start',
  },
  secBadgeText: { fontSize: 10, fontWeight: '600', color: colors.secondary },
  deleteBtn: {
    width: 32, height: 32, borderRadius: 16,
    backgroundColor: colors.errorLight, alignItems: 'center',
    justifyContent: 'center', alignSelf: 'center',
  },
  deleteIcon: { fontSize: 16, fontWeight: '700', color: colors.error },
  empty: {
    flex: 1, alignItems: 'center', justifyContent: 'center', padding: spacing.xl,
  },
  emptyIcon: { fontSize: 48 },
  emptyText: { ...typography.body, marginTop: spacing.md, textAlign: 'center' },
});
