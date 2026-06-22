import React, { forwardRef } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { useTranslation } from 'react-i18next';
import { PackingItem } from '../db';
import { colors } from '../theme';

export type PackingListShareCardProps = {
  tripName: string;
  category: string;
  categoryItems: PackingItem[];
  pageNumber: number;
  totalPages: number;
  totalChecked: number;
  totalItems: number;
};

const CARD_W  = 300;
const CARD_H  = 533;
const PHOTO_H = 190;
const OVERLAP = 20;

const PackingListShareCard = forwardRef<View, PackingListShareCardProps>(
  ({ tripName, category, categoryItems, pageNumber, totalPages, totalChecked, totalItems }, ref) => {
    const { t } = useTranslation();
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
            colors={['transparent', 'rgba(0,0,0,0.40)']}
            style={styles.photoEdgeGradient}
          />
          <View style={styles.photoOverlay}>
            <Text style={styles.tripName} numberOfLines={2}>{tripName}</Text>
            <View style={styles.badgeRow}>
              <Ionicons name="bag-handle-outline" size={11} color="rgba(255,255,255,0.85)" />
              <Text style={styles.badgeText}>
                {t('shareCard.packingListBadge', { page: pageNumber, total: totalPages })}
              </Text>
              <Text style={styles.checkedBadge}>  {t('shareCard.packed', { checked: totalChecked, total: totalItems })}</Text>
            </View>
          </View>
        </View>

        {/* ── White content area ───────────────────────────────── */}
        <View style={styles.body}>
          <View style={styles.content}>
            <Text style={styles.categoryTitle}>{category}</Text>

            {categoryItems.length === 0 ? (
              <View style={styles.emptyState}>
                <Ionicons name="bag-outline" size={28} color={colors.border} />
                <Text style={styles.emptyText}>{t('shareCard.noItemsInCategory')}</Text>
              </View>
            ) : (
              categoryItems.map((item, idx) => (
                <View
                  key={item.id}
                  style={[styles.itemRow, idx > 0 && styles.itemRowBorder]}
                >
                  <View style={[styles.checkbox, item.is_checked ? styles.checkboxDone : null]}>
                    {item.is_checked ? (
                      <Ionicons name="checkmark" size={9} color="#fff" />
                    ) : null}
                  </View>
                  <Text
                    style={[styles.itemLabel, item.is_checked && styles.itemLabelDone]}
                    numberOfLines={1}
                  >
                    {item.label}
                  </Text>
                </View>
              ))
            )}
          </View>

          <View style={styles.footerRow}>
            <Ionicons name="navigate-circle-outline" size={11} color={colors.tabInactive} />
            <Text style={styles.footerText}>{t('shareCard.madeWithKippy')}</Text>
          </View>
        </View>
      </View>
    );
  },
);

PackingListShareCard.displayName = 'PackingListShareCard';
export default PackingListShareCard;

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
  checkedBadge: {
    fontSize: 11,
    color: 'rgba(255,255,255,0.70)',
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

  content: {
    flex: 1,
  },

  categoryTitle: {
    fontSize: 10,
    fontWeight: '800',
    color: colors.coral,
    textTransform: 'uppercase',
    letterSpacing: 0.8,
    marginBottom: 8,
  },

  itemRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingVertical: 7,
  },
  itemRowBorder: {
    borderTopWidth: 1,
    borderTopColor: colors.border,
  },
  checkbox: {
    width: 15,
    height: 15,
    borderRadius: 4,
    borderWidth: 1.5,
    borderColor: colors.border,
    alignItems: 'center',
    justifyContent: 'center',
    flexShrink: 0,
  },
  checkboxDone: {
    backgroundColor: colors.coral,
    borderColor: colors.coral,
  },
  itemLabel: {
    flex: 1,
    fontSize: 12.5,
    color: colors.textPrimary,
    fontWeight: '400',
  },
  itemLabelDone: {
    color: colors.textSecondary,
    textDecorationLine: 'line-through',
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
