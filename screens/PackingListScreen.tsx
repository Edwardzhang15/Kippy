import { useEffect, useMemo, useRef, useState } from 'react';
import {
  Alert,
  Dimensions,
  Modal,
  Pressable,
  SafeAreaView,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation, useRoute } from '@react-navigation/native';
import { captureRef } from 'react-native-view-shot';
import * as Sharing from 'expo-sharing';
import { useTranslation } from 'react-i18next';
import { colors, fontSizes, radii, cardShadow } from '../theme';
import PackingListShareCard from '../components/PackingListShareCard';
import {
  getGroup,
  getPackingItems,
  setPackingItems,
  togglePackingItem,
  addPackingItem,
  deletePackingItem,
  PackingItem,
  Group,
} from '../db';
import {
  buildPackingList,
  getSeason,
  getTripDays,
  Vibe,
  PackingCategory,
} from '../data/packingRules';

const CATEGORY_ORDER: PackingCategory[] = [
  'Documents & Essentials',
  'Electronics',
  'Toiletries',
  'Clothing',
  'Comfort & Sleep',
  'Health & Safety',
];

const CATEGORY_I18N_KEY: Partial<Record<PackingCategory, string>> = {
  'Documents & Essentials': 'documents_essentials',
  'Electronics':            'electronics',
  'Toiletries':             'toiletries',
  'Clothing':               'clothing',
  'Comfort & Sleep':        'comfort_sleep',
  'Health & Safety':        'health_safety',
};

const CATEGORY_ICONS: Record<PackingCategory, string> = {
  'Documents & Essentials': 'document-text-outline',
  'Electronics':            'phone-portrait-outline',
  'Toiletries':             'water-outline',
  'Clothing':               'shirt-outline',
  'Comfort & Sleep':        'bed-outline',
  'Health & Safety':        'medical-outline',
};

const VIBES: { key: Vibe | null; labelKey: string }[] = [
  { key: null,        labelKey: 'packingList.vibeGeneral' },
  { key: 'beach',     labelKey: 'packingList.vibeBeach' },
  { key: 'adventure', labelKey: 'packingList.vibeAdventure' },
  { key: 'city',      labelKey: 'packingList.vibeCity' },
  { key: 'food',      labelKey: 'packingList.vibeFood' },
  { key: 'party',     labelKey: 'packingList.vibeParty' },
];

const { width: screenW } = Dimensions.get('window');

function tPackingItem(
  item: PackingItem,
  t: (key: string, opts?: Record<string, unknown>) => string,
): string {
  if (!item.label_key) return item.label;
  const [key, countStr] = item.label_key.split(':');
  const count = countStr ? parseInt(countStr, 10) : undefined;
  return t(key, count !== undefined ? { count } : {});
}

