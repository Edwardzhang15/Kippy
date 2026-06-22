import React, { forwardRef } from 'react';
import { Image, StyleSheet, Text, View } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { useTranslation } from 'react-i18next';
import { GroupDetails } from '../db';
import { colors, fontSizes } from '../theme';
import { getCurrencySymbol, formatAmount } from '../utils';

export type TripSummaryCardProps = {
  group: GroupDetails;
};

const CARD_W = 300;
const CARD_H = 533;
const PHOTO_H = 190;
const OVERLAP = 20;

function getTripDates(group: GroupDetails) {
  if (group.expenses.length === 0) return null;
  const dates = group.expenses.map((e) => e.date).sort();
  return { start: formatDate(dates[0]), end: formatDate(dates[dates.length - 1]) };
}

function formatDate(iso: string): string {
  const [year, month, day] = iso.split('T')[0].split('-');
  const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
  return `${months[parseInt(month, 10) - 1]} ${parseInt(day, 10)}, ${year}`;
}

const TripSummaryCard = forwardRef<View, TripSummaryCardProps>(({ group }, ref) => {
  const { t } = useTranslation();
  const hasPhoto = Boolean(group.destination_photo_url);
  const tripDates = getTripDates(group);

  const totalSpent = group.totalSpent;
  const totalOutstanding = group.members
    .filter((m) => m.balance < -0.005)
    .reduce((sum, m) => sum + Math.abs(m.balance), 0);
  const allSettled = totalOutstanding < 0.005;

  return (
    <View ref={ref} style={styles.card}>
      {/* ── Photo / gradient header ───────────────────────────── */}
      <View style={styles.photoSection}>
        {hasPhoto ? (
          <Image
            source={{ uri: group.destination_photo_url! }}
            style={StyleSheet.absoluteFill}
            resizeMode="cover"
          />
        ) : (
          <LinearGradient
            colors={[colors.coral, '#E05448', colors.sage]}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
            style={StyleSheet.absoluteFill}
          />
        )}

        {/* Decorative background icons — gradient mode only */}
        {!hasPhoto && (
          <>
            <Ionicons
              name="airplane-outline"
              size={88}
              color="rgba(255,255,255,0.11)"
              style={styles.decoA}
            />
            <Ionicons
              name="compass-outline"
              size={64}
              color="rgba(255,255,255,0.09)"
              style={styles.decoB}
            />
            <Ionicons
              name="map-outline"
              size={46}
              color="rgba(255,255,255,0.09)"
              style={styles.decoC}
            />
          </>
        )}

        <LinearGradient
          colors={['transparent', 'rgba(0,0,0,0.62)']}
          style={styles.photoEdgeGradient}
        />

        <View style={styles.photoOverlay}>
          <Text style={styles.groupName} numberOfLines={2}>{group.name}</Text>
          {group.destination ? (
            <View style={styles.destinationRow}>
              <Ionicons name="location-outline" size={12} color="rgba(255,255,255,0.82)" />
              <Text style={styles.destinationText}>{group.destination}</Text>
            </View>
          ) : null}
        </View>
      </View>

      {/* ── White stats card ──────────────────────────────────── */}
      <View style={styles.whiteCard}>
        <Text style={styles.totalLabel}>{t('shareCard.totalTripCost')}</Text>
        <View style={styles.totalAmountRow}>
          <Text style={styles.totalAmount}>{getCurrencySymbol(group.currency)}{formatAmount(totalSpent, group.currency)}</Text>
          <Text style={styles.totalCurrency}>{group.currency}</Text>
        </View>

        <View style={styles.divider} />

        <View style={styles.balanceRow}>
          <Text style={styles.balanceLabel}>{t('shareCard.outstandingBalance')}</Text>
          {allSettled ? (
            <View style={styles.allSettledRow}>
              <Ionicons name="checkmark-circle" size={14} color={colors.sage} />
              <Text style={styles.allSettledText}>{t('shareCard.allSettledUp')}</Text>
            </View>
          ) : (
            <Text style={styles.outstandingText}>
              {t('shareCard.remaining', { amount: formatAmount(totalOutstanding, group.currency) })}
            </Text>
          )}
        </View>

        <View style={styles.divider} />

        <View style={styles.memberList}>
          {group.members.slice(0, 6).map((m) => {
            const settled = Math.abs(m.balance) < 0.005;
            const owed = m.balance < -0.005;
            return (
              <View key={m.id} style={styles.memberRow}>
                <Text style={styles.memberName} numberOfLines={1}>{m.name}</Text>
                {settled ? (
                  <View style={styles.settledBadge}>
                    <Ionicons name="checkmark" size={11} color={colors.sage} />
                    <Text style={styles.settledText}>{t('shareCard.settled')}</Text>
                  </View>
                ) : owed ? (
                  <Text style={styles.owedText}>
                    {t('shareCard.owed', { amount: formatAmount(Math.abs(m.balance), group.currency) })}
                  </Text>
                ) : (
                  <Text style={styles.paidText}>+{getCurrencySymbol(group.currency)}{formatAmount(m.balance, group.currency)}</Text>
                )}
              </View>
            );
          })}
          {group.members.length > 6 && (
            <Text style={styles.moreMembers}>{t('shareCard.moreMembers', { count: group.members.length - 6 })}</Text>
          )}
        </View>

        {tripDates && (
          <Text style={styles.tripDates}>
            {tripDates.start === tripDates.end
              ? tripDates.start
              : `${tripDates.start} – ${tripDates.end}`}
          </Text>
        )}

        <View style={styles.footerRow}>
          <Ionicons name="navigate-circle-outline" size={11} color={colors.tabInactive} />
          <Text style={styles.footerText}>{t('shareCard.madeWithKippy')}</Text>
        </View>
      </View>
    </View>
  );
});

