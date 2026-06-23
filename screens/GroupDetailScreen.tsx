import { useCallback, useEffect, useRef, useState } from 'react';
import {
  Alert,
  Animated,
  Image,
  LayoutAnimation,
  Modal,
  Pressable,
  SafeAreaView,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { captureRef } from 'react-native-view-shot';
import * as Sharing from 'expo-sharing';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { useFocusEffect, useNavigation } from '@react-navigation/native';
import { NativeStackScreenProps, NativeStackNavigationProp } from '@react-navigation/native-stack';
import { useTranslation } from 'react-i18next';
import { HomeStackParamList } from '../navigation/types';
import {
  getGroupDetails,
  getSubgroups,
  archiveGroup,
  deleteSubgroup,
  simplifyDebts,
  getTripStops,
  GroupDetails,
  MemberWithBalance,
  Expense,
  SuggestedTransaction,
  SubgroupWithMembers,
  TripStop,
} from '../db';
import { type ColorPalette, fontSizes, radii, cardShadow } from '../theme';
import { useTheme } from '../context/ThemeContext';
import { getAvatarColor, getInitials, formatExpenseDate, getCurrencySymbol, formatAmount } from '../utils';
import { getCachedRates } from '../currencyRates';
import { CATEGORY_MAP, FALLBACK_CATEGORY } from '../categories';
import AnimatedFAB from '../components/AnimatedFAB';
import TripSummaryCard from '../components/TripSummaryCard';

type Props = NativeStackScreenProps<HomeStackParamList, 'GroupDetail'>;
type NavProp = NativeStackNavigationProp<HomeStackParamList, 'GroupDetail'>;


function MemberBalanceCard({
  member,
  index,
  groupCurrency,
  onPressBreakdown,
  onPressSettle,
}: {
  member: MemberWithBalance;
  index: number;
  groupCurrency: string;
  onPressBreakdown: () => void;
  onPressSettle: () => void;
}) {
  const { colors } = useTheme();
  const styles = makeStyles(colors);
  const isPositive    = member.balance >= 0;
  const fadeAnim      = useRef(new Animated.Value(0)).current;
  const translateAnim = useRef(new Animated.Value(16)).current;

  useEffect(() => {
    Animated.parallel([
      Animated.timing(fadeAnim, {
        toValue: 1,
        duration: 350,
        delay: index * 60,
        useNativeDriver: true,
      }),
      Animated.timing(translateAnim, {
        toValue: 0,
        duration: 350,
        delay: index * 60,
        useNativeDriver: true,
      }),
    ]).start();
  }, []);

  return (
    <Animated.View style={[{ flex: 1 }, { opacity: fadeAnim, transform: [{ translateY: translateAnim }] }]}>
      <View style={[styles.memberCard, cardShadow]}>
        <Pressable
          style={({ pressed }) => [styles.memberCardUpper, pressed && { opacity: 0.7 }]}
          onPress={onPressBreakdown}
        >
          <View style={[styles.memberAvatar, { backgroundColor: getAvatarColor(index) }]}>
            <Text style={styles.memberAvatarText}>{getInitials(member.name)}</Text>
          </View>
          <Text style={styles.memberName} numberOfLines={1} adjustsFontSizeToFit minimumFontScale={0.75}>
            {member.name}
          </Text>
        </Pressable>
        <View style={styles.memberCardDivider} />
        <Pressable
          style={({ pressed }) => [styles.memberCardLower, pressed && { opacity: 0.7 }]}
          onPress={onPressSettle}
        >
          <Text
            style={[styles.memberBalance, { color: isPositive ? colors.sage : colors.coral }]}
            numberOfLines={1}
            adjustsFontSizeToFit
            minimumFontScale={0.7}
          >
            {getCurrencySymbol(groupCurrency)}{formatAmount(Math.abs(member.balance), groupCurrency)}
          </Text>
          <Ionicons name="chevron-forward" size={11} color={colors.tabInactive} />
        </Pressable>
      </View>
    </Animated.View>
  );
}

function ExpenseRow({
  expense,
  index,
  memberCount,
  isLast,
  onPress,
  onReceiptPress,
}: {
  expense: Expense;
  index: number;
  memberCount: number;
  isLast: boolean;
  onPress: () => void;
  onReceiptPress?: () => void;
}) {
  const { colors } = useTheme();
  const styles = makeStyles(colors);
  const { t }   = useTranslation();
  const cat     = expense.category;
  const catDef  = CATEGORY_MAP[cat];
  const { icon: iconName, color: iconColor, bg: iconBg } = catDef ?? FALLBACK_CATEGORY;
  const title   =
    cat === 'other' && expense.custom_category?.trim()
      ? expense.custom_category.trim()
      : expense.note?.trim() || t(`categories.${cat}`, catDef?.label ?? cat);
  const delay   = memberCount * 60 + 80 + index * 60;
  const fadeAnim      = useRef(new Animated.Value(0)).current;
  const translateAnim = useRef(new Animated.Value(12)).current;

  useEffect(() => {
    Animated.parallel([
      Animated.timing(fadeAnim, {
        toValue: 1,
        duration: 320,
        delay,
        useNativeDriver: true,
      }),
      Animated.timing(translateAnim, {
        toValue: 0,
        duration: 320,
        delay,
        useNativeDriver: true,
      }),
    ]).start();
  }, []);

  return (
    <Animated.View style={{ opacity: fadeAnim, transform: [{ translateY: translateAnim }] }}>
      <Pressable
        style={({ pressed }) => [styles.expenseRow, pressed && { opacity: 0.7 }]}
        onPress={onPress}
      >
        <View style={[styles.categoryIcon, { backgroundColor: iconBg }]}>
          <Ionicons name={iconName} size={18} color={iconColor} />
        </View>
        <View style={styles.expenseInfo}>
          <Text style={styles.expenseTitle}>{title}</Text>
          <Text style={styles.expenseMeta}>
            {t('groupDetail.expensePaidBy', {
              name: expense.paid_by_name,
              date: formatExpenseDate(expense.date),
            })}
          </Text>
        </View>
        <View style={styles.expenseRight}>
          <Text style={styles.expenseAmount}>{getCurrencySymbol(expense.currency)}{formatAmount(expense.amount, expense.currency)}</Text>
          {expense.receipt_photo_uri ? (
            <Pressable
              onPress={onReceiptPress}
              hitSlop={8}
              style={styles.receiptBadge}
            >
              <Ionicons name="receipt-outline" size={14} color={colors.coral} />
            </Pressable>
          ) : null}
        </View>
      </Pressable>
      {!isLast && <View style={styles.divider} />}
    </Animated.View>
  );
}

function SuggestionRow({
  tx,
  fromIndex,
  groupCurrency,
  isLast,
}: {
  tx: SuggestedTransaction;
  fromIndex: number;
  groupCurrency: string;
  isLast: boolean;
}) {
  const { colors } = useTheme();
  const styles = makeStyles(colors);
  const { t } = useTranslation();
  return (
    <>
      <View style={styles.suggestionRow}>
        <View style={[styles.suggestionAvatar, { backgroundColor: getAvatarColor(fromIndex) }]}>
          <Text style={styles.suggestionAvatarText}>{getInitials(tx.fromName)}</Text>
        </View>
        <Text style={styles.suggestionText} numberOfLines={1}>
          <Text style={styles.suggestionName}>{tx.fromName}</Text>
          <Text style={styles.suggestionVerb}>{t('groupDetail.pays')}</Text>
          <Text style={styles.suggestionName}>{tx.toName}</Text>
        </Text>
        <Text style={styles.suggestionAmount}>{getCurrencySymbol(groupCurrency)}{formatAmount(tx.amount, groupCurrency)}</Text>
      </View>
      {!isLast && <View style={styles.divider} />}
    </>
  );
}

export default function GroupDetailScreen({ route }: Props) {
  const navigation = useNavigation<NavProp>();
  const { t }      = useTranslation();
  const { colors } = useTheme();
  const styles     = makeStyles(colors);
  const [group, setGroup]       = useState<GroupDetails | null>(null);
  const [subgroups, setSubgroups] = useState<SubgroupWithMembers[]>([]);
  const [stops, setStops]       = useState<TripStop[]>([]);
  const [loading, setLoading]   = useState(true);
  const [toolsExpanded, setToolsExpanded] = useState(false);
  const [showShareModal, setShowShareModal] = useState(false);
  const [sharing, setSharing]   = useState(false);
  const [receiptViewUri, setReceiptViewUri] = useState<string | null>(null);
  const cardRef = useRef<View>(null);
  const toggleTools = () => {
    LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
    setToolsExpanded(prev => !prev);
  };

  useFocusEffect(
    useCallback(() => {
      let active = true;
      Promise.all([
        getGroupDetails(route.params.groupId),
        getSubgroups(route.params.groupId),
        getTripStops(route.params.groupId),
      ]).then(([groupData, subgroupData, stopsData]) => {
        if (active) {
          setGroup(groupData);
          setSubgroups(subgroupData);
          setStops(stopsData);
          setLoading(false);
        }
      });
      return () => { active = false; };
    }, [route.params.groupId]),
  );

  if (loading) {
    return (
      <SafeAreaView style={styles.safe}>
        <Animated.View style={{ flex: 1, alignItems: 'center', justifyContent: 'center' }}>
          <Ionicons name="hourglass-outline" size={32} color={colors.coral} />
        </Animated.View>
      </SafeAreaView>
    );
  }

  if (!group) {
    return (
      <SafeAreaView style={styles.safe}>
        <Text style={{ padding: 24, color: colors.textSecondary }}>{t('common.groupNotFound')}</Text>
      </SafeAreaView>
    );
  }

  const handleShare = async () => {
    if (!cardRef.current) return;
    setSharing(true);
    try {
      const uri = await captureRef(cardRef, { format: 'png', quality: 1, pixelRatio: 3 });
      await Sharing.shareAsync(uri, {
        mimeType: 'image/png',
        dialogTitle: t('groupDetail.shareTripSummary'),
      });
    } catch {
      Alert.alert(t('groupDetail.shareError'), t('groupDetail.shareErrorMsg'));
    } finally {
      setSharing(false);
    }
  };

  const handleConclude = () => {
    Alert.alert(
      t('groupDetail.concludeTitle'),
      t('groupDetail.concludeMsg'),
      [
        { text: t('common.cancel'), style: 'cancel' },
        {
          text: t('groupDetail.conclude'),
          style: 'destructive',
          onPress: async () => {
            await archiveGroup(group.id);
            navigation.navigate('HomeScreen', { initialTab: 'archived' });
          },
        },
      ],
    );
  };

  const hasPhoto = Boolean(group.destination_photo_url);

  return (
    <SafeAreaView style={styles.safe}>
      <ScrollView
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        {hasPhoto ? (
          <View style={styles.heroPhoto}>
            <Image
              source={{ uri: group.destination_photo_url! }}
              style={StyleSheet.absoluteFill}
              resizeMode="cover"
            />
            <LinearGradient
              colors={['transparent', 'rgba(0,0,0,0.36)', 'rgba(0,0,0,0.70)']}
              locations={[0.45, 0.72, 1]}
              style={StyleSheet.absoluteFill}
            />
            <View style={styles.heroNavRow}>
              <Pressable onPress={() => navigation.goBack()} hitSlop={12}>
                <View style={styles.heroNavBtn}>
                  <Ionicons name="chevron-back" size={22} color="#fff" />
                </View>
              </Pressable>
              {!group.is_archived && (
                <Pressable onPress={handleConclude} hitSlop={10} style={styles.heroNavConclude}>
                  <Ionicons name="archive-outline" size={15} color="#fff" />
                  <Text style={styles.heroNavConcludeText}>{t('groupDetail.conclude')}</Text>
                </Pressable>
              )}
            </View>
            <View style={styles.heroTextArea}>
              <Text style={styles.heroTitle} numberOfLines={2}>{group.name}</Text>
              {group.destination ? (
                <View style={styles.heroDestRow}>
                  <Ionicons name="location-outline" size={13} color="rgba(255,255,255,0.82)" />
                  <Text style={styles.heroDestText}>{group.destination}</Text>
                </View>
              ) : null}
            </View>
          </View>
        ) : (
          <View style={styles.navRow}>
            <Pressable onPress={() => navigation.goBack()} hitSlop={12}>
              <Ionicons name="chevron-back" size={22} color={colors.textPrimary} />
            </Pressable>
            {!group.is_archived && (
              <Pressable onPress={handleConclude} style={styles.concludeBtn} hitSlop={10}>
                <Ionicons name="archive-outline" size={18} color={colors.textSecondary} />
                <Text style={styles.concludeLabel}>{t('groupDetail.conclude')}</Text>
              </Pressable>
            )}
          </View>
        )}

        {!hasPhoto && <Text style={styles.screenTitle}>{group.name}</Text>}
        <Text style={[styles.totalLabel, hasPhoto && styles.totalLabelAfterHero]}>
          {t('groupDetail.totalSpent', {
            amount: formatAmount(group.totalSpent, group.currency),
            currency: group.currency,
          })}
        </Text>
        {getCachedRates() === null && group.expenses.some(e => e.currency !== group.currency) && (
          <View style={styles.ratesBanner}>
            <Ionicons name="warning-outline" size={13} color={colors.coral} />
            <Text style={styles.ratesBannerText}>{t('common.ratesUnavailable')}</Text>
          </View>
        )}

        {group.is_archived ? (
          <Pressable
            style={({ pressed }) => [styles.shareBtn, pressed && { opacity: 0.8 }]}
            onPress={() => setShowShareModal(true)}
          >
            <Ionicons name="share-outline" size={18} color="#fff" />
            <Text style={styles.shareBtnText}>{t('groupDetail.shareTripSummary')}</Text>
          </Pressable>
        ) : null}

        {stops.length > 0 && (
          <View style={styles.stopsSection}>
            <View style={styles.stopsLabelRow}>
              <Ionicons name="map-outline" size={13} color={colors.textSecondary} />
              <Text style={styles.stopsLabel}>{t('groupDetail.stops')}</Text>
            </View>
            <ScrollView
              horizontal
              showsHorizontalScrollIndicator={false}
              contentContainerStyle={styles.stopsChipRow}
            >
              {stops.map((stop, i) => (
                <View key={stop.id} style={{ flexDirection: 'row', alignItems: 'center' }}>
                  {i > 0 && <Text style={styles.stopsArrow}>{'→'}</Text>}
                  <View style={styles.stopChip}>
                    <Text style={styles.stopChipText}>{stop.stop_name}</Text>
                  </View>
                </View>
              ))}
            </ScrollView>
          </View>
        )}

        <Pressable
          style={[styles.kipPicksBtn, cardShadow]}
          onPress={() =>
            navigation.navigate('Explore', {
              groupId: group.id,
              destination: group.destination ?? group.name,
            })
          }
        >
          <LinearGradient
            colors={['#FF6B5B', '#7FA68C']}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
            style={styles.kipPicksGradient}
          >
            <View style={{ flex: 1, justifyContent: 'center' }}>
              <View style={styles.kipBadgeRow}>
                <Ionicons name="sparkles" size={11} color="rgba(255,255,255,0.9)" />
                <Text style={styles.kipBadgeText}>KIP'S FAVS</Text>
              </View>
              <Text style={styles.kipPicksTitle}>{t('groupDetail.explore')}</Text>
              <Text style={styles.kipPicksSub}>{t('groupDetail.exploreSub')}</Text>
            </View>
            <View style={styles.kipImageWrapper}>
              <Image
                source={require('../assets/Kip_jog.png')}
                style={styles.kipPicksImage}
                resizeMode="contain"
              />
            </View>
          </LinearGradient>
        </Pressable>

        <Pressable style={styles.planningToolsHeader} onPress={toggleTools}>
          <Text style={styles.planningToolsTitle}>{t('groupDetail.planningTools')}</Text>
          <Ionicons
            name={toolsExpanded ? 'chevron-up' : 'chevron-down'}
            size={18}
            color={colors.textSecondary}
          />
        </Pressable>

        {toolsExpanded && (
          <>
            <Pressable
              style={[styles.itineraryBtn, { marginBottom: 12 }, cardShadow]}
              onPress={() =>
                navigation.navigate('Itinerary', {
                  groupId: group.id,
                  totalDays: (() => {
                    if (!group.planned_start_date || !group.planned_end_date) return 7;
                    const diff =
                      (new Date(group.planned_end_date).getTime() -
                        new Date(group.planned_start_date).getTime()) /
                      (1000 * 60 * 60 * 24);
                    return Math.max(1, Math.ceil(diff));
                  })(),
                })
              }
            >
              <View style={styles.itineraryIconBg}>
                <Ionicons name="calendar-outline" size={20} color={colors.coral} />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={styles.itineraryBtnTitle}>{t('groupDetail.itinerary')}</Text>
                <Text style={styles.itineraryBtnSub}>{t('groupDetail.itinerarySub')}</Text>
              </View>
              <Ionicons name="chevron-forward" size={16} color={colors.tabInactive} />
            </Pressable>

            <Pressable
              style={[styles.itineraryBtn, styles.packingBtn, cardShadow]}
              onPress={() => navigation.navigate('PackingList', { groupId: group.id })}
            >
              <View style={styles.packingIconBg}>
                <Ionicons name="bag-handle-outline" size={20} color={colors.sage} />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={styles.itineraryBtnTitle}>{t('groupDetail.packingList')}</Text>
                <Text style={styles.itineraryBtnSub}>{t('groupDetail.packingListSub')}</Text>
              </View>
              <Ionicons name="chevron-forward" size={16} color={colors.tabInactive} />
            </Pressable>

            <Pressable
              style={[styles.itineraryBtn, styles.budgetBtn, cardShadow]}
              onPress={() => navigation.navigate('BudgetPlan', { groupId: group.id })}
            >
              <View style={styles.budgetIconBg}>
                <Ionicons name="wallet-outline" size={20} color="#6A9BD8" />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={styles.itineraryBtnTitle}>{t('groupDetail.budgetPlan')}</Text>
                <Text style={styles.itineraryBtnSub}>{t('groupDetail.budgetPlanSub')}</Text>
              </View>
              <Ionicons name="chevron-forward" size={16} color={colors.tabInactive} />
            </Pressable>
          </>
        )}

        <Text style={styles.sectionTitle}>{t('groupDetail.balances')}</Text>
        <View style={styles.memberRow}>
          {group.members.map((m, i) => (
            <MemberBalanceCard
              key={m.id}
              member={m}
              index={i}
              groupCurrency={group.currency}
              onPressBreakdown={() =>
                navigation.navigate('MemberExpenses', {
                  groupId: group.id,
                  memberId: m.id,
                  memberName: m.name,
                  avatarIndex: i,
                  balance: m.balance,
                  groupCurrency: group.currency,
                })
              }
              onPressSettle={() =>
                navigation.navigate('SettleUp', {
                  groupId: group.id,
                  memberId: m.id,
                  memberName: m.name,
                  balance: m.balance,
                  avatarIndex: i,
                  currency: group.currency,
                })
              }
            />
          ))}
        </View>

        <View style={styles.subgroupsHeader}>
          <Text style={styles.sectionTitle}>{t('groupDetail.subgroups')}</Text>
          <Pressable
            onPress={() => navigation.navigate('CreateSubgroup', { groupId: group.id })}
            hitSlop={10}
            style={styles.subgroupAddBtn}
          >
            <Ionicons name="add" size={18} color={colors.coral} />
            <Text style={styles.subgroupAddLabel}>{t('groupDetail.subgroupNew')}</Text>
          </Pressable>
        </View>
        {subgroups.length === 0 ? (
          <View style={[styles.subgroupEmptyCard, cardShadow]}>
            <Text style={styles.subgroupEmptyText}>{t('groupDetail.subgroupEmpty')}</Text>
          </View>
        ) : (
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            style={styles.subgroupScroll}
            contentContainerStyle={styles.subgroupScrollContent}
          >
            {subgroups.map((sg) => (
              <Pressable
                key={sg.id}
                style={({ pressed }) => [styles.subgroupChip, pressed && { opacity: 0.7 }]}
                onLongPress={() => {
                  Alert.alert(
                    t('groupDetail.deleteSubgroup'),
                    t('groupDetail.removeSubgroupMsg', { name: sg.name }),
                    [
                      { text: t('common.cancel'), style: 'cancel' },
                      {
                        text: t('common.delete'),
                        style: 'destructive',
                        onPress: async () => {
                          await deleteSubgroup(sg.id);
                          setSubgroups((prev) => prev.filter((s) => s.id !== sg.id));
                        },
                      },
                    ],
                  );
                }}
              >
                <Text style={styles.subgroupChipName}>{sg.name}</Text>
                <Text style={styles.subgroupChipCount}>
                  {t('groupDetail.subgroupCount', { count: sg.members.length })}
                </Text>
              </Pressable>
            ))}
          </ScrollView>
        )}

        {(() => {
          const suggestions = simplifyDebts(group.members);
          const indexMap = Object.fromEntries(group.members.map((m, i) => [m.id, i]));
          if (suggestions.length === 0) return null;
          return (
            <>
              <Text style={styles.sectionTitle}>{t('groupDetail.suggestedSettlements')}</Text>
              <View style={[styles.expenseCard, cardShadow, { marginBottom: 28 }]}>
                {suggestions.map((tx, i) => (
                  <SuggestionRow
                    key={`${tx.fromId}-${tx.toId}`}
                    tx={tx}
                    fromIndex={indexMap[tx.fromId] ?? 0}
                    groupCurrency={group.currency}
                    isLast={i === suggestions.length - 1}
                  />
                ))}
              </View>
            </>
          );
        })()}

        <Text style={styles.sectionTitle}>{t('groupDetail.expenses')}</Text>
        {group.expenses.length === 0 ? (
          <View style={[styles.expenseCard, cardShadow, styles.emptyExpenses]}>
            <Text style={styles.emptyText}>{t('groupDetail.noExpenses')}</Text>
          </View>
        ) : (
          <View style={[styles.expenseCard, cardShadow]}>
            {group.expenses.map((expense, i) => (
              <ExpenseRow
                key={expense.id}
                expense={expense}
                index={i}
                memberCount={group.members.length}
                isLast={i === group.expenses.length - 1}
                onPress={() =>
                  navigation.navigate('AddExpense', {
                    groupId: group.id,
                    expenseId: expense.id,
                  })
                }
                onReceiptPress={
                  expense.receipt_photo_uri
                    ? () => setReceiptViewUri(expense.receipt_photo_uri!)
                    : undefined
                }
              />
            ))}
          </View>
        )}
      </ScrollView>

      <AnimatedFAB
        onPress={() => navigation.navigate('AddExpense', { groupId: group.id })}
      />

      {/* Receipt photo full-screen viewer */}
      <Modal
        visible={receiptViewUri !== null}
        transparent
        animationType="fade"
        onRequestClose={() => setReceiptViewUri(null)}
      >
        <View style={styles.receiptModalBg}>
          <SafeAreaView style={{ flex: 1 }}>
            <View style={styles.receiptModalHeader}>
              <Text style={styles.receiptModalTitle}>{t('groupDetail.receipt')}</Text>
              <Pressable onPress={() => setReceiptViewUri(null)} hitSlop={12}>
                <Ionicons name="close" size={24} color="#fff" />
              </Pressable>
            </View>
            {receiptViewUri && (
              <Image
                source={{ uri: receiptViewUri }}
                style={styles.receiptModalImage}
                resizeMode="contain"
              />
            )}
          </SafeAreaView>
        </View>
      </Modal>

      <Modal
        visible={showShareModal}
        animationType="slide"
        presentationStyle="pageSheet"
        onRequestClose={() => setShowShareModal(false)}
      >
        <SafeAreaView style={styles.modalSafe}>
          <View style={styles.modalHeader}>
            <Text style={styles.modalTitle}>{t('groupDetail.tripSummary')}</Text>
            <Pressable onPress={() => setShowShareModal(false)} hitSlop={12}>
              <Ionicons name="close" size={24} color={colors.textPrimary} />
            </Pressable>
          </View>

          <View style={styles.modalCardWrap}>
            <TripSummaryCard ref={cardRef} group={group} />
          </View>

          <View style={styles.modalFooter}>
            <Pressable
              style={({ pressed }) => [styles.shareSheetBtn, pressed && { opacity: 0.8 }, sharing && { opacity: 0.6 }]}
              onPress={handleShare}
              disabled={sharing}
            >
              <Ionicons name="share-outline" size={20} color="#fff" />
              <Text style={styles.shareSheetBtnText}>
                {sharing ? t('common.sharing') : t('common.share')}
              </Text>
            </Pressable>
          </View>
        </SafeAreaView>
      </Modal>
    </SafeAreaView>
  );
}

const makeStyles = (c: ColorPalette) => StyleSheet.create({
  safe: {
    flex: 1,
    backgroundColor: c.background,
  },
  scrollContent: {
    paddingHorizontal: 20,
    paddingBottom: 100,
  },

  // ── Hero photo header ──
  heroPhoto: {
    height: 300,
    overflow: 'hidden',
    marginHorizontal: -20,
    marginBottom: 16,
  },
  heroNavRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingTop: 16,
    paddingBottom: 8,
  },
  heroNavBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: 'rgba(0,0,0,0.28)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  heroNavConclude: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    backgroundColor: 'rgba(0,0,0,0.28)',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 16,
  },
  heroNavConcludeText: {
    fontSize: fontSizes.caption,
    fontWeight: '600',
    color: '#fff',
  },
  heroTextArea: {
    position: 'absolute',
    bottom: 16,
    left: 16,
    right: 16,
    gap: 4,
  },
  heroTitle: {
    fontSize: fontSizes.screenTitle,
    fontWeight: '800',
    color: '#fff',
    lineHeight: 34,
    textShadowColor: 'rgba(0,0,0,0.20)',
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 4,
  },
  heroDestRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  heroDestText: {
    fontSize: fontSizes.body,
    color: 'rgba(255,255,255,0.85)',
    fontWeight: '500',
  },
  totalLabelAfterHero: {
    marginTop: 0,
  },

  navRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginTop: 16,
    marginBottom: 4,
  },
  concludeBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
  },
  concludeLabel: {
    fontSize: fontSizes.body,
    fontWeight: '500',
    color: c.textSecondary,
  },
  screenTitle: {
    fontSize: fontSizes.screenTitle,
    fontWeight: '700',
    color: c.textPrimary,
    marginTop: 4,
  },
  totalLabel: {
    fontSize: fontSizes.body,
    color: c.textSecondary,
    marginTop: 4,
    marginBottom: 8,
  },
  ratesBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    marginBottom: 20,
  },
  ratesBannerText: {
    fontSize: fontSizes.caption,
    color: c.coral,
    flex: 1,
  },
  sectionTitle: {
    fontSize: fontSizes.sectionTitle,
    fontWeight: '700',
    color: c.textPrimary,
    marginBottom: 12,
  },
  memberRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
    marginBottom: 28,
  },
  memberCard: {
    backgroundColor: c.card,
    borderRadius: radii.card,
    overflow: 'hidden',
  },
  memberCardUpper: {
    alignItems: 'center',
    paddingTop: 12,
    paddingHorizontal: 14,
    paddingBottom: 10,
    gap: 5,
  },
  memberCardDivider: {
    height: StyleSheet.hairlineWidth,
    backgroundColor: c.border,
    marginHorizontal: 10,
  },
  memberCardLower: {
    alignItems: 'center',
    paddingTop: 8,
    paddingHorizontal: 14,
    paddingBottom: 10,
    gap: 2,
  },
  memberAvatar: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
  },
  memberAvatarText: {
    fontSize: 12,
    fontWeight: '700',
    color: '#fff',
  },
  memberName: {
    fontSize: fontSizes.caption,
    fontWeight: '600',
    color: c.textPrimary,
    alignSelf: 'stretch',
    textAlign: 'center',
  },
  memberBalance: {
    fontSize: 13,
    fontWeight: '700',
    alignSelf: 'stretch',
    textAlign: 'center',
  },
  expenseCard: {
    backgroundColor: c.card,
    borderRadius: radii.card,
    paddingHorizontal: 16,
    marginBottom: 16,
    overflow: 'hidden',
  },
  emptyExpenses: {
    paddingVertical: 24,
    alignItems: 'center',
  },
  emptyText: {
    fontSize: fontSizes.body,
    color: c.textSecondary,
  },
  expenseRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 14,
    gap: 12,
  },
  categoryIcon: {
    width: 38,
    height: 38,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  expenseInfo: {
    flex: 1,
    gap: 3,
  },
  expenseTitle: {
    fontSize: fontSizes.body,
    fontWeight: '600',
    color: c.textPrimary,
  },
  expenseMeta: {
    fontSize: fontSizes.caption,
    color: c.textSecondary,
  },
  expenseRight: {
    alignItems: 'flex-end',
    gap: 4,
    flexShrink: 0,
  },
  expenseAmount: {
    fontSize: fontSizes.body,
    fontWeight: '700',
    color: c.textPrimary,
  },
  receiptBadge: {
    backgroundColor: '#FFF0EE',
    borderRadius: 6,
    paddingHorizontal: 5,
    paddingVertical: 2,
  },

  // Receipt viewer modal
  receiptModalBg: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.92)',
  },
  receiptModalHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingVertical: 16,
  },
  receiptModalTitle: {
    fontSize: fontSizes.sectionTitle,
    fontWeight: '700',
    color: '#fff',
  },
  receiptModalImage: {
    flex: 1,
    width: '100%',
  },
  divider: {
    height: 1,
    backgroundColor: c.border,
  },
  suggestionRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 14,
    gap: 12,
  },
  suggestionAvatar: {
    width: 32,
    height: 32,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
    flexShrink: 0,
  },
  suggestionAvatarText: {
    fontSize: 10,
    fontWeight: '700',
    color: '#fff',
  },
  suggestionText: {
    flex: 1,
    fontSize: fontSizes.body,
  },
  suggestionName: {
    fontWeight: '700',
    color: c.textPrimary,
  },
  suggestionVerb: {
    color: c.textSecondary,
    fontWeight: '400',
  },
  suggestionAmount: {
    fontSize: fontSizes.body,
    fontWeight: '700',
    color: c.coral,
    flexShrink: 0,
  },

  // Subgroups section
  subgroupsHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 12,
  },
  subgroupAddBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  subgroupAddLabel: {
    fontSize: fontSizes.body,
    fontWeight: '700',
    color: c.coral,
  },
  subgroupEmptyCard: {
    backgroundColor: c.card,
    borderRadius: radii.card,
    paddingHorizontal: 16,
    paddingVertical: 14,
    marginBottom: 28,
  },
  subgroupEmptyText: {
    fontSize: fontSizes.caption,
    color: c.textSecondary,
    lineHeight: 18,
  },
  subgroupScroll: {
    flexGrow: 0,
    marginBottom: 28,
  },
  subgroupScrollContent: {
    gap: 10,
  },
  subgroupChip: {
    backgroundColor: c.card,
    borderRadius: radii.button,
    paddingHorizontal: 14,
    paddingVertical: 10,
    gap: 2,
    minWidth: 90,
    alignItems: 'center',
    borderWidth: 1.5,
    borderColor: c.border,
  },
  subgroupChipName: {
    fontSize: fontSizes.body,
    fontWeight: '700',
    color: c.textPrimary,
  },
  subgroupChipCount: {
    fontSize: fontSizes.caption,
    color: c.textSecondary,
    fontWeight: '500',
  },

  // Kip's Picks button
  kipPicksBtn: {
    borderRadius: radii.card,
    overflow: 'hidden',
    marginBottom: 16,
  },
  kipPicksGradient: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingLeft: 20,
    paddingVertical: 18,
    minHeight: 96,
  },
  kipBadgeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    marginBottom: 6,
  },
  kipBadgeText: {
    fontSize: 10,
    fontWeight: '700',
    color: 'rgba(255,255,255,0.9)',
    letterSpacing: 0.8,
  },
  kipPicksTitle: {
    fontSize: fontSizes.sectionTitle,
    fontWeight: '800',
    color: '#fff',
    marginBottom: 3,
  },
  kipPicksSub: {
    fontSize: fontSizes.caption,
    color: 'rgba(255,255,255,0.85)',
  },
  kipImageWrapper: {
    width: 96,
    alignItems: 'center',
    justifyContent: 'center',
  },
  kipPicksImage: {
    width: 80,
    height: 80,
  },
  planningToolsHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 14,
    marginBottom: 4,
  },
  planningToolsTitle: {
    fontSize: fontSizes.body,
    fontWeight: '700',
    color: c.textPrimary,
  },

  // Itinerary / Packing List / Budget buttons
  itineraryBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
    backgroundColor: c.card,
    borderRadius: radii.card,
    padding: 16,
    marginBottom: 20,
  },
  packingBtn: {
    marginBottom: 12,
  },
  budgetBtn: {
    marginBottom: 20,
  },
  itineraryIconBg: {
    width: 40,
    height: 40,
    borderRadius: 12,
    backgroundColor: '#FFF0EE',
    alignItems: 'center',
    justifyContent: 'center',
    flexShrink: 0,
  },
  packingIconBg: {
    width: 40,
    height: 40,
    borderRadius: 12,
    backgroundColor: '#EFF7F2',
    alignItems: 'center',
    justifyContent: 'center',
    flexShrink: 0,
  },
  budgetIconBg: {
    width: 40,
    height: 40,
    borderRadius: 12,
    backgroundColor: '#EEF3FF',
    alignItems: 'center',
    justifyContent: 'center',
    flexShrink: 0,
  },
  exploreBtn: {
    marginBottom: 20,
  },
  exploreIconBg: {
    width: 40,
    height: 40,
    borderRadius: 12,
    backgroundColor: '#E8F4F9',
    alignItems: 'center',
    justifyContent: 'center',
    flexShrink: 0,
  },
  itineraryBtnTitle: {
    fontSize: fontSizes.body,
    fontWeight: '700',
    color: c.textPrimary,
    marginBottom: 2,
  },
  itineraryBtnSub: {
    fontSize: fontSizes.caption,
    color: c.textSecondary,
  },

  stopsSection: {
    paddingHorizontal: 20,
    marginBottom: 16,
  },
  stopsLabelRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    marginBottom: 8,
  },
  stopsLabel: {
    fontSize: fontSizes.caption,
    fontWeight: '600',
    color: c.textSecondary,
    textTransform: 'uppercase',
    letterSpacing: 0.6,
  },
  stopsChipRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 0,
  },
  stopChip: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 20,
    backgroundColor: c.card,
    borderWidth: 1,
    borderColor: c.border,
  },
  stopChipText: {
    fontSize: fontSizes.caption,
    fontWeight: '600',
    color: c.textPrimary,
  },
  stopsArrow: {
    fontSize: fontSizes.caption,
    color: c.textSecondary,
    marginHorizontal: 6,
  },

  // Share button (visible on archived trips)
  shareBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    backgroundColor: c.coral,
    borderRadius: radii.button,
    paddingVertical: 14,
    marginBottom: 28,
    shadowColor: c.coral,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.35,
    shadowRadius: 8,
    elevation: 5,
  },
  shareBtnText: {
    fontSize: fontSizes.body,
    fontWeight: '700',
    color: '#fff',
    letterSpacing: 0.3,
  },

  // Share modal
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
  },
  modalTitle: {
    fontSize: fontSizes.sectionTitle,
    fontWeight: '700',
    color: c.textPrimary,
  },
  modalCardWrap: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 20,
  },
  modalFooter: {
    paddingHorizontal: 20,
    paddingBottom: 16,
    paddingTop: 12,
    backgroundColor: c.background,
  },
  shareSheetBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    backgroundColor: c.coral,
    borderRadius: radii.button,
    paddingVertical: 16,
    shadowColor: c.coral,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.35,
    shadowRadius: 8,
    elevation: 5,
  },
  shareSheetBtnText: {
    fontSize: fontSizes.body,
    fontWeight: '700',
    color: '#fff',
    letterSpacing: 0.3,
  },
});
