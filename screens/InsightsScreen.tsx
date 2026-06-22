import { useCallback, useEffect, useState } from 'react';
import {
  Alert,
  Image,
  Pressable,
  SafeAreaView,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useFocusEffect } from '@react-navigation/native';
import { useTranslation } from 'react-i18next';
import { type ColorPalette, fontSizes, radii, cardShadow } from '../theme';
import { useTheme } from '../context/ThemeContext';
import {
  getAllTripSummaries,
  getGroupDetails,
  deleteGroup,
  GroupSummary,
  GroupDetails,
} from '../db';
import { CATEGORIES, CATEGORY_MAP } from '../categories';
import { getAvatarColor, getInitials, getCurrencySymbol, formatAmount } from '../utils';
import { getCachedRates, convertAmount } from '../currencyRates';

let rememberedTab: 'all' | 'trip' = 'all';

function CategoryBreakdown({
  expenses,
  currency,
}: {
  expenses: { category: string; amount: number }[];
  currency: string;
}) {
  const { t } = useTranslation();
  const { colors } = useTheme();
  const styles = makeStyles(colors);
  const scopeTotal = expenses.reduce((s, e) => s + e.amount, 0);

  const catRows = CATEGORIES
    .map((cat) => ({
      ...cat,
      total: expenses.filter((e) => e.category === cat.id).reduce((s, e) => s + e.amount, 0),
    }))
    .filter((c) => c.total > 0)
    .sort((a, b) => b.total - a.total);

  const maxCat = catRows[0]?.total ?? 0;

  if (catRows.length === 0) {
    return (
      <View style={[styles.card, cardShadow, styles.emptyCard]}>
        <Ionicons name="pie-chart-outline" size={32} color={colors.border} />
        <Text style={styles.emptyText}>{t('insights.noCategoryExpenses')}</Text>
      </View>
    );
  }

  return (
    <View style={[styles.card, cardShadow]}>
      <Text style={styles.cardTitle}>{t('insights.byCategory')}</Text>
      <View style={styles.catList}>
        {catRows.map((cat) => {
          const barPct   = maxCat > 0 ? cat.total / maxCat : 0;
          const sharePct = scopeTotal > 0 ? Math.round((cat.total / scopeTotal) * 100) : 0;
          return (
            <View key={cat.id} style={styles.catRow}>
              <View style={[styles.catIconBg, { backgroundColor: cat.bg }]}>
                <Ionicons name={cat.icon} size={14} color={cat.color} />
              </View>
              <View style={styles.catInfo}>
                <View style={styles.catLabelRow}>
                  <Text style={styles.catName}>{t(`categories.${cat.id}`, cat.label)}</Text>
                  <View style={styles.catAmountRow}>
                    <Text style={[styles.catAmount, { color: cat.color }]}>
                      {getCurrencySymbol(currency)}{formatAmount(cat.total, currency)}
                    </Text>
                    <Text style={styles.catPct}>({sharePct}%)</Text>
                  </View>
                </View>
                <View style={styles.barTrack}>
                  <View
                    style={[
                      styles.barFill,
                      { width: `${(barPct * 100).toFixed(1)}%`, backgroundColor: cat.color },
                    ]}
                  />
                </View>
              </View>
            </View>
          );
        })}
      </View>
    </View>
  );
}

const MEDALS = ['🥇', '🥈', '🥉'];

function WhoPaidMost({ tripDetails }: { tripDetails: GroupDetails }) {
  const { t } = useTranslation();
  const { colors } = useTheme();
  const styles = makeStyles(colors);
  const memberIndexMap = new Map(tripDetails.members.map((m, i) => [m.id, i]));

  const paidMap = new Map<number, number>();
  tripDetails.expenses.forEach((e) => {
    paidMap.set(e.paid_by, (paidMap.get(e.paid_by) ?? 0) + e.amount);
  });

  const ranking = tripDetails.members
    .map((m) => ({
      ...m,
      avatarIndex: memberIndexMap.get(m.id) ?? 0,
      totalPaid: paidMap.get(m.id) ?? 0,
    }))
    .sort((a, b) => b.totalPaid - a.totalPaid);

  return (
    <View style={[styles.card, cardShadow]}>
      <Text style={styles.cardTitle}>{t('insights.whoPaidMost')}</Text>
      {ranking.map((member, i) => (
        <View key={member.id} style={[styles.rankRow, i > 0 && styles.rankRowBorder]}>
          {i < 3 ? (
            <Text style={styles.medal}>{MEDALS[i]}</Text>
          ) : (
            <View style={styles.rankNumBadge}>
              <Text style={styles.rankNumText}>{i + 1}</Text>
            </View>
          )}
          <View style={[styles.rankAvatar, { backgroundColor: getAvatarColor(member.avatarIndex) }]}>
            <Text style={styles.rankAvatarText}>{getInitials(member.name)}</Text>
          </View>
          <Text style={styles.rankName} numberOfLines={1}>{member.name}</Text>
          <Text style={[styles.rankAmount, member.totalPaid === 0 && styles.rankAmountZero]}>
            {getCurrencySymbol(tripDetails.currency)}{formatAmount(member.totalPaid, tripDetails.currency)}
          </Text>
        </View>
      ))}
    </View>
  );
}

