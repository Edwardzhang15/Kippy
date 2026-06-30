import React, { forwardRef } from 'react';
import { Image, StyleSheet, Text, View } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { useTranslation } from 'react-i18next';
import { ItineraryItem } from '../db';
import { SC } from './shareCardTheme';

export type ItineraryShareCardProps = {
  tripName: string;
  destination?: string;
  photoUrl?: string;
  dayNumber: number;
  items: ItineraryItem[];
};

const BODY_H   = SC.CARD_H - SC.HEADER_H + SC.OVERLAP;
const MAX_SHOW = 7;

// Soft chip tints for anchor vs regular events
const ANCHOR_CHIP = { bg: '#FFF0EE', color: '#E06050' };
const EVENT_CHIP  = { bg: '#EEF3FF', color: '#5A7EC8' };

function fmtTime(mins: number): string {
  const h      = Math.floor(mins / 60);
  const m      = mins % 60;
  const period = h < 12 ? 'AM' : 'PM';
  const disp   = h === 0 ? 12 : h > 12 ? h - 12 : h;
  return `${disp}:${String(m).padStart(2, '0')} ${period}`;
}

const ItineraryShareCard = forwardRef<View, ItineraryShareCardProps>(
  ({ tripName, destination, photoUrl, dayNumber, items }, ref) => {
    const { t } = useTranslation();
    const sorted   = [...items].sort((a, b) => a.start_time - b.start_time);
    const visible  = sorted.slice(0, MAX_SHOW);
    const overflow = sorted.length - visible.length;
    const isFirst  = dayNumber === 1;

    const eventPart = items.length > 0 ? t('shareCard.eventCount', { count: items.length }) : '';
    const labelText = `${t('shareCard.dayItinerary', { day: dayNumber })}${eventPart}`;

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
              source={require('../assets/Kip_Itinerary.png')}
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
              <Ionicons name="calendar-outline" size={10} color="rgba(255,255,255,0.65)" />
              <Text style={styles.headerLabel}>{labelText}</Text>
            </View>
          </View>
        </View>

        {/* ── Body ────────────────────────────────────────────────── */}
        <View style={styles.body}>
          <View style={styles.content}>
            <Text style={styles.sectionLabel}>{t('shareCard.schedule')}</Text>

            {visible.length === 0 ? (
              <View style={styles.empty}>
                <Ionicons name="calendar-outline" size={28} color={SC.divider} />
                <Text style={styles.emptyText}>{t('shareCard.noEventsPlanned')}</Text>
              </View>
            ) : (
              visible.map(item => {
                const isAnchor = item.is_anchor === 1;
                const chip     = isAnchor ? ANCHOR_CHIP : EVENT_CHIP;
                const chipIcon = isAnchor ? 'star-outline' : 'calendar-outline';
                return (
                  <View key={item.id} style={styles.row}>
                    <View style={[styles.iconChip, { backgroundColor: chip.bg }]}>
                      <Ionicons name={chipIcon} size={14} color={chip.color} />
                    </View>
                    <View style={styles.eventBody}>
                      <Text style={styles.rowLabel} numberOfLines={1}>{item.title}</Text>
                      {item.location_name ? (
                        <Text style={styles.rowSecondary} numberOfLines={1}>{item.location_name}</Text>
                      ) : null}
                    </View>
                    <Text style={styles.rowValue}>{fmtTime(item.start_time)}</Text>
                  </View>
                );
              })
            )}

            {overflow > 0 && (
              <Text style={styles.overflow}>+{overflow} more</Text>
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

ItineraryShareCard.displayName = 'ItineraryShareCard';
export default ItineraryShareCard;

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
  eventBody: {
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
    fontSize: 11,
    fontWeight: '600',
    color: SC.labelGray,
    flexShrink: 0,
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
