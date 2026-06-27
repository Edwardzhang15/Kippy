import React, { forwardRef } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { useTranslation } from 'react-i18next';
import { GroupDetails, simplifyDebts, type ExpenseWithSplits } from '../db';
import { colors, fontSizes, radii } from '../theme';
import { getCurrencySymbol, formatAmount, getAvatarColor, getInitials, formatExpenseDate } from '../utils';
import { CATEGORY_MAP, FALLBACK_CATEGORY } from '../categories';

export type BalanceBreakdownShareCardProps = {
  group: GroupDetails;
  expensesWithSplits: ExpenseWithSplits[];
};

const CARD_W = 320;
const EXPENSES_PER_PAGE = 8;

const BalanceBreakdownShareCard = forwardRef<View, BalanceBreakdownShareCardProps>(
  ({ group, expensesWithSplits }, ref) => {
    const { t } = useTranslation();
    const sym = getCurrencySymbol(group.currency);
    const suggestions = simplifyDebts(group.members);
    const allSettled  = group.members.every(m => Math.abs(m.balance) < 0.005);

    // Split expenses into pages
    const expensePages: ExpenseWithSplits[][] = [];
    for (let i = 0; i < expensesWithSplits.length; i += EXPENSES_PER_PAGE) {
      expensePages.push(expensesWithSplits.slice(i, i + EXPENSES_PER_PAGE));
    }

    return (
      <View ref={ref} style={styles.card} collapsable={false}>

        {/* ── Header gradient ─────────────────────────── */}
        <LinearGradient
          colors={[colors.coral, colors.sage]}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={styles.header}
        >
          <Text style={styles.headerTitle} numberOfLines={2}>{group.name}</Text>
          {group.destination ? (
            <View style={styles.destRow}>
              <Ionicons name="location-outline" size={10} color="rgba(255,255,255,0.85)" />
              <Text style={styles.destText}>{group.destination}</Text>
            </View>
          ) : null}
          <Text style={styles.headerTotal}>
            {t('shareCard.totalTripCost')}: {sym}{formatAmount(group.totalSpent, group.currency)}
          </Text>
        </LinearGradient>

        {/* ── Group Balances ──────────────────────────── */}
        <SectionBlock label={t('groupDetail.balances')}>
          {group.members.map((m, i) => {
            const isPositive = m.balance >= 0;
            const settled    = Math.abs(m.balance) < 0.005;
            return (
              <View key={m.id} style={styles.balanceRow}>
                <View style={[styles.avatar, { backgroundColor: getAvatarColor(i) }]}>
                  <Text style={styles.avatarText}>{getInitials(m.name)}</Text>
                </View>
                <Text style={styles.memberName} numberOfLines={1}>{m.name}</Text>
                <Text style={[
                  styles.balanceAmt,
                  { color: settled ? colors.textSecondary : isPositive ? colors.sage : colors.coral },
                ]}>
                  {settled
                    ? '✓ settled'
                    : (isPositive ? '+' : '-') + sym + formatAmount(Math.abs(m.balance), group.currency)}
                </Text>
              </View>
            );
          })}
          {allSettled && (
            <View style={styles.allSettledRow}>
              <Ionicons name="checkmark-circle" size={13} color={colors.sage} />
              <Text style={styles.settledText}>{t('shareCard.allSettledUp')}</Text>
            </View>
          )}
        </SectionBlock>

        {/* ── Suggested Settlements ───────────────────── */}
        {suggestions.length > 0 && (
          <SectionBlock label={t('groupDetail.suggestedSettlements')}>
            {suggestions.map(tx => (
              <View key={`${tx.fromId}-${tx.toId}`} style={styles.txRow}>
                <Ionicons name="arrow-forward-circle-outline" size={14} color={colors.coral} />
                <Text style={styles.txText} numberOfLines={1}>
                  <Text style={styles.txName}>{tx.fromName}</Text>
                  <Text style={styles.txVerb}>{t('groupDetail.pays')}</Text>
                  <Text style={styles.txName}>{tx.toName}</Text>
                </Text>
                <Text style={styles.txAmt}>{sym}{formatAmount(tx.amount, group.currency)}</Text>
              </View>
            ))}
          </SectionBlock>
        )}

        {/* ── Full Expense Breakdown (paginated) ───────── */}
        {expensesWithSplits.length > 0 && expensePages.map((page, pageIdx) => (
          <SectionBlock
            key={pageIdx}
            label={
              expensePages.length > 1
                ? `${t('groupDetail.expenses')} (${pageIdx + 1}/${expensePages.length})`
                : t('groupDetail.expenses')
            }
          >
            {page.map((exp, idx) => {
              const cat   = CATEGORY_MAP[exp.category] ?? FALLBACK_CATEGORY;
              const title = exp.note?.trim() || t(`categories.${exp.category}`, exp.category);
              return (
                <View key={exp.id}>
                  {idx > 0 && <View style={styles.expDivider} />}
                  <View style={styles.expRow}>
                    <View style={[styles.expIconBg, { backgroundColor: (cat as any).bg ?? '#F5F5F5' }]}>
                      <Ionicons name={cat.icon} size={12} color={cat.color} />
                    </View>
                    <View style={styles.expBody}>
                      <View style={styles.expTitleRow}>
                        <Text style={styles.expTitle} numberOfLines={1}>{title}</Text>
                        <Text style={styles.expAmt}>
                          {getCurrencySymbol(exp.currency)}{formatAmount(exp.amount, exp.currency)}
                        </Text>
                      </View>
                      <Text style={styles.expMeta}>
                        {t('groupDetail.expensePaidBy', { name: exp.paid_by_name, date: formatExpenseDate(exp.date) })}
                      </Text>
                      {exp.splitMemberNames.length > 0 && (
                        <Text style={styles.expSplit} numberOfLines={2}>
                          Split: {exp.splitMemberNames.join(', ')}
                        </Text>
                      )}
                    </View>
                  </View>
                </View>
              );
            })}
          </SectionBlock>
        ))}

        {/* ── Footer ──────────────────────────────────── */}
        <View style={styles.footer}>
          <Ionicons name="navigate-circle-outline" size={10} color={colors.textSecondary} />
          <Text style={styles.footerText}>{t('shareCard.madeWithKippy')}</Text>
        </View>
      </View>
    );
  },
);

