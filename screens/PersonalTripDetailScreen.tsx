import { useCallback, useRef, useState } from 'react';
import {
  Alert,
  Animated,
  Image,
  Pressable,
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

const KIP_STATES = {
  under:      require('../assets/Kip_jog.png'),
  approaching: require('../assets/Kip_jog.png'),
  over:       require('../assets/Kip_jog.png'),
};

const makeStyles = (c: ColorPalette) => StyleSheet.create({
  root:          { flex: 1, backgroundColor: c.background },
  header:        { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 20, paddingTop: 56, paddingBottom: 12 },
  backBtn:       { width: 36, height: 36, borderRadius: 18, backgroundColor: c.card, alignItems: 'center', justifyContent: 'center' },
  headerActions: { flexDirection: 'row', gap: 8 },
  actionBtn:     { width: 36, height: 36, borderRadius: 18, backgroundColor: c.card, alignItems: 'center', justifyContent: 'center' },
  heroCard:      { margin: 16, borderRadius: radii.card, backgroundColor: c.card, padding: 20, alignItems: 'center' },
  tripName:      { fontSize: fontSizes.sectionTitle, fontWeight: '700', color: c.textPrimary, marginTop: 12, textAlign: 'center' },
  spentLabel:    { fontSize: fontSizes.caption, color: c.textSecondary, marginTop: 4 },
  actionRow:     { flexDirection: 'row', gap: 10, marginTop: 16 },
  actionChip:    { flexDirection: 'row', alignItems: 'center', gap: 6, paddingHorizontal: 14, paddingVertical: 8, borderRadius: 20, borderWidth: 1.5, borderColor: c.border, backgroundColor: c.background },
  actionChipText: { fontSize: fontSizes.caption, fontWeight: '600', color: c.textPrimary },
  kipCard:       { marginHorizontal: 16, marginBottom: 12, borderRadius: radii.card, backgroundColor: c.card, flexDirection: 'row', alignItems: 'center', padding: 14, gap: 10 },
  kipImage:      { width: 48, height: 48 },
  kipText:       { flex: 1, fontSize: fontSizes.caption, color: c.textPrimary, lineHeight: 18 },
  sectionLabel:  { fontSize: fontSizes.caption, fontWeight: '700', color: c.textSecondary, textTransform: 'uppercase', letterSpacing: 0.5, marginHorizontal: 20, marginBottom: 8 },
  expenseCard:   { marginHorizontal: 16, marginBottom: 8, borderRadius: radii.card, backgroundColor: c.card, flexDirection: 'row', alignItems: 'center', paddingHorizontal: 14, paddingVertical: 12, gap: 12 },
  catIcon:       { width: 36, height: 36, borderRadius: 18, alignItems: 'center', justifyContent: 'center' },
  expMain:       { flex: 1 },
  expNote:       { fontSize: fontSizes.body, fontWeight: '600', color: c.textPrimary },
  expSub:        { fontSize: fontSizes.caption, color: c.textSecondary, marginTop: 2 },
  expAmount:     { fontSize: fontSizes.body, fontWeight: '700', color: c.textPrimary },
  emptyCard:     { margin: 20, borderRadius: radii.card, backgroundColor: c.card, padding: 24, alignItems: 'center', gap: 8 },
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
    Animated.spring(enterAnim, { toValue: 1, useNativeDriver: true, tension: 80, friction: 10 }).start();
  }, [tripId, enterAnim]));

  function getKipMessage(spent: number, budget: number | null): string {
    if (!budget || budget <= 0) return t('personalTrip.kipNoBudget');
    const pct = spent / budget;
    if (pct >= 1)    return t('personalTrip.kipOver');
    if (pct >= 0.8)  return t('personalTrip.kipApproaching');
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
    <View style={styles.root}>
      <View style={styles.header}>
        <Pressable style={styles.backBtn} onPress={() => navigation.goBack()}>
          <Ionicons name="chevron-back" size={18} color={colors.textPrimary} />
        </Pressable>
        <View style={{ flex: 1 }} />
        <View style={styles.headerActions}>
          <Pressable
            style={styles.actionBtn}
            onPress={() => navigation.navigate('CreatePersonalTrip', { tripId })}
          >
            <Ionicons name="pencil-outline" size={16} color={colors.textPrimary} />
          </Pressable>
          <Pressable style={styles.actionBtn} onPress={handleDelete}>
            <Ionicons name="trash-outline" size={16} color={colors.coral} />
          </Pressable>
        </View>
      </View>

      <ScrollView showsVerticalScrollIndicator={false}>
        <Animated.View style={{ opacity: enterAnim, transform: [{ scale: enterAnim.interpolate({ inputRange: [0, 1], outputRange: [0.96, 1] }) }] }}>
          {/* Hero card */}
          <View style={[styles.heroCard, cardShadow]}>
            <TripBudgetRing
              spent={spent}
              budget={trip?.budget_amount ?? null}
              currency={trip?.currency ?? 'CAD'}
              size={100}
              strokeWidth={8}
            />
            <Text style={styles.tripName}>{trip?.name ?? ''}</Text>
            <Text style={styles.spentLabel}>
              {sym}{formatAmount(spent, trip?.currency ?? 'CAD')} {t('personalTrip.spent')}
              {trip?.budget_amount ? ` / ${sym}${formatAmount(trip.budget_amount, trip.currency)} ${t('personalTrip.budget')}` : ''}
            </Text>
            <View style={styles.actionRow}>
              <Pressable
                style={[styles.actionChip, cardShadow]}
                onPress={() => navigation.navigate('ManageCategoryBudgets', { tripId })}
              >
                <Ionicons name="pie-chart-outline" size={14} color={colors.textPrimary} />
                <Text style={styles.actionChipText}>{t('personalTrip.categoryBudgets')}</Text>
              </Pressable>
            </View>
          </View>

          {/* Kip message */}
          {trip && (
            <View style={[styles.kipCard, cardShadow]}>
              <Image source={KIP_STATES.under} style={styles.kipImage} resizeMode="contain" />
              <Text style={styles.kipText}>{getKipMessage(spent, trip.budget_amount)}</Text>
            </View>
          )}

          {/* Expenses */}
          {expenses.length > 0 && (
            <Text style={styles.sectionLabel}>{t('personalTrip.expenses')}</Text>
          )}
          {expenses.map(exp => {
            const cat = CATEGORY_MAP[exp.category] ?? FALLBACK_CATEGORY;
            return (
              <Pressable
                key={exp.id}
                style={[styles.expenseCard, cardShadow]}
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
            );
          })}

          {expenses.length === 0 && (
            <View style={[styles.emptyCard, cardShadow]}>
              <Ionicons name="receipt-outline" size={32} color={colors.textSecondary} />
              <Text style={styles.emptyText}>{t('personalTrip.noExpenses')}</Text>
            </View>
          )}
        </Animated.View>
      </ScrollView>

      <Pressable
        style={[styles.fab, cardShadow]}
        onPress={() => navigation.navigate('AddPersonalTripExpense', { tripId })}
      >
        <Ionicons name="add" size={28} color="#fff" />
      </Pressable>
    </View>
  );
}
