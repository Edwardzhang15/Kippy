import React, { forwardRef } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { useTranslation } from 'react-i18next';
import { GroupDetails } from '../db';
import { colors, fontSizes } from '../theme';
import { getCurrencySymbol, formatAmount, getAvatarColor, getInitials, formatExpenseDate } from '../utils';
import { CATEGORY_MAP, FALLBACK_CATEGORY } from '../categories';

export type BalanceBreakdownShareCardProps = {
  group: GroupDetails;
};

const CARD_W = 320;

const BalanceBreakdownShareCard = forwardRef<View, BalanceBreakdownShareCardProps>(({ group }, ref) => {
  const { t } = useTranslation();
  const sym = getCurrencySymbol(group.currency);

  const allSettled = group.members.every(m => Math.abs(m.balance) < 0.005);

  return (
    <View ref={ref} style={styles.card}>
      {/* Header */}
      <LinearGradient
        colors={[colors.coral, colors.sage]}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={styles.header}
      >
        <Text style={styles.headerTitle}>{group.name}</Text>
        {group.destination ? (
          <View style={styles.destRow}>
            <Ionicons name="location-outline" size={11} color="rgba(255,255,255,0.85)" />
            <Text style={styles.destText}>{group.destination}</Text>
          </View>
        ) : null}
        <Text style={styles.headerTotal}>
          {t('shareCard.totalTripCost')}: {sym}{formatAmount(group.totalSpent, group.currency)}
        </Text>
      </LinearGradient>

      {/* Balances */}
      <View style={styles.section}>
        <Text style={styles.sectionLabel}>{t('groupDetail.balances')}</Text>
        {group.members.map((m, i) => {
          const isPositive = m.balance >= 0;
          return (
            <View key={m.id} style={styles.balanceRow}>
              <View style={[styles.avatar, { backgroundColor: getAvatarColor(i) }]}>
                <Text style={styles.avatarText}>{getInitials(m.name)}</Text>
              </View>
              <Text style={styles.memberName} numberOfLines={1}>{m.name}</Text>
              <Text style={[styles.balanceAmt, { color: isPositive ? colors.sage : colors.coral }]}>
                {isPositive ? '+' : '-'}{sym}{formatAmount(Math.abs(m.balance), group.currency)}
              </Text>
            </View>
          );
        })}
        {allSettled && (
          <View style={styles.settledBadge}>
            <Ionicons name="checkmark-circle" size={13} color={colors.sage} />
            <Text style={styles.settledText}>{t('shareCard.allSettledUp')}</Text>
          </View>
        )}
      </View>

      {/* Expenses */}
      {group.expenses.length > 0 && (
        <View style={styles.section}>
          <Text style={styles.sectionLabel}>{t('groupDetail.expenses')}</Text>
          {group.expenses.slice(0, 12).map(exp => {
            const cat = CATEGORY_MAP[exp.category] ?? FALLBACK_CATEGORY;
            const title = exp.note?.trim() || t(`categories.${exp.category}`, exp.category);
            return (
              <View key={exp.id} style={styles.expRow}>
                <View style={[styles.expCatDot, { backgroundColor: cat.color }]} />
                <Text style={styles.expTitle} numberOfLines={1}>{title}</Text>
                <Text style={styles.expDate}>{formatExpenseDate(exp.date)}</Text>
                <Text style={styles.expAmt}>{getCurrencySymbol(exp.currency)}{formatAmount(exp.amount, exp.currency)}</Text>
              </View>
            );
          })}
          {group.expenses.length > 12 && (
            <Text style={styles.moreText}>+ {group.expenses.length - 12} more</Text>
          )}
        </View>
      )}

      {/* Footer */}
      <View style={styles.footer}>
        <Text style={styles.footerText}>{t('shareCard.madeWithKippy')}</Text>
      </View>
    </View>
  );
});

export default BalanceBreakdownShareCard;

const styles = StyleSheet.create({
  card: {
    width: CARD_W,
    backgroundColor: '#FAFAF8',
    borderRadius: 20,
    overflow: 'hidden',
  },
  header: {
    paddingHorizontal: 18,
    paddingTop: 20,
    paddingBottom: 16,
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '800',
    color: '#fff',
    marginBottom: 2,
  },
  destRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 3,
    marginBottom: 6,
  },
  destText: {
    fontSize: 11,
    color: 'rgba(255,255,255,0.85)',
    fontWeight: '500',
  },
  headerTotal: {
    fontSize: 12,
    color: 'rgba(255,255,255,0.92)',
    fontWeight: '600',
    marginTop: 4,
  },
  section: {
    paddingHorizontal: 16,
    paddingTop: 14,
    paddingBottom: 6,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: '#EFEFED',
  },
  sectionLabel: {
    fontSize: 10,
    fontWeight: '700',
    color: '#8A8A8A',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    marginBottom: 8,
  },
  balanceRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 6,
  },
  avatar: {
    width: 24,
    height: 24,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarText: {
    fontSize: 9,
    fontWeight: '700',
    color: '#fff',
  },
  memberName: {
    flex: 1,
    fontSize: 12,
    fontWeight: '600',
    color: '#2D2D2D',
  },
  balanceAmt: {
    fontSize: 12,
    fontWeight: '700',
  },
  settledBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    marginTop: 4,
    marginBottom: 4,
  },
  settledText: {
    fontSize: 11,
    color: colors.sage,
    fontWeight: '600',
  },
  expRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginBottom: 5,
  },
  expCatDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
  },
  expTitle: {
    flex: 1,
    fontSize: 11,
    color: '#2D2D2D',
    fontWeight: '500',
  },
  expDate: {
    fontSize: 10,
    color: '#8A8A8A',
    marginRight: 4,
  },
  expAmt: {
    fontSize: 11,
    fontWeight: '700',
    color: '#2D2D2D',
  },
  moreText: {
    fontSize: 10,
    color: '#8A8A8A',
    marginTop: 2,
    marginBottom: 4,
  },
  footer: {
    paddingHorizontal: 16,
    paddingVertical: 10,
    alignItems: 'center',
  },
  footerText: {
    fontSize: 10,
    color: '#8A8A8A',
    fontWeight: '500',
  },
});