BalanceBreakdownShareCard.displayName = 'BalanceBreakdownShareCard';
export default BalanceBreakdownShareCard;

function SectionBlock({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <View style={styles.section}>
      <Text style={styles.sectionLabel}>{label.toUpperCase()}</Text>
      {children}
    </View>
  );
}

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
    marginBottom: 3,
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
    paddingBottom: 10,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: '#EFEFED',
  },
  sectionLabel: {
    fontSize: 9,
    fontWeight: '700',
    color: '#8A8A8A',
    letterSpacing: 0.6,
    marginBottom: 10,
  },

  balanceRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 7,
  },
  avatar: {
    width: 24,
    height: 24,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    flexShrink: 0,
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
    flexShrink: 0,
  },
  allSettledRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    marginTop: 4,
  },
  settledText: {
    fontSize: 11,
    color: colors.sage,
    fontWeight: '600',
  },

  txRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 7,
    marginBottom: 7,
  },
  txText: {
    flex: 1,
    fontSize: 12,
  },
  txName: {
    fontWeight: '700',
    color: '#2D2D2D',
  },
  txVerb: {
    color: '#8A8A8A',
  },
  txAmt: {
    fontSize: 12,
    fontWeight: '700',
    color: colors.coral,
    flexShrink: 0,
  },

  expRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 9,
    paddingVertical: 7,
  },
  expDivider: {
    height: StyleSheet.hairlineWidth,
    backgroundColor: '#EFEFED',
  },
  expIconBg: {
    width: 26,
    height: 26,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
    flexShrink: 0,
    marginTop: 1,
  },
  expBody: {
    flex: 1,
    gap: 2,
  },
  expTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 8,
  },
  expTitle: {
    flex: 1,
    fontSize: 12,
    fontWeight: '600',
    color: '#2D2D2D',
  },
  expAmt: {
    fontSize: 12,
    fontWeight: '700',
    color: '#2D2D2D',
    flexShrink: 0,
  },
  expMeta: {
    fontSize: 10,
    color: '#8A8A8A',
  },
  expSplit: {
    fontSize: 10,
    color: '#8A8A8A',
    lineHeight: 14,
  },

  footer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 4,
    paddingVertical: 10,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: '#EFEFED',
  },
  footerText: {
    fontSize: 10,
    color: '#8A8A8A',
    fontWeight: '500',
  },
});
