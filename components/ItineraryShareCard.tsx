import React, { forwardRef } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { useTranslation } from 'react-i18next';
import { ItineraryItem } from '../db';
import { colors } from '../theme';

export type ItineraryShareCardProps = {
  tripName: string;
  dayNumber: number;
  items: ItineraryItem[];
};

const CARD_W  = 300;
const CARD_H  = 533;
const PHOTO_H = 190;
const OVERLAP = 20;
const MAX_SHOW = 9;

function fmtTime(mins: number): string {
  const h = Math.floor(mins / 60);
  const m = mins % 60;
  const period = h < 12 ? 'AM' : 'PM';
  const display = h === 0 ? 12 : h > 12 ? h - 12 : h;
  return `${display}:${String(m).padStart(2, '0')} ${period}`;
}

const ItineraryShareCard = forwardRef<View, ItineraryShareCardProps>(
  ({ tripName, dayNumber, items }, ref) => {
    const { t } = useTranslation();
    const sorted = [...items].sort((a, b) => a.start_time - b.start_time);
    const visible = sorted.slice(0, MAX_SHOW);
    const overflow = sorted.length - visible.length;

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
            <View style={styles.dayBadge}>
              <Ionicons name="calendar-outline" size={11} color="rgba(255,255,255,0.85)" />
              <Text style={styles.dayBadgeText}>
                {t('shareCard.dayItinerary', { day: dayNumber })}
                {items.length > 0 && t('shareCard.eventCount', { count: items.length })}
              </Text>
            </View>
          </View>
        </View>

        {/* ── White content area ───────────────────────────────── */}
        <View style={styles.body}>
          {visible.length === 0 ? (
            <View style={styles.emptyState}>
              <Ionicons name="calendar-outline" size={32} color={colors.border} />
              <Text style={styles.emptyText}>{t('shareCard.noEventsPlanned')}</Text>
            </View>
          ) : (
            <>
              {visible.map((item, idx) => {
                const isAnchor = item.is_anchor === 1;
                return (
                  <View key={item.id} style={[styles.eventRow, idx > 0 && styles.eventRowBorder]}>
                    <Text style={styles.eventTime}>{fmtTime(item.start_time)}</Text>
                    <View style={[styles.eventDot, { backgroundColor: isAnchor ? colors.coral : colors.sage }]} />
                    <View style={styles.eventTextCol}>
                      <Text style={styles.eventTitle} numberOfLines={1}>{item.title}</Text>
                      {item.location_name ? (
                        <Text style={styles.eventLocation} numberOfLines={1}>{item.location_name}</Text>
                      ) : null}
                    </View>
                  </View>
                );
              })}

              {overflow > 0 && (
                <Text style={styles.overflow}>{t('shareCard.moreEvents', { count: overflow })}</Text>
              )}
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

ItineraryShareCard.displayName = 'ItineraryShareCard';
export default ItineraryShareCard;

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
  dayBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  dayBadgeText: {
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

  eventRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    paddingVertical: 7,
    gap: 8,
  },
  eventRowBorder: {
    borderTopWidth: 1,
    borderTopColor: colors.border,
  },
  eventTime: {
    fontSize: 10,
    fontWeight: '600',
    color: colors.textSecondary,
    width: 58,
    paddingTop: 2,
    letterSpacing: -0.2,
  },
  eventDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    marginTop: 4,
    flexShrink: 0,
  },
  eventTextCol: {
    flex: 1,
    gap: 1,
  },
  eventTitle: {
    fontSize: 13,
    fontWeight: '600',
    color: colors.textPrimary,
    lineHeight: 17,
  },
  eventLocation: {
    fontSize: 10,
    color: colors.textSecondary,
    fontWeight: '400',
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
