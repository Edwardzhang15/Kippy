import React, { forwardRef } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { useTranslation } from 'react-i18next';
import { BudgetItem } from '../db';
import { getBudgetCategoryDef } from '../data/budgetCategories';
import { colors } from '../theme';

export type BudgetShareCardProps = {
  tripName: string;
  items: BudgetItem[];
  currency: string;
};

const CARD_W  = 300;
const CARD_H  = 533;
const PHOTO_H = 190;
const OVERLAP = 20;
const MAX_ITEMS = 7;

function fmtAmount(n: number): string {
  return n.toLocaleString('en-US', { minimumFractionDigits: 0, maximumFractionDigits: 0 });
}

const BudgetShareCard = forwardRef<View, BudgetShareCardProps>(
  ({ tripName, items, currency }, ref) => {
    const { t } = useTranslation();
    const visible = items.slice(0, MAX_ITEMS);
    const overflow = items.length - visible.length;
    const total = items.reduce((sum, i) => sum + i.planned_amount, 0);

    return (
      <View ref={ref} style={styles.card}>
        {/* ── Gradient header ──────────────────────────────────── */}
        <View style={styles.photoSection}>
          <LinearGradient
            colors={[colors.coral, '#E05448', colors.sage]}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
            style={StyleSheet.absoluteFill}
          />
          <Ionicons
            name="airplane-outline"
            size={88}
            color="rgba(255,255,255,0.11)"
            style={styles.decoA}
          />
          <Ionicons
            name="compass-outline"
            size={64}
            color="rgba(255,255,255,0.09)"
            style={styles.decoB}
          />
          <Ionicons
            name="map-outline"
            size={46}
            color="rgba(255,255,255,0.09)"
            style={styles.decoC}
          />
          <LinearGradient
            colors={['transparent', 'rgba(0,0,0,0.45)']}
            style={styles.photoEdgeGradient}
          />
          <View style={styles.photoOverlay}>
            <Text style={styles.tripName} numberOfLines={2}>{tripName}</Text>
            <View style={styles.badgeRow}>
              <Ionicons name="wallet-outline" size={11} color="rgba(255,255,255,0.85)" />
              <Text style={styles.badgeText}>
                {t('shareCard.budgetPlanBadge')}
                {items.length > 0 && t('shareCard.budgetCategoryCount', { count: items.length })}
              </Text>
            </View>
          </View>
        </View>

        {/* ── White content area ───────────────────────────────── */}
        <View style={styles.body}>
          {items.length === 0 ? (
            <View style={styles.emptyState}>
              <Ionicons name="wallet-outline" size={32} color={colors.border} />
              <Text style={styles.emptyText}>{t('shareCard.noBudgetYet')}</Text>
            </View>
          ) : (
            <>
              <View style={styles.rowsSection}>
                {visible.map((item, idx) => {
                  const def = getBudgetCategoryDef(item.category);
                  const amount = item.planned_amount;
                  const pct = total > 0 ? amount / total : 0;
                  return (
                    <View key={item.id} style={[styles.catRow, idx > 0 && styles.catRowBorder]}>
                      <View style={[styles.catIconBg, { backgroundColor: def?.bg ?? '#F5F5F5' }]}>
                        <Ionicons
                          name={item.icon as any}
                          size={13}
                          color={def?.color ?? '#A0A0A0'}
                        />
                      </View>
                      <Text style={styles.catName} numberOfLines={1}>{t(`budget.names.${item.category}`, item.category)}</Text>
                      <View style={styles.catRight}>
                        <Text style={styles.catAmount}>${fmtAmount(amount)}</Text>
                        {total > 0 && (
                          <Text style={styles.catPct}>{Math.round(pct * 100)}%</Text>
                        )}
                      </View>
                    </View>
                  );
                })}

                {overflow > 0 && (
                  <Text style={styles.overflow}>
                    {t('shareCard.moreCats', { count: overflow })}
                  </Text>
                )}
              </View>

              <View style={styles.totalRow}>
                <Text style={styles.totalLabel}>{t('shareCard.totalPlanned')}</Text>
                <Text style={styles.totalAmount}>
                  ${fmtAmount(total)} <Text style={styles.totalCurrency}>{currency}</Text>
                </Text>
              </View>
            </>
          )}

          <View style={styles.footerRow}>
            <Ionicons name="navigate-circle-outline" size={11} color={colors.tabInactive} />
            <Text style={styles.footerText}>{t('shareCard.madeWithKippy')}</Text>
          </View>
        </View>
      </View>
    );
  },
);

