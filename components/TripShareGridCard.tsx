import React, { forwardRef } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { useTranslation } from 'react-i18next';
import { GroupDetails, simplifyDebts } from '../db';
import { colors, fontSizes } from '../theme';
import {
  getCurrencySymbol,
  formatAmount,
  getAvatarColor,
  getInitials,
  formatExpenseDate,
} from '../utils';
import { CATEGORY_MAP, FALLBACK_CATEGORY } from '../categories';

const OUTER_PAD = 10;
const GAP = 8;
const TOTAL_W = 320;
const PAGE_W = (TOTAL_W - OUTER_PAD * 2 - GAP) / 2; // 146
const PAGE_H = 256;
const BG = '#FAFAF8';

function getTripDates(group: GroupDetails) {
  if (group.expenses.length === 0) return null;
  const dates = group.expenses.map(e => e.date.slice(0, 10)).sort();
  const fmt = (iso: string) => {
    const [, m, d] = iso.split('-');
    const mo = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];
    return `${mo[parseInt(m,10)-1]} ${parseInt(d,10)}`;
  };
  return dates[0] === dates[dates.length - 1]
    ? fmt(dates[0])
    : `${fmt(dates[0])} – ${fmt(dates[dates.length - 1])}`;
}

function MiniPage({ children, style }: { children: React.ReactNode; style?: object }) {
  return (
    <View style={[styles.miniPage, style]}>{children}</View>
  );
}

function PageLabel({ text }: { text: string }) {
  return <Text style={styles.pageLabel}>{text}</Text>;
}

