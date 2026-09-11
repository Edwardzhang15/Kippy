import { useEffect, useRef, useState } from 'react';
import { ActivityIndicator, Animated, Pressable, StyleSheet, Text, TextInput, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTranslation } from 'react-i18next';
import { fetchExchangeRate, getCachedRate } from '../currencyRates';
import { type ColorPalette, fontSizes, radii, cardShadow } from '../theme';
import { useTheme } from '../context/ThemeContext';
import { getCurrencySymbol, formatAmount } from '../utils';
import { DONE_BAR_ID } from './KeyboardDoneBar';

// live:   fetched just now
// saved:  the rate already stored with the expense being edited (not re-fetched)
// failed: both providers failed; the field wants a manual rate (maybe prefilled
//         from the offline cache)
// custom: the user typed their own rate
export type RateStatus = 'loading' | 'live' | 'saved' | 'failed' | 'custom';

export type ExchangeRateState = {
  from: string;
  to: string;
  rateText: string;
  status: RateStatus;
  usedCache: boolean;
  /** Parsed rate, or null while loading or when the text isn't a positive number. */
  rate: number | null;
  setRateText: (text: string) => void;
  retry: () => void;
};

// Enough precision for both directions of lopsided pairs (KRW->USD 0.0007447,
// USD->KRW 1342.79) without an unreadable tail on everyday ones (1.1592).
export function formatRate(rate: number): string {
  if (rate >= 100) return rate.toFixed(2);
  if (rate >= 1) return rate.toFixed(4);
  return String(Number(rate.toPrecision(4)));
}

/**
 * Rate for converting `from` into `to`. Fetches once per currency pair; when a
 * stored rate for `from` is supplied (editing an existing expense) it is used
 * as-is instead of hitting the network.
 */
export function useExchangeRate(
  from: string,
  to: string,
  savedCurrency?: string | null,
  savedRate?: number | null,
): ExchangeRateState {
  const [rateText, setRateTextRaw] = useState('');
  // Full-precision rate behind the rounded text, so re-saving an edited expense
  // keeps its stored rate exactly. Dropped as soon as the user types.
  const [exactRate, setExactRate]  = useState<number | null>(null);
  const [status, setStatus]        = useState<RateStatus>('loading');
  const [usedCache, setUsedCache]  = useState(false);
  const [attempt, setAttempt]      = useState(0);
  // Which pair the state above belongs to. On the render right after the
  // currency changes, before the effect runs, it still holds the old pair's rate.
  const [ratePair, setRatePair]    = useState('');
  const pair = `${from}>${to}`;

  const applyRate = (rate: number | null) => {
    setExactRate(rate);
    setRateTextRaw(rate !== null ? formatRate(rate) : '');
    setRatePair(pair);
  };

  useEffect(() => {
    if (!from || !to) return;
    setUsedCache(false);
    if (from === to) {
      applyRate(1);
      setStatus('live');
      return;
    }
    if (savedRate != null && savedRate > 0 && savedCurrency === from) {
      applyRate(savedRate);
      setStatus('saved');
      return;
    }
    let active = true;
    // Clear the previous pair's rate so it can't be saved against the new pair.
    applyRate(null);
    setStatus('loading');
    fetchExchangeRate(from, to)
      .then((rate) => {
        if (!active) return;
        applyRate(rate);
        setStatus('live');
      })
      .catch(() => {
        if (!active) return;
        const cached = getCachedRate(from, to);
        applyRate(cached);
        setUsedCache(cached !== null);
        setStatus('failed');
      });
    return () => { active = false; };
  }, [from, to, savedCurrency, savedRate, attempt]);

  const current = ratePair === pair;
  const shownStatus: RateStatus = current ? status : 'loading';
  const parsed = parseFloat(rateText.replace(',', '.'));
  const rate   =
    shownStatus === 'loading' ? null :
    exactRate !== null        ? exactRate :
    isFinite(parsed) && parsed > 0 ? parsed : null;

  return {
    from,
    to,
    rateText: current ? rateText : '',
    status: shownStatus,
    usedCache,
    rate,
    setRateText: (text) => {
      setExactRate(null);
      setRateTextRaw(text);
      setStatus('custom');
    },
    retry: () => setAttempt((n) => n + 1),
  };
}

/**
 * "1 EUR = [1.1592] USD" card. The rate is always editable so a user can match
 * their card statement; when fetching fails it becomes the manual-entry path.
 * Pass `amount` to preview the converted value, or `footnote` for other context.
 */
