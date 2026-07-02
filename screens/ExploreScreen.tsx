import { useEffect, useRef, useState } from 'react';
import {
  ActivityIndicator,
  Image,
  Linking,
  Pressable,
  SafeAreaView,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { useRoute } from '@react-navigation/native';
import { useTranslation } from 'react-i18next';
import { type ColorPalette, fontSizes, radii, cardShadow } from '../theme';
import { useTheme } from '../context/ThemeContext';
import { type HomeStackParamList } from '../navigation/types';
import { getPlacesCache, setPlacesCache, clearPlacesCache, getTripStops, type TripStop } from '../db';
import { fetchPlacesRaw, ALL_CATEGORIES, type PlacesCategory, type PlaceResult } from '../placesApi';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';

type RouteParams = HomeStackParamList['Explore'];
type CategoryResult = PlaceResult[] | 'error';

const CATEGORY_META: Record<PlacesCategory, { icon: string; accent: string; bg: string }> = {
  restaurants: { icon: 'restaurant-outline', accent: '#FF6B5B', bg: '#FFF0EE' },
  attractions:  { icon: 'binoculars-outline', accent: '#7FA68C', bg: '#EFF7F2' },
  cheap_eats:   { icon: 'fast-food-outline',  accent: '#F4A623', bg: '#FFF8EC' },
  photo_spots:  { icon: 'camera-outline',     accent: '#8B72BE', bg: '#F3F0FF' },
};

// ─── Price dots ───────────────────────────────────────────────────────────────

function PriceLevel({ level, colors }: { level: number | null; colors: ColorPalette }) {
  if (level === null || level === 0) return null;
  return (
    <View style={{ flexDirection: 'row', gap: 2, marginTop: 3 }}>
      {[1, 2, 3, 4].map((i) => (
        <Text key={i} style={{ fontSize: 9, color: i <= level ? colors.coral : colors.border }}>
          {'●'}
        </Text>
      ))}
    </View>
  );
}

// ─── Place card ───────────────────────────────────────────────────────────────

function PlaceCard({ place, colors }: { place: PlaceResult; colors: ColorPalette }) {
  const [imgError, setImgError] = useState(false);
  const styles = makeCardStyles(colors);
  return (
    <Pressable
      style={({ pressed }) => [styles.card, pressed && { opacity: 0.85 }]}
      onPress={() => Linking.openURL(place.mapsUrl)}
    >
      {place.photoUrl && !imgError ? (
        <Image
          source={{ uri: place.photoUrl }}
          style={styles.photo}
          onError={() => setImgError(true)}
          resizeMode="cover"
        />
      ) : (
        <View style={styles.photoPlaceholder}>
          <Ionicons name="image-outline" size={28} color={colors.border} />
        </View>
      )}
      <View style={styles.cardBody}>
        <Text style={styles.cardName} numberOfLines={2}>{place.name}</Text>
        <View style={styles.metaBlock}>
          {place.rating !== null && (
            <View style={styles.ratingRow}>
              <Ionicons name="star" size={11} color="#F4B400" />
              <Text style={styles.ratingText}>{place.rating.toFixed(1)}</Text>
            </View>
          )}
          <PriceLevel level={place.priceLevel} colors={colors} />
        </View>
      </View>
    </Pressable>
  );
}

const makeCardStyles = (c: ColorPalette) => StyleSheet.create({
  card: {
    width: 190,
    backgroundColor: c.card,
    borderRadius: radii.card,
    marginRight: 12,
    overflow: 'hidden',
    ...(cardShadow as object),
  },
  photo: {
    width: 190,
    height: 115,
    borderTopLeftRadius: radii.card,
    borderTopRightRadius: radii.card,
  },
  photoPlaceholder: {
    width: 190,
    height: 115,
    borderTopLeftRadius: radii.card,
    borderTopRightRadius: radii.card,
    backgroundColor: c.border,
    alignItems: 'center',
    justifyContent: 'center',
  },
  cardBody: { padding: 10 },
  // Fixed height (2 lines' worth) so a short name and a wrapped name still
  // produce identical card heights across a horizontally-scrolling row.
  cardName: {
    height: 32,
    fontSize: fontSizes.caption,
    fontWeight: '700',
    color: c.textPrimary,
    lineHeight: 16,
    marginBottom: 3,
  },
  // Reserves space for rating + price dots even when a place has neither,
  // for the same reason.
  metaBlock: { minHeight: 26 },
  ratingRow: { flexDirection: 'row', alignItems: 'center', gap: 3 },
  ratingText: { fontSize: fontSizes.caption, color: c.textSecondary, fontWeight: '600' },
});

// ─── Per-category empty state ─────────────────────────────────────────────────

function CategoryEmpty({ label, colors }: { label: string; colors: ColorPalette }) {
  return (
    <View style={{ height: 110, alignItems: 'center', justifyContent: 'center', gap: 8 }}>
      <Image
        source={require('../assets/Kip_think.png')}
        style={{ width: 60, height: 60 }}
        resizeMode="contain"
      />
      <Text style={{ fontSize: fontSizes.caption, color: colors.textSecondary }}>{label}</Text>
    </View>
  );
}

// ─── Category section ─────────────────────────────────────────────────────────

function CategorySection({
  category,
  result,
  loading,
  colors,
  t,
}: {
  category: PlacesCategory;
  result: CategoryResult | undefined;
  loading: boolean;
  colors: ColorPalette;
  t: (key: string) => string;
}) {
  const styles = makeSectionStyles(colors);
  const meta   = CATEGORY_META[category];

  return (
    <View style={styles.section}>
      <View style={styles.sectionHeader}>
        <View style={[styles.catIconBg, { backgroundColor: meta.bg }]}>
          <Ionicons
            name={meta.icon as React.ComponentProps<typeof Ionicons>['name']}
            size={16}
            color={meta.accent}
          />
        </View>
        <Text style={styles.sectionTitle}>{t(`explore.cat_${category}`)}</Text>
      </View>

      {loading && result === undefined ? (
        <View style={styles.loadingRow}>
          <ActivityIndicator size="small" color={colors.coral} />
        </View>
      ) : result === 'error' ? (
        <View style={[styles.loadingRow, { flexDirection: 'row', gap: 6 }]}>
          <Ionicons name="alert-circle-outline" size={16} color={colors.textSecondary} />
          <Text style={{ fontSize: fontSizes.caption, color: colors.textSecondary }}>
            {t('explore.catError')}
          </Text>
        </View>
      ) : Array.isArray(result) && result.length > 0 ? (
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.hScroll}
        >
          {result.map((p) => (
            <PlaceCard key={p.id} place={p} colors={colors} />
          ))}
        </ScrollView>
      ) : (
        <CategoryEmpty label={t('explore.emptyCategory')} colors={colors} />
      )}
    </View>
  );
}

