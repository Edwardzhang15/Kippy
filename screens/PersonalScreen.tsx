import { useCallback, useMemo, useState } from 'react';
import {
  Dimensions,
  Image,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { type NativeStackScreenProps } from '@react-navigation/native-stack';
import { useFocusEffect } from '@react-navigation/native';
import { useTranslation } from 'react-i18next';
import { type PersonalStackParamList } from '../navigation/types';
import {
  getPersonalExpenses, getPersonalBudgets,
  type PersonalExpense, type PersonalBudget,
} from '../db';
import { CATEGORIES, CATEGORY_MAP, FALLBACK_CATEGORY } from '../categories';
import { type ColorPalette, fontSizes, radii, cardShadow } from '../theme';
import { useTheme } from '../context/ThemeContext';
import { getCurrencySymbol, formatAmount } from '../utils';

type Props = NativeStackScreenProps<PersonalStackParamList, 'PersonalMain'>;

const SCREEN_W = Dimensions.get('window').width;

// ─── Date grouping ────────────────────────────────────────────────────────────
type DateGroup = 'today' | 'yesterday' | 'thisWeek' | 'older';

function classifyDate(dateStr: string): DateGroup {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const d = new Date(dateStr + 'T00:00:00');
  const diff = Math.floor((today.getTime() - d.getTime()) / 86400000);
  if (diff === 0) return 'today';
  if (diff === 1) return 'yesterday';
  if (diff <= 7)  return 'thisWeek';
  return 'older';
}

// ─── Month helpers ────────────────────────────────────────────────────────────
function monthKey(y: number, m: number) { return `${y}-${String(m + 1).padStart(2, '0')}`; }
function expenseMonth(e: PersonalExpense) { return e.date.slice(0, 7); }

// ─── Styles ───────────────────────────────────────────────────────────────────
const makeStyles = (c: ColorPalette) => StyleSheet.create({
  root:          { flex: 1, backgroundColor: c.background },
  scroll:        { flex: 1 },
  scrollContent: { paddingBottom: 100 },

  header:        { paddingTop: 60, paddingHorizontal: 20, paddingBottom: 8, flexDirection: 'row', alignItems: 'center' },
  headerLeft:    { flex: 1 },
  headerTitle:   { fontSize: fontSizes.screenTitle, fontWeight: '800', color: c.textPrimary },
  headerSub:     { fontSize: fontSizes.body, color: c.textSecondary, marginTop: 2 },
  setBudgetsBtn: { flexDirection: 'row', alignItems: 'center', gap: 4, paddingHorizontal: 12, paddingVertical: 8, borderRadius: 20, borderWidth: 1, borderColor: c.border },
  setBudgetsText:{ fontSize: fontSizes.caption, fontWeight: '600', color: c.textSecondary },

  monthBar:      { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 16, paddingVertical: 10 },
  monthBtn:      { padding: 8 },
  monthLabel:    { fontSize: fontSizes.body, fontWeight: '700', color: c.textPrimary, minWidth: 110, textAlign: 'center' },

  card:          { ...cardShadow, backgroundColor: c.card, borderRadius: radii.card, marginHorizontal: 16, marginTop: 10 },
  cardTitle:     { fontSize: fontSizes.sectionTitle, fontWeight: '700', color: c.textPrimary, paddingHorizontal: 16, paddingTop: 16, paddingBottom: 10 },

  // Budget overview rows
  budgetRow:     { paddingHorizontal: 16, paddingBottom: 14 },
  budgetHeader:  { flexDirection: 'row', alignItems: 'center', marginBottom: 6, gap: 8 },
  budgetIconBg:  { width: 28, height: 28, borderRadius: 14, alignItems: 'center', justifyContent: 'center' },
  budgetCatName: { flex: 1, fontSize: fontSizes.body, fontWeight: '600', color: c.textPrimary },
  budgetAmts:    { fontSize: fontSizes.caption, color: c.textSecondary },
  barTrack:      { height: 7, borderRadius: 4, backgroundColor: c.border, overflow: 'hidden' },
  barFill:       { height: '100%', borderRadius: 4 },
  overBudgeTag:  { fontSize: 10, fontWeight: '700', color: c.coral, marginTop: 3 },

  // Chart section
  chartWrap:     { paddingHorizontal: 16, paddingBottom: 16 },
  chartRow:      { marginBottom: 10 },
  chartHeader:   { flexDirection: 'row', alignItems: 'center', marginBottom: 4, gap: 8 },
  chartIconBg:   { width: 24, height: 24, borderRadius: 12, alignItems: 'center', justifyContent: 'center' },
  chartCatName:  { flex: 1, fontSize: fontSizes.caption, fontWeight: '600', color: c.textPrimary },
  chartAmount:   { fontSize: fontSizes.caption, fontWeight: '700', color: c.textPrimary },
  chartBarTrack: { height: 8, borderRadius: 4, backgroundColor: c.border, overflow: 'hidden' },
  chartBarFill:  { height: '100%', borderRadius: 4 },
  chartEmpty:    { paddingVertical: 24, alignItems: 'center' },
  chartEmptyTxt: { fontSize: fontSizes.caption, color: c.textSecondary },

  // Kip row
  kipRow:        { flexDirection: 'row', alignItems: 'flex-end', marginHorizontal: 16, marginTop: 10, gap: 0 },
  kipImg:        { width: 68, height: 68 },
  kipBubble:     { flex: 1, backgroundColor: c.card, borderRadius: 14, borderBottomLeftRadius: 4, padding: 12, marginLeft: 10, ...cardShadow },
  kipBubbleText: { fontSize: fontSizes.caption, color: c.textSecondary, lineHeight: 18 },

  // Expense list
  listCard:      { ...cardShadow, backgroundColor: c.card, borderRadius: radii.card, marginHorizontal: 16, marginTop: 10, paddingBottom: 4 },
  groupHdr:      { paddingHorizontal: 16, paddingTop: 14, paddingBottom: 4, fontSize: fontSizes.caption, fontWeight: '700', color: c.textSecondary, letterSpacing: 0.6 },
  expRow:        { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 16, paddingVertical: 12, borderTopWidth: 1, borderTopColor: c.border, gap: 12 },
  expIconBg:     { width: 36, height: 36, borderRadius: 18, alignItems: 'center', justifyContent: 'center' },
  expMeta:       { flex: 1 },
  expNote:       { fontSize: fontSizes.body, fontWeight: '600', color: c.textPrimary },
  expDate:       { fontSize: fontSizes.caption, color: c.textSecondary, marginTop: 2 },
  expAmount:     { fontSize: fontSizes.body, fontWeight: '700', color: c.textPrimary },

  emptyList:     { paddingVertical: 36, alignItems: 'center', gap: 8 },
  emptyText:     { fontSize: fontSizes.body, color: c.textSecondary, textAlign: 'center' },

  // FAB
  fab:           { position: 'absolute', right: 20, bottom: 24, width: 56, height: 56, borderRadius: 28, backgroundColor: c.coral, alignItems: 'center', justifyContent: 'center', ...cardShadow },
});

export default function PersonalScreen({ navigation }: Props) {
  const { t }        = useTranslation();
  const { colors }   = useTheme();
  const styles       = makeStyles(colors);

  const [expenses, setExpenses]   = useState<PersonalExpense[]>([]);
  const [budgets, setBudgets]     = useState<PersonalBudget[]>([]);
  const [viewDate, setViewDate]   = useState(new Date());

  useFocusEffect(useCallback(() => {
    getPersonalExpenses().then(setExpenses);
    getPersonalBudgets().then(setBudgets);
  }, []));

  // ── Month navigation ─────────────────────────────────────────────────────
  const viewYear  = viewDate.getFullYear();
  const viewMonth = viewDate.getMonth();
  const currentMK = monthKey(viewYear, viewMonth);
  const isCurrentMonth = (() => {
    const n = new Date();
    return viewYear === n.getFullYear() && viewMonth === n.getMonth();
  })();

  const changeMonth = (delta: number) => {
    setViewDate(prev => new Date(prev.getFullYear(), prev.getMonth() + delta, 1));
  };

  const monthLabel = viewDate.toLocaleDateString('en-US', { month: 'long', year: 'numeric' });

  // ── Filtered expenses for viewed month ──────────────────────────────────
  const monthExpenses = useMemo(
    () => expenses.filter(e => expenseMonth(e) === currentMK),
    [expenses, currentMK],
  );

  // ── Spending by category for the month ──────────────────────────────────
  const spendByCategory = useMemo(() => {
    const m = new Map<string, number>();
    for (const e of monthExpenses) {
      m.set(e.category, (m.get(e.category) ?? 0) + e.amount);
    }
    return m;
  }, [monthExpenses]);

  const totalMonthSpend = useMemo(
    () => Array.from(spendByCategory.values()).reduce((s, v) => s + v, 0),
    [spendByCategory],
  );

  // ── Budget map ───────────────────────────────────────────────────────────
  const budgetMap = useMemo(() => {
    const m = new Map<string, number>();
    for (const b of budgets) m.set(b.category, b.monthly_budget_amount);
    return m;
  }, [budgets]);

  const catsWithBudget = useMemo(
    () => CATEGORIES.filter(c => (budgetMap.get(c.id) ?? 0) > 0),
    [budgetMap],
  );

  // ── Chart bars (non-zero spending this month, sorted desc) ──────────────
  const chartRows = useMemo(() => {
    const rows = CATEGORIES
      .map(c => ({ cat: c, spent: spendByCategory.get(c.id) ?? 0 }))
      .filter(r => r.spent > 0)
      .sort((a, b) => b.spent - a.spent);
    const max = rows[0]?.spent ?? 1;
    return rows.map(r => ({ ...r, pct: r.spent / max }));
  }, [spendByCategory]);

  // ── Today's expenses for Kip message ────────────────────────────────────
  const todaySpend = useMemo(() => {
    const today = new Date().toISOString().split('T')[0];
    return expenses.filter(e => e.date === today).reduce((s, e) => s + e.amount, 0);
  }, [expenses]);

  // ── Grouped expense list (only for viewed month) ─────────────────────────
  const groupedExpenses = useMemo(() => {
    const groups: Record<DateGroup, PersonalExpense[]> = {
      today: [], yesterday: [], thisWeek: [], older: [],
    };
    for (const e of monthExpenses) {
      groups[isCurrentMonth ? classifyDate(e.date) : 'older'].push(e);
    }
    return groups;
  }, [monthExpenses, isCurrentMonth]);

  const GROUP_ORDER: DateGroup[] = ['today', 'yesterday', 'thisWeek', 'older'];
  const groupLabel = (g: DateGroup) => {
    if (!isCurrentMonth) return monthLabel;
    return { today: t('personal.groupToday'), yesterday: t('personal.groupYesterday'), thisWeek: t('personal.groupThisWeek'), older: t('personal.groupOlder') }[g];
  };

  // ── Default currency for display ─────────────────────────────────────────
  const defaultCurrency = expenses[0]?.currency ?? 'CAD';
  const sym = getCurrencySymbol(defaultCurrency);

  return (
    <View style={styles.root}>
      <ScrollView style={styles.scroll} contentContainerStyle={styles.scrollContent}>

        {/* Header */}
        <View style={styles.header}>
          <View style={styles.headerLeft}>
            <Text style={styles.headerTitle}>{t('personal.title')}</Text>
            <Text style={styles.headerSub}>{t('personal.subtitle')}</Text>
          </View>
          <TouchableOpacity style={styles.setBudgetsBtn} onPress={() => navigation.navigate('SetBudgets')}>
            <Ionicons name="options-outline" size={14} color={colors.textSecondary} />
            <Text style={styles.setBudgetsText}>{t('personal.budgets')}</Text>
          </TouchableOpacity>
        </View>

        {/* Month selector */}
        <View style={styles.monthBar}>
          <TouchableOpacity style={styles.monthBtn} onPress={() => changeMonth(-1)}>
            <Ionicons name="chevron-back" size={20} color={colors.textPrimary} />
          </TouchableOpacity>
          <Text style={styles.monthLabel}>{monthLabel}</Text>
          <TouchableOpacity style={styles.monthBtn} onPress={() => changeMonth(1)} disabled={isCurrentMonth}>
            <Ionicons name="chevron-forward" size={20} color={isCurrentMonth ? colors.border : colors.textPrimary} />
          </TouchableOpacity>
        </View>

        {/* Budget overview (only if budgets set) */}
        {catsWithBudget.length > 0 && (
          <View style={styles.card}>
            <Text style={styles.cardTitle}>{t('personal.budgetOverview')}</Text>
            {catsWithBudget.map(cat => {
              const spent   = spendByCategory.get(cat.id) ?? 0;
              const budget  = budgetMap.get(cat.id)!;
              const pct     = Math.min(spent / budget, 1);
              const over    = spent > budget;
              const barColor = spent / budget > 0.75 ? colors.coral : colors.sage;
              return (
                <View key={cat.id} style={styles.budgetRow}>
                  <View style={styles.budgetHeader}>
                    <View style={[styles.budgetIconBg, { backgroundColor: cat.bg }]}>
                      <Ionicons name={cat.icon} size={14} color={cat.color} />
                    </View>
                    <Text style={styles.budgetCatName}>{t(`categories.${cat.id}`, cat.label)}</Text>
                    <Text style={styles.budgetAmts}>
                      {sym}{formatAmount(spent, defaultCurrency)} / {sym}{formatAmount(budget, defaultCurrency)}
                    </Text>
                  </View>
                  <View style={styles.barTrack}>
                    <View style={[styles.barFill, { width: `${(pct * 100).toFixed(0)}%` as any, backgroundColor: barColor }]} />
                  </View>
                  {over && <Text style={styles.overBudgeTag}>{t('personal.overBudget', { amt: `${sym}${formatAmount(spent - budget, defaultCurrency)}` })}</Text>}
                </View>
              );
            })}
          </View>
        )}

        {/* Monthly chart */}
        <View style={styles.card}>
          <Text style={styles.cardTitle}>{t('personal.spendingByCategory')}</Text>
          <View style={styles.chartWrap}>
            {chartRows.length === 0 ? (
              <View style={styles.chartEmpty}>
                <Text style={styles.chartEmptyTxt}>{t('personal.noSpendingThisMonth')}</Text>
              </View>
            ) : (
              chartRows.map(({ cat, spent, pct }) => (
                <View key={cat.id} style={styles.chartRow}>
                  <View style={styles.chartHeader}>
                    <View style={[styles.chartIconBg, { backgroundColor: cat.bg }]}>
                      <Ionicons name={cat.icon} size={12} color={cat.color} />
                    </View>
                    <Text style={styles.chartCatName}>{t(`categories.${cat.id}`, cat.label)}</Text>
                    <Text style={styles.chartAmount}>{sym}{formatAmount(spent, defaultCurrency)}</Text>
                  </View>
                  <View style={styles.chartBarTrack}>
                    <View style={[styles.chartBarFill, { width: `${(pct * 100).toFixed(0)}%` as any, backgroundColor: cat.color }]} />
                  </View>
                </View>
              ))
            )}
          </View>
        </View>

        {/* Kip illustration */}
        <View style={styles.kipRow}>
          <Image source={require('../assets/Kip_budget.png')} style={styles.kipImg} resizeMode="contain" />
          <View style={styles.kipBubble}>
            <Text style={styles.kipBubbleText}>
              {monthExpenses.length === 0
                ? t('personal.kipEmpty')
                : totalMonthSpend > 0
                ? t('personal.kipSpent', { sym, amount: formatAmount(totalMonthSpend, defaultCurrency) })
                : t('personal.kipReady')}
            </Text>
          </View>
        </View>

        {/* Expense list */}
        <View style={styles.listCard}>
          <Text style={styles.cardTitle}>{t('personal.expenses')}</Text>
          {monthExpenses.length === 0 ? (
            <View style={styles.emptyList}>
              <Text style={{ fontSize: 32 }}>💸</Text>
              <Text style={styles.emptyText}>{t('personal.noExpenses')}</Text>
            </View>
          ) : (
            GROUP_ORDER.map(g => {
              const items = groupedExpenses[g];
              if (!items.length) return null;
              return (
                <View key={g}>
                  <Text style={styles.groupHdr}>{groupLabel(g).toUpperCase()}</Text>
                  {items.map(e => {
                    const catMeta = CATEGORY_MAP[e.category] ?? FALLBACK_CATEGORY;
                    const expSym  = getCurrencySymbol(e.currency);
                    return (
                      <TouchableOpacity
                        key={e.id}
                        style={styles.expRow}
                        onPress={() => navigation.navigate('AddPersonalExpense', { expenseId: e.id })}
                      >
                        <View style={[styles.expIconBg, { backgroundColor: catMeta.bg }]}>
                          <Ionicons name={catMeta.icon as any} size={18} color={catMeta.color} />
                        </View>
                        <View style={styles.expMeta}>
                          <Text style={styles.expNote} numberOfLines={1}>
                            {e.note || t(`categories.${e.category}`, CATEGORY_MAP[e.category]?.label ?? 'Expense')}
                          </Text>
                          {g !== 'today' && (
                            <Text style={styles.expDate}>
                              {new Date(e.date + 'T00:00:00').toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
                            </Text>
                          )}
                        </View>
                        <Text style={styles.expAmount}>{expSym}{formatAmount(e.amount, e.currency)}</Text>
                      </TouchableOpacity>
                    );
                  })}
                </View>
              );
            })
          )}
        </View>

      </ScrollView>

      {/* FAB */}
      <TouchableOpacity style={styles.fab} onPress={() => navigation.navigate('AddPersonalExpense', {})}>
        <Ionicons name="add" size={28} color="#fff" />
      </TouchableOpacity>
    </View>
  );
}
