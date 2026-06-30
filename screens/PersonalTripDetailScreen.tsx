import { useCallback, useRef, useState } from 'react';
import {
  Alert,
  Animated,
  Image,
  Pressable,
  SafeAreaView,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { type NativeStackScreenProps } from '@react-navigation/native-stack';
import { useFocusEffect } from '@react-navigation/native';
import { useTranslation } from 'react-i18next';
import { type PersonalStackParamList } from '../navigation/types';
import {
  getPersonalTrip, getPersonalTripExpenses, deletePersonalTrip,
  getPersonalTripCategoryBudgetsWithSpent,
  type PersonalTrip, type PersonalTripExpense, type CategoryBudgetWithSpent,
} from '../db';
import TripBudgetRing from '../components/TripBudgetRing';
import { CATEGORY_MAP, FALLBACK_CATEGORY } from '../categories';

function catBarColor(pct: number, coral: string, sage: string): string {
  if (pct >= 0.9) return coral;
  if (pct >= 0.7) return '#F5A623';
  return sage;
}
import { type ColorPalette, fontSizes, radii, cardShadow } from '../theme';
import { useTheme } from '../context/ThemeContext';
import { getCurrencySymbol, formatAmount, formatExpenseDate } from '../utils';

type Props = NativeStackScreenProps<PersonalStackParamList, 'PersonalTripDetail'>;

const makeStyles = (c: ColorPalette) => StyleSheet.create({
  safe:          { flex: 1, backgroundColor: c.background },
  header:        { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 20, paddingTop: 8, paddingBottom: 4 },
  backBtn:       { width: 36, height: 36, borderRadius: 18, backgroundColor: c.card, alignItems: 'center', justifyContent: 'center' },
  headerSpacer:  { flex: 1 },
  headerActions: { flexDirection: 'row', gap: 8 },
  actionBtn:     { width: 36, height: 36, borderRadius: 18, backgroundColor: c.card, alignItems: 'center', justifyContent: 'center' },

  photoBanner:   {
    marginHorizontal: 16,
    marginTop: 12,
    height: 200,
    borderRadius: radii.card,
    overflow: 'hidden',
    marginBottom: 0,
  },
  photoBannerContent: { position: 'absolute', bottom: 16, left: 16, right: 16 },
  photoBannerTitle:   { fontSize: 22, fontWeight: '800', color: '#fff' },

  heroCard:      {
    marginHorizontal: 16,
    marginTop: 12,
    marginBottom: 20,
    borderRadius: radii.card,
    backgroundColor: c.card,
    paddingTop: 28,
    paddingBottom: 20,
    paddingHorizontal: 20,
    alignItems: 'center',
  },
  heroCardWithPhoto: { marginTop: 10, paddingTop: 20 },
  tripName:      { fontSize: 22, fontWeight: '800', color: c.textPrimary, marginTop: 16, textAlign: 'center' },
  spentLabel:    { fontSize: fontSizes.body, color: c.textSecondary, marginTop: 6, textAlign: 'center' },
  chipRow:       { flexDirection: 'row', gap: 8, marginTop: 18, flexWrap: 'wrap', justifyContent: 'center' },
  chip:          { flexDirection: 'row', alignItems: 'center', gap: 6, paddingHorizontal: 14, paddingVertical: 8, borderRadius: 20, borderWidth: 1.5, borderColor: c.border, backgroundColor: c.background },
  chipText:      { fontSize: fontSizes.caption, fontWeight: '600', color: c.textPrimary },

  kipCard:       { marginHorizontal: 16, marginBottom: 16, borderRadius: radii.card, backgroundColor: c.card, flexDirection: 'row', alignItems: 'center', paddingHorizontal: 14, paddingVertical: 16, gap: 12 },
  kipImage:      { width: 48, height: 48 },
  kipText:       { flex: 1, fontSize: fontSizes.body, color: c.textPrimary, lineHeight: 20 },

  sectionHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginHorizontal: 20, marginTop: 18, marginBottom: 10 },
  sectionLabel:  { fontSize: fontSizes.caption, fontWeight: '700', color: c.textSecondary, textTransform: 'uppercase', letterSpacing: 0.6 },
  sectionCount:  { fontSize: fontSizes.caption, color: c.textSecondary },

  expenseCard:   { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 14, paddingVertical: 13, gap: 12 },
  expDivider:    { height: StyleSheet.hairlineWidth, backgroundColor: c.border, marginHorizontal: 14 },
  catIcon:       { width: 38, height: 38, borderRadius: 12, alignItems: 'center', justifyContent: 'center', flexShrink: 0 },
  expMain:       { flex: 1, gap: 2 },
  expNote:       { fontSize: fontSizes.body, fontWeight: '600', color: c.textPrimary },
  expSub:        { fontSize: fontSizes.caption, color: c.textSecondary },
  expAmount:     { fontSize: fontSizes.body, fontWeight: '700', color: c.textPrimary },

  expenseGroup:  { marginBottom: 16, borderRadius: radii.card, overflow: 'hidden', marginHorizontal: 16, backgroundColor: c.card },

  // Category budget bars (inside heroCard)
  catDivider:    { height: StyleSheet.hairlineWidth, backgroundColor: c.border, width: '100%', marginTop: 16 },
  catSection:    { width: '100%', paddingTop: 12 },
  catSectionHdr: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 10 },
  catSectionLbl: { fontSize: fontSizes.caption, fontWeight: '700', color: c.textSecondary, textTransform: 'uppercase', letterSpacing: 0.6 },
  catManageBtn:  { flexDirection: 'row', alignItems: 'center', gap: 2 },
  catManageTxt:  { fontSize: fontSizes.caption, fontWeight: '600', color: c.coral },
  catRow:        { flexDirection: 'row', alignItems: 'center', gap: 9, marginBottom: 11 },
  catIconBg:     { width: 30, height: 30, borderRadius: 9, alignItems: 'center', justifyContent: 'center', flexShrink: 0 },
  catBody:       { flex: 1, gap: 4 },
  catLabelRow:   { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  catName:       { fontSize: 12, fontWeight: '600', color: c.textPrimary },
  catAmt:        { fontSize: 11, color: c.textSecondary, fontWeight: '500' },
  catBarBg:      { height: 6, borderRadius: 3, backgroundColor: c.border, overflow: 'hidden' },
  catBarFill:    { height: 6 },
  catEmptyHint:  { fontSize: fontSizes.caption, color: c.textSecondary, textAlign: 'center', paddingVertical: 6 },

  emptyCard:     { marginHorizontal: 16, marginBottom: 16, borderRadius: radii.card, backgroundColor: c.card, padding: 32, alignItems: 'center', gap: 10 },
  emptyText:     { fontSize: fontSizes.body, color: c.textSecondary, textAlign: 'center' },

  fab:           { position: 'absolute', bottom: 28, right: 20, width: 56, height: 56, borderRadius: 28, backgroundColor: c.coral, alignItems: 'center', justifyContent: 'center' },
});

