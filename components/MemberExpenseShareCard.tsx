import React, { forwardRef } from 'react';
import { Image, StyleSheet, Text, View } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { useTranslation } from 'react-i18next';
import { type MemberExpenseRow } from '../db';
import { getCurrencySymbol, formatAmount, formatExpenseDate } from '../utils';
import { CATEGORY_MAP, FALLBACK_CATEGORY } from '../categories';
import { SC, scAvatarColor, scInitials } from './shareCardTheme';

export type MemberExpenseShareCardProps = {
  groupName: string;
  destinationPhotoUrl?: string | null;
  memberName: string;
  avatarIndex: number;
  balance: number;
  groupCurrency: string;
  includedIn: MemberExpenseRow[];
  paidFor: MemberExpenseRow[];
  totalCharged: number;
  onPageRef?: (index: number, ref: View | null) => void;
};

const MAX_EXP   = 6;
const STACK_PAD = 10;
const STACK_W   = SC.CARD_W + STACK_PAD * 2;
const BODY_H    = SC.CARD_H - SC.HEADER_H + SC.OVERLAP;

// ─── Header ───────────────────────────────────────────────────────────────────

function CardHeader({
  groupName,
  destinationPhotoUrl,
  labelIcon,
  labelText,
}: {
  groupName: string;
  destinationPhotoUrl?: string | null;
  labelIcon: React.ComponentProps<typeof Ionicons>['name'];
  labelText: string;
}) {
  return (
    <View style={styles.header}>
      {destinationPhotoUrl ? (
        <Image
          source={{ uri: destinationPhotoUrl }}
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
        <Text style={styles.cardTitle} numberOfLines={2}>{groupName}</Text>
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

// ─── Helpers ──────────────────────────────────────────────────────────────────

function SectionLabel({ text }: { text: string }) {
  return <Text style={styles.sectionLabel}>{text}</Text>;
}

function SectionDivider() {
  return <View style={styles.sectionDivider} />;
}

// ─── Summary page (page 0) ────────────────────────────────────────────────────

function SummaryPage({
  groupName,
  destinationPhotoUrl,
  memberName,
  avatarIndex,
  balance,
  groupCurrency,
  includedIn,
  paidFor,
  totalCharged,
  pageRef,
}: {
  groupName: string;
  destinationPhotoUrl?: string | null;
  memberName: string;
  avatarIndex: number;
  balance: number;
  groupCurrency: string;
  includedIn: MemberExpenseRow[];
  paidFor: MemberExpenseRow[];
  totalCharged: number;
  pageRef?: (r: View | null) => void;
}) {
  const { t } = useTranslation();
  const sym = getCurrencySymbol(groupCurrency);

  const settled = Math.abs(balance) < 0.005;
  const isOwed  = balance > 0;
  const balColor = settled ? SC.labelGray : isOwed ? SC.sage : SC.coral;
  const balLabel = settled
    ? t('memberExpenses.settledBalance')
    : (isOwed ? '+' : '−') + sym + formatAmount(Math.abs(balance), groupCurrency);
  const balDesc = settled
    ? t('memberExpenses.settledDesc')
    : isOwed
    ? t('memberExpenses.isOwed')
    : t('memberExpenses.owes');

  const paidTotal = paidFor.reduce((sum, e) => sum + e.amount, 0);

  return (
    <View ref={pageRef} style={styles.page} collapsable={false}>
      <CardHeader
        groupName={groupName}
        destinationPhotoUrl={destinationPhotoUrl}
        labelIcon="person-outline"
        labelText={t('memberExpenses.memberSummary')}
      />

      <View style={styles.body}>
        <View style={styles.content}>

          <SectionLabel text={t('memberExpenses.memberLabel')} />

          {/* Member avatar + name + balance */}
          <View style={styles.row}>
            <View style={[styles.avatar, { backgroundColor: scAvatarColor(avatarIndex) }]}>
              <Text style={styles.avatarText}>{scInitials(memberName)}</Text>
            </View>
            <Text style={styles.rowLabel} numberOfLines={1}>{memberName}</Text>
            <Text style={[styles.rowValue, { color: balColor }]}>{balLabel}</Text>
          </View>

          <Text style={[styles.balanceDesc, { color: balColor }]}>{balDesc}</Text>

          <SectionDivider />
          <SectionLabel text={t('memberExpenses.overviewLabel')} />

          {/* Total charged (their share of split expenses) */}
          <View style={styles.row}>
            <View style={[styles.iconChip, { backgroundColor: '#FFF0EE' }]}>
              <Ionicons name="receipt-outline" size={14} color={SC.coral} />
            </View>
            <Text style={styles.rowLabel}>{t('memberExpenses.totalChargedShort')}</Text>
            <Text style={[styles.rowValue, { color: SC.coral }]}>
              {sym}{formatAmount(totalCharged, groupCurrency)}
            </Text>
          </View>

          {/* Total paid for (expenses they paid) */}
          <View style={styles.row}>
            <View style={[styles.iconChip, { backgroundColor: '#EEF4EF' }]}>
              <Ionicons name="card-outline" size={14} color={SC.sage} />
            </View>
            <Text style={styles.rowLabel}>{t('memberExpenses.totalPaidShort')}</Text>
            <Text style={[styles.rowValue, { color: SC.sage }]}>
              {sym}{formatAmount(paidTotal, groupCurrency)}
            </Text>
          </View>

          <SectionDivider />
          <SectionLabel text={t('memberExpenses.expensesLabel')} />

          {/* Included in count */}
          <View style={styles.row}>
            <View style={[styles.iconChip, { backgroundColor: '#F5F5F5' }]}>
              <Ionicons name="people-outline" size={14} color={SC.labelGray} />
            </View>
            <Text style={styles.rowLabel}>{t('memberExpenses.includedIn')}</Text>
            <Text style={styles.rowValue}>{includedIn.length}</Text>
          </View>

          {/* Paid for count */}
          <View style={styles.row}>
            <View style={[styles.iconChip, { backgroundColor: '#F5F5F5' }]}>
              <Ionicons name="cash-outline" size={14} color={SC.labelGray} />
            </View>
            <Text style={styles.rowLabel}>{t('memberExpenses.paidFor')}</Text>
            <Text style={styles.rowValue}>{paidFor.length}</Text>
          </View>

        </View>
        <Footer />
      </View>
    </View>
  );
}

// ─── Expense page ─────────────────────────────────────────────────────────────

function ExpensePage({
  groupName,
  destinationPhotoUrl,
  section,
  expenses,
  pageNum,
  totalPages,
  groupCurrency,
  showShare,
  pageRef,
}: {
  groupName: string;
  destinationPhotoUrl?: string | null;
  section: 'includedIn' | 'paidFor';
  expenses: MemberExpenseRow[];
  pageNum: number;
  totalPages: number;
  groupCurrency: string;
  showShare: boolean;
  pageRef?: (r: View | null) => void;
}) {
  const { t } = useTranslation();
  const sectionText = section === 'includedIn'
    ? t('memberExpenses.includedIn')
    : t('memberExpenses.paidFor');
  const labelIcon: React.ComponentProps<typeof Ionicons>['name'] =
    section === 'includedIn' ? 'people-outline' : 'cash-outline';
  const headerLabel = totalPages > 1
    ? `${sectionText} · ${pageNum}/${totalPages}`
    : sectionText;

  return (
    <View ref={pageRef} style={styles.page} collapsable={false}>
      <CardHeader
        groupName={groupName}
        destinationPhotoUrl={destinationPhotoUrl}
        labelIcon={labelIcon}
        labelText={headerLabel}
      />

      <View style={styles.body}>
        <View style={styles.content}>
          <SectionLabel text={sectionText.toUpperCase()} />
          {expenses.map(exp => {
            const cat = CATEGORY_MAP[exp.category] ?? FALLBACK_CATEGORY;
            const title =
              exp.category === 'other' && exp.custom_category?.trim()
                ? exp.custom_category.trim()
                : exp.note?.trim() || t(`categories.${exp.category}`, cat.label ?? exp.category);
            const paidBy = t('groupDetail.expensePaidBy', {
              name: exp.paid_by_name,
              date: formatExpenseDate(exp.date),
            });
            return (
              <View key={exp.id} style={styles.expRow}>
                <View style={[styles.iconChip, { backgroundColor: (cat as any).bg ?? '#F5F5F5' }]}>
                  <Ionicons name={cat.icon} size={15} color={cat.color} />
                </View>
                <View style={styles.expBody}>
                  <View style={styles.expTitleRow}>
                    <Text style={styles.rowLabel} numberOfLines={1}>{title}</Text>
                    <Text style={styles.expAmount}>
                      {getCurrencySymbol(exp.currency)}{formatAmount(exp.amount, exp.currency)}
                    </Text>
                  </View>
                  <Text style={styles.rowSecondary} numberOfLines={1}>{paidBy}</Text>
                  {showShare && exp.share_amount != null && (
                    <Text style={[styles.rowSecondary, { color: SC.coral }]}>
                      {t('memberExpenses.yourShare', {
                        symbol: getCurrencySymbol(exp.currency),
                        amount: formatAmount(exp.share_amount, exp.currency),
                      })}
                    </Text>
                  )}
                </View>
              </View>
            );
          })}
        </View>
        <Footer />
      </View>
    </View>
  );
}

// ─── Main export ──────────────────────────────────────────────────────────────

const MemberExpenseShareCard = forwardRef<View, MemberExpenseShareCardProps>(
  (
    {
      groupName,
      destinationPhotoUrl,
      memberName,
      avatarIndex,
      balance,
      groupCurrency,
      includedIn,
      paidFor,
      totalCharged,
      onPageRef,
    },
    ref,
  ) => {
    const includedInPages: MemberExpenseRow[][] = [];
    for (let i = 0; i < includedIn.length; i += MAX_EXP) {
      includedInPages.push(includedIn.slice(i, i + MAX_EXP));
    }
    const paidForPages: MemberExpenseRow[][] = [];
    for (let i = 0; i < paidFor.length; i += MAX_EXP) {
      paidForPages.push(paidFor.slice(i, i + MAX_EXP));
    }

    const incStart  = 1;
    const paidStart = incStart + includedInPages.length;

    return (
      <View ref={ref} style={styles.stack} collapsable={false}>
        <View style={styles.pageShadow}>
          <SummaryPage
            groupName={groupName}
            destinationPhotoUrl={destinationPhotoUrl}
            memberName={memberName}
            avatarIndex={avatarIndex}
            balance={balance}
            groupCurrency={groupCurrency}
            includedIn={includedIn}
            paidFor={paidFor}
            totalCharged={totalCharged}
            pageRef={r => onPageRef?.(0, r)}
          />
        </View>

        {includedInPages.map((page, i) => (
          <View key={`inc-${i}`} style={styles.pageShadow}>
            <ExpensePage
              groupName={groupName}
              destinationPhotoUrl={destinationPhotoUrl}
              section="includedIn"
              expenses={page}
              pageNum={i + 1}
              totalPages={includedInPages.length}
              groupCurrency={groupCurrency}
              showShare={true}
              pageRef={r => onPageRef?.(incStart + i, r)}
            />
          </View>
        ))}

        {paidForPages.map((page, i) => (
          <View key={`paid-${i}`} style={styles.pageShadow}>
            <ExpensePage
              groupName={groupName}
              destinationPhotoUrl={destinationPhotoUrl}
              section="paidFor"
              expenses={page}
              pageNum={i + 1}
              totalPages={paidForPages.length}
              groupCurrency={groupCurrency}
              showShare={false}
              pageRef={r => onPageRef?.(paidStart + i, r)}
            />
          </View>
        ))}
      </View>
    );
  },
);

MemberExpenseShareCard.displayName = 'MemberExpenseShareCard';
export default MemberExpenseShareCard;

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

  balanceDesc: {
    fontSize: 10,
    fontWeight: '500',
    paddingLeft: SC.AVATAR + 10,
    marginTop: -2,
    marginBottom: 2,
  },

  // ── Expense rows ──
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

  // ── Footer ──
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
