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
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { useFocusEffect } from '@react-navigation/native';
import { useTranslation } from 'react-i18next';
import { type ColorPalette, fontSizes, radii, cardShadow } from '../theme';
import { useTheme } from '../context/ThemeContext';
import {
  getAllTripSummaries,
  getGroupDetails,
  deleteGroup,
  getAllGroupExpensesForInsights,
  getAllPersonalTripSummaries,
  getAllPersonalTripExpensesForInsights,
  getPersonalTrip,
  getPersonalTripExpenses,
  deletePersonalTrip,
  GroupSummary,
  GroupDetails,
  GroupExpenseInsightRow,
  PersonalTrip,
  PersonalTripExpense,
  PersonalTripSummary,
  PersonalExpenseInsightRow,
} from '../db';
import TripBudgetRing from '../components/TripBudgetRing';
import { CATEGORIES, CATEGORY_MAP, FALLBACK_CATEGORY } from '../categories';
import { getAvatarColor, getInitials, getCurrencySymbol, formatAmount, formatExpenseDate } from '../utils';
import { getCachedRates, convertAmount } from '../currencyRates';

type IconName = React.ComponentProps<typeof Ionicons>['name'];
type TFn = ReturnType<typeof useTranslation>['t'];

let rememberedMode: 'group' | 'personal' = 'group';
let rememberedSubTab: 'all' | 'trip' = 'all';

function expenseLabel(
  t: TFn,
  category: string,
  customCategory: string | null | undefined,
  note: string | null | undefined,
): string {
  const catDef = CATEGORY_MAP[category];
  if (category === 'other' && customCategory?.trim()) return customCategory.trim();
  if (note?.trim()) return note.trim();
  return t(`categories.${category}`, catDef?.label ?? category);
}

// ─── Small shared pieces ───────────────────────────────────────────────────────

function EmptyCard({ icon, text }: { icon: IconName; text: string }) {
  const { colors } = useTheme();
  const styles = makeStyles(colors);
  return (
    <View style={[styles.card, cardShadow, styles.emptyCard]}>
      <Ionicons name={icon} size={32} color={colors.border} />
      <Text style={styles.emptyText}>{text}</Text>
    </View>
  );
}

function RatesBanner() {
  const { t } = useTranslation();
  const { colors } = useTheme();
  const styles = makeStyles(colors);
  return (
    <View style={styles.ratesBanner}>
      <Ionicons name="warning-outline" size={13} color={colors.coral} />
      <Text style={styles.ratesBannerText}>{t('common.ratesUnavailable')}</Text>
    </View>
  );
}

// Informational stats (most expensive trip, biggest group, budget discipline,
// average per trip, etc.) are never "owes"/"owed" values, so coral and sage
// are off-limits here — every stat tile and highlight card shares this one
// neutral icon treatment instead of picking its own accent color per tile.
function StatIconChip({ icon }: { icon: IconName }) {
  const { colors } = useTheme();
  const styles = makeStyles(colors);
  return (
    <View style={styles.hlIconBg}>
      <Ionicons name={icon} size={18} color={colors.textSecondary} />
    </View>
  );
}

type OverviewTileData = {
  icon: IconName;
  amount: string;
  currency?: string;
  label: string;
  sub: string;
};

function OverviewGrid({ tiles }: { tiles: OverviewTileData[] }) {
  const { colors } = useTheme();
  const styles = makeStyles(colors);
  return (
    <View style={styles.gridWrap}>
      {tiles.map((tile, i) => {
        const isLastOdd = tiles.length % 2 === 1 && i === tiles.length - 1;
        return (
          <View key={i} style={[styles.gridTile, cardShadow, isLastOdd && styles.gridTileFull]}>
            <StatIconChip icon={tile.icon} />
            <Text
              style={styles.hlAmount}
              numberOfLines={1}
              adjustsFontSizeToFit
              minimumFontScale={0.6}
            >
              {tile.amount}
              {tile.currency ? <Text style={styles.currencyTag}> {tile.currency}</Text> : null}
            </Text>
            <Text style={styles.hlLabel} numberOfLines={2}>{tile.label}</Text>
            <Text style={styles.hlSub} numberOfLines={2}>{tile.sub}</Text>
          </View>
        );
      })}
    </View>
  );
}

type HighlightItem = {
  icon: IconName;
  amount: string;
  currency: string;
  label: string;
  sub: string;
};

function HighlightsRow({ title, items }: { title: string; items: HighlightItem[] }) {
  const { colors } = useTheme();
  const styles = makeStyles(colors);
  if (items.length === 0) return null;
  return (
    <>
      <Text style={styles.hlTitle}>{title}</Text>
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        style={styles.hlScroll}
        contentContainerStyle={styles.hlScrollContent}
      >
        {items.map((item, i) => (
          <View key={i} style={[styles.hlCard, cardShadow]}>
            <StatIconChip icon={item.icon} />
            <Text
              style={styles.hlAmount}
              numberOfLines={1}
              adjustsFontSizeToFit
              minimumFontScale={0.6}
            >
              {item.amount}
              <Text style={styles.currencyTag}> {item.currency}</Text>
            </Text>
            <Text style={styles.hlLabel} numberOfLines={2}>{item.label}</Text>
            <Text style={styles.hlSub} numberOfLines={2}>{item.sub}</Text>
          </View>
        ))}
      </ScrollView>
    </>
  );
}

type RankableTrip = {
  id: number;
  name: string;
  destination: string | null;
  destination_photo_url: string | null;
  currency: string;
  totalSpent: number;
};

