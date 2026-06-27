import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import Svg, { Circle } from 'react-native-svg';
import { getCurrencySymbol, formatAmount } from '../utils';
import { useTheme } from '../context/ThemeContext';

const SAGE  = '#7FA68C';
const CORAL = '#FF6B5B';

function lerpHex(a: string, b: string, t: number): string {
  const parse = (h: string) => ({
    r: parseInt(h.slice(1, 3), 16),
    g: parseInt(h.slice(3, 5), 16),
    b: parseInt(h.slice(5, 7), 16),
  });
  const ca = parse(a);
  const cb = parse(b);
  const r  = Math.round(ca.r + (cb.r - ca.r) * t);
  const g  = Math.round(ca.g + (cb.g - ca.g) * t);
  const bv = Math.round(ca.b + (cb.b - ca.b) * t);
  return `rgb(${r},${g},${bv})`;
}

type Props = {
  spent: number;
  budget: number | null;
  currency: string;
  size?: number;
  strokeWidth?: number;
};

export default function TripBudgetRing({
  spent,
  budget,
  currency,
  size = 84,
  strokeWidth = 7,
}: Props) {
  const { colors } = useTheme();
  const radius      = (size - strokeWidth) / 2;
  const circumference = 2 * Math.PI * radius;

  const hasBudget = budget != null && budget > 0;
  const pct       = hasBudget ? Math.min(spent / budget!, 1) : 0;
  const ringColor = pct <= 0 ? SAGE : lerpHex(SAGE, CORAL, pct);
  const offset    = circumference * (1 - pct);
  const sym       = getCurrencySymbol(currency);

  // Scale text to ring size so it always fits
  const spentFontSize  = Math.max(9,  Math.round(size * 0.14));
  const budgetFontSize = Math.max(7,  Math.round(size * 0.10));
  // For small rings (<= 80) hide the budget label to avoid overflow
  const showBudgetLabel = hasBudget && size > 80;

  const textColor = pct <= 0 || !hasBudget ? colors.textPrimary : ringColor;

  return (
    <View style={styles.container}>
      <Svg width={size} height={size}>
        <Circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          stroke={colors.border}
          strokeWidth={strokeWidth}
          fill="none"
        />
        {(hasBudget || spent > 0) && (
          <Circle
            cx={size / 2}
            cy={size / 2}
            r={radius}
            stroke={ringColor}
            strokeWidth={strokeWidth}
            fill="none"
            strokeDasharray={`${circumference} ${circumference}`}
            strokeDashoffset={hasBudget ? offset : 0}
            strokeLinecap="round"
            rotation="-90"
            origin={`${size / 2}, ${size / 2}`}
          />
        )}
      </Svg>
      <View style={[StyleSheet.absoluteFill, styles.center]}>
        <Text style={[styles.spent, { fontSize: spentFontSize, color: textColor }]} numberOfLines={1} adjustsFontSizeToFit>
          {sym}{formatAmount(spent, currency)}
        </Text>
        {showBudgetLabel && (
          <Text style={[styles.budget, { fontSize: budgetFontSize, color: colors.textSecondary }]} numberOfLines={1}>
            / {sym}{formatAmount(budget!, currency)}
          </Text>
        )}
        {hasBudget && size > 100 && (
          <Text style={[styles.pct, { fontSize: Math.round(size * 0.09), color: ringColor }]}>
            {Math.round(pct * 100)}%
          </Text>
        )}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  center: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 8,
  },
  spent: {
    fontWeight: '700',
    textAlign: 'center',
  },
  budget: {
    fontWeight: '500',
    marginTop: 1,
    textAlign: 'center',
  },
  pct: {
    fontWeight: '600',
    marginTop: 2,
    textAlign: 'center',
  },
});
