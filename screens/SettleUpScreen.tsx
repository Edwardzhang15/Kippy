import { useRef, useState } from 'react';
import {
  Animated,
  Platform,
  Pressable,
  SafeAreaView,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { useTranslation } from 'react-i18next';
import { HomeStackParamList } from '../navigation/types';
import { recordSettlement } from '../db';
import { getCachedRates, convertAmount } from '../currencyRates';
import { type ColorPalette, fontSizes, radii } from '../theme';
import { getAvatarColor, getInitials, getCurrencySymbol, formatAmount } from '../utils';
import { useTheme } from '../context/ThemeContext';

type Props = NativeStackScreenProps<HomeStackParamList, 'SettleUp'>;

const SETTLE_CURRENCIES = ['CAD', 'USD', 'EUR', 'GBP', 'AUD', 'JPY'];

const makeStyles = (c: ColorPalette) => StyleSheet.create({
  safe: {
    flex: 1,
    backgroundColor: c.background,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingVertical: 16,
  },
  headerTitle: {
    fontSize: fontSizes.sectionTitle,
    fontWeight: '700',
    color: c.textPrimary,
  },
  content: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 16,
    paddingHorizontal: 32,
    paddingBottom: 60,
  },
  avatar: {
    width: 88,
    height: 88,
    borderRadius: 44,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 4,
  },
  avatarText: {
    fontSize: 28,
    fontWeight: '700',
    color: '#fff',
  },
  memberName: {
    fontSize: 28,
    fontWeight: '700',
    color: c.textPrimary,
    textAlign: 'center',
  },
  statusChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: c.card,
    borderRadius: 20,
    paddingHorizontal: 14,
    paddingVertical: 7,
  },
  chipText: {
    fontSize: fontSizes.caption,
    fontWeight: '600',
    color: c.textSecondary,
    textTransform: 'uppercase',
    letterSpacing: 0.6,
  },
  balanceAmount: {
    fontSize: 52,
    fontWeight: '800',
    letterSpacing: -1,
  },
  payingInSection: {
    alignItems: 'center',
    gap: 10,
    width: '100%',
  },
  payingInLabel: {
    fontSize: fontSizes.caption,
    fontWeight: '600',
    color: c.textSecondary,
    textTransform: 'uppercase',
    letterSpacing: 0.6,
  },
  currencyScroll: {
    flexGrow: 0,
  },
  currencyScrollContent: {
    gap: 8,
  },
  currencyChip: {
    paddingHorizontal: 18,
    paddingVertical: 10,
    borderRadius: 20,
    backgroundColor: c.card,
    borderWidth: 2,
    borderColor: 'transparent',
  },
  currencyChipSelected: {
    borderColor: c.coral,
  },
  currencyChipText: {
    fontSize: fontSizes.body,
    fontWeight: '600',
    color: c.textSecondary,
  },
  currencyChipTextSelected: {
    color: c.coral,
  },
  equivalentText: {
    fontSize: fontSizes.body,
    fontWeight: '700',
    color: c.textPrimary,
  },
  footer: {
    paddingHorizontal: 20,
    paddingBottom: Platform.OS === 'ios' ? 12 : 24,
    paddingTop: 12,
    alignItems: 'center',
    minHeight: 88,
    justifyContent: 'center',
  },
  button: {
    backgroundColor: c.coral,
    borderRadius: radii.button,
    paddingVertical: 17,
    alignItems: 'center',
    shadowColor: c.coral,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.35,
    shadowRadius: 8,
    elevation: 5,
  },
  buttonDisabled: {
    opacity: 0.4,
  },
  buttonText: {
    fontSize: fontSizes.body,
    fontWeight: '700',
    color: '#fff',
    letterSpacing: 0.3,
  },
  checkContainer: {
    alignItems: 'center',
    gap: 10,
  },
  settledLabel: {
    fontSize: fontSizes.sectionTitle,
    fontWeight: '700',
    color: c.coral,
  },
  settledDetail: {
    fontSize: fontSizes.caption,
    fontWeight: '500',
    color: c.textSecondary,
    textAlign: 'center',
  },
});

