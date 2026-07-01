import { useCallback, useRef, useState } from 'react';
import {
  Modal,
  Pressable,
  SafeAreaView,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { captureRef } from 'react-native-view-shot';
import * as Sharing from 'expo-sharing';
import { useFocusEffect, useNavigation } from '@react-navigation/native';
import { NativeStackScreenProps, NativeStackNavigationProp } from '@react-navigation/native-stack';
import { useTranslation } from 'react-i18next';
import { HomeStackParamList } from '../navigation/types';
import { getMemberExpenses, MemberExpenseRow, MemberExpensesData } from '../db';
import { type ColorPalette, fontSizes, radii, cardShadow } from '../theme';
import { useTheme } from '../context/ThemeContext';
import { getAvatarColor, getInitials, formatExpenseDate, getCurrencySymbol, formatAmount } from '../utils';
import { CATEGORY_MAP, FALLBACK_CATEGORY } from '../categories';
import MemberExpenseShareCard from '../components/MemberExpenseShareCard';

type Props = NativeStackScreenProps<HomeStackParamList, 'MemberExpenses'>;
type NavProp = NativeStackNavigationProp<HomeStackParamList, 'MemberExpenses'>;

const makeStyles = (c: ColorPalette) => StyleSheet.create({
  safe: { flex: 1, backgroundColor: c.background },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 14,
    gap: 12,
  },
  headerTitle: {
    fontSize: fontSizes.sectionTitle,
    fontWeight: '700',
    color: c.textPrimary,
    flex: 1,
  },
  scroll: { paddingBottom: 40 },
  heroCard: {
    marginHorizontal: 20,
    marginTop: 4,
    marginBottom: 20,
    backgroundColor: c.card,
    borderRadius: radii.card,
    padding: 20,
    gap: 14,
  },
  heroTop: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
  },
  avatar: {
    width: 52,
    height: 52,
    borderRadius: 26,
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarText: {
    fontSize: 18,
    fontWeight: '700',
    color: '#fff',
  },
  heroInfo: { flex: 1, gap: 4 },
  memberName: {
    fontSize: fontSizes.sectionTitle,
    fontWeight: '700',
    color: c.textPrimary,
  },
  totalLabel: {
    fontSize: fontSizes.caption,
    fontWeight: '500',
    color: c.textSecondary,
  },
  totalAmount: {
    fontSize: fontSizes.sectionTitle,
    fontWeight: '800',
    color: c.textPrimary,
  },
  settleBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: c.coral,
    borderRadius: radii.button,
    paddingVertical: 12,
    gap: 8,
  },
  settleBtnText: {
    fontSize: fontSizes.body,
    fontWeight: '700',
    color: '#fff',
  },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginHorizontal: 20,
    marginTop: 12,
    marginBottom: 8,
  },
  sectionTitle: {
    fontSize: fontSizes.caption,
    fontWeight: '700',
    color: c.textSecondary,
    textTransform: 'uppercase',
    letterSpacing: 0.6,
  },
  sectionCount: {
    fontSize: fontSizes.caption,
    fontWeight: '600',
    color: c.tabInactive,
  },
  expenseCard: {
    marginHorizontal: 20,
    backgroundColor: c.card,
    borderRadius: radii.card,
    overflow: 'hidden',
    marginBottom: 12,
  },
  expenseRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 14,
    gap: 12,
  },
  categoryIcon: {
    width: 38,
    height: 38,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
  },
  expenseInfo: { flex: 1, gap: 2 },
  expenseTitle: {
    fontSize: fontSizes.body,
    fontWeight: '600',
    color: c.textPrimary,
  },
  expenseMeta: {
    fontSize: fontSizes.caption,
    color: c.textSecondary,
  },
  expenseRight: { alignItems: 'flex-end', gap: 2 },
  expenseAmount: {
    fontSize: fontSizes.body,
    fontWeight: '600',
    color: c.textPrimary,
  },
  shareAmount: {
    fontSize: fontSizes.caption,
    fontWeight: '600',
    color: c.coral,
  },
  emptyText: {
    fontSize: fontSizes.caption,
    color: c.textSecondary,
    marginHorizontal: 20,
    marginBottom: 12,
    fontStyle: 'italic',
  },
  divider: {
    height: StyleSheet.hairlineWidth,
    backgroundColor: c.border,
    marginLeft: 66,
  },

  // ── Share button in header ──
  shareBtn: {
    padding: 6,
  },

  // ── Share modal ──
  modalSafe: {
    flex: 1,
    backgroundColor: c.background,
  },
  modalHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingVertical: 16,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: c.border,
  },
  modalTitle: {
    fontSize: fontSizes.sectionTitle,
    fontWeight: '700',
    color: c.textPrimary,
  },
  modalScroll: {
    flex: 1,
  },
  modalScrollContent: {
    alignItems: 'center',
    paddingVertical: 24,
  },
  modalActions: {
    flexDirection: 'row',
    gap: 10,
    paddingHorizontal: 20,
    paddingVertical: 16,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: c.border,
  },
  modalBtnOutline: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    paddingVertical: 13,
    borderRadius: radii.button,
    borderWidth: 1.5,
    borderColor: c.coral,
  },
  modalBtnOutlineText: {
    fontSize: fontSizes.body,
    fontWeight: '700',
    color: c.coral,
  },
  modalBtnFill: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    paddingVertical: 13,
    borderRadius: radii.button,
    backgroundColor: c.coral,
  },
  modalBtnFillText: {
    fontSize: fontSizes.body,
    fontWeight: '700',
    color: '#fff',
  },
});

