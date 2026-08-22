import React, { useState, useMemo } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  Modal,
  FlatList,
  TextInput,
  StyleSheet,
  Dimensions,
  TouchableWithoutFeedback,
  SafeAreaView,
} from 'react-native';
import { colors, fonts, spacing, borderRadius, shadows } from '../theme';

const { height: SCREEN_H } = Dimensions.get('window');

interface Props {
  label: string;
  placeholder?: string;
  options: string[];
  value: string;
  onSelect: (v: string) => void;
  error?: string;
  searchable?: boolean;
}

export default function DropdownPicker({
  label,
  placeholder = 'Select an option',
  options,
  value,
  onSelect,
  error,
  searchable = true,
}: Props) {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState('');

  const filtered = useMemo(
    () =>
      query.trim()
        ? options.filter(o => o.toLowerCase().includes(query.toLowerCase()))
        : options,
    [options, query],
  );

  function handleSelect(opt: string) {
    onSelect(opt);
    setOpen(false);
    setQuery('');
  }

  function handleClose() {
    setOpen(false);
    setQuery('');
  }

  return (
    <View style={s.wrap}>
      {/* Label */}
      <Text style={s.label}>{label}</Text>

      {/* Trigger */}
      <TouchableOpacity
        style={[s.trigger, error ? s.triggerErr : open ? s.triggerOpen : null]}
        onPress={() => setOpen(true)}
        activeOpacity={0.8}>
        <Text
          style={[s.triggerText, !value && s.triggerPlaceholder]}
          numberOfLines={1}>
          {value || placeholder}
        </Text>
        <Text style={[s.chevron, open && s.chevronUp]}>›</Text>
      </TouchableOpacity>

      {/* Error */}
      {error ? <Text style={s.err}>{error}</Text> : null}

      {/* Modal */}
      <Modal
        visible={open}
        transparent
        animationType="slide"
        onRequestClose={handleClose}
        statusBarTranslucent>
        <TouchableWithoutFeedback onPress={handleClose}>
          <View style={s.overlay} />
        </TouchableWithoutFeedback>

        <View style={s.sheet}>
          {/* Sheet Header */}
          <View style={s.sheetHeader}>
            <View style={s.sheetPill} />
            <Text style={s.sheetTitle}>{label.replace(' *', '')}</Text>
            <TouchableOpacity onPress={handleClose} style={s.closeBtn} activeOpacity={0.7}>
              <Text style={s.closeText}>✕</Text>
            </TouchableOpacity>
          </View>

          {/* Search */}
          {searchable && (
            <View style={s.searchWrap}>
              <Text style={s.searchIcon}>🔍</Text>
              <TextInput
                style={s.searchInput}
                placeholder={`Search ${label.replace(' *', '').toLowerCase()}...`}
                placeholderTextColor={colors.textFaint}
                value={query}
                onChangeText={setQuery}
                autoCapitalize="none"
              />
              {query.length > 0 && (
                <TouchableOpacity onPress={() => setQuery('')} activeOpacity={0.7}>
                  <Text style={s.searchClear}>✕</Text>
                </TouchableOpacity>
              )}
            </View>
          )}

          {/* Options List */}
          <FlatList
            data={filtered}
            keyExtractor={item => item}
            showsVerticalScrollIndicator={false}
            contentContainerStyle={s.listContent}
            keyboardShouldPersistTaps="handled"
            ListEmptyComponent={
              <View style={s.emptyWrap}>
                <Text style={s.emptyText}>No results found</Text>
              </View>
            }
            renderItem={({ item }) => {
              const selected = item === value;
              return (
                <TouchableOpacity
                  style={[s.option, selected && s.optionSelected]}
                  onPress={() => handleSelect(item)}
                  activeOpacity={0.75}>
                  <Text style={[s.optionText, selected && s.optionTextSelected]}>
                    {item}
                  </Text>
                  {selected && <Text style={s.checkmark}>✓</Text>}
                </TouchableOpacity>
              );
            }}
          />
        </View>
      </Modal>
    </View>
  );
}

