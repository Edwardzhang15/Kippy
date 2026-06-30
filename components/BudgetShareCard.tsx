import React, { forwardRef } from 'react';
import { Image, StyleSheet, Text, View } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { useTranslation } from 'react-i18next';
import { BudgetItem } from '../db';
import { getBudgetCategoryDef } from '../data/budgetCategories';
import { SC } from './shareCardTheme';

export type BudgetShareCardProps = {
  tripName: string;
  destination?: string;
  photoUrl?: string;
  items: BudgetItem[];
  currency: string;
};

const BODY_H   = SC.CARD_H - SC.HEADER_H + SC.OVERLAP;
const MAX_ITEMS = 7;

function fmtAmount(n: number): string {
  return n.toLocaleString('en-US', { minimumFractionDigits: 0, maximumFractionDigits: 0 });
}

const BudgetShareCard = forwardRef<View, BudgetShareCardProps>(
  ({ tripName, destination, photoUrl, items, currency }, ref) => {
    const { t } = useTranslation();
    const visible  = items.slice(0, MAX_ITEMS);
    const overflow = items.length - visible.length;
    const total    = items.reduce((sum, i) => sum + i.planned_amount, 0);

    const catsPart  = items.length > 0 ? t('shareCard.budgetCategoryCount', { count: items.length }) : '';
    const labelText = `${t('shareCard.budgetPlanBadge')}${catsPart}`;

    return (
      <View ref={ref} style={styles.card}>
        {/* ── Header ──────────────────────────────────────────────── */}
        <View style={styles.header}>
          {photoUrl ? (
            <Image source={{ uri: photoUrl }} style={StyleSheet.absoluteFill} resizeMode="cover" />
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
          <Image
            source={require('../assets/Kip_budget.png')}
            style={styles.kipMascot}
            resizeMode="contain"
          />
          <View style={styles.headerText}>
            <Text style={styles.cardTitle} numberOfLines={2}>{tripName}</Text>
            {destination ? (
              <View style={styles.headerRow}>
                <Ionicons name="location-outline" size={10} color="rgba(255,255,255,0.75)" />
                <Text style={styles.headerSub}>{destination}</Text>
              </View>
            ) : null}
            <View style={styles.headerRow}>
              <Ionicons name="wallet-outline" size={10} color="rgba(255,255,255,0.65)" />
              <Text style={styles.headerLabel}>{labelText}</Text>
            </View>
          </View>
        </View>

        {/* ── Body ────────────────────────────────────────────────── */}
        <View style={styles.body}>
          <View style={styles.content}>
            {items.length === 0 ? (
              <View style={styles.empty}>
                <Ionicons name="wallet-outline" size={28} color={SC.divider} />
                <Text style={styles.emptyText}>{t('shareCard.noBudgetYet')}</Text>
              </View>
            ) : (
              <>
                <Text style={styles.sectionLabel}>{t('shareCard.budgetBreakdown')}</Text>
                {visible.map(item => {
                  const def = getBudgetCategoryDef(item.category);
                  const pct = total > 0 ? Math.round((item.planned_amount / total) * 100) : 0;
                  return (
                    <View key={item.id} style={styles.row}>
                      <View style={[styles.iconChip, { backgroundColor: def?.bg ?? '#F5F5F5' }]}>
                        <Ionicons
                          name={item.icon as any}
                          size={15}
                          color={def?.color ?? '#A0A0A0'}
                        />
                      </View>
                      <View style={styles.rowBody}>
                        <Text style={styles.rowLabel} numberOfLines={1}>
                          {t(`budget.names.${item.category}`, item.category)}
                        </Text>
                        <Text style={styles.rowSecondary}>{pct}% of total</Text>
                      </View>
                      <Text style={styles.rowValue}>${fmtAmount(item.planned_amount)}</Text>
                    </View>
                  );
                })}
                {overflow > 0 && (
                  <Text style={styles.overflow}>+{overflow} more categories</Text>
                )}

                {/* Total row — between-section divider then total */}
                <View style={styles.sectionDivider} />
                <View style={styles.row}>
                  <View style={[styles.iconChip, { backgroundColor: '#F0F0F0' }]}>
                    <Ionicons name="calculator-outline" size={15} color={SC.labelGray} />
                  </View>
                  <Text style={[styles.rowLabel, styles.totalLabelText]}>
                    {t('shareCard.totalPlanned').toUpperCase()}
                  </Text>
                  <Text style={[styles.rowValue, styles.totalValueText]}>
                    ${fmtAmount(total)}{' '}
                    <Text style={styles.currencyText}>{currency}</Text>
                  </Text>
                </View>
              </>
            )}
          </View>

          <View style={styles.footer}>
            <Ionicons name="navigate-circle-outline" size={10} color={SC.footerGray} />
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
    width: SC.CARD_W,
    height: SC.CARD_H,
    borderRadius: 20,
    overflow: 'hidden',
    backgroundColor: SC.card,
  },

  header: {
    height: SC.HEADER_H,
    overflow: 'hidden',
  },
  kipMascot: {
    position: 'absolute',
    top: 12,
    right: 12,
    width: 52,
    height: 52,
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
  headerSub: {
    fontSize: 11,
    color: 'rgba(255,255,255,0.75)',
    fontWeight: '500',
  },
  headerLabel: {
    fontSize: 11,
    color: 'rgba(255,255,255,0.65)',
    fontWeight: '500',
  },

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
  rowBody: {
    flex: 1,
    gap: 1,
  },
  rowLabel: {
    fontSize: 12,
    fontWeight: '600',
    color: SC.dark,
  },
  rowSecondary: {
    fontSize: 10,
    color: SC.rowSecondary,
    fontWeight: '400',
  },
  rowValue: {
    fontSize: 12,
    fontWeight: '700',
    color: SC.dark,
    flexShrink: 0,
  },

  totalLabelText: {
    fontSize: 10,
    fontWeight: '700',
    color: SC.labelGray,
    letterSpacing: 0.5,
  },
  totalValueText: {
    fontSize: 15,
    fontWeight: '800',
    color: SC.dark,
  },
  currencyText: {
    fontSize: 11,
    fontWeight: '600',
    color: SC.labelGray,
  },

  overflow: {
    fontSize: 10,
    color: SC.labelGray,
    fontWeight: '500',
    paddingTop: 4,
  },

  empty: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
  },
  emptyText: {
    fontSize: 12,
    color: SC.labelGray,
    fontWeight: '500',
  },

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