function RankedTripList<T extends RankableTrip>({
  trips,
  grandTotal,
  rankValue,
  displayCurrency,
}: {
  trips: T[];
  grandTotal: number;
  rankValue: (t: T) => number;
  // Trips are ranked by rankValue(), which is already converted to this
  // currency — the amount shown must be the same converted value, otherwise
  // the ranking order looks arbitrary whenever currencies are mixed.
  displayCurrency: string;
}) {
  const { colors } = useTheme();
  const styles = makeStyles(colors);
  return (
    <View style={[styles.card, cardShadow]}>
      {trips.map((trip, i) => {
        const pct = grandTotal > 0 ? rankValue(trip) / grandTotal : 0;
        const showOriginal = trip.currency !== displayCurrency;
        return (
          <View key={trip.id} style={[styles.allTripRow, i > 0 && styles.rankRowBorder]}>
            <RankBadge rank={i + 1} />
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
              {/* Always render the destination line — with a space fallback
                  when absent — so every row reserves identical height instead
                  of some rows being shorter than others. */}
              <Text style={styles.allTripDest} numberOfLines={1}>{trip.destination || ' '}</Text>
              <View style={styles.barTrack}>
                <View style={[styles.barFill, { width: `${(pct * 100).toFixed(1)}%` as any, backgroundColor: colors.tabInactive }]} />
              </View>
            </View>
            <View style={styles.allTripAmountCol}>
              <Text
                style={styles.allTripAmount}
                numberOfLines={1}
                adjustsFontSizeToFit
                minimumFontScale={0.7}
              >
                {getCurrencySymbol(displayCurrency)}{formatAmount(rankValue(trip), displayCurrency)}
                <Text style={styles.currencyTag}> {displayCurrency}</Text>
              </Text>
              {showOriginal && (
                <Text style={styles.allTripAmountOriginal} numberOfLines={1}>
                  {getCurrencySymbol(trip.currency)}{formatAmount(trip.totalSpent, trip.currency)} {trip.currency}
                </Text>
              )}
            </View>
          </View>
        );
      })}
    </View>
  );
}

type ChippableTrip = {
  id: number;
  name: string;
  currency: string;
  totalSpent: number;
  is_archived: number;
};

function TripChip({
  name, currency, totalSpent, isArchived, isSelected, onPress, onDelete,
}: {
  name: string;
  currency: string;
  totalSpent: number;
  isArchived: boolean;
  isSelected: boolean;
  onPress: () => void;
  onDelete: () => void;
}) {
  const { colors } = useTheme();
  const styles = makeStyles(colors);
  return (
    <Pressable
      style={[styles.tripChip, !isSelected && cardShadow, isSelected && styles.tripChipSelected]}
      onPress={onPress}
    >
      {isArchived ? (
        <Ionicons name="archive-outline" size={11} color={isSelected ? colors.coral : colors.textSecondary} />
      ) : null}
      <View style={styles.tripChipTextCol}>
        <Text
          style={[styles.tripChipText, isSelected && styles.tripChipTextSelected]}
          numberOfLines={1}
        >
          {name}
        </Text>
        <Text style={styles.tripChipAmount} numberOfLines={1} adjustsFontSizeToFit minimumFontScale={0.75}>
          {getCurrencySymbol(currency)}{formatAmount(totalSpent, currency)} {currency}
        </Text>
      </View>
      {isArchived ? (
        <Pressable onPress={onDelete} hitSlop={10} style={styles.chipTrashBtn}>
          <Ionicons name="trash-outline" size={13} color={colors.coral} />
        </Pressable>
      ) : null}
    </Pressable>
  );
}

function TripChipRow<T extends ChippableTrip>({
  trips, selectedId, onSelect, onDelete,
}: {
  trips: T[];
  selectedId: number | null;
  onSelect: (id: number) => void;
  onDelete: (trip: T) => void;
}) {
  const { colors } = useTheme();
  const styles = makeStyles(colors);
  return (
    <ScrollView
      horizontal
      showsHorizontalScrollIndicator={false}
      style={styles.tripPickerScroll}
      contentContainerStyle={styles.tripPickerContent}
    >
      {trips.map((trip) => (
        <TripChip
          key={trip.id}
          name={trip.name}
          currency={trip.currency}
          totalSpent={trip.totalSpent}
          isArchived={Boolean(trip.is_archived)}
          isSelected={trip.id === selectedId}
          onPress={() => onSelect(trip.id)}
          onDelete={() => onDelete(trip)}
        />
      ))}
    </ScrollView>
  );
}

// ─── Category breakdown (shared by group + personal trip detail) ─────────────

function CategoryBreakdown({
  expenses,
  currency,
}: {
  expenses: { category: string; amount: number }[];
  currency: string;
}) {
  const { t } = useTranslation();
  const styles = makeStyles(useTheme().colors);
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
    return <EmptyCard icon="pie-chart-outline" text={t('insights.noCategoryExpenses')} />;
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
                    <Text
                      style={[styles.catAmount, { color: cat.color }]}
                      numberOfLines={1}
                      adjustsFontSizeToFit
                      minimumFontScale={0.7}
                    >
                      {getCurrencySymbol(currency)}{formatAmount(cat.total, currency)}
                      <Text style={styles.currencyTag}> {currency}</Text>
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

// One consistent rank style everywhere a list is ranked (trips, who-paid-most):
// numbered circles for every rank, with 1-3 filled solid instead of tinted —
// "bolder" rather than a semantic color, since rank position isn't an
// owes/owed value and must not borrow coral or sage.
function RankBadge({ rank }: { rank: number }) {
  const { colors } = useTheme();
  const styles = makeStyles(colors);
  const isTop3 = rank <= 3;
  return (
    <View style={[styles.rankBadge, isTop3 && styles.rankBadgeTop]}>
      <Text style={[styles.rankBadgeText, isTop3 && styles.rankBadgeTextTop]}>{rank}</Text>
    </View>
  );
}

// ─── Group: per-trip breakdown pieces ─────────────────────────────────────────

function WhoPaidMost({ tripDetails }: { tripDetails: GroupDetails }) {
  const { t } = useTranslation();
  const styles = makeStyles(useTheme().colors);
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
          <RankBadge rank={i + 1} />
          <View style={[styles.rankAvatar, { backgroundColor: getAvatarColor(member.avatarIndex) }]}>
            <Text style={styles.rankAvatarText}>{getInitials(member.name)}</Text>
          </View>
          <Text style={styles.rankName} numberOfLines={1}>{member.name}</Text>
          <Text
            style={[styles.rankAmount, member.totalPaid === 0 && styles.rankAmountZero]}
            numberOfLines={1}
            adjustsFontSizeToFit
            minimumFontScale={0.7}
          >
            {getCurrencySymbol(tripDetails.currency)}{formatAmount(member.totalPaid, tripDetails.currency)}
            <Text style={styles.currencyTag}> {tripDetails.currency}</Text>
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
              <Text
                style={styles.owesAmount}
                numberOfLines={1}
                adjustsFontSizeToFit
                minimumFontScale={0.6}
              >
                {t('insights.owed', {
                  symbol: getCurrencySymbol(tripDetails.currency),
                  amount: formatAmount(Math.abs(member.balance), tripDetails.currency),
                  currency: tripDetails.currency,
                })}
              </Text>
            ) : credited ? (
              <Text
                style={styles.creditAmount}
                numberOfLines={1}
                adjustsFontSizeToFit
                minimumFontScale={0.7}
              >
                +{getCurrencySymbol(tripDetails.currency)}{formatAmount(member.balance, tripDetails.currency)}
                <Text style={styles.currencyTag}> {tripDetails.currency}</Text>
              </Text>
            ) : null}
          </View>
        );
      })}
    </View>
  );
}

