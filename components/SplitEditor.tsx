import { useEffect, useRef } from 'react';
import { Animated, Pressable, StyleSheet, Text, TextInput, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTranslation } from 'react-i18next';
import { SPLIT_METHODS, type SplitMethod, type SplitResult } from '../splits';
import { type ColorPalette, fontSizes, radii, cardShadow } from '../theme';
import { useTheme } from '../context/ThemeContext';
import { getAvatarColor, getInitials, getCurrencySymbol, formatAmount } from '../utils';
import { DONE_BAR_ID } from './KeyboardDoneBar';

export type SplitMember = {
  id: number;
  name: string;
  avatarIndex: number;
};

type Props = {
  method: SplitMethod;
  onMethodChange: (method: SplitMethod) => void;
  /** Members included in the split, in display order. */
  members: SplitMember[];
  values: Record<number, string>;
  onValueChange: (memberId: number, text: string) => void;
  result: SplitResult;
  currency: string;
  onSplitEvenly: () => void;
};

function MemberSplitRow({
  member,
  value,
  onChange,
  amount,
  method,
  currency,
  isLast,
}: {
  member: SplitMember;
  value: string;
  onChange: (text: string) => void;
  amount: number | null;
  method: SplitMethod;
  currency: string;
  isLast: boolean;
}) {
  const { t }      = useTranslation();
  const { colors } = useTheme();
  const styles     = makeStyles(colors);
  // 'amount' types the figure itself, so repeating it under the name is noise.
  const showAmount = method !== 'amount' && amount !== null;

  return (
    <>
      <View style={styles.memberRow}>
        <View style={[styles.avatar, { backgroundColor: getAvatarColor(member.avatarIndex) }]}>
          <Text style={styles.avatarText}>{getInitials(member.name)}</Text>
        </View>
        <View style={styles.memberInfo}>
          <Text style={styles.memberName} numberOfLines={1}>{member.name}</Text>
          {showAmount && (
            <Text style={styles.memberAmount}>
              {getCurrencySymbol(currency)}{formatAmount(amount!, currency)}
            </Text>
          )}
        </View>
        <View style={styles.inputWrap}>
          {method === 'amount' && <Text style={styles.affix}>{getCurrencySymbol(currency)}</Text>}
          {method === 'shares' && <Text style={styles.affix}>×</Text>}
          <TextInput
            style={styles.input}
            value={value}
            onChangeText={onChange}
            keyboardType="decimal-pad"
            inputAccessoryViewID={DONE_BAR_ID}
            placeholder="0"
            placeholderTextColor={colors.tabInactive}
            selectionColor={colors.textPrimary}
            selectTextOnFocus
            accessibilityLabel={`${member.name}, ${t(`split.method.${method}`)}`}
          />
          {method === 'percent' && <Text style={styles.affix}>%</Text>}
        </View>
      </View>
      {!isLast && <View style={styles.divider} />}
    </>
  );
}

/**
 * Split method picker plus, for the uneven methods, a per-member input list with
 * a running total. The total line is what tells the user the split is short,
 * over, or ready to save.
 */
export default function SplitEditor({
  method,
  onMethodChange,
  members,
  values,
  onValueChange,
  result,
  currency,
  onSplitEvenly,
}: Props) {
  const { t }      = useTranslation();
  const { colors } = useTheme();
  const styles     = makeStyles(colors);

  const sym       = getCurrencySymbol(currency);
  const amountFor = (memberId: number) =>
    result.shares.find((s) => s.memberId === memberId)?.amount ?? null;

  const isPercent = method === 'percent';
  const fmt       = (n: number) => (isPercent ? `${Math.round(n * 100) / 100}%` : `${sym}${formatAmount(n, currency)}`);

  const shareTotal = members.reduce((sum, m) => sum + (parseFloat((values[m.id] ?? '').replace(',', '.')) || 0), 0);

  const summary = method === 'shares'
    ? t('split.sharesTotal', { count: Math.round(shareTotal * 100) / 100 })
    : t('split.allocated', { allocated: fmt(result.allocated), total: fmt(result.target) });

  const remainderText =
    method === 'shares' || result.remainder === 0 ? null :
    result.remainder > 0 ? t('split.left', { amount: fmt(result.remainder) })
                         : t('split.over',  { amount: fmt(-result.remainder) });

  // Anything that blocks saving gets a line of its own, so a disabled Save
  // button always has a visible reason next to it.
  const hintText = remainderText ?? (
    result.valid ? null :
    method === 'shares' ? t('split.needShares') : t('split.notBalanced')
  );

  return (
    <>
      <View style={styles.methodRow}>
        {SPLIT_METHODS.map((m) => {
          const active = method === m;
          return (
            <Pressable
              key={m}
              style={({ pressed }) => [
                styles.methodChip,
                active && styles.methodChipActive,
                pressed && { opacity: 0.75 },
              ]}
              onPress={() => onMethodChange(m)}
              accessibilityRole="button"
              accessibilityState={{ selected: active }}
            >
              <Text
                style={[styles.methodChipText, active && styles.methodChipTextActive]}
                numberOfLines={1}
                adjustsFontSizeToFit
                minimumFontScale={0.8}
              >
                {t(`split.method.${m}`)}
              </Text>
            </Pressable>
          );
        })}
      </View>

      {method !== 'even' && members.length > 0 && (
        <SplitPanel key={method}>
          <View style={styles.panelHeader}>
            <View style={styles.summaryGroup}>
              <Text style={styles.summaryText}>{summary}</Text>
              {hintText && (
                <View style={styles.remainderRow}>
                  <Ionicons name="alert-circle-outline" size={12} color={colors.textSecondary} />
                  <Text style={styles.remainderText}>{hintText}</Text>
                </View>
              )}
            </View>
            <Pressable onPress={onSplitEvenly} hitSlop={8}>
              <Text style={styles.evenlyLink}>{t('split.splitEvenly')}</Text>
            </Pressable>
          </View>

          <View style={styles.divider} />

          {members.map((m, i) => (
            <MemberSplitRow
              key={m.id}
              member={m}
              value={values[m.id] ?? ''}
              onChange={(text) => onValueChange(m.id, text)}
              amount={amountFor(m.id)}
              method={method}
              currency={currency}
              isLast={i === members.length - 1}
            />
          ))}
        </SplitPanel>
      )}
    </>
  );
}