const TripShareGridCard = forwardRef<View, { group: GroupDetails }>(({ group }, ref) => {
  const { t } = useTranslation();
  const sym = getCurrencySymbol(group.currency);
  const suggestions = simplifyDebts(group.members);
  const memberIndexMap = Object.fromEntries(group.members.map((m, i) => [m.id, i]));
  const tripDates = getTripDates(group);
  const allSettled = group.members.every(m => Math.abs(m.balance) < 0.005);

  return (
    <View ref={ref} style={styles.grid} collapsable={false}>
      {/* Row 1 */}
      <View style={styles.row}>

        {/* Page 1 — Trip header */}
        <MiniPage>
          <LinearGradient
            colors={[colors.coral, colors.sage]}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
            style={styles.headerGrad}
          >
            <View style={styles.kippyBadge}>
              <Ionicons name="navigate-circle-outline" size={9} color="rgba(255,255,255,0.8)" />
              <Text style={styles.kippyBadgeText}>KIPPY</Text>
            </View>
            <Text style={styles.tripName} numberOfLines={3}>{group.name}</Text>
            {group.destination ? (
              <View style={styles.destRow}>
                <Ionicons name="location-outline" size={9} color="rgba(255,255,255,0.82)" />
                <Text style={styles.destText} numberOfLines={1}>{group.destination}</Text>
              </View>
            ) : null}
          </LinearGradient>
          <View style={styles.headerStats}>
            <Text style={styles.totalLabel}>{t('shareCard.totalTripCost')}</Text>
            <Text style={styles.totalAmt}>{sym}{formatAmount(group.totalSpent, group.currency)}</Text>
            <Text style={styles.currencyText}>{group.currency}</Text>
            {tripDates ? (
              <View style={styles.datesRow}>
                <Ionicons name="calendar-outline" size={9} color={colors.textSecondary} />
                <Text style={styles.datesText}>{tripDates}</Text>
              </View>
            ) : null}
          </View>
        </MiniPage>

        {/* Page 2 — Balances */}
        <MiniPage>
          <View style={styles.miniBody}>
            <PageLabel text={t('groupDetail.balances')} />
            {group.members.slice(0, 7).map((m, i) => {
              const isPos = m.balance >= 0;
              const settled = Math.abs(m.balance) < 0.005;
              return (
                <View key={m.id} style={styles.balRow}>
                  <View style={[styles.avatar, { backgroundColor: getAvatarColor(i) }]}>
                    <Text style={styles.avatarTxt}>{getInitials(m.name)}</Text>
                  </View>
                  <Text style={styles.balName} numberOfLines={1}>{m.name}</Text>
                  <Text style={[
                    styles.balAmt,
                    { color: settled ? colors.textSecondary : isPos ? colors.sage : colors.coral },
                  ]}>
                    {settled ? '✓' : (isPos ? '+' : '-') + sym + formatAmount(Math.abs(m.balance), group.currency)}
                  </Text>
                </View>
              );
            })}
            {group.members.length > 7 && (
              <Text style={styles.moreText}>+{group.members.length - 7} more</Text>
            )}
            {allSettled && (
              <View style={styles.settledRow}>
                <Ionicons name="checkmark-circle" size={11} color={colors.sage} />
                <Text style={styles.settledTxt}>{t('shareCard.allSettledUp')}</Text>
              </View>
            )}
          </View>
        </MiniPage>
      </View>

      {/* Row 2 */}
      <View style={styles.row}>

        {/* Page 3 — Top expenses */}
        <MiniPage>
          <View style={styles.miniBody}>
            <PageLabel text={t('groupDetail.expenses')} />
            {group.expenses.length === 0 ? (
              <Text style={styles.emptyTxt}>{t('groupDetail.noExpenses')}</Text>
            ) : (
              group.expenses.slice(0, 6).map(exp => {
                const cat = CATEGORY_MAP[exp.category] ?? FALLBACK_CATEGORY;
                const title = exp.note?.trim() || t(`categories.${exp.category}`, exp.category);
                return (
                  <View key={exp.id} style={styles.expRow}>
                    <View style={[styles.expDot, { backgroundColor: cat.color }]} />
                    <Text style={styles.expTitle} numberOfLines={1}>{title}</Text>
                    <Text style={styles.expAmt}>
                      {getCurrencySymbol(exp.currency)}{formatAmount(exp.amount, exp.currency)}
                    </Text>
                  </View>
                );
              })
            )}
            {group.expenses.length > 6 && (
              <Text style={styles.moreText}>+{group.expenses.length - 6} more</Text>
            )}
          </View>
        </MiniPage>

        {/* Page 4 — Settlements */}
        <MiniPage>
          <View style={styles.miniBody}>
            <PageLabel text={t('groupDetail.suggestedSettlements')} />
            {suggestions.length === 0 ? (
              <View style={styles.settledRow}>
                <Ionicons name="checkmark-circle" size={14} color={colors.sage} />
                <Text style={[styles.settledTxt, { fontSize: 11 }]}>{t('shareCard.allSettledUp')}</Text>
              </View>
            ) : (
              suggestions.slice(0, 6).map(tx => {
                const fromIdx = memberIndexMap[tx.fromId] ?? 0;
                return (
                  <View key={`${tx.fromId}-${tx.toId}`} style={styles.txRow}>
                    <View style={[styles.avatar, { backgroundColor: getAvatarColor(fromIdx) }]}>
                      <Text style={styles.avatarTxt}>{getInitials(tx.fromName)}</Text>
                    </View>
                    <Text style={styles.txText} numberOfLines={1}>
                      <Text style={styles.txName}>{tx.fromName}</Text>
                      <Text style={styles.txArrow}> → </Text>
                      <Text style={styles.txName}>{tx.toName}</Text>
                    </Text>
                    <Text style={styles.txAmt}>{sym}{formatAmount(tx.amount, group.currency)}</Text>
                  </View>
                );
              })
            )}
          </View>
        </MiniPage>
      </View>

      {/* Footer */}
      <View style={styles.footer}>
        <Ionicons name="navigate-circle-outline" size={10} color={colors.textSecondary} />
        <Text style={styles.footerTxt}>{t('shareCard.madeWithKippy')}</Text>
      </View>
    </View>
  );
});

TripShareGridCard.displayName = 'TripShareGridCard';
export default TripShareGridCard;