function TripHighlights({ tripDetails }: { tripDetails: GroupDetails }) {
  const { t } = useTranslation();
  const { expenses } = tripDetails;
  if (expenses.length === 0) return null;

  const biggestExp = expenses.reduce((best, e) => (e.amount > best.amount ? e : best));

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
      amount: `${sym}${formatAmount(biggestExp.amount, tripDetails.currency)}`,
      currency: tripDetails.currency,
      label: t('insights.biggestExpense'),
      sub: expenseLabel(t, biggestExp.category, biggestExp.custom_category, biggestExp.note),
    },
    {
      icon: 'wallet-outline',
      amount: `${sym}${formatAmount(topSpenderAmt, tripDetails.currency)}`,
      currency: tripDetails.currency,
      label: t('insights.topSpender'),
      sub: topSpenderName,
    },
    {
      icon: 'calendar-outline',
      amount: `${sym}${formatAmount(topDateAmt, tripDetails.currency)}`,
      currency: tripDetails.currency,
      label: t('insights.priciestDay'),
      sub: topDateFmt,
    },
  ];

  return <HighlightsRow title={t('insights.highlights')} items={items} />;
}

// ─── Group: overview ("All Group Trips") ──────────────────────────────────────

function GroupOverview({ trips, expenses }: { trips: GroupSummary[]; expenses: GroupExpenseInsightRow[] }) {
  const { t }   = useTranslation();
  const { colors } = useTheme();
  const styles = makeStyles(colors);
  const rates   = getCachedRates();

  if (trips.length === 0) {
    return <EmptyCard icon="airplane-outline" text={t('insights.noTrips')} />;
  }

  const currencies = [...new Set(trips.map((tr) => tr.currency))];
  const mixedCurrencies = currencies.length > 1;
  const displayCurrency = mixedCurrencies ? 'USD' : (currencies[0] ?? 'USD');
  const toDisplay = (amount: number, currency: string) =>
    currency === displayCurrency ? amount : (rates ? convertAmount(amount, currency, displayCurrency, rates) : amount);

  const tripsWithDisp = trips.map((tr) => ({ ...tr, totalDisp: toDisplay(tr.totalSpent, tr.currency) }));
  const grandTotal = tripsWithDisp.reduce((s, tr) => s + tr.totalDisp, 0);
  const ranked     = [...tripsWithDisp].sort((a, b) => b.totalDisp - a.totalDisp);
  const mostExpensiveTrip = ranked[0] ?? null;
  const biggestGroup = [...trips].sort((a, b) => b.members.length - a.members.length)[0] ?? null;
  const avgPerTrip = trips.length > 0 ? grandTotal / trips.length : 0;

  const catTotals = new Map<string, number>();
  expenses.forEach((e) => {
    catTotals.set(e.category, (catTotals.get(e.category) ?? 0) + toDisplay(e.amount, e.currency));
  });
  let topCatId: string | null = null;
  let topCatAmt = 0;
  catTotals.forEach((amt, cat) => { if (amt > topCatAmt) { topCatAmt = amt; topCatId = cat; } });
  const topCatDef = topCatId ? CATEGORY_MAP[topCatId] : null;

  let biggestExpense: GroupExpenseInsightRow | null = null;
  let biggestExpenseDisp = 0;
  expenses.forEach((e) => {
    const disp = toDisplay(e.amount, e.currency);
    if (disp > biggestExpenseDisp) { biggestExpenseDisp = disp; biggestExpense = e; }
  });

  // Stats that compare trips against each other ("most expensive trip", "biggest
  // group", "average per trip") only mean something once there's something to
  // compare against — hide them with a single trip so the grid doesn't state
  // the obvious.
  const hasEnoughTripsToCompare = trips.length >= 2;

  const tiles: OverviewTileData[] = [];
  if (hasEnoughTripsToCompare && mostExpensiveTrip) {
    tiles.push({
      icon: 'trophy-outline',
      amount: `${getCurrencySymbol(mostExpensiveTrip.currency)}${formatAmount(mostExpensiveTrip.totalSpent, mostExpensiveTrip.currency)}`,
      currency: mostExpensiveTrip.currency,
      label: t('insights.mostExpensiveTrip'),
      sub: mostExpensiveTrip.name,
    });
  }
  if (topCatId && topCatDef) {
    tiles.push({
      icon: topCatDef.icon,
      amount: `${getCurrencySymbol(displayCurrency)}${formatAmount(topCatAmt, displayCurrency)}`,
      currency: displayCurrency,
      label: t('insights.mostExpensiveCategory'),
      sub: t(`categories.${topCatId}`, topCatDef.label),
    });
  }
  if (hasEnoughTripsToCompare && biggestGroup && biggestGroup.members.length > 0) {
    tiles.push({
      icon: 'people-outline',
      amount: String(biggestGroup.members.length),
      label: t('insights.biggestGroup'),
      sub: `${biggestGroup.name} · ${t('insights.memberCount', { count: biggestGroup.members.length })}`,
    });
  }
  if (biggestExpense) {
    const be = biggestExpense as GroupExpenseInsightRow;
    tiles.push({
      icon: 'trending-up-outline',
      amount: `${getCurrencySymbol(be.currency)}${formatAmount(be.amount, be.currency)}`,
      currency: be.currency,
      label: t('insights.biggestExpense'),
      sub: `${expenseLabel(t, be.category, be.custom_category, be.note)} · ${be.group_name}`,
    });
  }
  if (hasEnoughTripsToCompare) {
    tiles.push({
      icon: 'stats-chart-outline',
      amount: `${getCurrencySymbol(displayCurrency)}${formatAmount(avgPerTrip, displayCurrency)}`,
      currency: displayCurrency,
      label: t('insights.averagePerTrip'),
      sub: t('insights.tripCount', { count: trips.length }),
    });
  }

  return (
    <>
      <View style={[styles.card, cardShadow, styles.heroCard]}>
        <Text
          style={styles.heroAmount}
          numberOfLines={1}
          adjustsFontSizeToFit
          minimumFontScale={0.5}
        >
          {getCurrencySymbol(displayCurrency)}{formatAmount(grandTotal, displayCurrency)}
          <Text style={styles.heroCurrency}> {displayCurrency}</Text>
        </Text>
        <Text style={styles.heroSub}>
          {t('insights.tripCount', { count: trips.length })}
          {mixedCurrencies ? '  ·  ' + t('insights.mixedCurrencies') : ''}
        </Text>
      </View>
      {rates === null && mixedCurrencies && <RatesBanner />}

      <Text style={styles.allListTitle}>{t('insights.allGroupTrips')}</Text>
      <OverviewGrid tiles={tiles} />

      <Text style={styles.allListTitle}>{t('insights.rankedBySpend')}</Text>
      <RankedTripList trips={ranked} grandTotal={grandTotal} rankValue={(tr) => tr.totalDisp} displayCurrency={displayCurrency} />
    </>
  );
}

