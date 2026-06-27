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
import { Ionicons } from '@expo/vector-icons';
import { type NativeStackScreenProps } from '@react-navigation/native-stack';
import { useFocusEffect } from '@react-navigation/native';
import { useTranslation } from 'react-i18next';
import { type PersonalStackParamList } from '../navigation/types';
import {
  getPersonalTrip, getPersonalTripExpenses, deletePersonalTrip,
  type PersonalTrip, type PersonalTripExpense,
} from '../db';
import TripBudgetRing from '../components/TripBudgetRing';
import { CATEGORY_MAP, FALLBACK_CATEGORY } from '../categories';
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

  heroCard:      {
    marginHorizontal: 16,
    marginTop: 12,
    marginBottom: 14,
    borderRadius: radii.card,
    backgroundColor: c.card,
    paddingTop: 28,
    paddingBottom: 20,
    paddingHorizontal: 20,
    alignItems: 'center',
  },
  tripName:      { fontSize: 22, fontWeight: '800', color: c.textPrimary, marginTop: 16, textAlign: 'center' },
  spentLabel:    { fontSize: fontSizes.body, color: c.textSecondary, marginTop: 6, textAlign: 'center' },
  chipRow:       { flexDirection: 'row', gap: 8, marginTop: 18, flexWrap: 'wrap', justifyContent: 'center' },
  chip:          { flexDirection: 'row', alignItems: 'center', gap: 6, paddingHorizontal: 14, paddingVertical: 8, borderRadius: 20, borderWidth: 1.5, borderColor: c.border, backgroundColor: c.background },
  chipText:      { fontSize: fontSizes.caption, fontWeight: '600', color: c.textPrimary },

  kipCard:       { marginHorizontal: 16, marginBottom: 16, borderRadius: radii.card, backgroundColor: c.card, flexDirection: 'row', alignItems: 'center', paddingHorizontal: 14, paddingVertical: 14, gap: 12 },
  kipImage:      { width: 48, height: 48 },
  kipText:       { flex: 1, fontSize: fontSizes.body, color: c.textPrimary, lineHeight: 20 },

  sectionHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginHorizontal: 20, marginTop: 4, marginBottom: 10 },
  sectionLabel:  { fontSize: fontSizes.caption, fontWeight: '700', color: c.textSecondary, textTransform: 'uppercase', letterSpacing: 0.6 },
  sectionCount:  { fontSize: fontSizes.caption, color: c.textSecondary },

  expenseCard:   { marginHorizontal: 16, borderRadius: radii.card, backgroundColor: c.card, flexDirection: 'row', alignItems: 'center', paddingHorizontal: 14, paddingVertical: 13, gap: 12, ...cardShadow },
  expDivider:    { height: StyleSheet.hairlineWidth, backgroundColor: c.border, marginHorizontal: 16 + 14 },
  catIcon:       { width: 38, height: 38, borderRadius: 12, alignItems: 'center', justifyContent: 'center', flexShrink: 0 },
  expMain:       { flex: 1, gap: 2 },
  expNote:       { fontSize: fontSizes.body, fontWeight: '600', color: c.textPrimary },
  expSub:        { fontSize: fontSizes.caption, color: c.textSecondary },
  expAmount:     { fontSize: fontSizes.body, fontWeight: '700', color: c.textPrimary },

  expenseGroup:  { marginBottom: 16, borderRadius: radii.card, overflow: 'hidden', marginHorizontal: 16 },

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
  const enterAnim = useRef(new Animated.Value(0)).current;

  useFocusEffect(useCallback(() => {
    async function load() {
      const [t_, e_] = await Promise.all([
        getPersonalTrip(tripId),
        getPersonalTripExpenses(tripId),
      ]);
      setTrip(t_);
      setExpenses(e_);
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
          {/* Hero card with large ring */}
          <View style={[styles.heroCard, cardShadow]}>
            <TripBudgetRing
              spent={spent}
              budget={trip?.budget_amount ?? null}
              currency={trip?.currency ?? 'CAD'}
              size={148}
              strokeWidth={11}
            />
            <Text style={styles.tripName}>{trip?.name ?? ''}</Text>
            <Text style={styles.spentLabel}>
              {sym}{formatAmount(spent, trip?.currency ?? 'CAD')} {t('personalTrip.spent')}
              {trip?.budget_amount ? ` / ${sym}${formatAmount(trip.budget_amount, trip.currency)} ${t('personalTrip.budget')}` : ''}
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
                            {t(`categories.${exp.category}`)} · {formatExpenseDate(exp.date)}
                          </Text>
                        </View>
                        <Text style={styles.expAmount}>{sym}{formatAmount(exp.amount, exp.currency)}</Text>
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
