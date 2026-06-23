import { useEffect, useRef, useState } from 'react';
import {
  Alert,
  KeyboardAvoidingView,
  Modal,
  Platform,
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
import { type ColorPalette, fontSizes, radii, cardShadow } from '../theme';
import { useTheme } from '../context/ThemeContext';
import BudgetShareCard from '../components/BudgetShareCard';
import SharePreviewModal from '../components/SharePreviewModal';
import FeatureIntroSplash from '../components/FeatureIntroSplash';
import {
  getGroup,
  getGroupDetails,
  getBudgetItems,
  addBudgetItem,
  updateBudgetItem,
  deleteBudgetItem,
  markIntroSeen,
  BudgetItem,
  Expense,
  Group,
} from '../db';
import {
  BUDGET_CATEGORIES,
  DEFAULT_BUDGET_CATEGORIES,
  getBudgetCategoryDef,
  BudgetCategoryDef,
} from '../data/budgetCategories';

function fmt(n: number, currency: string): string {
  return `$${n.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} ${currency}`;
}

function BudgetRow({
  item,
  draft,
  currency,
  showActual,
  actual,
  onChangeText,
  onBlur,
  onDelete,
}: {
  item: BudgetItem;
  draft: string;
  currency: string;
  showActual: boolean;
  actual: number;
  onChangeText: (v: string) => void;
  onBlur: () => void;
  onDelete: () => void;
}) {
  const { t } = useTranslation();
  const { colors } = useTheme();
  const styles = makeStyles(colors);
  const def = getBudgetCategoryDef(item.category);
  const planned = parseFloat(draft) || 0;
  const pct = planned > 0 ? Math.min(actual / planned, 1) : 0;
  const isOver = actual > planned && planned > 0;
  const pctLabel = planned > 0 ? `${Math.round(pct * 100)}%` : '—';

  return (
    <View style={styles.rowCard}>
      <View style={styles.rowMain}>
        <View style={[styles.rowIconBg, { backgroundColor: def?.bg ?? '#F5F5F5' }]}>
          <Ionicons name={item.icon as any} size={18} color={def?.color ?? '#A0A0A0'} />
        </View>
        <Text style={styles.rowName} numberOfLines={1}>{t(`budget.names.${item.category}`, item.category)}</Text>
        <Text style={styles.rowCurrency}>$</Text>
        <TextInput
          style={styles.rowInput}
          value={draft}
          onChangeText={(v) => onChangeText(v.replace(/[^0-9.]/g, ''))}
          onBlur={onBlur}
          keyboardType="decimal-pad"
          placeholder="0"
          placeholderTextColor={colors.border}
          returnKeyType="done"
          selectTextOnFocus
        />
        <Pressable onPress={onDelete} hitSlop={10} style={styles.rowDeleteBtn}>
          <Ionicons name="close-circle-outline" size={20} color={colors.textSecondary} />
        </Pressable>
      </View>

      {showActual && (
        <View style={styles.actualSection}>
          <View style={styles.progressTrack}>
            <View
              style={[
                styles.progressFill,
                {
                  width: `${Math.round(pct * 100)}%` as any,
                  backgroundColor: isOver ? colors.coral : colors.sage,
                },
              ]}
            />
          </View>
          <View style={styles.actualLabelRow}>
            <Text style={[styles.actualLabel, isOver && styles.actualLabelOver]}>
              {t('budget.spent', { amount: actual.toFixed(2) })}
            </Text>
            <Text style={styles.pctLabel}>{pctLabel}</Text>
            {planned > 0 && (
              <Text style={[styles.budgetStatusLabel, isOver && styles.overBudgetLabel]}>
                {isOver ? t('budget.overBudgetLabel') : t('budget.underBudgetLabel')}
              </Text>
            )}
          </View>
        </View>
      )}
    </View>
  );
}

export default function BudgetPlanScreen() {
  const { t } = useTranslation();
  const { colors } = useTheme();
  const styles = makeStyles(colors);
  const navigation = useNavigation<any>();
  const { groupId } = useRoute<any>().params as { groupId: number };

  const [group, setGroup]       = useState<Group | null>(null);
  const [items, setItems]       = useState<BudgetItem[]>([]);
  const [drafts, setDrafts]     = useState<Record<number, string>>({});
  const [expenses, setExpenses] = useState<Expense[]>([]);
  const [showModal, setShowModal] = useState(false);
  const [loading, setLoading]   = useState(true);

  const [showShareModal, setShowShareModal] = useState(false);
  const [sharing, setSharing] = useState(false);
  const shareCardRef = useRef<View>(null);

  const [showIntro, setShowIntro] = useState(false);
  const introPhraseIdx = useRef(Math.floor(Math.random() * 5)).current;

  const handleShare = async () => {
    if (!shareCardRef.current) return;
    setSharing(true);
    try {
      const uri = await captureRef(shareCardRef, { format: 'png', quality: 1, pixelRatio: 3 });
      await Sharing.shareAsync(uri, { mimeType: 'image/png', dialogTitle: t('budget.title') });
    } catch {
      Alert.alert(t('budget.shareError'), t('budget.shareErrorMsg'));
    } finally {
      setSharing(false);
    }
  };

  useEffect(() => {
    (async () => {
      const g = await getGroup(groupId);
      let existing = await getBudgetItems(groupId);

      if (existing.length === 0) {
        for (const name of DEFAULT_BUDGET_CATEGORIES) {
          const def = getBudgetCategoryDef(name);
          if (def) await addBudgetItem(groupId, def.name, 0, def.icon);
        }
        existing = await getBudgetItems(groupId);
      }

      setGroup(g);
      if (g && !g.has_seen_budget_intro) setShowIntro(true);
      setItems(existing);
      setDrafts(
        Object.fromEntries(
          existing.map((i) => [i.id, i.planned_amount > 0 ? String(i.planned_amount) : '']),
        ),
      );

      if (g && g.is_planning === 0) {
        const details = await getGroupDetails(groupId);
        if (details) setExpenses(details.expenses);
      }

      setLoading(false);
    })();
  }, [groupId]);

  const showActual = group ? group.is_planning === 0 : false;

  const totalPlanned = Object.values(drafts).reduce(
    (sum, v) => sum + (parseFloat(v) || 0),
    0,
  );

  const getActual = (item: BudgetItem): number => {
    const def = getBudgetCategoryDef(item.category);
    if (!def || def.matchKeys.length === 0) return 0;
    return expenses
      .filter((e) => def.matchKeys.includes(e.category))
      .reduce((sum, e) => sum + e.amount, 0);
  };

  const totalActual = showActual
    ? items.reduce((sum, item) => sum + getActual(item), 0)
    : 0;

  const handleAmountChange = (id: number, v: string) => {
    setDrafts((prev) => ({ ...prev, [id]: v }));
  };

  const handleAmountBlur = async (id: number) => {
    const val = parseFloat(drafts[id] || '0') || 0;
    await updateBudgetItem(id, val);
    setItems((prev) =>
      prev.map((i) => (i.id === id ? { ...i, planned_amount: val } : i)),
    );
  };

  const handleAddCategory = async (def: BudgetCategoryDef) => {
    const id = await addBudgetItem(groupId, def.name, 0, def.icon);
    const newItem: BudgetItem = {
      id,
      group_id: groupId,
      category: def.name,
      planned_amount: 0,
      icon: def.icon,
    };
    setItems((prev) => [...prev, newItem]);
    setDrafts((prev) => ({ ...prev, [id]: '' }));
    setShowModal(false);
  };

  const handleDelete = (item: BudgetItem) => {
    Alert.alert(
      t('budget.removeTitle', { name: t(`budget.names.${item.category}`, item.category) }),
      t('budget.removeMsg'),
      [
        { text: t('common.cancel'), style: 'cancel' },
        {
          text: t('common.remove'),
          style: 'destructive',
          onPress: async () => {
            await deleteBudgetItem(item.id);
            setItems((prev) => prev.filter((i) => i.id !== item.id));
            setDrafts((prev) => {
              const next = { ...prev };
              delete next[item.id];
              return next;
            });
          },
        },
      ],
    );
  };

  const usedNames = new Set(items.map((i) => i.category));
  const remaining = BUDGET_CATEGORIES.filter((c) => !usedNames.has(c.name));
  const currency = group?.currency ?? 'CAD';
  const overallOver = showActual && totalActual > totalPlanned && totalPlanned > 0;

  return (
    <SafeAreaView style={styles.safe}>
      <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        keyboardVerticalOffset={0}
      >
        <View style={styles.header}>
          <Pressable onPress={() => navigation.goBack()} hitSlop={12}>
            <Ionicons name="chevron-back" size={22} color={colors.textPrimary} />
          </Pressable>
          <Text style={styles.headerTitle}>{t('budget.title')}</Text>
          <Pressable onPress={() => setShowShareModal(true)} hitSlop={12}>
            <Ionicons name="share-outline" size={20} color={colors.textPrimary} />
          </Pressable>
        </View>

        <ScrollView
          contentContainerStyle={styles.scrollContent}
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="handled"
        >
          <View style={[styles.totalCard, cardShadow]}>
            <Text style={styles.totalLabel}>{t('budget.totalPlanned')}</Text>
            <Text style={styles.totalAmount}>
              {fmt(totalPlanned, currency)}
            </Text>
            {showActual && (
              <View style={styles.totalActualRow}>
                <Ionicons
                  name={overallOver ? 'alert-circle-outline' : 'checkmark-circle-outline'}
                  size={14}
                  color="rgba(255,255,255,0.85)"
                />
                <Text style={styles.totalActualText}>
                  {t('budget.actualAmount', { amount: fmt(totalActual, currency) })}
                  {totalPlanned > 0
                    ? (overallOver
                      ? `  ·  ${t('budget.overBudgetSuffix')}`
                      : `  ·  ${t('budget.underBudgetSuffix')}`)
                    : ''}
                </Text>
              </View>
            )}
          </View>

          {!loading && items.map((item) => (
            <BudgetRow
              key={item.id}
              item={item}
              draft={drafts[item.id] ?? ''}
              currency={currency}
              showActual={showActual}
              actual={getActual(item)}
              onChangeText={(v) => handleAmountChange(item.id, v)}
              onBlur={() => handleAmountBlur(item.id)}
              onDelete={() => handleDelete(item)}
            />
          ))}

          {remaining.length > 0 && (
            <Pressable
              style={[styles.addCategoryBtn, cardShadow]}
              onPress={() => setShowModal(true)}
            >
              <View style={styles.addCategoryIconBg}>
                <Ionicons name="add" size={20} color={colors.coral} />
              </View>
              <Text style={styles.addCategoryText}>{t('budget.addCategory')}</Text>
              <Ionicons name="chevron-forward" size={16} color={colors.textSecondary} />
            </Pressable>
          )}

          <Text style={styles.hint}>
            {t('budget.tapToEdit')}
          </Text>
        </ScrollView>
      </KeyboardAvoidingView>

      <Modal
        visible={showModal}
        transparent
        animationType="slide"
        onRequestClose={() => setShowModal(false)}
      >
        <Pressable style={styles.modalOverlay} onPress={() => setShowModal(false)}>
          <Pressable style={styles.modalSheet} onPress={() => {}}>
            <View style={styles.modalHandle} />
            <Text style={styles.modalTitle}>{t('budget.addCategoryTitle')}</Text>
            <ScrollView showsVerticalScrollIndicator={false}>
              {remaining.map((cat) => (
                <Pressable
                  key={cat.name}
                  style={({ pressed }) => [
                    styles.modalRow,
                    pressed && { opacity: 0.7 },
                  ]}
                  onPress={() => handleAddCategory(cat)}
                >
                  <View style={[styles.modalIconBg, { backgroundColor: cat.bg }]}>
                    <Ionicons name={cat.icon as any} size={18} color={cat.color} />
                  </View>
                  <Text style={styles.modalCategoryName}>{t(`budget.names.${cat.name}`, cat.name)}</Text>
                  <Ionicons name="add-circle-outline" size={20} color={colors.coral} />
                </Pressable>
              ))}
            </ScrollView>
          </Pressable>
        </Pressable>
      </Modal>

      <SharePreviewModal
        visible={showShareModal}
        title={t('budget.title')}
        sharing={sharing}
        onClose={() => setShowShareModal(false)}
        onShare={handleShare}
      >
        <BudgetShareCard
          ref={shareCardRef}
          tripName={group?.name ?? ''}
          items={items}
          currency={group?.currency ?? 'CAD'}
        />
      </SharePreviewModal>

      {showIntro && (
        <FeatureIntroSplash
          image={require('../assets/Kip_budget.png')}
          tripName={group?.name ?? ''}
          phrase={t(`featureIntro.budget.phrase_${introPhraseIdx}`)}
          onContinue={() => {
            setShowIntro(false);
            markIntroSeen(groupId, 'budget');
          }}
        />
      )}
    </SafeAreaView>
  );
}

const makeStyles = (c: ColorPalette) => StyleSheet.create({
  safe: {
    flex: 1,
    backgroundColor: c.background,
  },

  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingTop: 8,
    paddingBottom: 12,
    justifyContent: 'space-between',
  },
  headerTitle: {
    fontSize: fontSizes.sectionTitle,
    fontWeight: '700',
    color: c.textPrimary,
  },

  scrollContent: {
    paddingHorizontal: 20,
    paddingBottom: 60,
  },

  totalCard: {
    backgroundColor: c.coral,
    borderRadius: radii.card,
    padding: 20,
    marginBottom: 20,
    gap: 6,
  },
  totalLabel: {
    fontSize: fontSizes.caption,
    fontWeight: '700',
    color: 'rgba(255,255,255,0.80)',
    textTransform: 'uppercase',
    letterSpacing: 0.6,
  },
  totalAmount: {
    fontSize: 30,
    fontWeight: '800',
    color: '#fff',
    letterSpacing: -0.5,
  },
  totalActualRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    marginTop: 2,
  },
  totalActualText: {
    fontSize: fontSizes.caption,
    color: 'rgba(255,255,255,0.85)',
    fontWeight: '500',
  },

  rowCard: {
    backgroundColor: c.card,
    borderRadius: radii.card,
    marginBottom: 12,
    overflow: 'hidden',
    ...cardShadow,
  },
  rowMain: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 14,
    paddingVertical: 14,
    gap: 12,
  },
  rowIconBg: {
    width: 38,
    height: 38,
    borderRadius: 11,
    alignItems: 'center',
    justifyContent: 'center',
    flexShrink: 0,
  },
  rowName: {
    flex: 1,
    fontSize: fontSizes.body,
    fontWeight: '600',
    color: c.textPrimary,
  },
  rowCurrency: {
    fontSize: fontSizes.body,
    fontWeight: '600',
    color: c.textSecondary,
    marginRight: -4,
  },
  rowInput: {
    width: 90,
    fontSize: fontSizes.body,
    fontWeight: '700',
    color: c.textPrimary,
    textAlign: 'right',
    paddingVertical: 4,
    paddingHorizontal: 6,
    borderBottomWidth: 1.5,
    borderBottomColor: c.border,
  },
  rowDeleteBtn: {
    paddingLeft: 4,
  },

  actualSection: {
    borderTopWidth: 1,
    borderTopColor: c.border,
    paddingHorizontal: 14,
    paddingTop: 10,
    paddingBottom: 12,
    gap: 6,
  },
  progressTrack: {
    height: 6,
    backgroundColor: c.border,
    borderRadius: 3,
    overflow: 'hidden',
  },
  progressFill: {
    height: '100%',
    borderRadius: 3,
  },
  actualLabelRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  actualLabel: {
    fontSize: fontSizes.caption,
    color: c.textSecondary,
    fontWeight: '500',
  },
  actualLabelOver: {
    color: c.coral,
    fontWeight: '600',
  },
  pctLabel: {
    fontSize: fontSizes.caption,
    color: c.textSecondary,
    fontWeight: '600',
  },
  budgetStatusLabel: {
    fontSize: fontSizes.caption,
    color: c.sage,
    fontWeight: '600',
    marginLeft: 'auto',
  },
  overBudgetLabel: {
    color: c.coral,
  },

  addCategoryBtn: {
    backgroundColor: c.card,
    borderRadius: radii.card,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
    padding: 14,
    marginBottom: 16,
    borderWidth: 1.5,
    borderColor: c.border,
    borderStyle: 'dashed',
  },
  addCategoryIconBg: {
    width: 38,
    height: 38,
    borderRadius: 11,
    backgroundColor: '#FFF0EE',
    alignItems: 'center',
    justifyContent: 'center',
  },
  addCategoryText: {
    flex: 1,
    fontSize: fontSizes.body,
    fontWeight: '600',
    color: c.coral,
  },

  hint: {
    textAlign: 'center',
    fontSize: fontSizes.caption,
    color: c.tabInactive,
    marginTop: 4,
    marginBottom: 8,
  },

  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.35)',
    justifyContent: 'flex-end',
  },
  modalSheet: {
    backgroundColor: c.card,
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    paddingTop: 12,
    paddingBottom: 40,
    maxHeight: '70%',
  },
  modalHandle: {
    width: 40,
    height: 4,
    backgroundColor: c.border,
    borderRadius: 2,
    alignSelf: 'center',
    marginBottom: 16,
  },
  modalTitle: {
    fontSize: fontSizes.sectionTitle,
    fontWeight: '700',
    color: c.textPrimary,
    paddingHorizontal: 20,
    marginBottom: 12,
  },
  modalRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 13,
    gap: 14,
    borderTopWidth: 1,
    borderTopColor: c.border,
  },
  modalIconBg: {
    width: 38,
    height: 38,
    borderRadius: 11,
    alignItems: 'center',
    justifyContent: 'center',
    flexShrink: 0,
  },
  modalCategoryName: {
    flex: 1,
    fontSize: fontSizes.body,
    fontWeight: '600',
    color: c.textPrimary,
  },
});