export default function PersonalTripDetailScreen({ navigation, route }: Props) {
  const { t } = useTranslation();
  const { colors } = useTheme();
  const styles = makeStyles(colors);
  const { tripId } = route.params;

  const [trip, setTrip] = useState<PersonalTrip | null>(null);
  const [expenses, setExpenses] = useState<PersonalTripExpense[]>([]);
  const [categoryBudgets, setCategoryBudgets] = useState<CategoryBudgetWithSpent[]>([]);
  const enterAnim = useRef(new Animated.Value(0)).current;

  useFocusEffect(useCallback(() => {
    async function load() {
      const [t_, e_, b_] = await Promise.all([
        getPersonalTrip(tripId),
        getPersonalTripExpenses(tripId),
        getPersonalTripCategoryBudgetsWithSpent(tripId),
      ]);
      setTrip(t_);
      setExpenses(e_);
      setCategoryBudgets(b_);
    }
    load();
    enterAnim.setValue(0);
    Animated.spring(enterAnim, { toValue: 1, useNativeDriver: true, tension: 80, friction: 10 }).start();
  }, [tripId, enterAnim]));

  function getKipMessage(spent: number, budget: number | null): string {
    if (!budget || budget <= 0) return t('personalTrip.kipNoBudget');
    const pct = spent / budget;
    if (pct >= 1)   return t('personalTrip.kipOver');
    if (pct >= 0.8) return t('personalTrip.kipApproaching');
    return t('personalTrip.kipUnder');
  }

  async function handleDelete() {
    Alert.alert(
      t('personalTrip.deleteTitle'),
      t('personalTrip.deleteMsg'),
      [
        { text: t('common.cancel'), style: 'cancel' },
        {
          text: t('common.delete'), style: 'destructive',
          onPress: async () => {
            await deletePersonalTrip(tripId);
            navigation.goBack();
          },
        },
      ],
    );
  }

  const spent = expenses.reduce((s, e) => s + e.amount, 0);
  const sym = getCurrencySymbol(trip?.currency ?? 'CAD');

  return (
    <SafeAreaView style={styles.safe}>
      <View style={styles.header}>
        <Pressable style={[styles.backBtn, cardShadow]} onPress={() => navigation.goBack()}>
          <Ionicons name="chevron-back" size={18} color={colors.textPrimary} />
        </Pressable>
        <View style={styles.headerSpacer} />
        <View style={styles.headerActions}>
          <Pressable
            style={[styles.actionBtn, cardShadow]}
            onPress={() => navigation.navigate('CreatePersonalTrip', { tripId })}
          >
            <Ionicons name="pencil-outline" size={16} color={colors.textPrimary} />
          </Pressable>
          <Pressable style={[styles.actionBtn, cardShadow]} onPress={handleDelete}>
            <Ionicons name="trash-outline" size={16} color={colors.coral} />
          </Pressable>
        </View>
      </View>

      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingBottom: 100 }}>
        <Animated.View style={{
          opacity: enterAnim,
          transform: [{ scale: enterAnim.interpolate({ inputRange: [0, 1], outputRange: [0.96, 1] }) }],
        }}>
          {/* Destination photo banner */}
          {trip?.destination_photo_url && (
            <View style={styles.photoBanner}>
              <Image
                source={{ uri: trip.destination_photo_url }}
                style={StyleSheet.absoluteFill}
                resizeMode="cover"
              />
              <LinearGradient
                colors={['transparent', 'rgba(0,0,0,0.44)', 'rgba(0,0,0,0.76)']}
                locations={[0.35, 0.70, 1]}
                style={StyleSheet.absoluteFill}
              />
              <View style={styles.photoBannerContent}>
                <Text style={styles.photoBannerTitle} numberOfLines={2}>{trip.name}</Text>
              </View>
            </View>
          )}

          {/* Hero card with large ring */}
          <View style={[styles.heroCard, cardShadow, trip?.destination_photo_url && styles.heroCardWithPhoto]}>
            <TripBudgetRing
              spent={spent}
              budget={trip?.budget_amount ?? null}
              currency={trip?.currency ?? 'CAD'}
              size={148}
              strokeWidth={11}
            />
            {!trip?.destination_photo_url && (
              <Text style={styles.tripName}>{trip?.name ?? ''}</Text>
            )}
            <Text style={styles.spentLabel}>
              {`${sym}${formatAmount(spent, trip?.currency ?? 'CAD')}${trip?.budget_amount ? ` / ${sym}${formatAmount(trip.budget_amount, trip.currency)}` : ''}`}
            </Text>
            <View style={styles.chipRow}>
              <Pressable
                style={styles.chip}
                onPress={() => navigation.navigate('ManageCategoryBudgets', { tripId })}
              >
                <Ionicons name="pie-chart-outline" size={14} color={colors.textPrimary} />
                <Text style={styles.chipText}>{t('personalTrip.categoryBudgets')}</Text>
              </Pressable>
            </View>

            {/* Category budget progress bars */}
            {categoryBudgets.length > 0 && (
              <>
                <View style={styles.catDivider} />
                <View style={styles.catSection}>
                  <View style={styles.catSectionHdr}>
                    <Text style={styles.catSectionLbl}>{t('personalTrip.categoryBudgets')}</Text>
                    <Pressable
                      style={styles.catManageBtn}
                      onPress={() => navigation.navigate('ManageCategoryBudgets', { tripId })}
                    >
                      <Text style={styles.catManageTxt}>{t('personalTrip.manageBudgets')}</Text>
                      <Ionicons name="chevron-forward" size={11} color={colors.coral} />
                    </Pressable>
                  </View>
                  {categoryBudgets.map(item => {
                    const pct = item.budget_amount > 0 ? item.spent / item.budget_amount : 0;
                    const cat = CATEGORY_MAP[item.category] ?? FALLBACK_CATEGORY;
                    const fillColor = catBarColor(pct, colors.coral, colors.sage);
                    const catSym = getCurrencySymbol(trip?.currency ?? 'CAD');
                    return (
                      <View key={item.category} style={styles.catRow}>
                        <View style={[styles.catIconBg, { backgroundColor: (cat as any).bg ?? '#F5F5F5' }]}>
                          <Ionicons name={cat.icon} size={13} color={cat.color} />
                        </View>
                        <View style={styles.catBody}>
                          <View style={styles.catLabelRow}>
                            <Text style={styles.catName} numberOfLines={1}>
                              {t(`categories.${item.category}`, item.category)}
                            </Text>
                            <Text style={styles.catAmt}>
                              {`${catSym}${formatAmount(item.spent, trip?.currency ?? 'CAD')} / ${catSym}${formatAmount(item.budget_amount, trip?.currency ?? 'CAD')}`}
                            </Text>
                          </View>
                          <View style={styles.catBarBg}>
                            <View style={[styles.catBarFill, { width: `${Math.min(pct * 100, 100)}%` as any, backgroundColor: fillColor }]} />
                          </View>
                        </View>
                      </View>
                    );
                  })}
                </View>
              </>
            )}
          </View>

          {/* Kip message */}
          {trip && (
            <View style={[styles.kipCard, cardShadow]}>
              <Image
                source={require('../assets/Kip_jog.png')}
                style={styles.kipImage}
                resizeMode="contain"
              />
              <Text style={styles.kipText}>{getKipMessage(spent, trip.budget_amount)}</Text>
            </View>
          )}

          {/* Expenses list */}
          {expenses.length === 0 ? (
            <View style={styles.emptyCard}>
              <Ionicons name="receipt-outline" size={36} color={colors.textSecondary} />
              <Text style={styles.emptyText}>{t('personalTrip.noExpenses')}</Text>
            </View>
          ) : (
            <>
              <View style={styles.sectionHeader}>
                <Text style={styles.sectionLabel}>{t('personalTrip.expenses')}</Text>
                <Text style={styles.sectionCount}>{expenses.length}</Text>
              </View>
              <View style={[styles.expenseGroup, cardShadow]}>
                {expenses.map((exp, i) => {
                  const cat = CATEGORY_MAP[exp.category] ?? FALLBACK_CATEGORY;
                  return (
                    <View key={exp.id}>
                      <Pressable
                        style={({ pressed }) => [styles.expenseCard, pressed && { opacity: 0.75 }]}
                        onPress={() => navigation.navigate('AddPersonalTripExpense', { tripId, expenseId: exp.id })}
                      >
                        <View style={[styles.catIcon, { backgroundColor: (cat as any).bg ?? '#F5F5F5' }]}>
                          <Ionicons name={cat.icon} size={18} color={cat.color} />
                        </View>
                        <View style={styles.expMain}>
                          <Text style={styles.expNote} numberOfLines={1}>
                            {exp.note || t(`categories.${exp.category}`)}
                          </Text>
                          <Text style={styles.expSub}>
                            {`${t(`categories.${exp.category}`)} · ${formatExpenseDate(exp.date)}`}
                          </Text>
                        </View>
                        <Text style={styles.expAmount}>{`${sym}${formatAmount(exp.amount, exp.currency)}`}</Text>
                      </Pressable>
                      {i < expenses.length - 1 && <View style={styles.expDivider} />}
                    </View>
                  );
                })}
              </View>
            </>
          )}
        </Animated.View>
      </ScrollView>

      <Pressable
        style={styles.fab}
        onPress={() => navigation.navigate('AddPersonalTripExpense', { tripId })}
      >
        <Ionicons name="add" size={28} color="#fff" />
      </Pressable>
    </SafeAreaView>
  );
}
