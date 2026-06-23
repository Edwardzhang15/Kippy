import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  ActivityIndicator,
  Animated,
  Dimensions,
  Image,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Svg, Path, Circle } from 'react-native-svg';
import { useFocusEffect } from '@react-navigation/native';
import { useTranslation } from 'react-i18next';
import { useTheme } from '../context/ThemeContext';
import { type ColorPalette, fontSizes, radii, cardShadow } from '../theme';
import {
  getVisitedCountries,
  setVisitedCountry,
  syncAutoCountries,
  getAllTripDestinations,
} from '../db';
import {
  ALL_COUNTRIES,
  ISO_NUMERIC_MAP,
  extractCountriesFromTrip,
} from '../data/isoCountries';

// ─── World-map TopoJSON decoder ───────────────────────────────────────────────
const MAP_W = 960;
const MAP_H = 480;
const TOPO_CDN = 'https://cdn.jsdelivr.net/npm/world-atlas@2.0.2/countries-110m.json';
const CACHE_KEY = 'worldmap_paths_v1';

function decodeTopo(topo: any): Map<string, string> {
  const { scale: [sx, sy], translate: [tx, ty] } = topo.transform ?? {
    scale: [360 / 99999, 180 / 99999],
    translate: [-180, -90],
  };

  // Delta-decode arcs → [screenX, screenY] arrays
  const arcs: [number, number][][] = topo.arcs.map((arc: number[][]) => {
    let x = 0, y = 0;
    return arc.map((pt: number[]) => {
      x += pt[0]; y += pt[1];
      const lon = x * sx + tx;
      const lat = y * sy + ty;
      return [
        +((lon + 180) * MAP_W / 360).toFixed(1),
        +((90 - lat) * MAP_H / 180).toFixed(1),
      ] as [number, number];
    });
  });

  function ringPath(indices: number[]): string {
    const pts: [number, number][] = [];
    for (const idx of indices) {
      const rev = idx < 0;
      const a = arcs[rev ? ~idx : idx];
      const seg = rev ? [...a].reverse() : a;
      pts.push(...seg);
    }
    if (!pts.length) return '';
    return pts.map(([px, py], i) => `${i ? 'L' : 'M'}${px},${py}`).join('') + 'Z';
  }

  const result = new Map<string, string>();
  for (const geo of topo.objects.countries.geometries) {
    const key = String(geo.id);
    if (geo.type === 'Polygon') {
      result.set(key, geo.arcs.map(ringPath).join(''));
    } else if (geo.type === 'MultiPolygon') {
      result.set(key, (geo.arcs as number[][][]).map(poly => poly.map(ringPath).join('')).join(''));
    }
  }
  return result;
}

async function loadMapPaths(): Promise<Map<string, string> | null> {
  try {
    const cached = await AsyncStorage.getItem(CACHE_KEY);
    if (cached) {
      const obj: Record<string, string> = JSON.parse(cached);
      return new Map(Object.entries(obj));
    }
    const res = await fetch(TOPO_CDN);
    if (!res.ok) return null;
    const topo = await res.json();
    const paths = decodeTopo(topo);
    await AsyncStorage.setItem(CACHE_KEY, JSON.stringify(Object.fromEntries(paths)));
    return paths;
  } catch {
    return null;
  }
}

// ─── Circular progress ring ───────────────────────────────────────────────────
const RING_R = 46;
const RING_STROKE = 10;
const RING_CIRC = 2 * Math.PI * (RING_R - RING_STROKE / 2);

function ProgressRing({ pct, coral }: { pct: number; coral: string }) {
  const anim = useRef(new Animated.Value(0)).current;
  useEffect(() => {
    Animated.timing(anim, { toValue: pct, duration: 900, useNativeDriver: false }).start();
  }, [pct]);
  // strokeDashoffset goes from RING_CIRC (empty) to RING_CIRC*(1-pct/100) (filled)
  const strokeDashoffset = anim.interpolate({
    inputRange:  [0, 100],
    outputRange: [RING_CIRC, 0],
  });
  return (
    <Svg width={RING_R * 2} height={RING_R * 2}>
      <Circle
        cx={RING_R} cy={RING_R} r={RING_R - RING_STROKE / 2}
        stroke="rgba(0,0,0,0.08)" strokeWidth={RING_STROKE} fill="none"
      />
      <AnimatedCircle
        cx={RING_R} cy={RING_R} r={RING_R - RING_STROKE / 2}
        stroke={coral} strokeWidth={RING_STROKE} fill="none"
        strokeDasharray={RING_CIRC}
        strokeDashoffset={strokeDashoffset}
        strokeLinecap="round"
        rotation="-90" origin={`${RING_R},${RING_R}`}
      />
    </Svg>
  );
}
const AnimatedCircle = Animated.createAnimatedComponent(Circle as any);