function ExpenseItem({
  expense,
  showShare,
  isLast,
  onPress,
}: {
  expense: MemberExpenseRow;
  showShare: boolean;
  isLast: boolean;
  onPress: () => void;
}) {
  const { t } = useTranslation();
  const { colors } = useTheme();
  const styles = makeStyles(colors);
  const cat = expense.category;
  const catDef = CATEGORY_MAP[cat];
  const { icon: iconName, color: iconColor, bg: iconBg } = catDef ?? FALLBACK_CATEGORY;
  const title =
    cat === 'other' && expense.custom_category?.trim()
      ? expense.custom_category.trim()
      : expense.note?.trim() || t(`categories.${cat}`, catDef?.label ?? cat);

  return (
    <>
      <Pressable
        style={({ pressed }) => [styles.expenseRow, pressed && { opacity: 0.7 }]}
        onPress={onPress}
      >
        <View style={[styles.categoryIcon, { backgroundColor: iconBg }]}>
          <Ionicons name={iconName} size={18} color={iconColor} />
        </View>
        <View style={styles.expenseInfo}>
          <Text style={styles.expenseTitle} numberOfLines={1}>{title}</Text>
          <Text style={styles.expenseMeta}>
            {t('groupDetail.expensePaidBy', {
              name: expense.paid_by_name,
              date: formatExpenseDate(expense.date),
            })}
          </Text>
        </View>
        <View style={styles.expenseRight}>
          <Text style={styles.expenseAmount}>
            {getCurrencySymbol(expense.currency)}{formatAmount(expense.amount, expense.currency)}
          </Text>
          {showShare && expense.share_amount != null && (
            <Text style={styles.shareAmount}>
              {t('memberExpenses.yourShare', {
                symbol: getCurrencySymbol(expense.currency),
                amount: formatAmount(expense.share_amount, expense.currency),
              })}
            </Text>
          )}
        </View>
      </Pressable>
      {!isLast && <View style={styles.divider} />}
    </>
  );
}