TripSummaryCard.displayName = 'TripSummaryCard';
export default TripSummaryCard;

const styles = StyleSheet.create({
  card: {
    width: CARD_W,
    height: CARD_H,
    borderRadius: 20,
    overflow: 'hidden',
    backgroundColor: '#fff',
  },

  photoSection: {
    height: PHOTO_H,
    overflow: 'hidden',
  },
  decoA: {
    position: 'absolute',
    top: -10,
    left: -12,
    transform: [{ rotate: '-22deg' }],
  },
  decoB: {
    position: 'absolute',
    top: 14,
    right: 22,
  },
  decoC: {
    position: 'absolute',
    bottom: 30,
    right: 8,
  },
  photoEdgeGradient: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    height: 80,
  },
  photoOverlay: {
    position: 'absolute',
    bottom: OVERLAP + 8,
    left: 0,
    right: 0,
    paddingHorizontal: 16,
    gap: 3,
  },
  groupName: {
    fontSize: 21,
    fontWeight: '800',
    color: '#fff',
    lineHeight: 25,
    textShadowColor: 'rgba(0,0,0,0.25)',
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 3,
  },
  destinationRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 3,
  },
  destinationText: {
    fontSize: 12,
    color: 'rgba(255,255,255,0.85)',
    fontWeight: '500',
  },

  whiteCard: {
    height: CARD_H - PHOTO_H + OVERLAP,
    marginTop: -OVERLAP,
    borderTopLeftRadius: OVERLAP,
    borderTopRightRadius: OVERLAP,
    backgroundColor: '#fff',
    paddingHorizontal: 18,
    paddingTop: 16,
    paddingBottom: 14,
  },
  totalLabel: {
    fontSize: 10,
    fontWeight: '600',
    color: colors.textSecondary,
    textTransform: 'uppercase',
    letterSpacing: 0.7,
    marginBottom: 2,
  },
  totalAmountRow: {
    flexDirection: 'row',
    alignItems: 'baseline',
    gap: 6,
    marginBottom: 12,
  },
  totalAmount: {
    fontSize: 30,
    fontWeight: '800',
    color: colors.textPrimary,
  },
  totalCurrency: {
    fontSize: 14,
    fontWeight: '600',
    color: colors.textSecondary,
  },
  divider: {
    height: 1,
    backgroundColor: colors.border,
    marginVertical: 10,
  },
  balanceRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  balanceLabel: {
    fontSize: 10,
    fontWeight: '600',
    color: colors.textSecondary,
    textTransform: 'uppercase',
    letterSpacing: 0.7,
  },
  allSettledRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  allSettledText: {
    fontSize: fontSizes.caption,
    fontWeight: '700',
    color: colors.sage,
  },
  outstandingText: {
    fontSize: fontSizes.caption,
    fontWeight: '700',
    color: colors.coral,
  },
  memberList: {
    gap: 7,
    marginTop: 2,
  },
  memberRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  memberName: {
    fontSize: 13,
    fontWeight: '500',
    color: colors.textPrimary,
    flex: 1,
    marginRight: 8,
  },
  settledBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 3,
  },
  settledText: {
    fontSize: 12,
    color: colors.sage,
    fontWeight: '600',
  },
  owedText: {
    fontSize: 12,
    color: colors.coral,
    fontWeight: '700',
  },
  paidText: {
    fontSize: 12,
    color: colors.sage,
    fontWeight: '700',
  },
  moreMembers: {
    fontSize: fontSizes.caption,
    color: colors.textSecondary,
    fontWeight: '500',
    textAlign: 'center',
    marginTop: 2,
  },
  tripDates: {
    fontSize: fontSizes.caption,
    color: colors.textSecondary,
    fontWeight: '500',
    textAlign: 'center',
    marginTop: 10,
  },

  footerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 5,
    paddingTop: 8,
    borderTopWidth: 1,
    borderTopColor: colors.border,
    marginTop: 'auto',
  },
  footerText: {
    fontSize: 10,
    color: colors.tabInactive,
    fontWeight: '500',
  },
});