// ─── Styles ───────────────────────────────────────────────────────────────────
const makeStyles = (c: ColorPalette) => StyleSheet.create({
  root:            { flex: 1, backgroundColor: c.background },
  scroll:          { flex: 1 },
  scrollContent:   { paddingBottom: 40 },
  header:          { paddingTop: 60, paddingHorizontal: 20, paddingBottom: 10 },
  headerTitle:     { fontSize: fontSizes.screenTitle, fontWeight: '800', color: c.textPrimary },
  headerSub:       { fontSize: fontSizes.body, color: c.textSecondary, marginTop: 4 },

  mapCard:         { ...cardShadow, backgroundColor: c.card, borderRadius: radii.card, marginHorizontal: 16, marginTop: 16, overflow: 'hidden' },
  mapLoading:      { alignItems: 'center', justifyContent: 'center', paddingVertical: 40 },
  mapUnavailable:  { alignItems: 'center', justifyContent: 'center', paddingVertical: 48, paddingHorizontal: 20 },
  mapUnavailText:  { fontSize: fontSizes.caption, color: c.textSecondary, textAlign: 'center', marginTop: 8 },

  statsCard:       { ...cardShadow, backgroundColor: c.card, borderRadius: radii.card, marginHorizontal: 16, marginTop: 12, padding: 20, flexDirection: 'row', alignItems: 'center' },
  statsRingWrap:   { alignItems: 'center', justifyContent: 'center', width: RING_R * 2, height: RING_R * 2 },
  statsPctText:    { position: 'absolute', fontSize: 13, fontWeight: '800', color: c.textPrimary },
  statsRight:      { flex: 1, paddingLeft: 20 },
  statsCountText:  { fontSize: 28, fontWeight: '800', color: c.textPrimary },
  statsLabel:      { fontSize: fontSizes.caption, color: c.textSecondary, marginTop: 2 },
  statsWorldPct:   { fontSize: fontSizes.caption, color: c.coral, fontWeight: '700', marginTop: 6 },

  kipRow:          { flexDirection: 'row', alignItems: 'flex-end', marginHorizontal: 16, marginTop: 16, gap: 0 },
  kipImg:          { width: 72, height: 72 },
  kipBubble:       { flex: 1, backgroundColor: c.card, borderRadius: 14, borderBottomLeftRadius: 4, padding: 12, marginLeft: 10, ...cardShadow },
  kipBubbleText:   { fontSize: fontSizes.caption, color: c.textSecondary, lineHeight: 18 },

  sectionCard:     { ...cardShadow, backgroundColor: c.card, borderRadius: radii.card, marginHorizontal: 16, marginTop: 12, paddingTop: 16, paddingBottom: 8 },
  sectionTitle:    { fontSize: fontSizes.sectionTitle, fontWeight: '700', color: c.textPrimary, paddingHorizontal: 16, marginBottom: 10 },
  searchWrap:      { flexDirection: 'row', alignItems: 'center', backgroundColor: c.background, borderRadius: radii.button, marginHorizontal: 16, marginBottom: 10, paddingHorizontal: 12 },
  searchInput:     { flex: 1, fontSize: fontSizes.body, color: c.textPrimary, paddingVertical: 10 },

  countryRow:      { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 16, paddingVertical: 11, borderTopWidth: 1, borderTopColor: c.border },
  countryFlag:     { fontSize: 20, marginRight: 10 },
  countryName:     { flex: 1, fontSize: fontSizes.body, color: c.textPrimary },
  checkCircle:     { width: 24, height: 24, borderRadius: 12, borderWidth: 2, alignItems: 'center', justifyContent: 'center' },
  checkDot:        { width: 10, height: 10, borderRadius: 5 },

  visitedHdr:      { paddingHorizontal: 16, paddingTop: 4, paddingBottom: 6, fontSize: fontSizes.caption, fontWeight: '700', color: c.textSecondary, letterSpacing: 0.6 },
  emptyVisited:    { paddingHorizontal: 16, paddingVertical: 20, alignItems: 'center' },
  emptyVisitedTxt: { fontSize: fontSizes.caption, color: c.textSecondary, textAlign: 'center' },

  addHdr:          { paddingHorizontal: 16, paddingTop: 14, paddingBottom: 6, fontSize: fontSizes.caption, fontWeight: '700', color: c.textSecondary, letterSpacing: 0.6 },
});