export default function ExchangeRateField({
  fx,
  amount,
  footnote,
}: {
  fx: ExchangeRateState;
  amount?: number | null;
  footnote?: string;
}) {
  const { t }      = useTranslation();
  const { colors } = useTheme();
  const styles     = makeStyles(colors);
  const appear     = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.timing(appear, { toValue: 1, duration: 220, useNativeDriver: true }).start();
  }, []);

  const statusText =
    fx.status === 'loading' ? t('exchangeRate.fetching') :
    fx.status === 'live'    ? t('exchangeRate.live') :
    fx.status === 'saved'   ? t('exchangeRate.saved') :
    fx.status === 'custom'  ? t('exchangeRate.custom') :
    fx.usedCache            ? t('exchangeRate.failedCached') :
                              t('exchangeRate.failed');

  const showPreview = amount !== undefined;
  const converted   = amount != null && amount > 0 && fx.rate !== null ? amount * fx.rate : null;

  return (
    <Animated.View
      style={[
        styles.card,
        cardShadow,
        {
          opacity: appear,
          transform: [{ translateY: appear.interpolate({ inputRange: [0, 1], outputRange: [-6, 0] }) }],
        },
      ]}
    >
      <View style={styles.rateRow}>
        <Text style={styles.rateSide}>1 {fx.from} =</Text>
        {fx.status === 'loading' ? (
          <View style={[styles.rateInput, styles.rateLoading]}>
            <ActivityIndicator size="small" color={colors.textSecondary} />
          </View>
        ) : (
          <TextInput
            style={styles.rateInput}
            value={fx.rateText}
            onChangeText={fx.setRateText}
            keyboardType="decimal-pad"
            inputAccessoryViewID={DONE_BAR_ID}
            placeholder="0.00"
            placeholderTextColor={colors.tabInactive}
            selectionColor={colors.textPrimary}
            accessibilityLabel={t('exchangeRate.label')}
          />
        )}
        <Text style={styles.rateSide}>{fx.to}</Text>
      </View>

      {showPreview && (
        <Text style={styles.converted} numberOfLines={1}>
          {converted !== null
            ? t('exchangeRate.converted', {
                sym: getCurrencySymbol(fx.to),
                amount: formatAmount(converted, fx.to),
                currency: fx.to,
              })
            : `≈ ${getCurrencySymbol(fx.to)}- ${fx.to}`}
        </Text>
      )}

      <View style={styles.statusRow}>
        {fx.status === 'failed' && (
          <Ionicons name="cloud-offline-outline" size={13} color={colors.textSecondary} />
        )}
        <Text style={styles.statusText}>{statusText}</Text>
        {fx.status === 'failed' && (
          <Pressable onPress={fx.retry} hitSlop={8}>
            <Text style={styles.retry}>{t('exchangeRate.retry')}</Text>
          </Pressable>
        )}
      </View>

      {footnote ? <Text style={styles.footnote}>{footnote}</Text> : null}
    </Animated.View>
  );
}

const makeStyles = (c: ColorPalette) => StyleSheet.create({
  card: {
    backgroundColor: c.card,
    borderRadius: radii.card,
    paddingHorizontal: 16,
    paddingVertical: 14,
    marginTop: 12,
    gap: 8,
  },
  rateRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 10,
  },
  rateSide: {
    fontSize: fontSizes.body,
    fontWeight: '600',
    color: c.textSecondary,
  },
  rateInput: {
    minWidth: 96,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: radii.button,
    borderWidth: 1.5,
    borderColor: c.border,
    fontSize: 17,
    fontWeight: '700',
    color: c.textPrimary,
    textAlign: 'center',
  },
  rateLoading: {
    alignItems: 'center',
    justifyContent: 'center',
    height: 40,
  },
  converted: {
    fontSize: fontSizes.body,
    fontWeight: '700',
    color: c.textPrimary,
    textAlign: 'center',
  },
  statusRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    flexWrap: 'wrap',
    gap: 5,
  },
  statusText: {
    fontSize: fontSizes.caption,
    color: c.textSecondary,
    textAlign: 'center',
    flexShrink: 1,
  },
  retry: {
    fontSize: fontSizes.caption,
    fontWeight: '700',
    color: c.textPrimary,
    textDecorationLine: 'underline',
  },
  footnote: {
    fontSize: fontSizes.caption,
    color: c.textSecondary,
    textAlign: 'center',
    lineHeight: 17,
  },
});