BudgetShareCard.displayName = 'BudgetShareCard';
export default BudgetShareCard;

const styles = StyleSheet.create({
  card: {
    width: CARD_W,
    height: CARD_H,
    borderRadius: 20,
    overflow: 'hidden',
    backgroundColor: '#fff',
  },

  photoSection: {
    height: PHOTO_H,
    overflow: 'hidden',
  },
  decoA: {
    position: 'absolute',
    top: -10,
    left: -12,
    transform: [{ rotate: '-22deg' }],
  },
  decoB: {
    position: 'absolute',
    top: 14,
    right: 22,
  },
  decoC: {
    position: 'absolute',
    bottom: 30,
    right: 8,
  },
  photoEdgeGradient: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    height: 80,
  },
  photoOverlay: {
    position: 'absolute',
    bottom: OVERLAP + 8,
    left: 0,
    right: 0,
    paddingHorizontal: 16,
    gap: 5,
  },
  tripName: {
    fontSize: 21,
    fontWeight: '800',
    color: '#fff',
    lineHeight: 25,
    textShadowColor: 'rgba(0,0,0,0.25)',
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 3,
  },
  badgeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  badgeText: {
    fontSize: 12,
    color: 'rgba(255,255,255,0.85)',
    fontWeight: '500',
  },

  body: {
    height: CARD_H - PHOTO_H + OVERLAP,
    marginTop: -OVERLAP,
    borderTopLeftRadius: OVERLAP,
    borderTopRightRadius: OVERLAP,
    backgroundColor: '#fff',
    paddingHorizontal: 16,
    paddingTop: 14,
    paddingBottom: 12,
    justifyContent: 'space-between',
  },

  rowsSection: {
    flex: 1,
  },

  catRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 9,
    gap: 9,
  },
  catRowBorder: {
    borderTopWidth: 1,
    borderTopColor: colors.border,
  },
  catIconBg: {
    width: 28,
    height: 28,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
    flexShrink: 0,
  },
  catName: {
    flex: 1,
    fontSize: 12,
    fontWeight: '600',
    color: colors.textPrimary,
  },
  catRight: {
    alignItems: 'flex-end',
    gap: 1,
  },
  catAmount: {
    fontSize: 13,
    fontWeight: '700',
    color: colors.textPrimary,
  },
  catPct: {
    fontSize: 10,
    color: colors.textSecondary,
    fontWeight: '500',
  },

  overflow: {
    fontSize: 11,
    color: colors.textSecondary,
    fontWeight: '500',
    textAlign: 'center',
    paddingTop: 6,
    borderTopWidth: 1,
    borderTopColor: colors.border,
  },

  totalRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    borderTopWidth: 1.5,
    borderTopColor: colors.border,
    paddingTop: 10,
    marginTop: 4,
    marginBottom: 4,
  },
  totalLabel: {
    fontSize: 11,
    fontWeight: '700',
    color: colors.textSecondary,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  totalAmount: {
    fontSize: 18,
    fontWeight: '800',
    color: colors.coral,
  },
  totalCurrency: {
    fontSize: 12,
    fontWeight: '600',
    color: colors.textSecondary,
  },

  emptyState: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
  },
  emptyText: {
    fontSize: 13,
    color: colors.textSecondary,
    fontWeight: '500',
  },

  footerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 5,
    paddingTop: 8,
    borderTopWidth: 1,
    borderTopColor: colors.border,
  },
  footerText: {
    fontSize: 10,
    color: colors.tabInactive,
    fontWeight: '500',
  },
});