// ─── Personal: overview ("All Personal Trips") ────────────────────────────────

function PersonalOverview({ trips, expenses }: { trips: PersonalTripSummary[]; expenses: PersonalExpenseInsightRow[] }) {
  const { t }   = useTranslation();
  const { colors } = useTheme();
  const styles = makeStyles(colors);
  const rates   = getCachedRates();

  if (trips.length === 0) {
    return <EmptyCard icon="airplane-outline" text={t('insights.noTrips')} />;
  }

  const currencies = [...new Set(trips.map((tr) => tr.currency))];
  const mixedCurrencies = currencies.length > 1;
  const displayCurrency = mixedCurrencies ? 'USD' : (currencies[0] ?? 'USD');
  const toDisplay = (amount: number, currency: string) =>
    currency === displayCurrency ? amount : (rates ? convertAmount(amount, currency, displayCurrency, rates) : amount);

  const tripsWithDisp = trips.map((tr) => ({ ...tr, totalDisp: toDisplay(tr.totalSpent, tr.currency) }));
  const grandTotal = tripsWithDisp.reduce((s, tr) => s + tr.totalDisp, 0);
  const ranked     = [...tripsWithDisp].sort((a, b) => b.totalDisp - a.totalDisp);
  const mostExpensiveTrip = ranked[0] ?? null;
  const avgPerTrip = trips.length > 0 ? grandTotal / trips.length : 0;

  const budgeted = trips.filter((tr) => tr.budget_amount != null && tr.budget_amount > 0);
  let bestBudgetTrip: PersonalTripSummary | null = null;
  let bestBudgetDistance = Infinity;
  budgeted.forEach((tr) => {
    const pct = tr.totalSpent / tr.budget_amount!;
    const dist = Math.abs(pct - 1);
    if (dist < bestBudgetDistance) { bestBudgetDistance = dist; bestBudgetTrip = tr; }
  });

  const catTotals = new Map<string, number>();
  expenses.forEach((e) => {
    catTotals.set(e.category, (catTotals.get(e.category) ?? 0) + toDisplay(e.amount, e.currency));
  });
  let topCatId: string | null = null;
  let topCatAmt = 0;
  catTotals.forEach((amt, cat) => { if (amt > topCatAmt) { topCatAmt = amt; topCatId = cat; } });
  const topCatDef = topCatId ? CATEGORY_MAP[topCatId] : null;

  let biggestExpense: PersonalExpenseInsightRow | null = null;
  let biggestExpenseDisp = 0;
  expenses.forEach((e) => {
    const disp = toDisplay(e.amount, e.currency);
    if (disp > biggestExpenseDisp) { biggestExpenseDisp = disp; biggestExpense = e; }
  });

  // Stats that compare trips against each other only mean something once
  // there's something to compare against — hide them when there's nothing to
  // rank. "Best Budget Discipline" specifically compares budgeted trips, so it
  // gates on how many of those exist rather than the total trip count.
  const hasEnoughTripsToCompare = trips.length >= 2;
  const hasEnoughBudgetedTripsToCompare = budgeted.length >= 2;

  const tiles: OverviewTileData[] = [];
  if (hasEnoughTripsToCompare && mostExpensiveTrip) {
    tiles.push({
      icon: 'trophy-outline',
      amount: `${getCurrencySymbol(mostExpensiveTrip.currency)}${formatAmount(mostExpensiveTrip.totalSpent, mostExpensiveTrip.currency)}`,
      currency: mostExpensiveTrip.currency,
      label: t('insights.mostExpensiveTrip'),
      sub: mostExpensiveTrip.name,
    });
  }
  if (topCatId && topCatDef) {
    tiles.push({
      icon: topCatDef.icon,
      amount: `${getCurrencySymbol(displayCurrency)}${formatAmount(topCatAmt, displayCurrency)}`,
      currency: displayCurrency,
      label: t('insights.mostExpensiveCategory'),
      sub: t(`categories.${topCatId}`, topCatDef.label),
    });
  }
  if (hasEnoughBudgetedTripsToCompare && bestBudgetTrip) {
    const bbt = bestBudgetTrip as PersonalTripSummary;
    const pct = Math.round((bbt.totalSpent / bbt.budget_amount!) * 100);
    tiles.push({
      icon: 'ribbon-outline',
      amount: `${pct}%`,
      label: t('insights.bestBudgetDiscipline'),
      sub: bbt.name,
    });
  }
  if (biggestExpense) {
    const be = biggestExpense as PersonalExpenseInsightRow;
    tiles.push({
      icon: 'trending-up-outline',
      amount: `${getCurrencySymbol(be.currency)}${formatAmount(be.amount, be.currency)}`,
      currency: be.currency,
      label: t('insights.biggestExpense'),
      sub: `${expenseLabel(t, be.category, undefined, be.note)} · ${be.trip_name}`,
    });
  }
  if (hasEnoughTripsToCompare) {
    tiles.push({
      icon: 'stats-chart-outline',
      amount: `${getCurrencySymbol(displayCurrency)}${formatAmount(avgPerTrip, displayCurrency)}`,
      currency: displayCurrency,
      label: t('insights.averagePerTrip'),
      sub: t('insights.tripCount', { count: trips.length }),
    });
  }

  return (
    <>
      <View style={[styles.card, cardShadow, styles.heroCard]}>
        <Text
          style={styles.heroAmount}
          numberOfLines={1}
          adjustsFontSizeToFit
          minimumFontScale={0.5}
        >
          {getCurrencySymbol(displayCurrency)}{formatAmount(grandTotal, displayCurrency)}
          <Text style={styles.heroCurrency}> {displayCurrency}</Text>
        </Text>
        <Text style={styles.heroSub}>
          {t('insights.tripCount', { count: trips.length })}
          {mixedCurrencies ? '  ·  ' + t('insights.mixedCurrencies') : ''}
        </Text>
      </View>
      {rates === null && mixedCurrencies && <RatesBanner />}

      <Text style={styles.allListTitle}>{t('insights.allPersonalTrips')}</Text>
      <OverviewGrid tiles={tiles} />

      <Text style={styles.allListTitle}>{t('insights.rankedBySpend')}</Text>
      <RankedTripList trips={ranked} grandTotal={grandTotal} rankValue={(tr) => tr.totalDisp} displayCurrency={displayCurrency} />
    </>
  );
}