function WhoOwesMost({ tripDetails }: { tripDetails: GroupDetails }) {
  const { t } = useTranslation();
  const { colors } = useTheme();
  const styles = makeStyles(colors);
  const memberIndexMap = new Map(tripDetails.members.map((m, i) => [m.id, i]));
  const ranking = [...tripDetails.members].sort((a, b) => a.balance - b.balance);

  return (
    <View style={[styles.card, cardShadow]}>
      <Text style={styles.cardTitle}>{t('insights.whoOwesMost')}</Text>
      {ranking.map((member, i) => {
        const avatarColor = getAvatarColor(memberIndexMap.get(member.id) ?? 0);
        const settled  = Math.abs(member.balance) < 0.005;
        const owes     = member.balance < -0.005;
        const credited = member.balance > 0.005;

        return (
          <View key={member.id} style={[styles.rankRow, i > 0 && styles.rankRowBorder]}>
            <View style={[styles.rankAvatar, { backgroundColor: avatarColor }]}>
              <Text style={styles.rankAvatarText}>{getInitials(member.name)}</Text>
            </View>
            <Text style={styles.rankName} numberOfLines={1}>{member.name}</Text>
            {settled ? (
              <View style={styles.settledBadge}>
                <Ionicons name="checkmark-circle" size={14} color={colors.sage} />
                <Text style={styles.settledText}>{t('insights.settled')}</Text>
              </View>
            ) : owes ? (
              <Text style={styles.owesAmount}>
                {t('insights.owed', { amount: Math.abs(member.balance).toFixed(2) })}
              </Text>
            ) : credited ? (
              <Text style={styles.creditAmount}>
                +{getCurrencySymbol(tripDetails.currency)}{formatAmount(member.balance, tripDetails.currency)}
              </Text>
            ) : null}
          </View>
        );
      })}
    </View>
  );
}

type HighlightItem = {
  icon: React.ComponentProps<typeof Ionicons>['name'];
  iconColor: string;
  iconBg: string;
  amount: string;
  label: string;
  sub: string;
};

