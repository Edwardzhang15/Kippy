import React, { forwardRef } from 'react';
import { Image, StyleSheet, Text, View } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { useTranslation } from 'react-i18next';
import { GroupDetails, simplifyDebts, type ExpenseWithSplits } from '../db';
import { getCurrencySymbol, formatAmount, formatExpenseDate } from '../utils';
import { CATEGORY_MAP, FALLBACK_CATEGORY } from '../categories';
import { SC, scAvatarColor, scInitials } from './shareCardTheme';

export type BalanceBreakdownShareCardProps = {
  group: GroupDetails;
  expensesWithSplits: ExpenseWithSplits[];
  onPageRef?: (index: number, ref: View | null) => void;
};

const STACK_PAD = 10;
const STACK_W   = SC.CARD_W + STACK_PAD * 2;
const BODY_H    = SC.CARD_H - SC.HEADER_H + SC.OVERLAP;
const MAX_BAL   = 5;
const MAX_SETTL = 3;
const MAX_EXP   = 5;

// ─── Header ───────────────────────────────────────────────────────────────────

function CardHeader({
  group,
  labelIcon,
  labelText,
}: {
  group: GroupDetails;
  labelIcon: React.ComponentProps<typeof Ionicons>['name'];
  labelText: string;
}) {
  const hasPhoto = Boolean(group.destination_photo_url);
  return (
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
      <View style={styles.headerText}>
        <Text style={styles.cardTitle} numberOfLines={2}>{group.name}</Text>
        {group.destination ? (
          <View style={styles.headerRow}>
            <Ionicons name="location-outline" size={10} color="rgba(255,255,255,0.75)" />
            <Text style={styles.headerSub}>{group.destination}</Text>
          </View>
        ) : null}
        <View style={styles.headerRow}>
          <Ionicons name={labelIcon} size={10} color="rgba(255,255,255,0.65)" />
          <Text style={styles.headerLabel}>{labelText}</Text>
        </View>
      </View>
    </View>
  );
}

// ─── Footer ───────────────────────────────────────────────────────────────────

function Footer() {
  return (
    <View style={styles.footer}>
      <Ionicons name="navigate-circle-outline" size={10} color={SC.footerGray} />
      <Text style={styles.footerText}>Made with Kippy</Text>
    </View>
  );
}

// ─── Section label ────────────────────────────────────────────────────────────

function SectionLabel({ text }: { text: string }) {
  return <Text style={styles.sectionLabel}>{text}</Text>;
}

// ─── Section divider ─────────────────────────────────────────────────────────

function SectionDivider() {
  return <View style={styles.sectionDivider} />;
}

// ─── Page 0 — Balances + Settlements ─────────────────────────────────────────

function SummaryPage({
  group,
  isFirst,
  pageRef,
}: {
  group: GroupDetails;
  isFirst: boolean;
  pageRef?: (r: View | null) => void;
}) {
  const { t } = useTranslation();
  const sym         = getCurrencySymbol(group.currency);
  const suggestions = simplifyDebts(group.members);
  const allSettled  = group.members.every(m => Math.abs(m.balance) < 0.005);
  const visMembers  = group.members.slice(0, MAX_BAL);
  const extraMem    = group.members.length - visMembers.length;
  const visSettl    = suggestions.slice(0, MAX_SETTL);
  const extraSettl  = suggestions.length - visSettl.length;

  return (
    <View ref={pageRef} style={styles.page} collapsable={false}>
      <CardHeader
        group={group}
        labelIcon="people-outline"
        labelText={t('groupDetail.balances')}
      />

      <View style={styles.body}>
        <View style={styles.content}>
          <SectionLabel text={t('groupDetail.balances').toUpperCase()} />

          {visMembers.map((m, i) => {
            const isPos   = m.balance >= 0;
            const settled = Math.abs(m.balance) < 0.005;
            const color   = settled ? SC.labelGray : isPos ? SC.sage : SC.coral;
            const label   = settled
              ? '✓ settled'
              : (isPos ? '+' : '−') + sym + formatAmount(Math.abs(m.balance), group.currency);
            return (
              <View key={m.id} style={styles.row}>
                <View style={[styles.avatar, { backgroundColor: scAvatarColor(i) }]}>
                  <Text style={styles.avatarText}>{scInitials(m.name)}</Text>
                </View>
                <Text style={styles.rowLabel} numberOfLines={1}>{m.name}</Text>
                <Text style={[styles.rowValue, { color }]}>{label}</Text>
              </View>
            );
          })}

          {extraMem > 0 && (
            <Text style={styles.overflow}>+{extraMem} more</Text>
          )}

          {allSettled && (
            <View style={[styles.row, { marginTop: 2 }]}>
              <Ionicons name="checkmark-circle" size={14} color={SC.sage} />
              <Text style={[styles.rowLabel, { color: SC.sage, fontWeight: '600' }]}>
                {t('shareCard.allSettledUp')}
              </Text>
            </View>
          )}

          {visSettl.length > 0 && (
            <>
              <SectionDivider />
              <SectionLabel text={t('groupDetail.suggestedSettlements').toUpperCase()} />
              {visSettl.map((tx, i) => (
                <View key={`${tx.fromId}-${tx.toId}`} style={styles.row}>
                  <View style={[styles.iconChip, { backgroundColor: '#F0F0F0' }]}>
                    <Ionicons name="arrow-forward" size={14} color={SC.labelGray} />
                  </View>
                  <Text style={styles.rowLabel} numberOfLines={1}>
                    {tx.fromName} → {tx.toName}
                  </Text>
                  <Text style={[styles.rowValue, { color: SC.coral }]}>
                    {sym}{formatAmount(tx.amount, group.currency)}
                  </Text>
                </View>
              ))}
              {extraSettl > 0 && (
                <Text style={styles.overflow}>+{extraSettl} more</Text>
              )}
            </>
          )}
        </View>
        <Footer />
      </View>
    </View>
  );
}