// ─── Personal: per-trip breakdown pieces ──────────────────────────────────────

function PersonalBiggestExpense({ trip, expenses }: { trip: PersonalTrip; expenses: PersonalTripExpense[] }) {
  const { t } = useTranslation();
  if (expenses.length === 0) return null;
  const biggest = expenses.reduce((best, e) => (e.amount > best.amount ? e : best));
  const sym = getCurrencySymbol(trip.currency);
  const item: HighlightItem = {
    icon: 'trending-up-outline',
    amount: `${sym}${formatAmount(biggest.amount, trip.currency)}`,
    currency: trip.currency,
    label: t('insights.biggestExpense'),
    sub: expenseLabel(t, biggest.category, undefined, biggest.note),
  };
  return <HighlightsRow title={t('insights.highlights')} items={[item]} />;
}

function PersonalExpenseTimeline({ expenses }: { expenses: PersonalTripExpense[] }) {
  const { t } = useTranslation();
  const styles = makeStyles(useTheme().colors);

  if (expenses.length === 0) {
    return <EmptyCard icon="receipt-outline" text={t('personalTrip.noExpenses')} />;
  }

  return (
    <View style={[styles.card, cardShadow]}>
      <Text style={styles.cardTitle}>{t('insights.expenseTimeline')}</Text>
      {expenses.map((exp, i) => {
        const cat = CATEGORY_MAP[exp.category] ?? FALLBACK_CATEGORY;
        return (
          <View key={exp.id} style={[styles.rankRow, i > 0 && styles.rankRowBorder]}>
            <View style={[styles.catIconBg, { backgroundColor: cat.bg }]}>
              <Ionicons name={cat.icon} size={14} color={cat.color} />
            </View>
            <View style={styles.timelineInfo}>
              <Text style={styles.rankName} numberOfLines={1}>
                {exp.note?.trim() || t(`categories.${exp.category}`, cat.label)}
              </Text>
              <Text style={styles.timelineDate}>{formatExpenseDate(exp.date)}</Text>
            </View>
            <Text
              style={styles.rankAmount}
              numberOfLines={1}
              adjustsFontSizeToFit
              minimumFontScale={0.7}
            >
              {getCurrencySymbol(exp.currency)}{formatAmount(exp.amount, exp.currency)}
              <Text style={styles.currencyTag}> {exp.currency}</Text>
            </Text>
          </View>
        );
      })}
    </View>
  );
}

// ─── Main screen ───────────────────────────────────────────────────────────────