function TripHighlights({ tripDetails }: { tripDetails: GroupDetails }) {
  const { t } = useTranslation();
  const { colors } = useTheme();
  const styles = makeStyles(colors);
  const { expenses } = tripDetails;
  if (expenses.length === 0) return null;

  const biggestExp = expenses.reduce((best, e) => (e.amount > best.amount ? e : best));
  const catDef = CATEGORY_MAP[biggestExp.category];
  const biggestExpLabel =
    biggestExp.category === 'other' && biggestExp.custom_category?.trim()
      ? biggestExp.custom_category.trim()
      : biggestExp.note?.trim()
      ? biggestExp.note.trim()
      : t(`categories.${biggestExp.category}`, catDef?.label ?? biggestExp.category);

  const paidByName = new Map<string, number>();
  expenses.forEach((e) => {
    paidByName.set(e.paid_by_name, (paidByName.get(e.paid_by_name) ?? 0) + e.amount);
  });
  let topSpenderName = '';
  let topSpenderAmt  = 0;
  paidByName.forEach((amt, name) => {
    if (amt > topSpenderAmt) { topSpenderAmt = amt; topSpenderName = name; }
  });

  const byDate = new Map<string, number>();
  expenses.forEach((e) => {
    byDate.set(e.date, (byDate.get(e.date) ?? 0) + e.amount);
  });
  let topDate    = '';
  let topDateAmt = 0;
  byDate.forEach((amt, date) => {
    if (amt > topDateAmt) { topDateAmt = amt; topDate = date; }
  });
  const topDateFmt = topDate
    ? new Date(topDate + 'T12:00:00').toLocaleDateString('en-US', {
        month: 'short', day: 'numeric',
      })
    : '';

  const sym = getCurrencySymbol(tripDetails.currency);
  const items: HighlightItem[] = [
    {
      icon: 'trending-up-outline',
      iconColor: colors.coral,
      iconBg: '#FFF0EE',
      amount: `${sym}${formatAmount(biggestExp.amount, tripDetails.currency)}`,
      label: t('insights.biggestExpense'),
      sub: biggestExpLabel,
    },
    {
      icon: 'wallet-outline',
      iconColor: '#8B72BE',
      iconBg: '#F3F0FF',
      amount: `${sym}${formatAmount(topSpenderAmt, tripDetails.currency)}`,
      label: t('insights.topSpender'),
      sub: topSpenderName,
    },
    {
      icon: 'calendar-outline',
      iconColor: colors.sage,
      iconBg: '#F0F5F2',
      amount: `${sym}${formatAmount(topDateAmt, tripDetails.currency)}`,
      label: t('insights.priciestDay'),
      sub: topDateFmt,
    },
  ];

  return (
    <>
      <Text style={styles.hlTitle}>{t('insights.highlights')}</Text>
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        style={styles.hlScroll}
        contentContainerStyle={styles.hlScrollContent}
      >
        {items.map((item, i) => (
          <View key={i} style={[styles.hlCard, cardShadow]}>
            <View style={[styles.hlIconBg, { backgroundColor: item.iconBg }]}>
              <Ionicons name={item.icon} size={18} color={item.iconColor} />
            </View>
            <Text style={[styles.hlAmount, { color: item.iconColor }]}>{item.amount}</Text>
            <Text style={styles.hlLabel}>{item.label}</Text>
            <Text style={styles.hlSub} numberOfLines={2}>{item.sub}</Text>
          </View>
        ))}
      </ScrollView>
    </>
  );
}

function AllTripsView({ trips }: { trips: GroupSummary[] }) {
  const { t }   = useTranslation();
  const { colors } = useTheme();
  const styles = makeStyles(colors);
  const rates   = getCachedRates();

  if (trips.length === 0) {
    return (
      <View style={[styles.card, cardShadow, styles.emptyCard]}>
        <Ionicons name="airplane-outline" size={32} color={colors.border} />
        <Text style={styles.emptyText}>{t('insights.noTrips')}</Text>
      </View>
    );
  }

  const currencies = [...new Set(trips.map((tr) => tr.currency))];
  const mixedCurrencies = currencies.length > 1;

  const tripsWithUSD = trips.map((tr) => ({
    ...tr,
    totalInUSD: rates ? convertAmount(tr.totalSpent, tr.currency, 'USD', rates) : tr.totalSpent,
  }));
  const grandTotal = tripsWithUSD.reduce((s, tr) => s + tr.totalInUSD, 0);
  const ranked     = [...tripsWithUSD].sort((a, b) => b.totalInUSD - a.totalInUSD);
  const displayCurrency = mixedCurrencies ? 'USD' : currencies[0];

  return (
    <>
      <View style={styles.headlineCard}>
        <Text style={styles.headlineScope}>{t('insights.allTripsScope')}</Text>
        <Text style={styles.headlineAmount}>
          {getCurrencySymbol(displayCurrency ?? 'USD')}{formatAmount(grandTotal, displayCurrency ?? 'USD')}
          <Text style={styles.headlineCurrency}> {displayCurrency}</Text>
        </Text>
        <Text style={styles.headlineSub}>
          {t('insights.tripCount', { count: trips.length })}
          {mixedCurrencies ? ' · ' + t('insights.mixedCurrencies') : ''}
        </Text>
      </View>
      {rates === null && mixedCurrencies && (
        <View style={styles.ratesBanner}>
          <Ionicons name="warning-outline" size={13} color={colors.coral} />
          <Text style={styles.ratesBannerText}>{t('common.ratesUnavailable')}</Text>
        </View>
      )}

      <Text style={styles.allListTitle}>{t('insights.rankedBySpend')}</Text>
      <View style={[styles.card, cardShadow]}>
        {ranked.map((trip, i) => {
          const pct = grandTotal > 0 ? trip.totalInUSD / grandTotal : 0;
          return (
            <View key={trip.id} style={[styles.allTripRow, i > 0 && styles.rankRowBorder]}>
              {i < 3 ? (
                <Text style={styles.medal}>{MEDALS[i]}</Text>
              ) : (
                <View style={styles.rankNumBadge}>
                  <Text style={styles.rankNumText}>{i + 1}</Text>
                </View>
              )}
              {trip.destination_photo_url ? (
                <Image
                  source={{ uri: trip.destination_photo_url }}
                  style={styles.allTripThumb}
                  resizeMode="cover"
                />
              ) : (
                <View style={[styles.allTripThumb, styles.allTripThumbPlaceholder]}>
                  <Text style={styles.allTripThumbInitial}>
                    {(trip.name[0] ?? '?').toUpperCase()}
                  </Text>
                </View>
              )}
              <View style={styles.allTripInfo}>
                <Text style={styles.allTripName} numberOfLines={1}>{trip.name}</Text>
                {trip.destination ? (
                  <Text style={styles.allTripDest} numberOfLines={1}>{trip.destination}</Text>
                ) : null}
                <View style={styles.barTrack}>
                  <View style={[styles.barFill, { width: `${(pct * 100).toFixed(1)}%` as any, backgroundColor: colors.coral }]} />
                </View>
              </View>
              <Text style={styles.allTripAmount}>
                {getCurrencySymbol(trip.currency)}{formatAmount(trip.totalSpent, trip.currency)}
              </Text>
            </View>
          );
        })}
      </View>
    </>
  );
}