const styles = StyleSheet.create({
  grid: {
    width: TOTAL_W,
    backgroundColor: BG,
    borderRadius: 20,
    overflow: 'hidden',
    paddingHorizontal: OUTER_PAD,
    paddingTop: OUTER_PAD,
    paddingBottom: 0,
  },
  row: {
    flexDirection: 'row',
    gap: GAP,
    marginBottom: GAP,
  },
  miniPage: {
    width: PAGE_W,
    minHeight: PAGE_H,
    backgroundColor: '#fff',
    borderRadius: 12,
    overflow: 'hidden',
  },
  headerGrad: {
    paddingHorizontal: 10,
    paddingTop: 10,
    paddingBottom: 10,
    minHeight: 112,
    justifyContent: 'flex-end',
  },
  kippyBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 3,
    marginBottom: 8,
  },
  kippyBadgeText: {
    fontSize: 8,
    fontWeight: '700',
    color: 'rgba(255,255,255,0.8)',
    letterSpacing: 0.6,
  },
  tripName: {
    fontSize: 13,
    fontWeight: '800',
    color: '#fff',
    lineHeight: 16,
    marginBottom: 3,
  },
  destRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 2,
  },
  destText: {
    fontSize: 9,
    color: 'rgba(255,255,255,0.85)',
    fontWeight: '500',
    flex: 1,
  },
  headerStats: {
    paddingHorizontal: 10,
    paddingTop: 10,
    paddingBottom: 10,
  },
  totalLabel: {
    fontSize: 8,
    fontWeight: '600',
    color: colors.textSecondary,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    marginBottom: 1,
  },
  totalAmt: {
    fontSize: 20,
    fontWeight: '800',
    color: colors.textPrimary,
  },
  currencyText: {
    fontSize: 10,
    fontWeight: '600',
    color: colors.textSecondary,
    marginBottom: 6,
  },
  datesRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 3,
  },
  datesText: {
    fontSize: 9,
    color: colors.textSecondary,
    fontWeight: '500',
  },
  miniBody: {
    padding: 10,
    flex: 1,
  },
  pageLabel: {
    fontSize: 8,
    fontWeight: '700',
    color: colors.textSecondary,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    marginBottom: 7,
  },
  balRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    marginBottom: 5,
  },
  avatar: {
    width: 18,
    height: 18,
    borderRadius: 9,
    alignItems: 'center',
    justifyContent: 'center',
    flexShrink: 0,
  },
  avatarTxt: {
    fontSize: 7,
    fontWeight: '700',
    color: '#fff',
  },
  balName: {
    flex: 1,
    fontSize: 10,
    fontWeight: '600',
    color: colors.textPrimary,
  },
  balAmt: {
    fontSize: 10,
    fontWeight: '700',
    flexShrink: 0,
  },
  settledRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    marginTop: 4,
  },
  settledTxt: {
    fontSize: 10,
    color: colors.sage,
    fontWeight: '600',
  },
  expRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    marginBottom: 5,
  },
  expDot: {
    width: 5,
    height: 5,
    borderRadius: 2.5,
    flexShrink: 0,
  },
  expTitle: {
    flex: 1,
    fontSize: 10,
    color: colors.textPrimary,
    fontWeight: '500',
  },
  expAmt: {
    fontSize: 10,
    fontWeight: '700',
    color: colors.textPrimary,
    flexShrink: 0,
  },
  txRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    marginBottom: 5,
  },
  txText: {
    flex: 1,
    fontSize: 9,
  },
  txName: {
    fontWeight: '700',
    color: colors.textPrimary,
  },
  txArrow: {
    color: colors.textSecondary,
  },
  txAmt: {
    fontSize: 10,
    fontWeight: '700',
    color: colors.coral,
    flexShrink: 0,
  },
  moreText: {
    fontSize: 9,
    color: colors.textSecondary,
    marginTop: 2,
  },
  emptyTxt: {
    fontSize: 10,
    color: colors.textSecondary,
  },
  footer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 4,
    paddingVertical: 8,
  },
  footerTxt: {
    fontSize: 9,
    color: colors.textSecondary,
    fontWeight: '500',
  },
});