export default function InsightsScreen() {
  const { t } = useTranslation();
  const { colors } = useTheme();
  const styles = makeStyles(colors);

  const [mode, setMode] = useState<'group' | 'personal'>(rememberedMode);
  const [subTab, setSubTab] = useState<'all' | 'trip'>(rememberedSubTab);

  const [allTrips, setAllTrips]             = useState<GroupSummary[]>([]);
  const [groupExpenses, setGroupExpenses]   = useState<GroupExpenseInsightRow[]>([]);
  const [selectedTripId, setSelectedTripId] = useState<number | null>(null);
  const [tripDetails, setTripDetails]       = useState<GroupDetails | null>(null);
  const [tripLoading, setTripLoading]       = useState(false);

  const [personalTrips, setPersonalTrips]           = useState<PersonalTripSummary[]>([]);
  const [personalExpensesAll, setPersonalExpensesAll] = useState<PersonalExpenseInsightRow[]>([]);
  const [selectedPersonalId, setSelectedPersonalId] = useState<number | null>(null);
  const [personalDetail, setPersonalDetail]         = useState<{ trip: PersonalTrip; expenses: PersonalTripExpense[] } | null>(null);
  const [personalLoading, setPersonalLoading]       = useState(false);

  useFocusEffect(
    useCallback(() => {
      let active = true;
      Promise.all([
        getAllTripSummaries(),
        getAllGroupExpensesForInsights(),
        getAllPersonalTripSummaries(),
        getAllPersonalTripExpensesForInsights(),
      ]).then(([trips, gExp, pTrips, pExp]) => {
        if (!active) return;
        setAllTrips(trips);
        setGroupExpenses(gExp);
        setPersonalTrips(pTrips);
        setPersonalExpensesAll(pExp);
        setSelectedTripId((prev) => (prev === null && trips.length > 0 ? trips[0].id : prev));
        setSelectedPersonalId((prev) => (prev === null && pTrips.length > 0 ? pTrips[0].id : prev));
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

  useEffect(() => {
    if (selectedPersonalId === null) {
      setPersonalDetail(null);
      return;
    }
    let active = true;
    setPersonalLoading(true);
    Promise.all([getPersonalTrip(selectedPersonalId), getPersonalTripExpenses(selectedPersonalId)]).then(
      ([trip, expenses]) => {
        if (!active) return;
        setPersonalDetail(trip ? { trip, expenses } : null);
        setPersonalLoading(false);
      },
    );
    return () => { active = false; };
  }, [selectedPersonalId]);

  const switchMode = (m: 'group' | 'personal') => {
    rememberedMode = m;
    setMode(m);
    // Level 2 always resets to the overview when Level 1 changes.
    rememberedSubTab = 'all';
    setSubTab('all');
  };
  const switchSubTab = (tab: 'all' | 'trip') => {
    rememberedSubTab = tab;
    setSubTab(tab);
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

  const handleDeletePersonalTrip = (trip: PersonalTripSummary) => {
    Alert.alert(
      t('insights.deleteTitle', { name: trip.name }),
      t('insights.deleteMsg'),
      [
        { text: t('common.cancel'), style: 'cancel' },
        {
          text: t('common.delete'),
          style: 'destructive',
          onPress: async () => {
            await deletePersonalTrip(trip.id);
            const updated = await getAllPersonalTripSummaries();
            setPersonalTrips(updated);
            if (selectedPersonalId === trip.id) {
              const nextId = updated[0]?.id ?? null;
              setSelectedPersonalId(nextId);
              if (nextId === null) setPersonalDetail(null);
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

  const personalSpent = personalDetail
    ? personalDetail.expenses.reduce((s, e) =>
        s + (rates ? convertAmount(e.amount, e.currency, personalDetail.trip.currency, rates) : e.amount), 0)
    : 0;
  const personalExpensesNorm: PersonalTripExpense[] = personalDetail && rates
    ? personalDetail.expenses.map((e) => ({
        ...e,
        amount: convertAmount(e.amount, e.currency, personalDetail.trip.currency, rates),
      }))
    : personalDetail?.expenses ?? [];
  const hasMixedPersonalCurrencies = personalDetail
    ? personalDetail.expenses.some((e) => e.currency !== personalDetail.trip.currency)
    : false;

  return (
    <SafeAreaView style={styles.safe}>
      <ScrollView
        contentContainerStyle={styles.scroll}
        showsVerticalScrollIndicator={false}
      >
        <Text style={styles.screenTitle}>{t('insights.title')}</Text>

        {/* LEVEL 1 — Group Trips vs Personal Trips. The dominant choice on this screen. */}
        <View style={[styles.primaryToggleRow, cardShadow]}>
          <Pressable
            style={[styles.primaryToggle, mode === 'group' && styles.primaryToggleSelected]}
            onPress={() => switchMode('group')}
          >
            <Text
              style={[styles.primaryToggleText, mode === 'group' && styles.primaryToggleTextSelected]}
              numberOfLines={1}
              adjustsFontSizeToFit
              minimumFontScale={0.8}
            >
              {t('insights.modeGroup')}
            </Text>
          </Pressable>
          <Pressable
            style={[styles.primaryToggle, mode === 'personal' && styles.primaryToggleSelected]}
            onPress={() => switchMode('personal')}
          >
            <Text
              style={[styles.primaryToggleText, mode === 'personal' && styles.primaryToggleTextSelected]}
              numberOfLines={1}
              adjustsFontSizeToFit
              minimumFontScale={0.8}
            >
              {t('insights.modePersonal')}
            </Text>
          </Pressable>
        </View>

        {/* LEVEL 2 — All Trips vs By Trip. Deliberately subtler than Level 1. */}
        <View style={styles.subTabRow}>
          <Pressable style={styles.subTabItem} onPress={() => switchSubTab('all')}>
            <Text style={[styles.subTabText, subTab === 'all' && styles.subTabTextActive]}>
              {t('insights.segmentAll')}
            </Text>
            {subTab === 'all' && <View style={styles.subTabUnderline} />}
          </Pressable>
          <Pressable style={styles.subTabItem} onPress={() => switchSubTab('trip')}>
            <Text style={[styles.subTabText, subTab === 'trip' && styles.subTabTextActive]}>
              {t('insights.segmentByTrip')}
            </Text>
            {subTab === 'trip' && <View style={styles.subTabUnderline} />}
          </Pressable>
        </View>

        {/* CONTENT — driven entirely by the two toggles above. */}
        {mode === 'group' ? (
          subTab === 'all' ? (
            <GroupOverview trips={allTrips} expenses={groupExpenses} />
          ) : (
            <>
              {allTrips.length === 0 ? (
                <EmptyCard icon="airplane-outline" text={t('insights.noTrips')} />
              ) : (
                <TripChipRow
                  trips={allTrips}
                  selectedId={selectedTripId}
                  onSelect={setSelectedTripId}
                  onDelete={handleDeleteTrip}
                />
              )}

              {tripDetails && !tripLoading ? (
                <>
                  {tripDetails.destination_photo_url ? (
                    <View style={[styles.photoHeader, cardShadow]}>
                      <Image
                        source={{ uri: tripDetails.destination_photo_url }}
                        style={StyleSheet.absoluteFill}
                        resizeMode="cover"
                      />
                      <LinearGradient
                        colors={['transparent', 'rgba(0,0,0,0.35)', 'rgba(0,0,0,0.72)']}
                        locations={[0.4, 0.7, 1]}
                        style={StyleSheet.absoluteFill}
                      />
                      <View style={styles.photoHeaderText}>
                        <Text style={styles.photoHeaderTitle} numberOfLines={1}>{tripDetails.name}</Text>
                        {tripDetails.destination ? (
                          <View style={styles.photoHeaderDestRow}>
                            <Ionicons name="location-outline" size={12} color="rgba(255,255,255,0.85)" />
                            <Text style={styles.photoHeaderDest} numberOfLines={1}>{tripDetails.destination}</Text>
                          </View>
                        ) : null}
                      </View>
                    </View>
                  ) : null}

                  <View style={[styles.card, cardShadow, styles.heroCard]}>
                    {!tripDetails.destination_photo_url && (
                      <Text style={styles.heroTripName} numberOfLines={1}>{tripDetails.name}</Text>
                    )}
                    <Text
                      style={styles.heroAmount}
                      numberOfLines={1}
                      adjustsFontSizeToFit
                      minimumFontScale={0.5}
                    >
                      {getCurrencySymbol(tripDetails.currency)}{formatAmount(tripTotal, tripDetails.currency)}
                      <Text style={styles.heroCurrency}> {tripDetails.currency}</Text>
                    </Text>
                    <Text style={styles.heroSub}>
                      {t('insights.expenseCount', { count: tripDetails.expenses.length })}
                      {costPerPerson !== null
                        ? '  ·  ' +
                          t('insights.perPerson', { symbol: getCurrencySymbol(tripDetails.currency), amount: formatAmount(costPerPerson, tripDetails.currency) }) +
                          ' ' + tripDetails.currency +
                          '  ·  ' +
                          t('insights.memberCount', { count: memberCount })
                        : ''}
                    </Text>
                  </View>
                  {rates === null && hasMixedExpCurrencies && <RatesBanner />}

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
                <EmptyCard icon="airplane-outline" text={t('insights.selectTrip')} />
              ) : null}
            </>
          )
        ) : subTab === 'all' ? (
          <PersonalOverview trips={personalTrips} expenses={personalExpensesAll} />
        ) : (
          <>
            {personalTrips.length === 0 ? (
              <EmptyCard icon="airplane-outline" text={t('insights.noTrips')} />
            ) : (
              <TripChipRow
                trips={personalTrips}
                selectedId={selectedPersonalId}
                onSelect={setSelectedPersonalId}
                onDelete={handleDeletePersonalTrip}
              />
            )}

            {personalDetail && !personalLoading ? (
              <>
                {personalDetail.trip.destination_photo_url ? (
                  <View style={[styles.photoHeader, cardShadow]}>
                    <Image
                      source={{ uri: personalDetail.trip.destination_photo_url }}
                      style={StyleSheet.absoluteFill}
                      resizeMode="cover"
                    />
                    <LinearGradient
                      colors={['transparent', 'rgba(0,0,0,0.35)', 'rgba(0,0,0,0.72)']}
                      locations={[0.4, 0.7, 1]}
                      style={StyleSheet.absoluteFill}
                    />
                    <View style={styles.photoHeaderText}>
                      <Text style={styles.photoHeaderTitle} numberOfLines={1}>{personalDetail.trip.name}</Text>
                      {personalDetail.trip.destination ? (
                        <View style={styles.photoHeaderDestRow}>
                          <Ionicons name="location-outline" size={12} color="rgba(255,255,255,0.85)" />
                          <Text style={styles.photoHeaderDest} numberOfLines={1}>{personalDetail.trip.destination}</Text>
                        </View>
                      ) : null}
                    </View>
                  </View>
                ) : null}

                <View style={[styles.card, cardShadow, styles.personalStatsCard]}>
                  {!personalDetail.trip.destination_photo_url && (
                    <Text style={styles.heroTripName} numberOfLines={1}>{personalDetail.trip.name}</Text>
                  )}
                  <TripBudgetRing
                    spent={personalSpent}
                    budget={personalDetail.trip.budget_amount}
                    currency={personalDetail.trip.currency}
                    size={130}
                    strokeWidth={10}
                  />
                  <Text
                    style={styles.personalSpentLabel}
                    numberOfLines={1}
                    adjustsFontSizeToFit
                    minimumFontScale={0.6}
                  >
                    {getCurrencySymbol(personalDetail.trip.currency)}{formatAmount(personalSpent, personalDetail.trip.currency)} {personalDetail.trip.currency}
                    {personalDetail.trip.budget_amount
                      ? ` / ${getCurrencySymbol(personalDetail.trip.currency)}${formatAmount(personalDetail.trip.budget_amount, personalDetail.trip.currency)} ${personalDetail.trip.currency}`
                      : ''}
                  </Text>
                </View>
                {rates === null && hasMixedPersonalCurrencies && <RatesBanner />}

                <PersonalBiggestExpense trip={personalDetail.trip} expenses={personalExpensesNorm} />
                <CategoryBreakdown
                  expenses={personalExpensesNorm}
                  currency={personalDetail.trip.currency}
                />
                <PersonalExpenseTimeline expenses={personalDetail.expenses} />
              </>
            ) : personalTrips.length > 0 && selectedPersonalId === null ? (
              <EmptyCard icon="airplane-outline" text={t('insights.selectTrip')} />
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

  // LEVEL 1 — Group Trips / Personal Trips. The dominant control on the screen:
  // bigger type, bigger touch targets, a solid coral fill on the active side.
  primaryToggleRow: {
    flexDirection: 'row',
    backgroundColor: c.card,
    borderRadius: radii.button,
    padding: 5,
    marginBottom: 14,
  },
  primaryToggle: {
    flex: 1,
    paddingVertical: 14,
    borderRadius: radii.button - 2,
    alignItems: 'center',
  },
  primaryToggleSelected: {
    backgroundColor: c.coral,
  },
  primaryToggleText: {
    fontSize: 17,
    fontWeight: '700',
    color: c.textSecondary,
  },
  primaryToggleTextSelected: {
    color: '#fff',
  },

  // LEVEL 2 — All Trips / By Trip. Deliberately quiet: plain text tabs with a
  // thin coral underline on the active one, no background fill.
  subTabRow: {
    flexDirection: 'row',
    gap: 24,
    marginBottom: 18,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: c.border,
  },
  subTabItem: {
    paddingBottom: 10,
    position: 'relative',
  },
  subTabText: {
    fontSize: fontSizes.body,
    fontWeight: '600',
    color: c.textSecondary,
  },
  subTabTextActive: {
    color: c.coral,
  },
  subTabUnderline: {
    position: 'absolute',
    bottom: -1,
    left: 0,
    right: 0,
    height: 2,
    borderRadius: 1,
    backgroundColor: c.coral,
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
    marginBottom: 12,
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
  currencyTag: {
    fontSize: 10,
    fontWeight: '600',
    color: c.textSecondary,
  },

  gridWrap: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 16,
    marginBottom: 16,
  },
  gridTile: {
    width: '47%',
    minHeight: 168,
    backgroundColor: c.card,
    borderRadius: radii.card,
    padding: 14,
    gap: 5,
  },
  gridTileFull: {
    width: '100%',
  },

  photoHeader: {
    height: 170,
    borderRadius: radii.card,
    overflow: 'hidden',
    marginBottom: 16,
  },
  photoHeaderText: {
    position: 'absolute',
    bottom: 16,
    left: 16,
    right: 16,
    gap: 4,
  },
  photoHeaderTitle: {
    fontSize: fontSizes.sectionTitle,
    fontWeight: '800',
    color: '#fff',
    textShadowColor: 'rgba(0,0,0,0.20)',
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 4,
  },
  photoHeaderDestRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  photoHeaderDest: {
    fontSize: fontSizes.caption,
    color: 'rgba(255,255,255,0.85)',
    fontWeight: '500',
  },

  // HERO — the single most important number on each tab (overview total, or
  // the selected trip's total in By Trip). Shared by every context so the
  // total always reads as the anchor of the screen, not a throwaway line.
  heroCard: {
    gap: 4,
  },
  heroTripName: {
    fontSize: fontSizes.sectionTitle,
    fontWeight: '700',
    color: c.textPrimary,
    marginBottom: 2,
  },
  heroAmount: {
    fontSize: 34,
    fontWeight: '800',
    color: c.textPrimary,
  },
  heroCurrency: {
    fontSize: fontSizes.body,
    fontWeight: '600',
    color: c.textSecondary,
  },
  heroSub: {
    fontSize: fontSizes.caption,
    fontWeight: '500',
    color: c.textSecondary,
    marginTop: 2,
  },

  personalStatsCard: {
    alignItems: 'center',
    gap: 10,
  },
  personalSpentLabel: {
    fontSize: fontSizes.body,
    fontWeight: '600',
    color: c.textSecondary,
    textAlign: 'center',
  },
  timelineInfo: {
    flex: 1,
    gap: 2,
  },
  timelineDate: {
    fontSize: fontSizes.caption,
    color: c.textSecondary,
  },

  ratesBanner: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 5,
    marginBottom: 12,
  },
  ratesBannerText: {
    fontSize: fontSizes.caption,
    color: c.coral,
    flex: 1,
  },

  tripPickerScroll: {
    flexGrow: 0,
    marginBottom: 16,
  },
  tripPickerContent: {
    gap: 10,
    paddingVertical: 3,
    paddingRight: 2,
  },
  tripChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 16,
    backgroundColor: c.card,
    borderWidth: 1.5,
    borderColor: 'transparent',
    maxWidth: 200,
  },
  tripChipSelected: {
    borderColor: c.coral,
    backgroundColor: '#FFF0EE',
  },
  tripChipTextCol: {
    flexShrink: 1,
  },
  tripChipText: {
    fontSize: fontSizes.caption,
    fontWeight: '600',
    color: c.textSecondary,
  },
  tripChipTextSelected: {
    color: c.coral,
  },
  tripChipAmount: {
    fontSize: 10,
    fontWeight: '600',
    color: c.textSecondary,
    marginTop: 1,
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
    backgroundColor: c.border,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 2,
  },
  // Slightly smaller than sectionTitle so stat-card values don't compete
  // with the hero total, and always near-black — informational stats never
  // borrow the coral/sage owes/owed colors.
  hlAmount: {
    fontSize: 18,
    fontWeight: '800',
    color: c.textPrimary,
  },
  // minHeight reserves 2 lines' worth of space so a 1-line label and a
  // wrapped 2-line label produce identically-sized cards.
  hlLabel: {
    fontSize: fontSizes.caption,
    fontWeight: '600',
    color: c.textSecondary,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    lineHeight: 15,
    minHeight: 30,
  },
  hlSub: {
    fontSize: fontSizes.body,
    fontWeight: '500',
    color: c.textPrimary,
    lineHeight: 19,
    minHeight: 38,
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
  rankBadge: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: c.background,
    alignItems: 'center',
    justifyContent: 'center',
    flexShrink: 0,
  },
  rankBadgeTop: {
    backgroundColor: c.textPrimary,
  },
  rankBadgeText: {
    fontSize: 11,
    fontWeight: '700',
    color: c.textSecondary,
  },
  rankBadgeTextTop: {
    color: '#fff',
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
    backgroundColor: c.border,
    alignItems: 'center',
    justifyContent: 'center',
  },
  allTripThumbInitial: {
    fontSize: 17,
    fontWeight: '800',
    color: c.textSecondary,
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
  allTripAmountCol: {
    alignItems: 'flex-end',
    gap: 2,
    flexShrink: 0,
  },
  allTripAmount: {
    fontSize: fontSizes.body,
    fontWeight: '700',
    color: c.textPrimary,
    flexShrink: 0,
  },
  allTripAmountOriginal: {
    fontSize: 10,
    fontWeight: '500',
    color: c.textSecondary,
    flexShrink: 0,
  },
});
