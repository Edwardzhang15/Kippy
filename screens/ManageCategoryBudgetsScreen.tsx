import { useCallback, useState } from 'react';
import {
  InputAccessoryView,
  Keyboard,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { type NativeStackScreenProps } from '@react-navigation/native-stack';
import { useFocusEffect } from '@react-navigation/native';
import { useTranslation } from 'react-i18next';
import { type PersonalStackParamList } from '../navigation/types';
import {
  getPersonalTrip, getPersonalTripBudgets, getPersonalTripExpenses,
  setPersonalTripBudget,
  type PersonalTrip, type PersonalTripBudget, type PersonalTripExpense,
} from '../db';
import { CATEGORIES } from '../categories';
import { type ColorPalette, fontSizes, radii, cardShadow } from '../theme';
import { useTheme } from '../context/ThemeContext';
import { getCurrencySymbol, formatAmount } from '../utils';
import { DONE_BAR_ID } from '../components/KeyboardDoneBar';

type Props = NativeStackScreenProps<PersonalStackParamList, 'ManageCategoryBudgets'>;

const SAGE  = '#7FA68C';
const CORAL = '#FF6B5B';

function lerpHex(a: string, b: string, t: number): string {
  const parse = (h: string) => ({
    r: parseInt(h.slice(1, 3), 16),
    g: parseInt(h.slice(3, 5), 16),
    b: parseInt(h.slice(5, 7), 16),
  });
  const ca = parse(a);
  const cb = parse(b);
  const r = Math.round(ca.r + (cb.r - ca.r) * t);
  const g = Math.round(ca.g + (cb.g - ca.g) * t);
  const bv = Math.round(ca.b + (cb.b - ca.b) * t);
  return `rgb(${r},${g},${bv})`;
}

const makeStyles = (c: ColorPalette) => StyleSheet.create({
  root:        { flex: 1, backgroundColor: c.background },
  header:      { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 20, paddingTop: 56, paddingBottom: 12 },
  backBtn:     { width: 36, height: 36, borderRadius: 18, backgroundColor: c.card, alignItems: 'center', justifyContent: 'center' },
  title:       { flex: 1, fontSize: fontSizes.sectionTitle, fontWeight: '700', color: c.textPrimary, textAlign: 'center' },
  spacer:      { width: 36 },
  body:        { flex: 1, paddingHorizontal: 20 },
  hint:        { fontSize: fontSizes.caption, color: c.textSecondary, marginBottom: 16, marginTop: 4 },
  catRow:        { backgroundColor: c.card, borderRadius: radii.card, padding: 14, marginBottom: 10 },
  catRowOver:    { borderWidth: 1.5, borderColor: c.coral },
  catHeader:     { flexDirection: 'row', alignItems: 'center', gap: 10, marginBottom: 8 },
  catIcon:       { width: 32, height: 32, borderRadius: 16, alignItems: 'center', justifyContent: 'center' },
  catName:       { flex: 1, fontSize: fontSizes.body, fontWeight: '600', color: c.textPrimary },
  inputRow:      { flexDirection: 'row', alignItems: 'center', gap: 8 },
  budgetInput:   { flex: 1, backgroundColor: c.background, borderRadius: radii.button, paddingHorizontal: 12, paddingVertical: 9, fontSize: fontSizes.body, color: c.textPrimary },
  bar:           { height: 4, borderRadius: 2, overflow: 'hidden', marginTop: 8 },
  barFill:       { height: '100%', borderRadius: 2 },
  totalRow:      { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingHorizontal: 4, marginTop: 4, marginBottom: 6 },
  totalLabel:    { fontSize: fontSizes.caption, fontWeight: '600', color: c.textSecondary },
  totalValue:    { fontSize: fontSizes.caption, fontWeight: '700', color: c.textPrimary },
  totalValueOver:{ color: c.coral },
  warningBox:    { flexDirection: 'row', alignItems: 'flex-start', gap: 8, backgroundColor: `${c.coral}1A`, borderRadius: radii.card, padding: 10, marginTop: 8 },
  warningText:   { flex: 1, fontSize: fontSizes.caption, fontWeight: '600', color: c.coral, lineHeight: 18 },
  saveBtn:       { margin: 20, marginTop: 24, backgroundColor: c.coral, borderRadius: radii.button, paddingVertical: 16, alignItems: 'center' },
  saveBtnText:   { fontSize: fontSizes.body, fontWeight: '700', color: '#fff' },
  doneBar:       { flexDirection: 'row', justifyContent: 'flex-end', alignItems: 'center', paddingHorizontal: 16, paddingVertical: 10, backgroundColor: c.card, borderTopWidth: StyleSheet.hairlineWidth, borderTopColor: c.border },
  doneBtn:       { paddingHorizontal: 4 },
  doneBtnText:   { fontSize: 17, fontWeight: '600', color: c.coral },
});

export default function ManageCategoryBudgetsScreen({ navigation, route }: Props) {
  const { t } = useTranslation();
  const { colors } = useTheme();
  const styles = makeStyles(colors);
  const { tripId } = route.params;

  const [trip, setTrip] = useState<PersonalTrip | null>(null);
  const [budgets, setBudgets] = useState<Record<string, string>>({});
  const [spentByCategory, setSpentByCategory] = useState<Record<string, number>>({});
  const [saving, setSaving] = useState(false);

  useFocusEffect(useCallback(() => {
    async function load() {
      const [t_, b_, e_] = await Promise.all([
        getPersonalTrip(tripId),
        getPersonalTripBudgets(tripId),
        getPersonalTripExpenses(tripId),
      ]);
      setTrip(t_);
      const bMap: Record<string, string> = {};
      b_.forEach(b => { bMap[b.category] = String(b.planned_amount); });
      setBudgets(bMap);
      const sMap: Record<string, number> = {};
      e_.forEach(e => { sMap[e.category] = (sMap[e.category] ?? 0) + e.amount; });
      setSpentByCategory(sMap);
    }
    load();
  }, [tripId]));

  async function handleSave() {
    setSaving(true);
    try {
      for (const cat of CATEGORIES) {
        const raw = budgets[cat.id] ?? '';
        const val = raw ? parseFloat(raw) : 0;
        await setPersonalTripBudget(tripId, cat.id, isNaN(val) ? 0 : val);
      }
      navigation.goBack();
    } finally {
      setSaving(false);
    }
  }

  const sym = getCurrencySymbol(trip?.currency ?? 'CAD');
  const currency = trip?.currency ?? 'CAD';
  const tripBudget = trip?.budget_amount ?? null;

  const catTotal = CATEGORIES.reduce((sum, cat) => sum + (parseFloat(budgets[cat.id] ?? '') || 0), 0);
  const isOverBudget = tripBudget !== null && tripBudget > 0 && catTotal >= tripBudget;

  // Find the category where cumulative sum first reaches/exceeds the trip budget
  let overflowCat: string | null = null;
  if (isOverBudget && tripBudget) {
    let running = 0;
    for (const cat of CATEGORIES) {
      running += parseFloat(budgets[cat.id] ?? '') || 0;
      if (running >= tripBudget) { overflowCat = cat.id; break; }
    }
  }

  return (
    <>
      <KeyboardAvoidingView style={styles.root} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        <View style={styles.header}>
          <Pressable style={styles.backBtn} onPress={() => navigation.goBack()}>
            <Ionicons name="chevron-back" size={18} color={colors.textPrimary} />
          </Pressable>
          <Text style={styles.title}>{t('personalTrip.categoryBudgets')}</Text>
          <View style={styles.spacer} />
        </View>

        <ScrollView style={styles.body} keyboardShouldPersistTaps="handled" contentContainerStyle={{ paddingBottom: 24 }}>
          <Text style={styles.hint}>{t('personalTrip.categoryBudgetHint')}</Text>
          {CATEGORIES.map(cat => {
            const spent = spentByCategory[cat.id] ?? 0;
            const budgetVal = parseFloat(budgets[cat.id] ?? '') || 0;
            const pct = budgetVal > 0 ? Math.min(spent / budgetVal, 1) : 0;
            const barColor = pct <= 0 ? SAGE : lerpHex(SAGE, CORAL, pct);
            const isOverflowTrigger = cat.id === overflowCat;

            return (
              <View key={cat.id} style={[styles.catRow, cardShadow, isOverflowTrigger && styles.catRowOver]}>
                <View style={styles.catHeader}>
                  <View style={[styles.catIcon, { backgroundColor: cat.bg }]}>
                    <Ionicons name={cat.icon} size={16} color={cat.color} />
                  </View>
                  <Text style={styles.catName}>{t(`categories.${cat.id}`)}</Text>
                </View>
                <View style={styles.inputRow}>
                  <Text style={{ color: colors.textSecondary, fontSize: fontSizes.body }}>{sym}</Text>
                  <TextInput
                    style={styles.budgetInput}
                    value={budgets[cat.id] ?? ''}
                    onChangeText={v => setBudgets(prev => ({ ...prev, [cat.id]: v }))}
                    placeholder={t('personalTrip.budgetPlaceholder')}
                    placeholderTextColor={colors.textSecondary}
                    keyboardType="decimal-pad"
                    inputAccessoryViewID={DONE_BAR_ID}
                    returnKeyType="done"
                  />
                </View>
                {budgetVal > 0 && (
                  <View style={[styles.bar, { backgroundColor: colors.border }]}>
                    <View style={[styles.barFill, { width: `${pct * 100}%` as any, backgroundColor: barColor }]} />
                  </View>
                )}
                {isOverflowTrigger && tripBudget !== null && (
                  <View style={styles.warningBox}>
                    <Ionicons name="warning-outline" size={14} color={colors.coral} />
                    <Text style={styles.warningText}>
                      {t('personalTrip.budgetOverflowWarning', { sym, amount: formatAmount(catTotal - tripBudget, currency) })}
                    </Text>
                  </View>
                )}
              </View>
            );
          })}

          {tripBudget !== null && tripBudget > 0 && (
            <View style={styles.totalRow}>
              <Text style={styles.totalLabel}>{t('personalTrip.categoryTotal')}</Text>
              <Text style={[styles.totalValue, isOverBudget && styles.totalValueOver]}>
                {sym}{formatAmount(catTotal, currency)} / {sym}{formatAmount(tripBudget, currency)}
              </Text>
            </View>
          )}
        </ScrollView>

        <Pressable style={styles.saveBtn} onPress={handleSave} disabled={saving}>
          <Text style={styles.saveBtnText}>{saving ? t('personalTrip.saving') : t('personalTrip.saveBudgets')}</Text>
        </Pressable>
      </KeyboardAvoidingView>

      {Platform.OS === 'ios' && (
        <InputAccessoryView nativeID={DONE_BAR_ID}>
          <View style={styles.doneBar}>
            <Pressable onPress={Keyboard.dismiss} hitSlop={16} style={styles.doneBtn}>
              <Text style={styles.doneBtnText}>{t('common.done')}</Text>
            </Pressable>
          </View>
        </InputAccessoryView>
      )}
    </>
  );
}
