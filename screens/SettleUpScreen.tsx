import { useRef, useState } from 'react';
import {
  Animated,
  Platform,
  Pressable,
  SafeAreaView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { useTranslation } from 'react-i18next';
import { HomeStackParamList } from '../navigation/types';
import { recordSettlement } from '../db';
import { colors, fontSizes, radii } from '../theme';
import { getAvatarColor, getInitials, getCurrencySymbol, formatAmount } from '../utils';

type Props = NativeStackScreenProps<HomeStackParamList, 'SettleUp'>;

export default function SettleUpScreen({ route, navigation }: Props) {
  const { t } = useTranslation();
  const { groupId, memberId, memberName, balance, avatarIndex, currency } = route.params;

  const [settling, setSettling] = useState(false);
  const [settled,  setSettled]  = useState(false);

  const checkScale   = useRef(new Animated.Value(0)).current;
  const checkOpacity = useRef(new Animated.Value(0)).current;
  const buttonOpacity = useRef(new Animated.Value(1)).current;

  const isOwed    = balance > 0;
  const absAmount = formatAmount(Math.abs(balance), currency);
  const sym       = getCurrencySymbol(currency);
  const isZero    = balance === 0;

  const handleSettle = async () => {
    if (settling || isZero) return;
    setSettling(true);

    const today = new Date().toISOString().split('T')[0];
    await recordSettlement(groupId, memberId, balance, today);

    // Fade out button, then scale in checkmark
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
        setTimeout(() => navigation.goBack(), 650);
      });
    });
  };

  return (
    <SafeAreaView style={styles.safe}>
      {/* Header */}
      <View style={styles.header}>
        <Pressable onPress={() => navigation.goBack()} hitSlop={12}>
          <Ionicons name="close" size={24} color={colors.textPrimary} />
        </Pressable>
        <Text style={styles.headerTitle}>{t('settleUp.title')}</Text>
        <View style={{ width: 24 }} />
      </View>

      {/* Main content */}
      <View style={styles.content}>
        {/* Avatar */}
        <View style={[styles.avatar, { backgroundColor: getAvatarColor(avatarIndex) }]}>
          <Text style={styles.avatarText}>{getInitials(memberName)}</Text>
        </View>

        <Text style={styles.memberName}>{memberName}</Text>

        {isZero ? (
          <View style={styles.chip}>
            <Ionicons name="checkmark-circle" size={16} color={colors.sage} />
            <Text style={[styles.chipText, { color: colors.sage }]}>{t('settleUp.alreadySettled')}</Text>
          </View>
        ) : (
          <>
            <View style={styles.chip}>
              <Text style={styles.chipText}>
                {isOwed ? t('settleUp.getsBack') : t('settleUp.owes')}
              </Text>
            </View>

            <Text style={[styles.balanceAmount, { color: isOwed ? colors.sage : colors.coral }]}>
              {isOwed ? '+' : '-'}{sym}{absAmount}
            </Text>
          </>
        )}
      </View>

      {/* Footer action */}
      <View style={styles.footer}>
        {settled ? (
          <Animated.View
            style={[styles.checkContainer, { opacity: checkOpacity, transform: [{ scale: checkScale }] }]}
          >
            <Ionicons name="checkmark-circle" size={60} color={colors.coral} />
            <Text style={styles.settledLabel}>{t('settleUp.settled')}</Text>
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

const styles = StyleSheet.create({
  safe: {
    flex: 1,
    backgroundColor: colors.background,
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
    color: colors.textPrimary,
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
    color: colors.textPrimary,
    textAlign: 'center',
  },
  chip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: colors.card,
    borderRadius: 20,
    paddingHorizontal: 14,
    paddingVertical: 7,
  },
  chipText: {
    fontSize: fontSizes.caption,
    fontWeight: '600',
    color: colors.textSecondary,
    textTransform: 'uppercase',
    letterSpacing: 0.6,
  },
  balanceAmount: {
    fontSize: 52,
    fontWeight: '800',
    letterSpacing: -1,
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
    backgroundColor: colors.coral,
    borderRadius: radii.button,
    paddingVertical: 17,
    alignItems: 'center',
    shadowColor: colors.coral,
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
    color: colors.coral,
  },
});
