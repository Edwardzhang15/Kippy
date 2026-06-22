import { useCallback, useEffect, useRef, useState } from 'react';
import {
  Alert,
  Animated,
  FlatList,
  Image,
  Pressable,
  SafeAreaView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { useFocusEffect, useNavigation } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { useTranslation } from 'react-i18next';
import { colors, fontSizes, radii, cardShadow } from '../theme';
import { getPlanSummaries, deleteGroup, GroupSummary } from '../db';
import { PlanStackParamList } from '../navigation/types';
import AnimatedFAB from '../components/AnimatedFAB';

type NavProp = NativeStackNavigationProp<PlanStackParamList, 'PlanScreen'>;

function formatPlanDate(dateStr: string | null, locale: string): string | null {
  if (!dateStr) return null;
  return new Date(dateStr + 'T12:00:00').toLocaleDateString(locale, {
    month: 'short', day: 'numeric', year: 'numeric',
  });
}

function PlanCard({
  group,
  index,
  onEdit,
  onDelete,
}: {
  group: GroupSummary;
  index: number;
  onEdit: () => void;
  onDelete: () => void;
}) {
  const navigation           = useNavigation<NavProp>();
  const { t, i18n }         = useTranslation();
  const fadeAnim             = useRef(new Animated.Value(0)).current;
  const translateAnim        = useRef(new Animated.Value(18)).current;
  const hasPhoto             = Boolean(group.destination_photo_url);

  useEffect(() => {
    Animated.parallel([
      Animated.timing(fadeAnim, { toValue: 1, duration: 350, delay: index * 60, useNativeDriver: true }),
      Animated.timing(translateAnim, { toValue: 0, duration: 350, delay: index * 60, useNativeDriver: true }),
    ]).start();
  }, []);

  const startFmt  = formatPlanDate(group.planned_start_date, i18n.language);
  const endFmt    = formatPlanDate(group.planned_end_date, i18n.language);
  const dateRange = startFmt && endFmt
    ? `${startFmt} – ${endFmt}`
    : startFmt ? t('plan.dateFrom', { date: startFmt })
    : endFmt   ? t('plan.dateUntil', { date: endFmt })
    : null;

  return (
    <Animated.View style={{ opacity: fadeAnim, transform: [{ translateY: translateAnim }] }}>
      <Pressable
        style={({ pressed }) => [
          styles.card,
          !hasPhoto && cardShadow,
          hasPhoto  && styles.photoCard,
          pressed   && styles.cardPressed,
        ]}
        onPress={() => navigation.navigate('PlanDetail', { groupId: group.id })}
      >
        {hasPhoto && (
          <>
            <Image
              source={{ uri: group.destination_photo_url! }}
              style={StyleSheet.absoluteFill}
              resizeMode="cover"
            />
            <LinearGradient
              colors={['transparent', 'rgba(0,0,0,0.36)', 'rgba(0,0,0,0.68)']}
              locations={[0.38, 0.68, 1]}
              style={StyleSheet.absoluteFill}
            />
          </>
        )}

        <View style={styles.cardMain}>
          <View style={[styles.planBadge, hasPhoto && styles.planBadgePhoto]}>
            <Ionicons name="map-outline" size={11} color={hasPhoto ? colors.card : colors.coral} />
            <Text style={[styles.planBadgeText, hasPhoto && styles.planBadgeTextPhoto]}>
              {t('plan.badge')}
            </Text>
          </View>

          <Text
            style={[styles.groupName, hasPhoto && styles.groupNamePhoto]}
            numberOfLines={1}
          >
            {group.name}
          </Text>

          {group.destination ? (
            <View style={styles.detailRow}>
              <Ionicons
                name="location-outline"
                size={12}
                color={hasPhoto ? 'rgba(255,255,255,0.80)' : colors.textSecondary}
              />
              <Text style={[styles.detailText, hasPhoto && styles.detailTextPhoto]}>
                {group.destination}
              </Text>
            </View>
          ) : null}

          {dateRange ? (
            <View style={styles.detailRow}>
              <Ionicons
                name="calendar-outline"
                size={12}
                color={hasPhoto ? 'rgba(255,255,255,0.80)' : colors.textSecondary}
              />
              <Text style={[styles.detailText, hasPhoto && styles.detailTextPhoto]}>
                {dateRange}
              </Text>
            </View>
          ) : null}

          {group.budget_per_person != null ? (
            <View style={styles.detailRow}>
              <Ionicons
                name="wallet-outline"
                size={12}
                color={hasPhoto ? 'rgba(255,255,255,0.80)' : colors.textSecondary}
              />
              <Text style={[styles.detailText, hasPhoto && styles.detailTextPhoto]}>
                {t('plan.budgetPerPerson', {
                  amount: group.budget_per_person.toFixed(0),
                  currency: group.currency,
                })}
              </Text>
            </View>
          ) : null}
        </View>

        <View style={styles.cardActions}>
          <Pressable
            onPress={onEdit}
            hitSlop={10}
            style={hasPhoto ? styles.photoActionBtn : styles.actionBtn}
          >
            <Ionicons
              name="pencil-outline"
              size={15}
              color={hasPhoto ? 'rgba(255,255,255,0.90)' : colors.textSecondary}
            />
          </Pressable>
          <Pressable
            onPress={onDelete}
            hitSlop={10}
            style={hasPhoto ? styles.photoActionBtn : styles.actionBtn}
          >
            <Ionicons
              name="trash-outline"
              size={15}
              color={hasPhoto ? 'rgba(255,255,255,0.90)' : colors.coral}
            />
          </Pressable>
        </View>
      </Pressable>
    </Animated.View>
  );
}

function EmptyState() {
  const { t }         = useTranslation();
  const fadeAnim      = useRef(new Animated.Value(0)).current;
  const translateAnim = useRef(new Animated.Value(12)).current;

  useEffect(() => {
    Animated.parallel([
      Animated.timing(fadeAnim, { toValue: 1, duration: 400, delay: 100, useNativeDriver: true }),
      Animated.timing(translateAnim, { toValue: 0, duration: 400, delay: 100, useNativeDriver: true }),
    ]).start();
  }, []);

  return (
    <Animated.View
      style={[styles.emptyState, { opacity: fadeAnim, transform: [{ translateY: translateAnim }] }]}
    >
      <Ionicons name="map-outline" size={48} color={colors.border} />
      <Text style={styles.emptyTitle}>{t('plan.emptyTitle')}</Text>
      <Text style={styles.emptySubtitle}>{t('plan.emptySubtitle')}</Text>
    </Animated.View>
  );
}

export default function PlanScreen() {
  const navigation    = useNavigation<NavProp>();
  const { t }         = useTranslation();
  const [plans, setPlans]     = useState<GroupSummary[]>([]);
  const [loading, setLoading] = useState(true);

  useFocusEffect(
    useCallback(() => {
      let active = true;
      getPlanSummaries().then((data) => {
        if (active) {
          setPlans(data);
          setLoading(false);
        }
      });
      return () => { active = false; };
    }, []),
  );

  const handleDelete = (group: GroupSummary) => {
    Alert.alert(
      t('plan.deleteTitle', { name: group.name }),
      t('plan.deleteMsg'),
      [
        { text: t('common.cancel'), style: 'cancel' },
        {
          text: t('common.delete'),
          style: 'destructive',
          onPress: async () => {
            await deleteGroup(group.id);
            setPlans((prev) => prev.filter((p) => p.id !== group.id));
          },
        },
      ],
    );
  };

  const header = (
    <Text style={styles.screenTitle}>{t('plan.title')}</Text>
  );

  return (
    <SafeAreaView style={styles.safe}>
      {!loading && (
        <FlatList
          data={plans}
          keyExtractor={(item) => String(item.id)}
          contentContainerStyle={[styles.list, plans.length === 0 && { flex: 1 }]}
          ListHeaderComponent={header}
          ListEmptyComponent={<EmptyState />}
          renderItem={({ item, index }) => (
            <PlanCard
              group={item}
              index={index}
              onEdit={() => navigation.navigate('EditTrip', { groupId: item.id })}
              onDelete={() => handleDelete(item)}
            />
          )}
          showsVerticalScrollIndicator={false}
        />
      )}
      <AnimatedFAB onPress={() => navigation.navigate('TripWizard')} />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: {
    flex: 1,
    backgroundColor: colors.background,
  },
  list: {
    paddingHorizontal: 20,
    paddingBottom: 100,
  },
  screenTitle: {
    fontSize: fontSizes.screenTitle,
    fontWeight: '700',
    color: colors.textPrimary,
    marginTop: 24,
    marginBottom: 16,
  },

  card: {
    backgroundColor: colors.card,
    borderRadius: radii.card,
    padding: 16,
    marginBottom: 14,
    flexDirection: 'row',
    alignItems: 'center',
  },
  photoCard: {
    height: 180,
    overflow: 'hidden',
    alignItems: 'flex-end',
  },
  cardPressed: {
    opacity: 0.85,
  },
  cardMain: {
    flex: 1,
    gap: 5,
  },

  planBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: '#FFF0EE',
    alignSelf: 'flex-start',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 10,
    marginBottom: 4,
  },
  planBadgePhoto: {
    backgroundColor: 'rgba(255,255,255,0.20)',
  },
  planBadgeText: {
    fontSize: 10,
    fontWeight: '700',
    color: colors.coral,
    textTransform: 'uppercase',
    letterSpacing: 0.4,
  },
  planBadgeTextPhoto: {
    color: colors.card,
  },

  groupName: {
    fontSize: fontSizes.sectionTitle,
    fontWeight: '700',
    color: colors.textPrimary,
  },
  groupNamePhoto: {
    color: colors.card,
    fontWeight: '800',
  },
  detailRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
  },
  detailText: {
    fontSize: fontSizes.caption,
    color: colors.textSecondary,
    fontWeight: '500',
    flex: 1,
  },
  detailTextPhoto: {
    color: 'rgba(255,255,255,0.85)',
  },

  cardActions: {
    flexDirection: 'column',
    gap: 10,
    alignItems: 'center',
  },
  actionBtn: {
    padding: 4,
  },
  photoActionBtn: {
    width: 30,
    height: 30,
    borderRadius: 15,
    backgroundColor: 'rgba(0,0,0,0.32)',
    alignItems: 'center',
    justifyContent: 'center',
  },

  emptyState: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingBottom: 80,
  },
  emptyTitle: {
    fontSize: fontSizes.sectionTitle,
    fontWeight: '700',
    color: colors.textPrimary,
    marginTop: 8,
  },
  emptySubtitle: {
    fontSize: fontSizes.body,
    color: colors.textSecondary,
    textAlign: 'center',
    paddingHorizontal: 40,
  },
});
