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

  // Inner usable diameter (inside the stroke on both sides)
  const innerDiameter = size - strokeWidth * 2;
  // Keep text clear of the stroke with a small buffer
  const innerPad      = strokeWidth + 5;

  // Percentage label (when budget set)
  const pctFontSize   = Math.max(11, Math.round(innerDiameter * 0.27));
  // Compact spent label (when no budget)
  const spentFontSize = Math.max(9,  Math.round(innerDiameter * 0.20));

  const textColor = colors.textPrimary;

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
      <View style={[StyleSheet.absoluteFill, styles.center, { paddingHorizontal: innerPad }]}>
        {hasBudget ? (
          <Text
            style={[styles.pct, { fontSize: pctFontSize, color: ringColor }]}
            numberOfLines={1}
            adjustsFontSizeToFit
          >
            {`${Math.round(pct * 100)}%`}
          </Text>
        ) : (
          <Text
            style={[styles.spent, { fontSize: spentFontSize, color: textColor }]}
            numberOfLines={1}
            adjustsFontSizeToFit
          >
            {`${sym}${formatAmount(spent, currency)}`}
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
  },
  pct: {
    fontWeight: '700',
    textAlign: 'center',
  },
  spent: {
    fontWeight: '600',
    textAlign: 'center',
  },
});