// ─── Flag emoji helper ────────────────────────────────────────────────────────
function flagEmoji(iso2: string): string {
  if (!iso2 || iso2.length !== 2) return '🌍';
  const base = 0x1F1E6;
  return String.fromCodePoint(base + iso2.charCodeAt(0) - 65) +
         String.fromCodePoint(base + iso2.charCodeAt(1) - 65);
}

// ─── Screen ───────────────────────────────────────────────────────────────────
export default function BeenScreen() {
  const { t } = useTranslation();
  const { colors, isDark } = useTheme();
  const styles = makeStyles(colors);

  const [mapPaths, setMapPaths]       = useState<Map<string, string> | null>(null);
  const [mapLoading, setMapLoading]   = useState(true);
  const [visited, setVisited]         = useState<Set<string>>(new Set());
  const [search, setSearch]           = useState('');

  const screenWidth = Dimensions.get('window').width;
  const mapCardW    = screenWidth - 32;
  const mapSvgH     = Math.round(mapCardW * MAP_H / MAP_W);

  // Build numeric-id → iso2 lookup for coloring map
  const numericToIso2 = useMemo(() => {
    const m = new Map<string, string>();
    for (const [num, { iso2 }] of Object.entries(ISO_NUMERIC_MAP)) {
      m.set(num, iso2);
    }
    return m;
  }, []);

  // Load world map paths (cached)
  useEffect(() => {
    loadMapPaths().then(paths => {
      setMapPaths(paths);
      setMapLoading(false);
    });
  }, []);

  // Refresh visited countries whenever screen is focused
  useFocusEffect(useCallback(() => {
    (async () => {
      // Auto-detect from trips
      const trips = await getAllTripDestinations();
      const auto: string[] = [];
      for (const { destination, stops } of trips) {
        auto.push(...extractCountriesFromTrip(destination, stops));
      }
      await syncAutoCountries(auto);
      const rows = await getVisitedCountries();
      setVisited(new Set(rows));
    })();
  }, []));

  const toggle = useCallback(async (iso2: string) => {
    const nowVisited = !visited.has(iso2);
    setVisited(prev => {
      const next = new Set(prev);
      nowVisited ? next.add(iso2) : next.delete(iso2);
      return next;
    });
    await setVisitedCountry(iso2, nowVisited);
  }, [visited]);

  // Stats
  const totalCountries = ALL_COUNTRIES.length;
  const visitedCount   = visited.size;
  const visitedPct     = totalCountries > 0 ? Math.round((visitedCount / totalCountries) * 100) : 0;

  // Country list: visited first, then search results
  const visitedList = useMemo(() =>
    ALL_COUNTRIES.filter(c => visited.has(c.iso2)),
    [visited],
  );

  const searchResults = useMemo(() => {
    if (!search.trim()) return [];
    const q = search.toLowerCase();
    return ALL_COUNTRIES.filter(c => !visited.has(c.iso2) && c.name.toLowerCase().includes(q)).slice(0, 20);
  }, [search, visited]);

  // Map color for a country path
  const pathFill = useCallback((numericId: string): string => {
    const iso2 = numericToIso2.get(numericId);
    if (!iso2) return isDark ? '#2a2a2a' : '#d8d8d0';
    if (visited.has(iso2)) return colors.coral;
    return isDark ? '#2a2a2a' : '#d8d8d0';
  }, [visited, colors.coral, isDark, numericToIso2]);

  const mapStroke = isDark ? '#1a1a1a' : '#f0f0ea';

  return (
    <View style={styles.root}>
      <ScrollView style={styles.scroll} contentContainerStyle={styles.scrollContent} keyboardShouldPersistTaps="handled">

        {/* Header */}
        <View style={styles.header}>
          <Text style={styles.headerTitle}>{t('been.title')}</Text>
          <Text style={styles.headerSub}>{t('been.subtitle')}</Text>
        </View>

        {/* World Map Card */}
        <View style={styles.mapCard}>
          {mapLoading ? (
            <View style={styles.mapLoading}>
              <ActivityIndicator color={colors.coral} size="small" />
            </View>
          ) : mapPaths ? (
            <Svg
              width={mapCardW}
              height={mapSvgH}
              viewBox={`0 0 ${MAP_W} ${MAP_H}`}
            >
              {Array.from(mapPaths.entries()).map(([id, d]) => (
                <Path
                  key={id}
                  d={d}
                  fill={pathFill(id)}
                  stroke={mapStroke}
                  strokeWidth={0.5}
                />
              ))}
            </Svg>
          ) : (
            <View style={styles.mapUnavailable}>
              <Text style={{ fontSize: 32 }}>🗺️</Text>
              <Text style={styles.mapUnavailText}>{t('been.mapOffline')}</Text>
            </View>
          )}
        </View>

        {/* Stats Card */}
        <View style={styles.statsCard}>
          <View style={styles.statsRingWrap}>
            <ProgressRing pct={visitedPct} coral={colors.coral} />
            <Text style={styles.statsPctText}>{visitedPct}%</Text>
          </View>
          <View style={styles.statsRight}>
            <Text style={styles.statsCountText}>{visitedCount}</Text>
            <Text style={styles.statsLabel}>
              {visitedCount === 1 ? t('been.country_one') : t('been.country_other', { count: visitedCount })}
            </Text>
            <Text style={styles.statsWorldPct}>{t('been.ofTheWorld', { pct: visitedPct })}</Text>
          </View>
        </View>

        {/* Kip illustration */}
        <View style={styles.kipRow}>
          <Image source={require('../assets/Kip_map.png')} style={styles.kipImg} resizeMode="contain" />
          <View style={styles.kipBubble}>
            <Text style={styles.kipBubbleText}>
              {visitedCount === 0
                ? t('been.kipEmpty')
                : visitedCount < 10
                ? t('been.kipFew', { count: visitedCount })
                : t('been.kipMany', { count: visitedCount })}
            </Text>
          </View>
        </View>

        {/* Countries section */}
        <View style={styles.sectionCard}>
          <Text style={styles.sectionTitle}>{t('been.countries')}</Text>

          {/* Search */}
          <View style={styles.searchWrap}>
            <Text style={{ fontSize: 16, marginRight: 6 }}>🔍</Text>
            <TextInput
              style={styles.searchInput}
              placeholder={t('been.searchPlaceholder')}
              placeholderTextColor={colors.textSecondary}
              value={search}
              onChangeText={setSearch}
              autoCorrect={false}
              autoCapitalize="words"
            />
            {search.length > 0 && (
              <TouchableOpacity onPress={() => setSearch('')} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
                <Text style={{ color: colors.textSecondary, fontSize: 18 }}>×</Text>
              </TouchableOpacity>
            )}
          </View>

          {/* Search results */}
          {searchResults.length > 0 && (
            <>
              <Text style={styles.addHdr}>{t('been.addCountry').toUpperCase()}</Text>
              {searchResults.map(c => (
                <CountryRow key={c.iso2} iso2={c.iso2} name={c.name} visited={false} onToggle={toggle} colors={colors} styles={styles} />
              ))}
            </>
          )}

          {/* Visited countries */}
          <Text style={styles.visitedHdr}>{t('been.visited').toUpperCase()}</Text>
          {visitedList.length === 0 ? (
            <View style={styles.emptyVisited}>
              <Text style={styles.emptyVisitedTxt}>{t('been.emptyHint')}</Text>
            </View>
          ) : (
            visitedList.map(c => (
              <CountryRow key={c.iso2} iso2={c.iso2} name={c.name} visited={true} onToggle={toggle} colors={colors} styles={styles} />
            ))
          )}

        </View>
      </ScrollView>
    </View>
  );
}

// ─── Country row ──────────────────────────────────────────────────────────────
function CountryRow({
  iso2, name, visited, onToggle, colors, styles,
}: {
  iso2: string; name: string; visited: boolean;
  onToggle: (iso2: string) => void;
  colors: ColorPalette;
  styles: ReturnType<typeof makeStyles>;
}) {
  return (
    <Pressable style={styles.countryRow} onPress={() => onToggle(iso2)}>
      <Text style={styles.countryFlag}>{flagEmoji(iso2)}</Text>
      <Text style={styles.countryName}>{name}</Text>
      <View style={[styles.checkCircle, { borderColor: visited ? colors.coral : colors.border }]}>
        {visited && <View style={[styles.checkDot, { backgroundColor: colors.coral }]} />}
      </View>
    </Pressable>
  );
}
