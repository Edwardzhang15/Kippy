import React, { forwardRef } from 'react';
import { Image, StyleSheet, Text, View } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { useTranslation } from 'react-i18next';
import { PackingItem } from '../db';
import { SC } from './shareCardTheme';

export type PackingListShareCardProps = {
  tripName: string;
  destination?: string;
  photoUrl?: string;
  category: string;
  categoryItems: PackingItem[];
  pageNumber: number;
  totalPages: number;
  totalChecked: number;
  totalItems: number;
};

const BODY_H = SC.CARD_H - SC.HEADER_H + SC.OVERLAP;

// Neutral chip for checked/unchecked state
const CHECK_DONE_BG    = '#E9F5EC';
const CHECK_DONE_COLOR = '#3D9A55';
const CHECK_EMPTY_BG   = '#F2F2F2';
const CHECK_EMPTY_COLOR = '#AAAAAA';

const PackingListShareCard = forwardRef<View, PackingListShareCardProps>(
  ({
    tripName, destination, photoUrl,
    category, categoryItems,
    pageNumber, totalPages,
    totalChecked, totalItems,
  }, ref) => {
    const { t } = useTranslation();
    const isFirst = pageNumber === 1;

    const paginationPart = totalPages > 1 ? ` · ${pageNumber}/${totalPages}` : '';
    const packedPart     = t('shareCard.packed', { checked: totalChecked, total: totalItems });
    const labelText      = `${t('shareCard.packingList')}${paginationPart} · ${packedPart}`;

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
          {isFirst && (
            <Image
              source={require('../assets/Kip_packing.png')}
              style={styles.kipMascot}
              resizeMode="contain"
            />
          )}
          <View style={styles.headerText}>
            <Text style={styles.cardTitle} numberOfLines={2}>{tripName}</Text>
            {destination ? (
              <View style={styles.headerRow}>
                <Ionicons name="location-outline" size={10} color="rgba(255,255,255,0.75)" />
                <Text style={styles.headerSub}>{destination}</Text>
              </View>
            ) : null}
            <View style={styles.headerRow}>
              <Ionicons name="bag-handle-outline" size={10} color="rgba(255,255,255,0.65)" />
              <Text style={styles.headerLabel}>{labelText}</Text>
            </View>
          </View>
        </View>

        {/* ── Body ────────────────────────────────────────────────── */}
        <View style={styles.body}>
          <View style={styles.content}>
            <Text style={styles.sectionLabel}>{category.toUpperCase()}</Text>

            {categoryItems.length === 0 ? (
              <View style={styles.empty}>
                <Ionicons name="bag-outline" size={28} color={SC.divider} />
                <Text style={styles.emptyText}>{t('shareCard.noItemsInCategory')}</Text>
              </View>
            ) : (
              categoryItems.map(item => {
                const done      = item.is_checked === 1;
                const chipBg    = done ? CHECK_DONE_BG    : CHECK_EMPTY_BG;
                const chipColor = done ? CHECK_DONE_COLOR : CHECK_EMPTY_COLOR;
                const chipIcon  = done ? 'checkmark'      : 'ellipse-outline';
                return (
                  <View key={item.id} style={styles.row}>
                    <View style={[styles.iconChip, { backgroundColor: chipBg }]}>
                      <Ionicons name={chipIcon} size={15} color={chipColor} />
                    </View>
                    <Text
                      style={[styles.rowLabel, done && styles.rowLabelDone]}
                      numberOfLines={1}
                    >
                      {item.label}
                    </Text>
                    {done && (
                      <Text style={[styles.rowValue, { color: CHECK_DONE_COLOR }]}>✓</Text>
                    )}
                  </View>
                );
              })
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

PackingListShareCard.displayName = 'PackingListShareCard';
export default PackingListShareCard;

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
  rowLabel: {
    flex: 1,
    fontSize: 12,
    fontWeight: '600',
    color: SC.dark,
  },
  rowLabelDone: {
    color: SC.rowSecondary,
    textDecorationLine: 'line-through',
  },
  rowValue: {
    fontSize: 12,
    fontWeight: '700',
    flexShrink: 0,
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