const s = StyleSheet.create({
  wrap: { marginBottom: spacing.md },

  label: {
    fontFamily: fonts.medium,
    fontSize: 12.5,
    color: colors.text,
    marginBottom: 5,
  },

  /* Trigger button */
  trigger: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    borderWidth: 1,
    borderColor: colors.line,
    borderRadius: borderRadius.md,
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md + 2,
    backgroundColor: colors.surfaceAlt,
    minHeight: 48,
  },
  triggerOpen: {
    borderColor: colors.primary,
    backgroundColor: colors.primaryDim,
  },
  triggerErr: {
    borderColor: colors.danger,
    backgroundColor: colors.dangerDim,
  },
  triggerText: {
    flex: 1,
    fontFamily: fonts.regular,
    fontSize: 13.5,
    color: colors.text,
  },
  triggerPlaceholder: {
    color: colors.textFaint,
  },
  chevron: {
    fontSize: 22,
    color: colors.textDim,
    transform: [{ rotate: '90deg' }],
    marginLeft: spacing.sm,
    lineHeight: 24,
  },
  chevronUp: {
    transform: [{ rotate: '-90deg' }],
    color: colors.primary,
  },

  err: {
    fontFamily: fonts.regular,
    fontSize: 11.5,
    color: colors.danger,
    marginTop: 3,
  },

  /* Overlay */
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(44, 53, 64, 0.45)',
  },

  /* Bottom Sheet */
  sheet: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    backgroundColor: colors.bg,
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    maxHeight: SCREEN_H * 0.72,
    paddingBottom: spacing.xxxl,
    ...shadows.lg,
  },
  sheetHeader: {
    alignItems: 'center',
    paddingTop: spacing.md,
    paddingBottom: spacing.md,
    paddingHorizontal: spacing.xl,
    borderBottomWidth: 1,
    borderBottomColor: colors.line,
    position: 'relative',
  },
  sheetPill: {
    width: 40,
    height: 4,
    borderRadius: 2,
    backgroundColor: colors.line,
    marginBottom: spacing.sm,
  },
  sheetTitle: {
    fontFamily: fonts.semiBold,
    fontSize: 16,
    color: colors.text,
  },
  closeBtn: {
    position: 'absolute',
    right: spacing.xl,
    top: spacing.lg,
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: colors.surfaceAlt,
    alignItems: 'center',
    justifyContent: 'center',
  },
  closeText: {
    fontFamily: fonts.medium,
    fontSize: 12,
    color: colors.textDim,
  },

  /* Search */
  searchWrap: {
    flexDirection: 'row',
    alignItems: 'center',
    margin: spacing.lg,
    marginBottom: spacing.sm,
    borderWidth: 1,
    borderColor: colors.line,
    borderRadius: borderRadius.lg,
    paddingHorizontal: spacing.md,
    backgroundColor: colors.surfaceAlt,
  },
  searchIcon: { fontSize: 14, marginRight: spacing.sm },
  searchInput: {
    flex: 1,
    fontFamily: fonts.regular,
    fontSize: 13.5,
    color: colors.text,
    paddingVertical: spacing.md,
  },
  searchClear: {
    fontFamily: fonts.medium,
    fontSize: 12,
    color: colors.textDim,
    padding: spacing.sm,
  },

  /* List */
  listContent: { paddingHorizontal: spacing.lg, paddingTop: spacing.sm },

  option: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: spacing.md + 2,
    paddingHorizontal: spacing.md,
    borderRadius: borderRadius.md,
    marginBottom: 4,
  },
  optionSelected: {
    backgroundColor: colors.primaryDim,
  },
  optionText: {
    fontFamily: fonts.regular,
    fontSize: 14,
    color: colors.text,
    flex: 1,
  },
  optionTextSelected: {
    fontFamily: fonts.semiBold,
    color: colors.primary,
  },
  checkmark: {
    fontFamily: fonts.bold,
    fontSize: 14,
    color: colors.primary,
    marginLeft: spacing.sm,
  },

  emptyWrap: { alignItems: 'center', paddingVertical: spacing.xxl },
  emptyText: { fontFamily: fonts.regular, fontSize: 13, color: colors.textFaint },
});
