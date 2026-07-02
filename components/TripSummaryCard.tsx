import React, { forwardRef } from 'react';
import { Image, StyleSheet, Text, View } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { useTranslation } from 'react-i18next';
import { GroupDetails } from '../db';
import { getCurrencySymbol, formatAmount } from '../utils';
import { SC, scAvatarColor, scInitials } from './shareCardTheme';

export type TripSummaryCardProps = {
  group: GroupDetails;
};

const BODY_H  = SC.CARD_H - SC.HEADER_H + SC.OVERLAP;
// Kept lower than the balance-breakdown card's member cap (5) because this
// card also carries the big total-cost block above the member list, and a
// fixed-height card has no room to spare for that extra content.
const MAX_MEM = 4;

function getTripDates(group: GroupDetails) {
  if (group.expenses.length === 0) return null;
  const dates = group.expenses.map(e => e.date).sort();
  return { start: fmtDate(dates[0]), end: fmtDate(dates[dates.length - 1]) };
}

function fmtDate(iso: string): string {
  const [year, month, day] = iso.split('T')[0].split('-');
  const months = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];
  return `${months[parseInt(month, 10) - 1]} ${parseInt(day, 10)}, ${year}`;
}

const TripSummaryCard = forwardRef<View, TripSummaryCardProps>(({ group }, ref) => {
  const { t } = useTranslation();
  const hasPhoto  = Boolean(group.destination_photo_url);
  const sym       = getCurrencySymbol(group.currency);
  const tripDates = getTripDates(group);

  const totalOutstanding = group.members
    .filter(m => m.balance < -0.005)
    .reduce((sum, m) => sum + Math.abs(m.balance), 0);
  const allSettled = totalOutstanding < 0.005;
  const visMembers = group.members.slice(0, MAX_MEM);
  const extraMem   = group.members.length - visMembers.length;

  return (
    <View ref={ref} style={styles.card}>
      {/* ── Header ──────────────────────────────────────────────── */}
      <View style={styles.header}>
        {hasPhoto ? (
          <Image
            source={{ uri: group.destination_photo_url! }}
            style={StyleSheet.absoluteFill}
            resizeMode="cover"
          />
        ) : (
          <LinearGradient
            colors={SC.headerGradient}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
            style={StyleSheet.absoluteFill}
          />
        )}
        <LinearGradient
          colors={['rgba(0,0,0,0)', 'rgba(0,0,0,0.30)', 'rgba(0,0,0,0.72)']}
          locations={[0, 0.45, 1]}
          style={StyleSheet.absoluteFill}
        />
        <Image
          source={require('../assets/Kip_wave.png')}
          style={styles.kipMascot}
          resizeMode="contain"
        />
        <View style={styles.headerText}>
          <Text style={styles.cardTitle} numberOfLines={2} adjustsFontSizeToFit minimumFontScale={0.8}>
            {group.name}
          </Text>
          {group.destination ? (
            <View style={styles.headerRow}>
              <Ionicons name="location-outline" size={10} color="rgba(255,255,255,0.75)" />
              <Text style={styles.headerSub}>{group.destination}</Text>
            </View>
          ) : null}
          <View style={styles.headerRow}>
            <Ionicons name="receipt-outline" size={10} color="rgba(255,255,255,0.65)" />
            <Text style={styles.headerLabel}>{t('shareCard.tripSummaryBadge')}</Text>
          </View>
        </View>
      </View>

      {/* ── Body ────────────────────────────────────────────────── */}
      <View style={styles.body}>
        <View style={styles.content}>
          {/* Total */}
          <Text style={styles.totalLabel}>{t('shareCard.totalTripCost').toUpperCase()}</Text>
          <Text style={styles.totalAmount} numberOfLines={1} adjustsFontSizeToFit minimumFontScale={0.65}>
            {sym}{formatAmount(group.totalSpent, group.currency)}
            {'  '}<Text style={styles.totalCurrency}>{group.currency}</Text>
          </Text>

          {tripDates && (
            <Text style={styles.dates} numberOfLines={1}>
              {tripDates.start === tripDates.end
                ? tripDates.start
                : `${tripDates.start} – ${tripDates.end}`}
            </Text>
          )}

          <View style={styles.sectionDivider} />

          {/* Outstanding */}
          <Text style={styles.sectionLabel}>{t('shareCard.outstandingBalance').toUpperCase()}</Text>
          {allSettled ? (
            <View style={styles.row}>
              <Ionicons name="checkmark-circle" size={16} color={SC.sage} />
              <Text
                style={[styles.rowLabel, { color: SC.sage }]}
                numberOfLines={1}
                adjustsFontSizeToFit
                minimumFontScale={0.85}
              >
                {t('shareCard.allSettledUp')}
              </Text>
            </View>
          ) : (
            <View style={styles.row}>
              <Ionicons name="alert-circle-outline" size={16} color={SC.coral} />
              <Text style={styles.rowLabel} numberOfLines={1} adjustsFontSizeToFit minimumFontScale={0.85}>
                {t('shareCard.remaining', {
                  amount: formatAmount(totalOutstanding, group.currency),
                })}
              </Text>
            </View>
          )}

          <View style={styles.sectionDivider} />

          {/* Members */}
          <Text style={styles.sectionLabel}>{t('createGroup.members').toUpperCase()}</Text>
          {visMembers.map((m, i) => {
            const settled = Math.abs(m.balance) < 0.005;
            const isPos   = m.balance >= 0;
            const color   = settled ? SC.labelGray : isPos ? SC.sage : SC.coral;
            const val     = settled
              ? '✓'
              : (isPos ? '+' : '−') + sym + formatAmount(Math.abs(m.balance), group.currency);
            return (
              <View key={m.id} style={styles.row}>
                <View style={[styles.avatar, { backgroundColor: scAvatarColor(i) }]}>
                  <Text style={styles.avatarText}>{scInitials(m.name)}</Text>
                </View>
                <Text style={styles.rowLabel} numberOfLines={1} adjustsFontSizeToFit minimumFontScale={0.75}>
                  {m.name}
                </Text>
                <Text style={[styles.rowValue, { color }]} numberOfLines={1}>{val}</Text>
              </View>
            );
          })}
          {extraMem > 0 && (
            <Text style={styles.overflow} numberOfLines={1}>+{extraMem} more</Text>
          )}
        </View>

        <View style={styles.footer}>
          <Ionicons name="navigate-circle-outline" size={10} color={SC.footerGray} />
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
    width: SC.CARD_W,
    height: SC.CARD_H,
    borderRadius: 20,
    overflow: 'hidden',
    backgroundColor: SC.card,
  },

  header: {
    height: SC.HEADER_H,
    overflow: 'hidden',
  },
  kipMascot: {
    position: 'absolute',
    top: 12,
    right: 12,
    width: 52,
    height: 52,
  },
  headerText: {
    position: 'absolute',
    bottom: SC.OVERLAP + 8,
    left: 0,
    right: 0,
    paddingHorizontal: SC.H_PAD,
    gap: 3,
  },
  cardTitle: {
    fontSize: 20,
    fontWeight: '800',
    color: '#fff',
    lineHeight: 24,
    textShadowColor: 'rgba(0,0,0,0.30)',
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 3,
  },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  headerSub: {
    fontSize: 11,
    color: 'rgba(255,255,255,0.75)',
    fontWeight: '500',
  },
  headerLabel: {
    fontSize: 11,
    color: 'rgba(255,255,255,0.65)',
    fontWeight: '500',
  },

  body: {
    height: BODY_H,
    marginTop: -SC.OVERLAP,
    borderTopLeftRadius: SC.OVERLAP,
    borderTopRightRadius: SC.OVERLAP,
    backgroundColor: SC.card,
    paddingHorizontal: SC.H_PAD,
    paddingTop: 14,
    paddingBottom: 10,
  },
  content: {
    flex: 1,
  },

  totalLabel: {
    fontSize: 9,
    fontWeight: '700',
    color: SC.labelGray,
    letterSpacing: 0.9,
    marginBottom: 3,
  },
  totalAmount: {
    fontSize: 26,
    fontWeight: '800',
    color: SC.dark,
    lineHeight: 31,
  },
  totalCurrency: {
    fontSize: 13,
    fontWeight: '600',
    color: SC.labelGray,
  },
  dates: {
    fontSize: 10,
    color: SC.labelGray,
    fontWeight: '500',
    marginTop: 2,
  },

  sectionLabel: {
    fontSize: 9,
    fontWeight: '700',
    color: SC.labelGray,
    letterSpacing: 0.9,
    marginBottom: 5,
  },
  sectionDivider: {
    height: 1,
    backgroundColor: SC.divider,
    marginVertical: 9,
    marginHorizontal: -SC.H_PAD,
  },

  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    paddingVertical: 4,
  },
  avatar: {
    width: SC.AVATAR,
    height: SC.AVATAR,
    borderRadius: SC.AVATAR / 2,
    alignItems: 'center',
    justifyContent: 'center',
    flexShrink: 0,
  },
  avatarText: {
    fontSize: 10,
    fontWeight: '700',
    color: '#fff',
  },
  rowLabel: {
    flex: 1,
    fontSize: 12,
    fontWeight: '600',
    color: SC.dark,
  },
  rowValue: {
    fontSize: 12,
    fontWeight: '700',
    color: SC.dark,
    flexShrink: 0,
  },
  overflow: {
    fontSize: 10,
    color: SC.labelGray,
    fontWeight: '500',
    paddingTop: 2,
  },

  footer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 4,
    paddingTop: 8,
    marginTop: 'auto',
  },
  footerText: {
    fontSize: 9,
    color: SC.footerGray,
    fontWeight: '500',
  },
});