// Fades the list in when a method is picked, and again on each switch (the
// parent remounts it by key), so the panel never just pops into place.
function SplitPanel({ children }: { children: React.ReactNode }) {
  const { colors } = useTheme();
  const styles     = makeStyles(colors);
  const appear     = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.timing(appear, { toValue: 1, duration: 200, useNativeDriver: true }).start();
  }, []);

  return (
    <Animated.View
      style={[
        styles.panel,
        cardShadow,
        {
          opacity: appear,
          transform: [{ translateY: appear.interpolate({ inputRange: [0, 1], outputRange: [-6, 0] }) }],
        },
      ]}
    >
      {children}
    </Animated.View>
  );
}

const makeStyles = (c: ColorPalette) => StyleSheet.create({
  methodRow: {
    flexDirection: 'row',
    gap: 6,
    marginTop: 14,
  },
  methodChip: {
    flex: 1,
    paddingVertical: 9,
    paddingHorizontal: 6,
    borderRadius: radii.button,
    backgroundColor: c.card,
    borderWidth: 1.5,
    borderColor: c.border,
    alignItems: 'center',
  },
  methodChipActive: {
    borderColor: c.coral,
  },
  methodChipText: {
    fontSize: fontSizes.caption,
    fontWeight: '600',
    color: c.textSecondary,
  },
  methodChipTextActive: {
    color: c.coral,
    fontWeight: '700',
  },

  panel: {
    marginTop: 12,
    backgroundColor: c.card,
    borderRadius: radii.card,
    paddingHorizontal: 16,
    overflow: 'hidden',
  },
  panelHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 12,
    paddingVertical: 12,
  },
  summaryGroup: {
    flexShrink: 1,
    gap: 2,
  },
  summaryText: {
    fontSize: fontSizes.body,
    fontWeight: '700',
    color: c.textPrimary,
  },
  remainderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
  },
  remainderText: {
    fontSize: fontSizes.caption,
    color: c.textSecondary,
  },
  evenlyLink: {
    fontSize: fontSizes.caption,
    fontWeight: '700',
    color: c.textPrimary,
    textDecorationLine: 'underline',
    flexShrink: 0,
  },

  memberRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    paddingVertical: 10,
  },
  avatar: {
    width: 32,
    height: 32,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
    flexShrink: 0,
  },
  avatarText: {
    fontSize: 10,
    fontWeight: '700',
    color: '#fff',
  },
  memberInfo: {
    flex: 1,
    gap: 1,
  },
  memberName: {
    fontSize: fontSizes.body,
    fontWeight: '600',
    color: c.textPrimary,
  },
  memberAmount: {
    fontSize: fontSizes.caption,
    color: c.textSecondary,
  },
  inputWrap: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: radii.button,
    borderWidth: 1.5,
    borderColor: c.border,
    minWidth: 104,
  },
  affix: {
    fontSize: fontSizes.caption,
    fontWeight: '600',
    color: c.textSecondary,
  },
  input: {
    flex: 1,
    fontSize: fontSizes.body,
    fontWeight: '700',
    color: c.textPrimary,
    textAlign: 'right',
    paddingVertical: 2,
  },
  divider: {
    height: StyleSheet.hairlineWidth,
    backgroundColor: c.border,
  },
});