// ─── Expense page ─────────────────────────────────────────────────────────────

function ExpensePage({
  group,
  expenses,
  pageNum,
  totalPages,
  pageRef,
}: {
  group: GroupDetails;
  expenses: ExpenseWithSplits[];
  pageNum: number;
  totalPages: number;
  pageRef?: (r: View | null) => void;
}) {
  const { t } = useTranslation();
  const label = totalPages > 1
    ? `${t('groupDetail.expenses')} · ${pageNum}/${totalPages}`
    : t('groupDetail.expenses');

  return (
    <View ref={pageRef} style={styles.page} collapsable={false}>
      <CardHeader
        group={group}
        labelIcon="receipt-outline"
        labelText={label}
      />

      <View style={styles.body}>
        <View style={styles.content}>
          <SectionLabel text={t('groupDetail.expenses').toUpperCase()} />
          {expenses.slice(0, MAX_EXP).map(exp => {
            const cat       = CATEGORY_MAP[exp.category] ?? FALLBACK_CATEGORY;
            const title     = exp.note?.trim() || t(`categories.${exp.category}`, exp.category);
            const paidBy    = t('groupDetail.expensePaidBy', {
              name: exp.paid_by_name,
              date: formatExpenseDate(exp.date),
            });
            const splitStr  = exp.splitMemberNames.length > 0
              ? `Split: ${exp.splitMemberNames.join(', ')}`
              : null;
            return (
              <View key={exp.id} style={styles.expRow}>
                <View style={[styles.iconChip, { backgroundColor: (cat as any).bg ?? '#F5F5F5' }]}>
                  <Ionicons name={cat.icon} size={15} color={cat.color} />
                </View>
                <View style={styles.expBody}>
                  {/* Title + amount on the same line */}
                  <View style={styles.expTitleRow}>
                    <Text style={styles.rowLabel} numberOfLines={1}>{title}</Text>
                    <Text style={styles.expAmount}>
                      {getCurrencySymbol(exp.currency)}{formatAmount(exp.amount, exp.currency)}
                    </Text>
                  </View>
                  {/* Paid-by on its own line */}
                  <Text style={styles.rowSecondary} numberOfLines={1}>{paidBy}</Text>
                  {/* Split list — allow up to 2 lines for long name lists */}
                  {splitStr && (
                    <Text style={styles.expSplit} numberOfLines={2}>{splitStr}</Text>
                  )}
                </View>
              </View>
            );
          })}
          {expenses.length > MAX_EXP && (
            <Text style={styles.overflow}>+{expenses.length - MAX_EXP} more</Text>
          )}
        </View>
        <Footer />
      </View>
    </View>
  );
}

// ─── Main export ──────────────────────────────────────────────────────────────

const BalanceBreakdownShareCard = forwardRef<View, BalanceBreakdownShareCardProps>(
  ({ group, expensesWithSplits, onPageRef }, ref) => {
    const expensePages: ExpenseWithSplits[][] = [];
    for (let i = 0; i < expensesWithSplits.length; i += MAX_EXP) {
      expensePages.push(expensesWithSplits.slice(i, i + MAX_EXP));
    }
    const totalExpPages = expensePages.length;

    return (
      <View ref={ref} style={styles.stack} collapsable={false}>
        <View style={styles.pageShadow}>
          <SummaryPage
            group={group}
            isFirst={true}
            pageRef={r => onPageRef?.(0, r)}
          />
        </View>
        {expensePages.map((page, i) => (
          <View key={i} style={styles.pageShadow}>
            <ExpensePage
              group={group}
              expenses={page}
              pageNum={i + 1}
              totalPages={totalExpPages}
              pageRef={r => onPageRef?.(i + 1, r)}
            />
          </View>
        ))}
      </View>
    );
  },
);

BalanceBreakdownShareCard.displayName = 'BalanceBreakdownShareCard';
export default BalanceBreakdownShareCard;

// ─── Styles ───────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  stack: {
    width: STACK_W,
    backgroundColor: SC.pageBg,
    gap: STACK_PAD,
    padding: STACK_PAD,
  },

  pageShadow: {
    borderRadius: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.10,
    shadowRadius: 10,
    elevation: 4,
  },

  page: {
    width: SC.CARD_W,
    height: SC.CARD_H,
    borderRadius: 20,
    overflow: 'hidden',
    backgroundColor: SC.card,
  },

  // ── Header ──
  header: {
    height: SC.HEADER_H,
    overflow: 'hidden',
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

  // ── Body ──
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
    marginVertical: 8,
    marginHorizontal: -SC.H_PAD,
  },

  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    paddingVertical: 4,
  },

  iconChip: {
    width: SC.ICON_CHIP,
    height: SC.ICON_CHIP,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
    flexShrink: 0,
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

  // Expense-specific row: top-align icon with title text
  expRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 10,
    paddingVertical: 5,
  },
  expBody: {
    flex: 1,
    gap: 2,
  },
  expTitleRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
    gap: 8,
  },
  expAmount: {
    fontSize: 12,
    fontWeight: '700',
    color: SC.dark,
    flexShrink: 0,
  },
  rowSecondary: {
    fontSize: 10,
    color: SC.rowSecondary,
    fontWeight: '400',
    lineHeight: 14,
  },
  expSplit: {
    fontSize: 10,
    color: SC.rowSecondary,
    fontWeight: '400',
    lineHeight: 14,
    marginTop: 1,
  },

  overflow: {
    fontSize: 10,
    color: SC.labelGray,
    fontWeight: '500',
    paddingTop: 4,
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