export default function InsightsScreen() {
  const { t } = useTranslation();
  const { colors } = useTheme();
  const styles = makeStyles(colors);
  const [activeTab, setActiveTab] = useState<'all' | 'trip'>(rememberedTab);

  const [allTrips, setAllTrips]             = useState<GroupSummary[]>([]);
  const [selectedTripId, setSelectedTripId] = useState<number | null>(null);
  const [tripDetails, setTripDetails]       = useState<GroupDetails | null>(null);
  const [tripLoading, setTripLoading]       = useState(false);

  useFocusEffect(
    useCallback(() => {
      let active = true;
      getAllTripSummaries().then((data) => {
        if (!active) return;
        setAllTrips(data);
        setSelectedTripId((prev) => {
          if (prev === null && data.length > 0) return data[0].id;
          return prev;
        });
      });
      return () => { active = false; };
    }, []),
  );

  useEffect(() => {
    if (selectedTripId === null) {
      setTripDetails(null);
      return;
    }
    let active = true;
    setTripLoading(true);
    getGroupDetails(selectedTripId).then((data) => {
      if (!active) return;
      setTripDetails(data);
      setTripLoading(false);
    });
    return () => { active = false; };
  }, [selectedTripId]);

  const switchTab = (tab: 'all' | 'trip') => {
    rememberedTab = tab;
    setActiveTab(tab);
  };

  const handleDeleteTrip = (trip: GroupSummary) => {
    Alert.alert(
      t('insights.deleteTitle', { name: trip.name }),
      t('insights.deleteMsg'),
      [
        { text: t('common.cancel'), style: 'cancel' },
        {
          text: t('common.delete'),
          style: 'destructive',
          onPress: async () => {
            await deleteGroup(trip.id);
            const updated = await getAllTripSummaries();
            setAllTrips(updated);
            if (selectedTripId === trip.id) {
              const nextId = updated[0]?.id ?? null;
              setSelectedTripId(nextId);
              if (nextId === null) setTripDetails(null);
            }
          },
        },
      ],
    );
  };

  const rates         = getCachedRates();
  const tripTotal     = tripDetails?.totalSpent ?? 0;
  const memberCount   = tripDetails?.members.length ?? 0;
  const costPerPerson = memberCount > 0 ? tripTotal / memberCount : null;

  const tripDetailsNorm: GroupDetails | null = tripDetails && rates ? {
    ...tripDetails,
    expenses: tripDetails.expenses.map((e) => ({
      ...e,
      amount: convertAmount(e.amount, e.currency, tripDetails.currency, rates),
    })),
  } : tripDetails;
  const hasMixedExpCurrencies = tripDetails
    ? tripDetails.expenses.some((e) => e.currency !== tripDetails.currency)
    : false;

  return (
    <SafeAreaView style={styles.safe}>
      <ScrollView
        contentContainerStyle={styles.scroll}
        showsVerticalScrollIndicator={false}
      >
        <Text style={styles.screenTitle}>{t('insights.title')}</Text>

        <View style={[styles.segmentRow, cardShadow]}>
          <Pressable
            style={[styles.segment, activeTab === 'all' && styles.segmentSelected]}
            onPress={() => switchTab('all')}
          >
            <Text style={[styles.segmentText, activeTab === 'all' && styles.segmentTextSelected]}>
              {t('insights.segmentAll')}
            </Text>
          </Pressable>
          <Pressable
            style={[styles.segment, activeTab === 'trip' && styles.segmentSelected]}
            onPress={() => switchTab('trip')}
          >
            <Text style={[styles.segmentText, activeTab === 'trip' && styles.segmentTextSelected]}>
              {t('insights.segmentByTrip')}
            </Text>
          </Pressable>
        </View>

        {activeTab === 'all' ? (
          <AllTripsView trips={allTrips} />
        ) : (
          <>
            {allTrips.length === 0 ? (
              <View style={[styles.card, cardShadow, styles.emptyCard]}>
                <Ionicons name="airplane-outline" size={32} color={colors.border} />
                <Text style={styles.emptyText}>{t('insights.noTrips')}</Text>
              </View>
            ) : (
              <ScrollView
                horizontal
                showsHorizontalScrollIndicator={false}
                style={styles.tripPickerScroll}
                contentContainerStyle={styles.tripPickerContent}
              >
                {allTrips.map((trip) => {
                  const isSelected = trip.id === selectedTripId;
                  const isArchived = Boolean(trip.is_archived);
                  return (
                    <Pressable
                      key={trip.id}
                      style={[styles.tripChip, isSelected && styles.tripChipSelected]}
                      onPress={() => setSelectedTripId(trip.id)}
                    >
                      {isArchived ? (
                        <Ionicons
                          name="archive-outline"
                          size={11}
                          color={isSelected ? colors.coral : colors.textSecondary}
                        />
                      ) : null}
                      <Text
                        style={[styles.tripChipText, isSelected && styles.tripChipTextSelected]}
                        numberOfLines={1}
                      >
                        {trip.name}
                      </Text>
                      {isArchived ? (
                        <Pressable
                          onPress={() => handleDeleteTrip(trip)}
                          hitSlop={10}
                          style={styles.chipTrashBtn}
                        >
                          <Ionicons name="trash-outline" size={13} color={colors.coral} />
                        </Pressable>
                      ) : null}
                    </Pressable>
                  );
                })}
              </ScrollView>
            )}

            {tripDetails && !tripLoading ? (
              <>
                <View style={styles.headlineCard}>
                  <Text style={styles.headlineScope} numberOfLines={1}>
                    {tripDetails.name.toUpperCase()}
                  </Text>
                  <Text style={styles.headlineAmount}>
                    {getCurrencySymbol(tripDetails.currency)}{formatAmount(tripTotal, tripDetails.currency)}{' '}
                    <Text style={styles.headlineCurrency}>{tripDetails.currency}</Text>
                  </Text>
                  <Text style={styles.headlineSub}>
                    {t('insights.expenseCount', { count: tripDetails.expenses.length })}
                  </Text>
                  {costPerPerson !== null && (
                    <>
                      <View style={styles.headlineDivider} />
                      <View style={styles.cppRow}>
                        <Ionicons name="people-outline" size={13} color="rgba(255,255,255,0.80)" />
                        <Text style={styles.cppText}>
                          {t('insights.perPerson', { symbol: getCurrencySymbol(tripDetails.currency), amount: formatAmount(costPerPerson, tripDetails.currency) })}
                          {'  ·  '}
                          {t('insights.memberCount', { count: memberCount })}
                        </Text>
                      </View>
                    </>
                  )}
                </View>
                {rates === null && hasMixedExpCurrencies && (
                  <View style={styles.ratesBanner}>
                    <Ionicons name="warning-outline" size={13} color={colors.coral} />
                    <Text style={styles.ratesBannerText}>{t('common.ratesUnavailable')}</Text>
                  </View>
                )}

                <TripHighlights tripDetails={tripDetailsNorm ?? tripDetails} />
                <CategoryBreakdown
                  expenses={tripDetailsNorm?.expenses ?? tripDetails.expenses}
                  currency={tripDetails.currency}
                />

                {tripDetails.members.length > 0 && (
                  <>
                    <WhoPaidMost tripDetails={tripDetailsNorm ?? tripDetails} />
                    <WhoOwesMost tripDetails={tripDetails} />
                  </>
                )}
              </>
            ) : allTrips.length > 0 && selectedTripId === null ? (
              <View style={[styles.card, cardShadow, styles.emptyCard]}>
                <Text style={styles.emptyText}>{t('insights.selectTrip')}</Text>
              </View>
            ) : null}
          </>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

const makeStyles = (c: ColorPalette) => StyleSheet.create({
  safe: {
    flex: 1,
    backgroundColor: c.background,
  },
  scroll: {
    paddingHorizontal: 20,
    paddingBottom: 100,
  },
  screenTitle: {
    fontSize: fontSizes.screenTitle,
    fontWeight: '700',
    color: c.textPrimary,
    marginTop: 24,
    marginBottom: 20,
  },

  segmentRow: {
    flexDirection: 'row',
    backgroundColor: c.card,
    borderRadius: radii.button,
    padding: 4,
    marginBottom: 20,
  },
  segment: {
    flex: 1,
    paddingVertical: 9,
    borderRadius: radii.button - 2,
    alignItems: 'center',
  },
  segmentSelected: {
    backgroundColor: c.coral,
  },
  segmentText: {
    fontSize: fontSizes.body,
    fontWeight: '600',
    color: c.textSecondary,
  },
  segmentTextSelected: {
    color: '#fff',
  },

  card: {
    backgroundColor: c.card,
    borderRadius: radii.card,
    padding: 16,
    marginBottom: 16,
  },
  cardTitle: {
    fontSize: fontSizes.sectionTitle,
    fontWeight: '700',
    color: c.textPrimary,
    marginBottom: 14,
  },
  emptyCard: {
    alignItems: 'center',
    paddingVertical: 28,
    gap: 8,
  },
  emptyText: {
    fontSize: fontSizes.body,
    color: c.textSecondary,
  },

  headlineCard: {
    backgroundColor: c.coral,
    borderRadius: radii.card,
    paddingHorizontal: 20,
    paddingVertical: 18,
    marginBottom: 16,
    gap: 3,
    shadowColor: c.coral,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.35,
    shadowRadius: 10,
    elevation: 5,
  },
  headlineScope: {
    fontSize: fontSizes.caption,
    fontWeight: '600',
    color: c.card,
    opacity: 0.82,
    textTransform: 'uppercase',
    letterSpacing: 0.6,
  },
  headlineAmount: {
    fontSize: fontSizes.screenTitle,
    fontWeight: '800',
    color: c.card,
  },
  headlineCurrency: {
    fontSize: fontSizes.body,
    fontWeight: '600',
  },
  headlineSub: {
    fontSize: fontSizes.caption,
    fontWeight: '500',
    color: c.card,
    opacity: 0.72,
  },
  headlineDivider: {
    height: 1,
    backgroundColor: 'rgba(255,255,255,0.25)',
    marginTop: 10,
    marginBottom: 6,
  },
  ratesBanner: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 5,
    marginTop: -8,
    marginBottom: 12,
  },
  ratesBannerText: {
    fontSize: fontSizes.caption,
    color: c.coral,
    flex: 1,
  },
  cppRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  cppText: {
    fontSize: fontSizes.caption,
    fontWeight: '600',
    color: c.card,
    opacity: 0.90,
  },

  tripPickerScroll: {
    flexGrow: 0,
    marginBottom: 16,
  },
  tripPickerContent: {
    gap: 8,
    paddingVertical: 2,
  },
  tripChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 20,
    backgroundColor: c.card,
    borderWidth: 1.5,
    borderColor: 'transparent',
    maxWidth: 180,
  },
  tripChipSelected: {
    borderColor: c.coral,
    backgroundColor: '#FFF0EE',
  },
  tripChipText: {
    fontSize: fontSizes.caption,
    fontWeight: '600',
    color: c.textSecondary,
  },
  tripChipTextSelected: {
    color: c.coral,
  },
  chipTrashBtn: {
    marginLeft: 2,
  },

  catList: {
    gap: 12,
  },
  catRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  catIconBg: {
    width: 32,
    height: 32,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
    flexShrink: 0,
  },
  catInfo: {
    flex: 1,
    gap: 5,
  },
  catLabelRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  catName: {
    fontSize: fontSizes.caption,
    fontWeight: '600',
    color: c.textPrimary,
  },
  catAmountRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  catAmount: {
    fontSize: fontSizes.caption,
    fontWeight: '700',
  },
  catPct: {
    fontSize: fontSizes.caption,
    fontWeight: '500',
    color: c.textSecondary,
  },
  barTrack: {
    height: 5,
    borderRadius: 3,
    backgroundColor: c.border,
    overflow: 'hidden',
  },
  barFill: {
    height: '100%',
    borderRadius: 3,
  },

  hlTitle: {
    fontSize: fontSizes.sectionTitle,
    fontWeight: '700',
    color: c.textPrimary,
    marginBottom: 12,
  },
  hlScroll: {
    flexGrow: 0,
    marginBottom: 16,
  },
  hlScrollContent: {
    gap: 12,
    paddingVertical: 3,
    paddingHorizontal: 1,
  },
  hlCard: {
    width: 148,
    backgroundColor: c.card,
    borderRadius: radii.card,
    padding: 14,
    gap: 5,
  },
  hlIconBg: {
    width: 38,
    height: 38,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 2,
  },
  hlAmount: {
    fontSize: fontSizes.sectionTitle,
    fontWeight: '800',
  },
  hlLabel: {
    fontSize: fontSizes.caption,
    fontWeight: '600',
    color: c.textSecondary,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  hlSub: {
    fontSize: fontSizes.body,
    fontWeight: '500',
    color: c.textPrimary,
  },

  rankRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 10,
    gap: 10,
  },
  rankRowBorder: {
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: c.border,
  },
  medal: {
    fontSize: 18,
    width: 28,
    textAlign: 'center',
  },
  rankNumBadge: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: c.background,
    alignItems: 'center',
    justifyContent: 'center',
  },
  rankNumText: {
    fontSize: 11,
    fontWeight: '700',
    color: c.textSecondary,
  },
  rankAvatar: {
    width: 34,
    height: 34,
    borderRadius: 17,
    alignItems: 'center',
    justifyContent: 'center',
    flexShrink: 0,
  },
  rankAvatarText: {
    fontSize: 11,
    fontWeight: '700',
    color: '#fff',
  },
  rankName: {
    flex: 1,
    fontSize: fontSizes.body,
    fontWeight: '500',
    color: c.textPrimary,
  },
  rankAmount: {
    fontSize: fontSizes.body,
    fontWeight: '700',
    color: c.textPrimary,
  },
  rankAmountZero: {
    color: c.textSecondary,
    fontWeight: '500',
  },
  settledBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  settledText: {
    fontSize: fontSizes.caption,
    fontWeight: '600',
    color: c.sage,
  },
  owesAmount: {
    fontSize: fontSizes.body,
    fontWeight: '700',
    color: c.coral,
  },
  creditAmount: {
    fontSize: fontSizes.body,
    fontWeight: '700',
    color: c.sage,
  },

  allListTitle: {
    fontSize: fontSizes.sectionTitle,
    fontWeight: '700',
    color: c.textPrimary,
    marginBottom: 12,
  },
  allTripRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 10,
    gap: 10,
  },
  allTripThumb: {
    width: 42,
    height: 42,
    borderRadius: 10,
    overflow: 'hidden',
    flexShrink: 0,
  },
  allTripThumbPlaceholder: {
    backgroundColor: '#FFF0EE',
    alignItems: 'center',
    justifyContent: 'center',
  },
  allTripThumbInitial: {
    fontSize: 17,
    fontWeight: '800',
    color: c.coral,
  },
  allTripInfo: {
    flex: 1,
    gap: 3,
  },
  allTripName: {
    fontSize: fontSizes.body,
    fontWeight: '600',
    color: c.textPrimary,
  },
  allTripDest: {
    fontSize: fontSizes.caption,
    color: c.textSecondary,
    fontWeight: '400',
  },
  allTripAmount: {
    fontSize: fontSizes.body,
    fontWeight: '700',
    color: c.textPrimary,
    flexShrink: 0,
  },
});