export default function SettleUpScreen({ route, navigation }: Props) {
  const { t } = useTranslation();
  const { colors } = useTheme();
  const styles = makeStyles(colors);
  const { groupId, memberId, memberName, balance, avatarIndex, currency } = route.params;

  const [payInCurrency, setPayInCurrency] = useState(currency);
  const [settling, setSettling] = useState(false);
  const [settled,  setSettled]  = useState(false);
  const [settledPayCurrency, setSettledPayCurrency] = useState('');
  const [settledPayAmount,   setSettledPayAmount]   = useState(0);

  const checkScale    = useRef(new Animated.Value(0)).current;
  const checkOpacity  = useRef(new Animated.Value(0)).current;
  const buttonOpacity = useRef(new Animated.Value(1)).current;

  const isOwed  = balance > 0;
  const isZero  = balance === 0;
  const absBase = Math.abs(balance);
  const baseSym = getCurrencySymbol(currency);
  const baseAmt = formatAmount(absBase, currency);

  const rates         = getCachedRates();
  const isCrossCur    = payInCurrency !== currency;
  const payInAbsAmt   = isCrossCur && rates
    ? convertAmount(absBase, currency, payInCurrency, rates)
    : absBase;
  const payInSym      = getCurrencySymbol(payInCurrency);
  const payInAmtStr   = formatAmount(payInAbsAmt, payInCurrency);

  const handleSettle = async () => {
    if (settling || isZero) return;
    setSettling(true);

    const finalPayCur = payInCurrency;
    const finalPayAmt = isCrossCur ? payInAbsAmt : absBase;
    setSettledPayCurrency(finalPayCur);
    setSettledPayAmount(finalPayAmt);

    const today = new Date().toISOString().split('T')[0];
    await recordSettlement(
      groupId, memberId, balance, today,
      isCrossCur ? finalPayCur : undefined,
      isCrossCur ? (balance < 0 ? -finalPayAmt : finalPayAmt) : undefined,
    );

    Animated.timing(buttonOpacity, {
      toValue: 0,
      duration: 150,
      useNativeDriver: true,
    }).start(() => {
      setSettled(true);
      Animated.parallel([
        Animated.spring(checkScale, {
          toValue: 1,
          tension: 55,
          friction: 5,
          useNativeDriver: true,
        }),
        Animated.timing(checkOpacity, {
          toValue: 1,
          duration: 200,
          useNativeDriver: true,
        }),
      ]).start(() => {
        setTimeout(() => navigation.goBack(), 1200);
      });
    });
  };

  return (
    <SafeAreaView style={styles.safe}>
      <View style={styles.header}>
        <Pressable onPress={() => navigation.goBack()} hitSlop={12}>
          <Ionicons name="close" size={24} color={colors.textPrimary} />
        </Pressable>
        <Text style={styles.headerTitle}>{t('settleUp.title')}</Text>
        <View style={{ width: 24 }} />
      </View>

      <View style={styles.content}>
        <View style={[styles.avatar, { backgroundColor: getAvatarColor(avatarIndex) }]}>
          <Text style={styles.avatarText}>{getInitials(memberName)}</Text>
        </View>

        <Text style={styles.memberName}>{memberName}</Text>

        {isZero ? (
          <View style={styles.statusChip}>
            <Ionicons name="checkmark-circle" size={16} color={colors.sage} />
            <Text style={[styles.chipText, { color: colors.sage }]}>{t('settleUp.alreadySettled')}</Text>
          </View>
        ) : (
          <>
            <View style={styles.statusChip}>
              <Text style={styles.chipText}>
                {isOwed ? t('settleUp.getsBack') : t('settleUp.owes')}
              </Text>
            </View>

            <Text style={[styles.balanceAmount, { color: isOwed ? colors.sage : colors.coral }]}>
              {isOwed ? '+' : '-'}{baseSym}{baseAmt}
            </Text>

            <View style={styles.payingInSection}>
              <Text style={styles.payingInLabel}>{t('settleUp.payingIn')}</Text>
              <ScrollView
                horizontal
                showsHorizontalScrollIndicator={false}
                style={styles.currencyScroll}
                contentContainerStyle={styles.currencyScrollContent}
              >
                {SETTLE_CURRENCIES.map((cur) => (
                  <Pressable
                    key={cur}
                    style={[styles.currencyChip, payInCurrency === cur && styles.currencyChipSelected]}
                    onPress={() => setPayInCurrency(cur)}
                  >
                    <Text style={[styles.currencyChipText, payInCurrency === cur && styles.currencyChipTextSelected]}>
                      {cur}
                    </Text>
                  </Pressable>
                ))}
              </ScrollView>

              {isCrossCur && (
                <Text style={styles.equivalentText}>
                  {rates
                    ? t('settleUp.equivalent', { sym: payInSym, amount: payInAmtStr, currency: payInCurrency })
                    : `≈ ${payInSym}— ${payInCurrency}`}
                </Text>
              )}
            </View>
          </>
        )}
      </View>

      <View style={styles.footer}>
        {settled ? (
          <Animated.View
            style={[styles.checkContainer, { opacity: checkOpacity, transform: [{ scale: checkScale }] }]}
          >
            <Ionicons name="checkmark-circle" size={60} color={colors.coral} />
            <Text style={styles.settledLabel}>{t('settleUp.settled')}</Text>
            {settledPayCurrency !== currency && (
              <Text style={styles.settledDetail}>
                {t('settleUp.settledDetail', {
                  baseSym,
                  baseAmt,
                  baseCur: currency,
                  paidSym: getCurrencySymbol(settledPayCurrency),
                  paidAmt: formatAmount(settledPayAmount, settledPayCurrency),
                  paidCur: settledPayCurrency,
                })}
              </Text>
            )}
          </Animated.View>
        ) : (
          <Animated.View style={{ opacity: buttonOpacity, width: '100%' }}>
            <Pressable
              style={[styles.button, (settling || isZero) && styles.buttonDisabled]}
              onPress={handleSettle}
              disabled={settling || isZero}
            >
              <Text style={styles.buttonText}>
                {settling ? t('settleUp.saving') : t('settleUp.markAsSettled')}
              </Text>
            </Pressable>
          </Animated.View>
        )}
      </View>
    </SafeAreaView>
  );
}