const makeSectionStyles = (c: ColorPalette) => StyleSheet.create({
  section:     { marginBottom: 32 },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    marginBottom: 14,
  },
  catIconBg: {
    width: 34,
    height: 34,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
    flexShrink: 0,
  },
  sectionTitle: {
    fontSize: fontSizes.sectionTitle,
    fontWeight: '700',
    color: c.textPrimary,
  },
  loadingRow: {
    height: 110,
    alignItems: 'center',
    justifyContent: 'center',
  },
  hScroll: { paddingRight: 4 },
});

// ─── Main screen ──────────────────────────────────────────────────────────────

export default function ExploreScreen({ navigation }: NativeStackScreenProps<HomeStackParamList, 'Explore'>) {
  const route                     = useRoute();
  const { groupId, destination }  = route.params as RouteParams;
  const { t }                     = useTranslation();
  const { colors, isDark }        = useTheme();
  const styles                    = makeStyles(colors);

  const [results, setResults]           = useState<Partial<Record<PlacesCategory, CategoryResult>>>({});
  const [loading, setLoading]           = useState(true);
  const [error, setError]               = useState<string | null>(null);
  const [stops, setStops]               = useState<TripStop[]>([]);
  const [activeStopId, setActiveStopId] = useState<number | null>(null);
  const isMounted                       = useRef(true);

  // Derived from `stops` + the selected id every render, rather than stored as
  // its own object — so the active stop can never drift out of sync with (or
  // be left dangling by) the stops list itself.
  const activeStop     = activeStopId !== null ? stops.find((s) => s.id === activeStopId) ?? null : null;
  const activeDest     = activeStop ? activeStop.stop_name : destination;
  const gradientColors = (isDark ? ['#FF7A6A', '#FF9E90'] : [colors.coral, '#FF9488']) as [string, string];

  useEffect(() => {
    let active = true;
    getTripStops(groupId)
      .then((s) => {
        if (!active) return;
        setStops(s);
        if (s.length > 0) setActiveStopId(s[0].id);
      })
      .catch(() => { /* stop tabs simply won't show if this fails */ });
    return () => { active = false; };
  }, [groupId]);

  useEffect(() => {
    isMounted.current = true;
    setResults({});
    loadAll(false);
    return () => { isMounted.current = false; };
  }, [activeDest]);

  const loadAll = async (forceRefresh: boolean) => {
    setLoading(true);
    setError(null);
    const stopName = activeStop?.stop_name;
    try {
      // Serve cached data instantly
      const cached: Partial<Record<PlacesCategory, CategoryResult>> = {};
      if (!forceRefresh) {
        await Promise.all(
          ALL_CATEGORIES.map(async (cat) => {
            const raw = await getPlacesCache(groupId, cat, stopName);
            if (raw) {
              try { cached[cat] = JSON.parse(raw) as PlaceResult[]; } catch { /* ignore */ }
            }
          }),
        );
        if (isMounted.current && Object.keys(cached).length > 0) setResults({ ...cached });
      }

      const toFetch = forceRefresh ? ALL_CATEGORIES : ALL_CATEGORIES.filter((c) => !cached[c]);
      if (toFetch.length > 0) {
        let firstError: string | null = null;
        await Promise.all(
          toFetch.map(async (cat) => {
            const res = await fetchPlacesRaw(activeDest, cat);
            if (res.kind === 'error') {
              if (!firstError) firstError = res.message;
              if (isMounted.current) setResults((prev) => ({ ...prev, [cat]: 'error' as const }));
            } else {
              if (res.places.length > 0) await setPlacesCache(groupId, cat, JSON.stringify(res.places), stopName);
              if (isMounted.current) setResults((prev) => ({ ...prev, [cat]: res.places }));
            }
          }),
        );
        if (firstError && isMounted.current) setError(firstError);
      }
    } catch {
      if (isMounted.current) setError(t('explore.errorMsg'));
    } finally {
      if (isMounted.current) setLoading(false);
    }
  };

  const handleRefresh = async () => {
    setResults({});
    await clearPlacesCache(groupId);
    await loadAll(true);
  };

  const showSpinner   = loading && Object.keys(results).length === 0;
  const showFullError = !loading && error !== null && ALL_CATEGORIES.every((c) => !results[c] || results[c] === 'error');

  return (
    <View style={[styles.outerWrap, { backgroundColor: gradientColors[0] }]}>
      <SafeAreaView style={styles.safe}>

        {/* ── Gradient banner ── */}
        <LinearGradient
          colors={gradientColors}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={styles.banner}
        >
          <View style={styles.bannerTopRow}>
            <Pressable style={styles.bannerBtn} onPress={() => navigation.goBack()} hitSlop={8}>
              <Ionicons name="chevron-back" size={22} color="#fff" />
            </Pressable>
            <Pressable
              style={[styles.bannerBtn, loading && { opacity: 0.45 }]}
              onPress={handleRefresh}
              disabled={loading}
              hitSlop={8}
            >
              <Ionicons name="refresh-outline" size={20} color="#fff" />
            </Pressable>
          </View>

          <View style={styles.bannerTitleArea}>
            <Text style={styles.bannerTitle} numberOfLines={1}>{t('explore.title')}</Text>
            <Text style={styles.bannerSub} numberOfLines={1}>{activeDest}</Text>
          </View>

          <Image
            source={require('../assets/Kip_map.png')}
            style={styles.kipImage}
            resizeMode="contain"
          />
        </LinearGradient>

        {/* ── Stop tabs ── */}
        {stops.length > 0 && (
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            style={styles.stopTabsRow}
            contentContainerStyle={styles.stopTabsContent}
          >
            {stops.map((stop) => {
              const isActive = activeStopId === stop.id;
              return (
                <Pressable
                  key={stop.id}
                  style={[styles.stopTab, isActive && styles.stopTabActive]}
                  onPress={() => { if (!isActive) setActiveStopId(stop.id); }}
                >
                  <Text style={[styles.stopTabText, isActive && styles.stopTabTextActive]}>
                    {stop.stop_name}
                  </Text>
                </Pressable>
              );
            })}
          </ScrollView>
        )}

        {/* ── Body ── */}
        {showSpinner ? (
          <View style={styles.center}>
            <ActivityIndicator size="large" color={colors.coral} />
          </View>
        ) : showFullError ? (
          <View style={styles.center}>
            <Image source={require('../assets/Kip_think.png')} style={{ width: 70, height: 70 }} resizeMode="contain" />
            <Text style={styles.errorTitle}>{t('explore.errorTitle')}</Text>
            <Text style={styles.errorMsg}>{t('explore.errorMsg')}</Text>
            {error && <Text style={styles.errorDetail} numberOfLines={3}>{error}</Text>}
            <Pressable style={styles.retryBtn} onPress={() => loadAll(false)}>
              <Text style={styles.retryText}>{t('explore.retry')}</Text>
            </Pressable>
          </View>
        ) : (
          <ScrollView
            style={styles.resultsScroll}
            contentContainerStyle={styles.scrollContent}
            showsVerticalScrollIndicator={false}
          >
            {ALL_CATEGORIES.map((cat) => (
              <CategorySection
                key={cat}
                category={cat}
                result={results[cat]}
                loading={loading}
                colors={colors}
                t={t}
              />
            ))}
          </ScrollView>
        )}

      </SafeAreaView>
    </View>
  );
}