export default function PackingListScreen() {
  const navigation = useNavigation<any>();
  const { t } = useTranslation();
  const { groupId } = useRoute<any>().params as { groupId: number };
  const tCategory = (cat: string) => {
    const key = CATEGORY_I18N_KEY[cat as PackingCategory];
    return key ? t(`packingList.category.${key}`, cat) : cat;
  };

  const [group, setGroup] = useState<Group | null>(null);
  const [items, setItems] = useState<PackingItem[]>([]);
  const [vibe, setVibe] = useState<Vibe | null>(null);
  const [collapsed, setCollapsed] = useState<Set<string>>(new Set());
  const [addingTo, setAddingTo] = useState<string | null>(null);
  const [customLabel, setCustomLabel] = useState('');
  const [loading, setLoading] = useState(true);

  const [showShareModal, setShowShareModal] = useState(false);
  const [sharing, setSharing] = useState(false);
  const [sharePageIndex, setSharePageIndex] = useState(0);
  const pageRefs = useRef<(View | null)[]>([]);

  const byCategory = useMemo(() => {
    const map: Record<string, PackingItem[]> = {};
    for (const item of items) {
      if (!map[item.category]) map[item.category] = [];
      map[item.category].push(item);
    }
    return map;
  }, [items]);

  const orderedCategories = useMemo(() => [
    ...CATEGORY_ORDER.filter((c) => byCategory[c]),
    ...Object.keys(byCategory).filter(
      (c) => !CATEGORY_ORDER.includes(c as PackingCategory),
    ),
  ], [byCategory]);

  const checkedCount = items.filter((i) => i.is_checked).length;

  const handleShare = async () => {
    const viewNode = pageRefs.current[sharePageIndex];
    if (!viewNode) return;
    setSharing(true);
    try {
      const uri = await captureRef(viewNode as any, { format: 'png', quality: 1, pixelRatio: 3 });
      await Sharing.shareAsync(uri, { mimeType: 'image/png', dialogTitle: t('packingList.title') });
    } catch {
      Alert.alert(t('packingList.shareError'), t('packingList.shareErrorMsg'));
    } finally {
      setSharing(false);
    }
  };

  useEffect(() => {
    (async () => {
      const [g, existing] = await Promise.all([
        getGroup(groupId),
        getPackingItems(groupId),
      ]);
      setGroup(g);
      if (existing.length === 0 && g) {
        const days = getTripDays(g.planned_start_date, g.planned_end_date);
        const season = getSeason(g.planned_start_date);
        const generated = buildPackingList(null, days, season);
        await setPackingItems(groupId, generated);
        setItems(await getPackingItems(groupId));
      } else {
        setItems(existing);
      }
      setLoading(false);
    })();
  }, [groupId]);

  const doRegenerate = async (newVibe: Vibe | null, currentGroup: Group) => {
    const days = getTripDays(currentGroup.planned_start_date, currentGroup.planned_end_date);
    const season = getSeason(currentGroup.planned_start_date);
    const generated = buildPackingList(newVibe, days, season);
    await setPackingItems(groupId, generated);
    setItems(await getPackingItems(groupId));
  };

  const handleVibeSelect = (newVibe: Vibe | null) => {
    if (newVibe === vibe || !group) return;
    const checked = items.filter((i) => i.is_checked).length;
    if (checked > 0) {
      Alert.alert(
        t('packingList.regenerateTitle'),
        t('packingList.regenerateMsg', { checked }),
        [
          { text: t('common.cancel'), style: 'cancel' },
          {
            text: t('packingList.regenerate'),
            style: 'destructive',
            onPress: () => { setVibe(newVibe); doRegenerate(newVibe, group); },
          },
        ],
      );
    } else {
      setVibe(newVibe);
      doRegenerate(newVibe, group);
    }
  };

  const handleToggle = async (item: PackingItem) => {
    const nowChecked = item.is_checked === 0;
    await togglePackingItem(item.id, nowChecked);
    setItems((prev) =>
      prev.map((i) => (i.id === item.id ? { ...i, is_checked: nowChecked ? 1 : 0 } : i)),
    );
  };

  const handleAddItem = async (category: string) => {
    const label = customLabel.trim();
    if (!label) return;
    const id = await addPackingItem(groupId, label, category);
    setItems((prev) => [
      ...prev,
      { id, group_id: groupId, label, category, is_checked: 0, label_key: null },
    ]);
    setCustomLabel('');
    setAddingTo(null);
  };

  const handleDeleteItem = (item: PackingItem) => {
    Alert.alert(t('packingList.removeItemTitle'), t('packingList.removeItemMsg', { label: tPackingItem(item, t) }), [
      { text: t('common.cancel'), style: 'cancel' },
      {
        text: t('packingList.remove'),
        style: 'destructive',
        onPress: async () => {
          await deletePackingItem(item.id);
          setItems((prev) => prev.filter((i) => i.id !== item.id));
        },
      },
    ]);
  };

  const toggleCollapse = (cat: string) => {
    setCollapsed((prev) => {
      const next = new Set(prev);
      if (next.has(cat)) next.delete(cat);
      else next.add(cat);
      return next;
    });
  };

  return (
    <SafeAreaView style={styles.safe}>
      {/* ── Header ─────────────────────────────────────────────── */}
      <View style={styles.header}>
        <Pressable onPress={() => navigation.goBack()} hitSlop={12}>
          <Ionicons name="chevron-back" size={22} color={colors.textPrimary} />
        </Pressable>
        <Text style={styles.headerTitle}>{t('packingList.title')}</Text>
        <View style={styles.headerRight}>
          <Text style={styles.headerCount}>{checkedCount}/{items.length}</Text>
          <Pressable onPress={() => { setSharePageIndex(0); setShowShareModal(true); }} hitSlop={12}>
            <Ionicons name="share-outline" size={20} color={colors.textPrimary} />
          </Pressable>
        </View>
      </View>

      <ScrollView
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
      >
        {/* ── Vibe selector ──────────────────────────────────────── */}
        <Text style={styles.sectionLabel}>{t('packingList.tripVibe')}</Text>
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          style={styles.vibeScroll}
          contentContainerStyle={styles.vibeScrollContent}
        >
          {VIBES.map(({ key, labelKey }) => (
            <Pressable
              key={String(key)}
              style={[styles.vibeChip, vibe === key && styles.vibeChipActive]}
              onPress={() => handleVibeSelect(key)}
            >
              <Text style={[styles.vibeChipText, vibe === key && styles.vibeChipTextActive]}>
                {t(labelKey)}
              </Text>
            </Pressable>
          ))}
        </ScrollView>

        {/* ── Category sections ──────────────────────────────────── */}
        {!loading && orderedCategories.map((cat) => {
          const catItems = byCategory[cat] ?? [];
          const isCollapsed = collapsed.has(cat);
          const checkedInCat = catItems.filter((i) => i.is_checked).length;
          const icon = CATEGORY_ICONS[cat as PackingCategory] ?? 'list-outline';
          const isAdding = addingTo === cat;

          return (
            <View key={cat} style={[styles.categoryCard, cardShadow]}>
              <Pressable style={styles.categoryHeader} onPress={() => toggleCollapse(cat)}>
                <View style={styles.categoryIconBg}>
                  <Ionicons name={icon as any} size={16} color={colors.coral} />
                </View>
                <Text style={styles.categoryName}>{tCategory(cat)}</Text>
                <Text style={styles.categoryCount}>
                  {checkedInCat}/{catItems.length}
                </Text>
                <Ionicons
                  name={isCollapsed ? 'chevron-forward' : 'chevron-down'}
                  size={16}
                  color={colors.textSecondary}
                />
              </Pressable>

              {!isCollapsed && (
                <>
                  {catItems.map((item) => (
                    <View key={item.id}>
                      <View style={styles.itemDivider} />
                      <Pressable
                        style={styles.itemRow}
                        onPress={() => handleToggle(item)}
                        onLongPress={() => handleDeleteItem(item)}
                      >
                        <View style={[styles.checkbox, item.is_checked ? styles.checkboxDone : null]}>
                          {item.is_checked ? (
                            <Ionicons name="checkmark" size={12} color="#fff" />
                          ) : null}
                        </View>
                        <Text
                          style={[
                            styles.itemLabel,
                            item.is_checked ? styles.itemLabelDone : null,
                          ]}
                          numberOfLines={2}
                        >
                          {tPackingItem(item, t)}
                        </Text>
                      </Pressable>
                    </View>
                  ))}

                  <View style={styles.itemDivider} />
                  {isAdding ? (
                    <View style={styles.addInputRow}>
                      <TextInput
                        style={styles.addInput}
                        placeholder={t('packingList.addItemPlaceholder')}
                        placeholderTextColor={colors.textSecondary}
                        value={customLabel}
                        onChangeText={setCustomLabel}
                        autoFocus
                        returnKeyType="done"
                        onSubmitEditing={() => handleAddItem(cat)}
                      />
                      <Pressable onPress={() => handleAddItem(cat)} hitSlop={8}>
                        <Ionicons name="checkmark-circle" size={24} color={colors.coral} />
                      </Pressable>
                      <Pressable
                        onPress={() => { setAddingTo(null); setCustomLabel(''); }}
                        hitSlop={8}
                      >
                        <Ionicons name="close-circle" size={24} color={colors.textSecondary} />
                      </Pressable>
                    </View>
                  ) : (
                    <Pressable
                      style={styles.addItemBtn}
                      onPress={() => { setAddingTo(cat); setCustomLabel(''); }}
                    >
                      <Ionicons name="add-circle-outline" size={16} color={colors.coral} />
                      <Text style={styles.addItemText}>{t('packingList.addItem')}</Text>
                    </Pressable>
                  )}
                </>
              )}
            </View>
          );
        })}

        <Text style={styles.hint}>{t('packingList.longPressHint')}</Text>
      </ScrollView>

      {/* ── Multi-page share modal ─────────────────────────────── */}
      <Modal
        visible={showShareModal}
        animationType="slide"
        presentationStyle="pageSheet"
        onRequestClose={() => setShowShareModal(false)}
      >
        <SafeAreaView style={styles.modalSafe}>
          {/* Header */}
          <View style={styles.modalHeader}>
            <Text style={styles.modalHeaderTitle}>{t('packingList.title')}</Text>
            <Pressable onPress={() => setShowShareModal(false)} hitSlop={12}>
              <Ionicons name="close" size={24} color={colors.textPrimary} />
            </Pressable>
          </View>

          {/* Page label */}
          <Text style={styles.modalPageLabel}>
            {tCategory(orderedCategories[sharePageIndex] ?? '')}
            {'  ·  '}
            {t('packingList.pageIndicator', { page: sharePageIndex + 1, total: orderedCategories.length })}
          </Text>

          {/* Swipeable card pages */}
          <ScrollView
            horizontal
            pagingEnabled
            showsHorizontalScrollIndicator={false}
            style={{ width: screenW }}
            contentContainerStyle={styles.modalScrollContent}
            onMomentumScrollEnd={(e) => {
              const page = Math.round(e.nativeEvent.contentOffset.x / screenW);
              setSharePageIndex(page);
            }}
          >
            {orderedCategories.map((cat, idx) => (
              <View key={cat} style={[styles.modalCardPage, { width: screenW }]}>
                <View ref={(r) => { pageRefs.current[idx] = r; }}>
                  <PackingListShareCard
                    tripName={group?.name ?? ''}
                    category={tCategory(cat)}
                    categoryItems={byCategory[cat] ?? []}
                    pageNumber={idx + 1}
                    totalPages={orderedCategories.length}
                    totalChecked={checkedCount}
                    totalItems={items.length}
                  />
                </View>
              </View>
            ))}
          </ScrollView>

          {/* Dot indicators */}
          <View style={styles.modalDots}>
            {orderedCategories.map((_, idx) => (
              <View
                key={idx}
                style={[styles.modalDot, sharePageIndex === idx && styles.modalDotActive]}
              />
            ))}
          </View>

          {/* Share button */}
          <View style={styles.modalFooter}>
            <Pressable
              style={[styles.shareSheetBtn, sharing && { opacity: 0.6 }]}
              onPress={handleShare}
              disabled={sharing}
            >
              <Ionicons name="share-outline" size={20} color="#fff" />
              <Text style={styles.shareSheetBtnText}>
                {sharing
                  ? t('common.sharing')
                  : t('packingList.sharePage', { page: sharePageIndex + 1, total: orderedCategories.length })}
              </Text>
            </Pressable>
          </View>
        </SafeAreaView>
      </Modal>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: {
    flex: 1,
    backgroundColor: colors.background,
  },

  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingTop: 8,
    paddingBottom: 12,
    gap: 10,
  },
  headerTitle: {
    flex: 1,
    fontSize: fontSizes.sectionTitle,
    fontWeight: '700',
    color: colors.textPrimary,
  },
  headerRight: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
  },
  headerCount: {
    fontSize: fontSizes.caption,
    color: colors.textSecondary,
    fontWeight: '600',
  },

  scrollContent: {
    paddingHorizontal: 20,
    paddingBottom: 60,
  },

  sectionLabel: {
    fontSize: fontSizes.caption,
    fontWeight: '700',
    color: colors.textSecondary,
    textTransform: 'uppercase',
    letterSpacing: 0.6,
    marginBottom: 10,
    marginTop: 4,
  },

  vibeScroll: {
    marginBottom: 20,
  },
  vibeScrollContent: {
    gap: 8,
    paddingRight: 4,
  },
  vibeChip: {
    paddingHorizontal: 14,
    paddingVertical: 7,
    borderRadius: 20,
    backgroundColor: colors.card,
    borderWidth: 1,
    borderColor: colors.border,
  },
  vibeChipActive: {
    backgroundColor: '#FFF0EE',
    borderColor: colors.coral,
  },
  vibeChipText: {
    fontSize: fontSizes.caption,
    fontWeight: '600',
    color: colors.textSecondary,
  },
  vibeChipTextActive: {
    color: colors.coral,
  },

  categoryCard: {
    backgroundColor: colors.card,
    borderRadius: radii.card,
    marginBottom: 14,
    overflow: 'hidden',
  },
  categoryHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 14,
    gap: 10,
  },
  categoryIconBg: {
    width: 32,
    height: 32,
    borderRadius: 10,
    backgroundColor: '#FFF0EE',
    alignItems: 'center',
    justifyContent: 'center',
  },
  categoryName: {
    flex: 1,
    fontSize: fontSizes.body,
    fontWeight: '700',
    color: colors.textPrimary,
  },
  categoryCount: {
    fontSize: fontSizes.caption,
    color: colors.textSecondary,
    fontWeight: '500',
    marginRight: 4,
  },

  itemDivider: {
    height: 1,
    backgroundColor: colors.border,
    marginLeft: 16,
  },
  itemRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
    gap: 12,
  },
  checkbox: {
    width: 22,
    height: 22,
    borderRadius: 6,
    borderWidth: 2,
    borderColor: colors.border,
    alignItems: 'center',
    justifyContent: 'center',
  },
  checkboxDone: {
    backgroundColor: colors.coral,
    borderColor: colors.coral,
  },
  itemLabel: {
    flex: 1,
    fontSize: fontSizes.body,
    color: colors.textPrimary,
  },
  itemLabelDone: {
    color: colors.textSecondary,
    textDecorationLine: 'line-through',
  },

  addItemBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
    gap: 8,
  },
  addItemText: {
    fontSize: fontSizes.caption,
    color: colors.coral,
    fontWeight: '600',
  },
  addInputRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 8,
    gap: 8,
  },
  addInput: {
    flex: 1,
    fontSize: fontSizes.body,
    color: colors.textPrimary,
    paddingVertical: 4,
  },

  hint: {
    textAlign: 'center',
    fontSize: fontSizes.caption,
    color: colors.tabInactive,
    marginTop: 4,
    marginBottom: 8,
  },

  // ── Share modal ──────────────────────────────────────────
  modalSafe: {
    flex: 1,
    backgroundColor: colors.background,
  },
  modalHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingVertical: 16,
  },
  modalHeaderTitle: {
    fontSize: fontSizes.sectionTitle,
    fontWeight: '700',
    color: colors.textPrimary,
  },
  modalPageLabel: {
    textAlign: 'center',
    fontSize: fontSizes.caption,
    color: colors.textSecondary,
    fontWeight: '600',
    marginBottom: 12,
    paddingHorizontal: 20,
  },
  modalScrollContent: {
    alignItems: 'center',
  },
  modalCardPage: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 8,
  },
  modalDots: {
    flexDirection: 'row',
    justifyContent: 'center',
    gap: 6,
    marginTop: 14,
    marginBottom: 4,
  },
  modalDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: colors.border,
  },
  modalDotActive: {
    width: 18,
    backgroundColor: colors.coral,
  },
  modalFooter: {
    paddingHorizontal: 20,
    paddingBottom: 16,
    paddingTop: 14,
    backgroundColor: colors.background,
  },
  shareSheetBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    backgroundColor: colors.coral,
    borderRadius: radii.button,
    paddingVertical: 15,
  },
  shareSheetBtnText: {
    color: '#fff',
    fontSize: fontSizes.body,
    fontWeight: '700',
  },
});
