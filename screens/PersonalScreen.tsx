import { useCallback, useRef, useState } from 'react';
import {
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
  getPersonalTrips, getPersonalTripExpenses,
  type PersonalTrip,
} from '../db';
import TripBudgetRing from '../components/TripBudgetRing';
import { type ColorPalette, fontSizes, radii, cardShadow } from '../theme';
import { useTheme } from '../context/ThemeContext';
import { getCurrencySymbol, formatAmount } from '../utils';

type Props = NativeStackScreenProps<PersonalStackParamList, 'PersonalMain'>;

type TripWithSpent = PersonalTrip & { spent: number };

const makeStyles = (c: ColorPalette) => StyleSheet.create({
  safe:          { flex: 1, backgroundColor: c.background },
  header:        { paddingHorizontal: 20, paddingTop: 16, paddingBottom: 12 },
  screenTitle:   { fontSize: fontSizes.screenTitle, fontWeight: '800', color: c.textPrimary },
  screenSub:     { fontSize: fontSizes.body, color: c.textSecondary, marginTop: 3 },

  list:          { paddingHorizontal: 16, paddingBottom: 100 },
  tripGroup:     { borderRadius: radii.card, backgroundColor: c.card, overflow: 'hidden', marginBottom: 12, ...cardShadow },
  tripCard:      { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 16, paddingVertical: 14, gap: 14 },
  tripDivider:   { height: StyleSheet.hairlineWidth, backgroundColor: c.border, marginLeft: 16 + 72 + 14 },
  tripInfo:      { flex: 1, gap: 2 },
  tripName:      { fontSize: fontSizes.body, fontWeight: '700', color: c.textPrimary },
  tripSub:       { fontSize: fontSizes.caption, color: c.textSecondary },
  chevron:       { opacity: 0.35 },

  emptyContainer: { flex: 1, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 36, paddingBottom: 80 },
  kipImage:      { width: 96, height: 96, marginBottom: 20 },
  emptyTitle:    { fontSize: fontSizes.sectionTitle, fontWeight: '800', color: c.textPrimary, textAlign: 'center', marginBottom: 10 },
  emptyBody:     { fontSize: fontSizes.body, color: c.textSecondary, textAlign: 'center', lineHeight: 22, marginBottom: 28 },
  createBtn:     { backgroundColor: c.coral, borderRadius: radii.button, paddingHorizontal: 28, paddingVertical: 14 },
  createBtnText: { fontSize: fontSizes.body, fontWeight: '700', color: '#fff' },

  fab:           { position: 'absolute', bottom: 28, right: 20, width: 56, height: 56, borderRadius: 28, backgroundColor: c.coral, alignItems: 'center', justifyContent: 'center' },
});

export default function PersonalScreen({ navigation }: Props) {
  const { t } = useTranslation();
  const { colors } = useTheme();
  const styles = makeStyles(colors);

  const [trips, setTrips] = useState<TripWithSpent[]>([]);
  const [loading, setLoading] = useState(true);
  const listAnim = useRef(new Animated.Value(0)).current;

  useFocusEffect(useCallback(() => {
    async function load() {
      const raw = await getPersonalTrips();
      const withSpent = await Promise.all(
        raw.map(async trip => {
          const exps = await getPersonalTripExpenses(trip.id);
          const spent = exps.reduce((s, e) => s + e.amount, 0);
          return { ...trip, spent };
        }),
      );
      setTrips(withSpent);
      setLoading(false);
      listAnim.setValue(0);
      Animated.spring(listAnim, { toValue: 1, useNativeDriver: true, tension: 80, friction: 10 }).start();
    }
    load();
  }, [listAnim]));

  if (loading) return <SafeAreaView style={styles.safe} />;

  const noTrips = trips.length === 0;

  return (
    <SafeAreaView style={styles.safe}>
      <View style={styles.header}>
        <Text style={styles.screenTitle}>{t('personalTrip.tabTitle')}</Text>
        <Text style={styles.screenSub}>{t('personalTrip.tabSub')}</Text>
      </View>

      {noTrips ? (
        <View style={styles.emptyContainer}>
          <Image
            source={require('../assets/Kip_jog.png')}
            style={styles.kipImage}
            resizeMode="contain"
          />
          <Text style={styles.emptyTitle}>{t('personalTrip.emptyTitle')}</Text>
          <Text style={styles.emptyBody}>{t('personalTrip.emptyBody')}</Text>
          <Pressable
            style={[styles.createBtn, cardShadow]}
            onPress={() => navigation.navigate('CreatePersonalTrip', {})}
          >
            <Text style={styles.createBtnText}>{t('personalTrip.createFirst')}</Text>
          </Pressable>
        </View>
      ) : (
        <>
          <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.list}>
            {trips.map((trip, i) => {
              const sym = getCurrencySymbol(trip.currency);
              const hasBudget = trip.budget_amount != null && trip.budget_amount > 0;
              return (
                <Animated.View
                  key={trip.id}
                  style={{
                    opacity: listAnim,
                    transform: [{ translateY: listAnim.interpolate({ inputRange: [0, 1], outputRange: [20 + i * 8, 0] }) }],
                  }}
                >
                  <Pressable
                    style={({ pressed }) => [styles.tripCard, cardShadow, pressed && { opacity: 0.75 }]}
                    onPress={() => navigation.navigate('PersonalTripDetail', { tripId: trip.id })}
                  >
                    <TripBudgetRing
                      spent={trip.spent}
                      budget={trip.budget_amount}
                      currency={trip.currency}
                      size={68}
                      strokeWidth={6}
                    />
                    <View style={styles.tripInfo}>
                      <Text style={styles.tripName} numberOfLines={1}>{trip.name}</Text>
                      <Text style={styles.tripSub}>
                        {sym}{formatAmount(trip.spent, trip.currency)} {t('personalTrip.spent')}
                        {hasBudget ? ` / ${sym}${formatAmount(trip.budget_amount!, trip.currency)}` : ''}
                      </Text>
                    </View>
                    <Ionicons name="chevron-forward" size={18} color={colors.textSecondary} style={styles.chevron} />
                  </Pressable>
                </Animated.View>
              );
            })}
          </ScrollView>

          <Pressable
            style={styles.fab}
            onPress={() => navigation.navigate('CreatePersonalTrip', {})}
          >
            <Ionicons name="add" size={28} color="#fff" />
          </Pressable>
        </>
      )}
    </SafeAreaView>
  );
}