const makeStyles = (c: ColorPalette) => StyleSheet.create({
  outerWrap: { flex: 1 },
  safe:      { flex: 1, backgroundColor: c.background },
  banner: {
    height: 140,
    paddingHorizontal: 16,
    paddingTop: 8,
    paddingBottom: 14,
    overflow: 'visible',
  },
  bannerTopRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 10,
  },
  bannerBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: 'rgba(0,0,0,0.18)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  bannerTitleArea: {
    flex: 1,
    justifyContent: 'flex-end',
    paddingRight: 120,
  },
  bannerTitle: {
    fontSize: fontSizes.sectionTitle,
    fontWeight: '800',
    color: '#fff',
    lineHeight: 26,
  },
  bannerSub: {
    fontSize: fontSizes.caption,
    color: 'rgba(255,255,255,0.85)',
    fontWeight: '500',
    marginTop: 2,
  },
  kipImage: {
    position: 'absolute',
    bottom: -10,
    right: 10,
    width: 110,
    height: 110,
  },
  stopTabsRow: {
    flexGrow: 0,
    backgroundColor: c.card,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: c.border,
  },
  stopTabsContent: {
    paddingHorizontal: 20,
    paddingTop: 14,
    paddingBottom: 10,
    gap: 8,
    flexDirection: 'row',
    alignItems: 'center',
  },
  stopTab: {
    paddingHorizontal: 14,
    paddingVertical: 6,
    borderRadius: 16,
    backgroundColor: c.background,
    borderWidth: 1.5,
    borderColor: c.border,
  },
  stopTabActive:     { backgroundColor: '#FFF0EE', borderColor: c.coral },
  stopTabText:       { fontSize: fontSizes.caption, fontWeight: '600', color: c.textSecondary },
  stopTabTextActive: { color: c.coral },
  resultsScroll: {
    flex: 1,
  },
  scrollContent: {
    paddingHorizontal: 20,
    paddingTop: 10,
    paddingBottom: 48,
  },
  center: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 32,
    gap: 12,
  },
  errorTitle: {
    fontSize: fontSizes.sectionTitle,
    fontWeight: '700',
    color: c.textPrimary,
    textAlign: 'center',
  },
  errorMsg: {
    fontSize: fontSizes.body,
    color: c.textSecondary,
    textAlign: 'center',
    lineHeight: 22,
  },
  errorDetail: {
    fontSize: fontSizes.caption,
    color: c.textSecondary,
    textAlign: 'center',
    fontStyle: 'italic',
    lineHeight: 18,
    opacity: 0.7,
  },
  retryBtn: {
    marginTop: 8,
    backgroundColor: c.coral,
    borderRadius: radii.button,
    paddingHorizontal: 28,
    paddingVertical: 12,
  },
  retryText: {
    fontSize: fontSizes.body,
    fontWeight: '700',
    color: '#fff',
  },
});