export default function MemberExpensesScreen({ route }: Props) {
  const navigation = useNavigation<NavProp>();
  const { t } = useTranslation();
  const { colors } = useTheme();
  const styles = makeStyles(colors);
  const { groupId, memberId, memberName, avatarIndex, balance, groupCurrency } = route.params;
  const [data, setData] = useState<MemberExpensesData | null>(null);
  const [showShareModal, setShowShareModal] = useState(false);
  const [sharingSummary, setSharingSummary] = useState(false);
  const [sharingAll, setSharingAll] = useState(false);

  const memberCardRef = useRef<View>(null);
  const pageRefs = useRef<Array<View | null>>([]);
  const pageRefCallback = useCallback((i: number, r: View | null) => {
    pageRefs.current[i] = r;
  }, []);

  useFocusEffect(
    useCallback(() => {
      let active = true;
      getMemberExpenses(groupId, memberId).then((d) => {
        if (active) setData(d);
      });
      return () => { active = false; };
    }, [groupId, memberId]),
  );

  const handleShareSummary = async () => {
    const ref = pageRefs.current[0];
    if (!ref) return;
    setSharingSummary(true);
    try {
      const uri = await captureRef(ref, { format: 'png', quality: 1, pixelRatio: 3 });
      await Sharing.shareAsync(uri, { mimeType: 'image/png', dialogTitle: t('memberExpenses.shareTitle') });
    } catch {}
    setSharingSummary(false);
  };

  const handleShareAll = async () => {
    if (!memberCardRef.current) return;
    setSharingAll(true);
    try {
      const uri = await captureRef(memberCardRef.current, { format: 'png', quality: 1, pixelRatio: 3 });
      await Sharing.shareAsync(uri, { mimeType: 'image/png', dialogTitle: t('memberExpenses.shareTitle') });
    } catch {}
    setSharingAll(false);
  };

  const goToSettle = () => {
    navigation.navigate('SettleUp', {
      groupId,
      memberId,
      memberName,
      balance,
      avatarIndex,
      currency: groupCurrency,
    });
  };

  return (
    <SafeAreaView style={styles.safe}>
      <View style={styles.header}>
        <Pressable onPress={() => navigation.goBack()} hitSlop={12}>
          <Ionicons name="chevron-back" size={22} color={colors.textPrimary} />
        </Pressable>
        <Text style={styles.headerTitle}>{t('memberExpenses.title')}</Text>
        <Pressable
          style={({ pressed }) => [styles.shareBtn, pressed && { opacity: 0.6 }]}
          onPress={() => setShowShareModal(true)}
          hitSlop={12}
        >
          <Ionicons name="share-outline" size={22} color={colors.textPrimary} />
        </Pressable>
      </View>

      <ScrollView contentContainerStyle={styles.scroll} showsVerticalScrollIndicator={false}>
        <View style={[styles.heroCard, cardShadow]}>
          <View style={styles.heroTop}>
            <View style={[styles.avatar, { backgroundColor: getAvatarColor(avatarIndex) }]}>
              <Text style={styles.avatarText}>{getInitials(memberName)}</Text>
            </View>
            <View style={styles.heroInfo}>
              <Text style={styles.memberName}>{memberName}</Text>
              <Text style={styles.totalLabel}>
                {t('memberExpenses.totalCharged', { name: memberName })}
              </Text>
              <Text style={styles.totalAmount}>
                {getCurrencySymbol(groupCurrency)}
                {formatAmount(data?.totalCharged ?? 0, groupCurrency)}
              </Text>
            </View>
          </View>
          <Pressable
            style={({ pressed }) => [styles.settleBtn, pressed && { opacity: 0.85 }]}
            onPress={goToSettle}
          >
            <Ionicons name="swap-horizontal-outline" size={18} color="#fff" />
            <Text style={styles.settleBtnText}>{t('memberExpenses.settleUp')}</Text>
          </Pressable>
        </View>

        <View style={styles.sectionHeader}>
          <Text style={styles.sectionTitle}>{t('memberExpenses.includedIn')}</Text>
          <Text style={styles.sectionCount}>{data?.includedIn.length ?? 0}</Text>
        </View>
        {data && data.includedIn.length > 0 ? (
          <View style={[styles.expenseCard, cardShadow]}>
            {data.includedIn.map((e, i) => (
              <ExpenseItem
                key={e.id}
                expense={e}
                showShare
                isLast={i === data.includedIn.length - 1}
                onPress={() => navigation.navigate('AddExpense', { groupId, expenseId: e.id })}
              />
            ))}
          </View>
        ) : (
          <Text style={styles.emptyText}>{t('memberExpenses.noExpenses')}</Text>
        )}

        <View style={styles.sectionHeader}>
          <Text style={styles.sectionTitle}>{t('memberExpenses.paidFor')}</Text>
          <Text style={styles.sectionCount}>{data?.paidFor.length ?? 0}</Text>
        </View>
        {data && data.paidFor.length > 0 ? (
          <View style={[styles.expenseCard, cardShadow]}>
            {data.paidFor.map((e, i) => (
              <ExpenseItem
                key={e.id}
                expense={e}
                showShare={false}
                isLast={i === data.paidFor.length - 1}
                onPress={() => navigation.navigate('AddExpense', { groupId, expenseId: e.id })}
              />
            ))}
          </View>
        ) : (
          <Text style={styles.emptyText}>{t('memberExpenses.noExpenses')}</Text>
        )}
      </ScrollView>

      <Modal
        visible={showShareModal}
        animationType="slide"
        presentationStyle="pageSheet"
        onRequestClose={() => setShowShareModal(false)}
      >
        <SafeAreaView style={styles.modalSafe}>
          <View style={styles.modalHeader}>
            <Text style={styles.modalTitle}>{t('memberExpenses.shareTitle')}</Text>
            <Pressable onPress={() => setShowShareModal(false)} hitSlop={12}>
              <Ionicons name="close" size={24} color={colors.textPrimary} />
            </Pressable>
          </View>

          <ScrollView
            style={styles.modalScroll}
            contentContainerStyle={styles.modalScrollContent}
            showsVerticalScrollIndicator={false}
          >
            {data && (
              <MemberExpenseShareCard
                ref={memberCardRef}
                groupName={data.groupName}
                destinationPhotoUrl={data.destinationPhotoUrl}
                memberName={memberName}
                avatarIndex={avatarIndex}
                balance={balance}
                groupCurrency={groupCurrency}
                includedIn={data.includedIn}
                paidFor={data.paidFor}
                totalCharged={data.totalCharged}
                onPageRef={pageRefCallback}
              />
            )}
          </ScrollView>

          <View style={styles.modalActions}>
            <Pressable
              style={({ pressed }) => [styles.modalBtnOutline, pressed && { opacity: 0.8 }, sharingSummary && { opacity: 0.6 }]}
              onPress={handleShareSummary}
              disabled={sharingSummary || sharingAll}
            >
              <Ionicons name="image-outline" size={18} color={colors.coral} />
              <Text style={styles.modalBtnOutlineText}>
                {sharingSummary ? t('common.sharing') : t('memberExpenses.shareSummary')}
              </Text>
            </Pressable>
            <Pressable
              style={({ pressed }) => [styles.modalBtnFill, pressed && { opacity: 0.8 }, sharingAll && { opacity: 0.6 }]}
              onPress={handleShareAll}
              disabled={sharingAll || sharingSummary}
            >
              <Ionicons name="share-outline" size={18} color="#fff" />
              <Text style={styles.modalBtnFillText}>
                {sharingAll ? t('common.sharing') : t('memberExpenses.shareAll')}
              </Text>
            </Pressable>
          </View>
        </SafeAreaView>
      </Modal>
    </SafeAreaView>
  );
}
