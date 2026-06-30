import { useCallback, useEffect, useRef, useState } from 'react';
import {
  ActionSheetIOS,
  Alert,
  Image,
  Platform,
  Pressable,
  SafeAreaView,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { type NativeStackScreenProps } from '@react-navigation/native-stack';
import { useFocusEffect } from '@react-navigation/native';
import { useTranslation } from 'react-i18next';
import { type PersonalStackParamList } from '../navigation/types';
import {
  getPersonalTrips,
  getArchivedPersonalTrips,
  getPersonalTripExpenses,
  setCurrentPersonalTrip,
  getPersonalTripCategoryBudgetsWithSpent,
  deletePersonalTrip,
  archivePersonalTrip,
  type PersonalTrip,
  type CategoryBudgetWithSpent,
} from '../db';
import TripBudgetRing from '../components/TripBudgetRing';
import ActionSheet, { type SheetOption } from '../components/ActionSheet';
import { CATEGORY_MAP, FALLBACK_CATEGORY } from '../categories';
import { type ColorPalette, fontSizes, radii, cardShadow } from '../theme';
import { useTheme } from '../context/ThemeContext';
import { getCurrencySymbol, formatAmount } from '../utils';

type Props = NativeStackScreenProps<PersonalStackParamList, 'PersonalMain'>;
type TripWithSpent = PersonalTrip & { spent: number };

const SAGE  = '#7FA68C';
const CORAL = '#FF6B5B';
const FALLBACK_PHOTO = require('../assets/Kip_map.png');
const UNSPLASH_KEY   = '_dJ9KWj8_6gx-it3O-USLvSCHVRLH39n2okh6S3Onlo';
const STRIP_WORDS    = new Set(['trip', 'vacation', 'holiday', 'tour', 'my', 'the', 'a', 'an', 'visit', 'travel', 'journey', 'to', 'in', 'for', 'our', 'grand']);

function lerpHex(a: string, b: string, t: number): string {
  const parse = (h: string) => ({ r: parseInt(h.slice(1,3),16), g: parseInt(h.slice(3,5),16), b: parseInt(h.slice(5,7),16) });
  const ca = parse(a), cb = parse(b);
  return `rgb(${Math.round(ca.r+(cb.r-ca.r)*t)},${Math.round(ca.g+(cb.g-ca.g)*t)},${Math.round(ca.b+(cb.b-ca.b)*t)})`;
}

function barColor(pct: number): string {
  return pct <= 0 ? SAGE : lerpHex(SAGE, CORAL, Math.min(pct, 1));
}

async function fetchTripPhoto(name: string): Promise<string | null> {
  try {
    const query = name.split(/\s+/).filter(w => !STRIP_WORDS.has(w.toLowerCase())).join(' ').trim() || name;
    const res = await fetch(
      `https://api.unsplash.com/search/photos?query=${encodeURIComponent(query)}&orientation=landscape&per_page=1&client_id=${UNSPLASH_KEY}`,
      { headers: { 'Accept-Version': 'v1' } },
    );
    if (!res.ok) return null;
    const data = await res.json();
    return (data.results?.[0]?.urls?.regular as string) ?? null;
  } catch {
    return null;
  }
}

const makeStyles = (c: ColorPalette) => StyleSheet.create({
  safe:           { flex: 1, backgroundColor: c.background },
  header:         { paddingHorizontal: 20, paddingTop: 16, paddingBottom: 12 },
  screenTitle:    { fontSize: fontSizes.screenTitle, fontWeight: '800', color: c.textPrimary },
  screenSub:      { fontSize: fontSizes.body, color: c.textSecondary, marginTop: 3 },
  sectionLabel:   { fontSize: fontSizes.caption, fontWeight: '700', color: c.textSecondary, textTransform: 'uppercase', letterSpacing: 0.7 },

  // ── Current Trip Focus Card ─────────────────────────────────────────────
  focusCard:           { marginHorizontal: 16, borderRadius: radii.card, backgroundColor: c.card, overflow: 'hidden' },
  focusPhotoSection:   { height: 140, overflow: 'hidden' },
  focusPhotoName:      { position: 'absolute', bottom: 14, left: 20, right: 20, fontSize: 18, fontWeight: '800', color: '#fff' },
  focusInner:          { alignItems: 'center', paddingTop: 28, paddingHorizontal: 20, paddingBottom: 20 },
  focusInnerWithPhoto: { paddingTop: 18 },
  focusTripName:       { fontSize: 20, fontWeight: '800', color: c.textPrimary, marginTop: 14, textAlign: 'center' },
  focusTripSub:        { fontSize: fontSizes.body, color: c.textSecondary, marginTop: 5, textAlign: 'center' },
  focusDivider:        { width: '100%', height: StyleSheet.hairlineWidth, backgroundColor: c.border, marginTop: 18 },

  catSection:    { width: '100%', paddingTop: 14 },
  catSectionHdr: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12 },
  catManageBtn:  { flexDirection: 'row', alignItems: 'center', gap: 4 },
  catManageTxt:  { fontSize: fontSizes.caption, fontWeight: '600', color: c.coral },
  catRow:        { flexDirection: 'row', alignItems: 'center', gap: 9, marginBottom: 11 },
  catIconBg:     { width: 30, height: 30, borderRadius: 9, alignItems: 'center', justifyContent: 'center', flexShrink: 0 },
  catBody:       { flex: 1, gap: 4 },
  catLabelRow:   { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  catName:       { fontSize: 12, fontWeight: '600', color: c.textPrimary },
  catAmt:        { fontSize: 11, color: c.textSecondary, fontWeight: '500' },
  catBarBg:      { height: 6, borderRadius: 3, backgroundColor: c.border, overflow: 'hidden' },
  catBarFill:    { height: 6 },
  // Tappable "add budgets" button shown when no category budgets are set
  catAddBtn:     { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6, paddingVertical: 10, borderRadius: radii.button, borderWidth: 1.5, borderColor: c.coral, borderStyle: 'dashed' },
  catAddBtnTxt:  { fontSize: fontSizes.body, fontWeight: '600', color: c.coral },

  viewDetailsBtn: { marginTop: 14, width: '100%', flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6, backgroundColor: c.coral, borderRadius: radii.button, paddingVertical: 12 },
  viewDetailsTxt: { fontSize: fontSizes.body, fontWeight: '700', color: '#fff' },

  // ── Your Trips section ──────────────────────────────────────────────────
  tripsSectionHdr:  { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginHorizontal: 20, marginTop: 28, marginBottom: 10 },
  selectToggleTxt:  { fontSize: fontSizes.caption, fontWeight: '600', color: c.coral },
  selectAllTxt:     { fontSize: fontSizes.caption, fontWeight: '600', color: c.textSecondary },

  // Segmented control (Active / Past)
  segmentRow:          { flexDirection: 'row', backgroundColor: c.card, borderRadius: radii.button, padding: 3, marginHorizontal: 16, marginBottom: 12 },
  segment:             { flex: 1, paddingVertical: 8, borderRadius: radii.button - 2, alignItems: 'center' },
  segmentSelected:     { backgroundColor: c.coral },
  segmentText:         { fontSize: fontSizes.body, fontWeight: '600', color: c.textSecondary },
  segmentTextSelected: { color: '#fff' },

  tripsList: { paddingHorizontal: 16, gap: 10 },

  // All cards: fixed-height photo layout
  tripCard:         { borderRadius: radii.card, height: 130, overflow: 'hidden', flexDirection: 'column', alignItems: 'flex-start', justifyContent: 'flex-end' },
  tripCardCurrent:  { borderWidth: 1.5, borderColor: c.coral },
  tripCardSelected: { borderWidth: 1.5, borderColor: c.coral, opacity: 0.92 },
  archivedWrap:     { opacity: 0.65 },

  // Trip name + spent/budget text, positioned above the budget strip when it exists
  tripInfoOverlay:  { position: 'absolute', left: 16, right: 54, gap: 2 },
  tripNamePhoto:    { fontSize: fontSizes.body, fontWeight: '800', color: '#fff' },
  tripSubPhoto:     { fontSize: fontSizes.caption, color: 'rgba(255,255,255,0.85)' },

  // Budget strip — visible dark band at card bottom with bar + percentage label
  budgetStrip:      { position: 'absolute', bottom: 0, left: 0, right: 0, height: 22, backgroundColor: 'rgba(0,0,0,0.50)', flexDirection: 'row', alignItems: 'center', paddingHorizontal: 10, gap: 7 },
  budgetBarTrack:   { flex: 1, height: 5, borderRadius: 2.5, backgroundColor: 'rgba(255,255,255,0.22)', overflow: 'hidden' },
  budgetBarFill:    { height: 5, borderRadius: 2.5 },
  budgetBarLabel:   { fontSize: 10, fontWeight: '800', color: 'rgba(255,255,255,0.92)', minWidth: 28, textAlign: 'right' },

  menuBtnPhoto:         { position: 'absolute', top: 10, right: 10, width: 32, height: 32, borderRadius: 16, backgroundColor: 'rgba(0,0,0,0.32)', alignItems: 'center', justifyContent: 'center' },
  selectCircle:         { width: 26, height: 26, borderRadius: 13, borderWidth: 2, borderColor: 'rgba(255,255,255,0.8)', alignItems: 'center', justifyContent: 'center' },
  selectCircleActive:   { borderColor: c.coral, backgroundColor: c.coral },
  selectCircleAbsolute: { position: 'absolute', top: 10, right: 10 },

  emptyTabMsg: { fontSize: fontSizes.body, color: c.textSecondary, textAlign: 'center', paddingVertical: 36, paddingHorizontal: 20 },

  // ── Empty state (no trips at all) ───────────────────────────────────────
  emptyContainer: { flex: 1, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 36, paddingVertical: 80 },
  emptyKip:       { width: 96, height: 96, marginBottom: 20 },
  emptyTitle:     { fontSize: fontSizes.sectionTitle, fontWeight: '800', color: c.textPrimary, textAlign: 'center', marginBottom: 10 },
  emptyBody:      { fontSize: fontSizes.body, color: c.textSecondary, textAlign: 'center', lineHeight: 22, marginBottom: 28 },
  createBtn:      { backgroundColor: c.coral, borderRadius: radii.button, paddingHorizontal: 28, paddingVertical: 14 },
  createBtnText:  { fontSize: fontSizes.body, fontWeight: '700', color: '#fff' },

  fab:     { position: 'absolute', bottom: 28, right: 20, width: 56, height: 56, borderRadius: 28, backgroundColor: c.coral, alignItems: 'center', justifyContent: 'center' },

  // ── Bulk action bar ─────────────────────────────────────────────────────
  bulkBar:         { position: 'absolute', bottom: 0, left: 0, right: 0, backgroundColor: c.card, borderTopWidth: StyleSheet.hairlineWidth, borderTopColor: c.border, paddingHorizontal: 20, paddingVertical: 14, paddingBottom: Platform.OS === 'ios' ? 28 : 14, flexDirection: 'row', alignItems: 'center', gap: 10 },
  bulkCount:       { flex: 1, fontSize: fontSizes.body, fontWeight: '600', color: c.textPrimary },
  bulkConcludeBtn: { flexDirection: 'row', alignItems: 'center', gap: 6, backgroundColor: c.sage, paddingHorizontal: 16, paddingVertical: 10, borderRadius: radii.button },
  bulkDeleteBtn:   { flexDirection: 'row', alignItems: 'center', gap: 6, backgroundColor: c.coral, paddingHorizontal: 16, paddingVertical: 10, borderRadius: radii.button },
  bulkBtnTxt:      { fontSize: fontSizes.caption, fontWeight: '700', color: '#fff' },
});

export default function PersonalScreen({ navigation }: Props) {
  const { t } = useTranslation();
  const { colors } = useTheme();
  const styles = makeStyles(colors);

  const [trips, setTrips]                 = useState<TripWithSpent[]>([]);
  const [archivedTrips, setArchivedTrips] = useState<TripWithSpent[]>([]);
  const [categoryBudgets, setCategoryBudgets] = useState<CategoryBudgetWithSpent[]>([]);
  const [loading, setLoading]             = useState(true);
  const [tripTab, setTripTab]             = useState<'active' | 'past'>('active');

  // Inferred photo cache (trip name → Unsplash URL or null = use fallback)
  const photoCacheRef = useRef<Map<number, string | null>>(new Map());
  const [photoCache, setPhotoCache] = useState<Map<number, string | null>>(new Map());

  // Scroll ref for position preservation
  const scrollRef = useRef<ScrollView>(null);

  // Three-dot menu
  const [menuTrip, setMenuTrip]           = useState<TripWithSpent | null>(null);
  const [showMenuSheet, setShowMenuSheet] = useState(false);

  // Multi-select
  const [selectMode, setSelectMode]   = useState(false);
  const [selectedIds, setSelectedIds] = useState<Set<number>>(new Set());

  // Scroll to top when switching tabs (new tab always starts from top)
  useEffect(() => {
    setSelectMode(false);
    setSelectedIds(new Set());
    requestAnimationFrame(() => {
      scrollRef.current?.scrollTo({ y: 0, animated: false });
    });
  }, [tripTab]);

  useFocusEffect(useCallback(() => {
    async function load() {
      const [raw, rawArchived] = await Promise.all([
        getPersonalTrips(),
        getArchivedPersonalTrips(),
      ]);

      const toWithSpent = async (list: PersonalTrip[]) =>
        Promise.all(list.map(async trip => {
          const exps = await getPersonalTripExpenses(trip.id);
          return { ...trip, spent: exps.reduce((s, e) => s + e.amount, 0) };
        }));

      const [withSpent, withSpentArchived] = await Promise.all([
        toWithSpent(raw),
        toWithSpent(rawArchived),
      ]);

      // Fetch category budgets before any setState so all updates batch together
      const ct = withSpent.find(t => t.is_current === 1) ?? withSpent[0] ?? null;
      const catBudgets = ct ? await getPersonalTripCategoryBudgetsWithSpent(ct.id) : [];

      // Batch all state updates in one synchronous block (React 18 auto-batches)
      setTrips(withSpent);
      setArchivedTrips(withSpentArchived);
      setCategoryBudgets(catBudgets);
      setLoading(false);

      // Photo fetching is non-blocking — runs after main render
      const allTrips = [...withSpent, ...withSpentArchived];
      const needsFetch = allTrips.filter(t => !t.destination_photo_url && !photoCacheRef.current.has(t.id));
      if (needsFetch.length > 0) {
        await Promise.all(
          needsFetch.map(async t => {
            const url = await fetchTripPhoto(t.name);
            photoCacheRef.current.set(t.id, url);
          }),
        );
        setPhotoCache(new Map(photoCacheRef.current));
      }
    }
    load();
    setSelectMode(false);
    setSelectedIds(new Set());
  }, []));

  async function reloadTrips() {
    const [raw, rawArchived] = await Promise.all([
      getPersonalTrips(),
      getArchivedPersonalTrips(),
    ]);
    const toWithSpent = async (list: PersonalTrip[]) =>
      Promise.all(list.map(async trip => {
        const exps = await getPersonalTripExpenses(trip.id);
        return { ...trip, spent: exps.reduce((s, e) => s + e.amount, 0) };
      }));
    const [withSpent, withSpentArchived] = await Promise.all([
      toWithSpent(raw),
      toWithSpent(rawArchived),
    ]);
    const ct = withSpent.find(t => t.is_current === 1) ?? withSpent[0] ?? null;
    const catBudgets = ct ? await getPersonalTripCategoryBudgetsWithSpent(ct.id) : [];
    setTrips(withSpent);
    setArchivedTrips(withSpentArchived);
    setCategoryBudgets(catBudgets);
  }

  async function handleSetCurrent(tripId: number) {
    await setCurrentPersonalTrip(tripId);
    await reloadTrips();
  }

  function handleDeleteTrip(trip: TripWithSpent) {
    const isArchived = trip.is_archived === 1;
    Alert.alert(
      t('personalTrip.deleteTitle', { name: trip.name }),
      t('personalTrip.deleteMsg'),
      [
        { text: t('common.cancel'), style: 'cancel' },
        {
          text: t('common.delete'), style: 'destructive',
          onPress: async () => {
            await deletePersonalTrip(trip.id);
            if (isArchived) setArchivedTrips(prev => prev.filter(t => t.id !== trip.id));
            else setTrips(prev => prev.filter(t => t.id !== trip.id));
          },
        },
      ],
    );
  }

  function handleConcludeTrip(trip: TripWithSpent) {
    Alert.alert(
      t('personalTrip.concludeTitle'),
      t('personalTrip.concludeMsg'),
      [
        { text: t('common.cancel'), style: 'cancel' },
        {
          text: t('personalTrip.menuConclude'),
          onPress: async () => {
            await archivePersonalTrip(trip.id);
            const concluded = { ...trip, is_archived: 1, is_current: 0 };
            setTrips(prev => prev.filter(t => t.id !== trip.id));
            setArchivedTrips(prev => [concluded, ...prev]);
          },
        },
      ],
    );
  }

  function openTripMenu(trip: TripWithSpent) {
    const isArchived = trip.is_archived === 1;
    if (Platform.OS === 'ios') {
      const options = isArchived
        ? [t('personalTrip.menuEdit'), t('personalTrip.menuDelete'), t('common.cancel')]
        : [t('personalTrip.menuEdit'), t('personalTrip.menuConclude'), t('personalTrip.menuDelete'), t('common.cancel')];
      ActionSheetIOS.showActionSheetWithOptions(
        { options, cancelButtonIndex: isArchived ? 2 : 3, destructiveButtonIndex: isArchived ? 1 : 2 },
        idx => {
          if (idx === 0) navigation.navigate('CreatePersonalTrip', { tripId: trip.id });
          else if (!isArchived && idx === 1) handleConcludeTrip(trip);
          else if (isArchived && idx === 1) handleDeleteTrip(trip);
          else if (!isArchived && idx === 2) handleDeleteTrip(trip);
        },
      );
    } else {
      setMenuTrip(trip);
      setShowMenuSheet(true);
    }
  }

  function toggleSelectTrip(id: number) {
    setSelectedIds(prev => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id); else next.add(id);
      return next;
    });
  }

  const displayedTrips = tripTab === 'active' ? trips : archivedTrips;
  const allSelected = displayedTrips.length > 0 && displayedTrips.every(t => selectedIds.has(t.id));

  function handleSelectAll() {
    if (allSelected) setSelectedIds(new Set());
    else setSelectedIds(new Set(displayedTrips.map(t => t.id)));
  }

  function handleBulkDelete() {
    Alert.alert(
      t('personalTrip.bulkDeleteTitle', { count: selectedIds.size }),
      t('personalTrip.bulkDeleteMsg'),
      [
        { text: t('common.cancel'), style: 'cancel' },
        {
          text: t('common.delete'), style: 'destructive',
          onPress: async () => {
            await Promise.all([...selectedIds].map(id => deletePersonalTrip(id)));
            if (tripTab === 'active') setTrips(prev => prev.filter(t => !selectedIds.has(t.id)));
            else setArchivedTrips(prev => prev.filter(t => !selectedIds.has(t.id)));
            setSelectMode(false);
            setSelectedIds(new Set());
          },
        },
      ],
    );
  }

  function handleBulkConclude() {
    Alert.alert(
      t('personalTrip.bulkConcludeTitle', { count: selectedIds.size }),
      t('personalTrip.bulkConcludeMsg'),
      [
        { text: t('common.cancel'), style: 'cancel' },
        {
          text: t('personalTrip.menuConclude'),
          onPress: async () => {
            await Promise.all([...selectedIds].map(id => archivePersonalTrip(id)));
            const concluded = trips.filter(t => selectedIds.has(t.id)).map(t => ({ ...t, is_archived: 1, is_current: 0 }));
            setTrips(prev => prev.filter(t => !selectedIds.has(t.id)));
            setArchivedTrips(prev => [...concluded, ...prev]);
            setSelectMode(false);
            setSelectedIds(new Set());
          },
        },
      ],
    );
  }

  const menuSheetOptions: SheetOption[] = menuTrip
    ? menuTrip.is_archived === 1
      ? [
          { label: t('personalTrip.menuEdit'), onPress: () => navigation.navigate('CreatePersonalTrip', { tripId: menuTrip.id }) },
          { label: t('personalTrip.menuDelete'), destructive: true, onPress: () => handleDeleteTrip(menuTrip) },
        ]
      : [
          { label: t('personalTrip.menuEdit'), onPress: () => navigation.navigate('CreatePersonalTrip', { tripId: menuTrip.id }) },
          { label: t('personalTrip.menuConclude'), onPress: () => handleConcludeTrip(menuTrip) },
          { label: t('personalTrip.menuDelete'), destructive: true, onPress: () => handleDeleteTrip(menuTrip) },
        ]
    : [];

  if (loading) return <SafeAreaView style={styles.safe} />;

  const noAnyTrips      = trips.length === 0 && archivedTrips.length === 0;
  const currentTrip     = trips.find(t => t.is_current === 1) ?? trips[0] ?? null;
  const currentHasPhoto = Boolean(currentTrip?.destination_photo_url);

  return (
    <SafeAreaView style={styles.safe}>
      <View style={styles.header}>
        <Text style={styles.screenTitle}>{t('personalTrip.tabTitle')}</Text>
        <Text style={styles.screenSub}>{t('personalTrip.tabSub')}</Text>
      </View>

      {noAnyTrips ? (
        <View style={styles.emptyContainer}>
          <Image source={require('../assets/Kip_jog.png')} style={styles.emptyKip} resizeMode="contain" />
          <Text style={styles.emptyTitle}>{t('personalTrip.emptyTitle')}</Text>
          <Text style={styles.emptyBody}>{t('personalTrip.emptyBody')}</Text>
          <Pressable style={[styles.createBtn, cardShadow]} onPress={() => navigation.navigate('CreatePersonalTrip', {})}>
            <Text style={styles.createBtnText}>{t('personalTrip.createFirst')}</Text>
          </Pressable>
        </View>
      ) : (
        <ScrollView
          ref={scrollRef}
          showsVerticalScrollIndicator={false}
          contentContainerStyle={{ paddingBottom: selectMode ? 140 : 100 }}
          scrollEventThrottle={100}
        >

          {/* ── Current Trip focus card — only shown on Active tab ────── */}
          {currentTrip && tripTab === 'active' && (
            <>
              <Text style={[styles.sectionLabel, { marginHorizontal: 20, marginTop: 4, marginBottom: 10 }]}>
                {t('personalTrip.currentTrip')}
              </Text>
              <View style={[styles.focusCard, cardShadow]}>
                {currentHasPhoto && (
                  <View style={styles.focusPhotoSection}>
                    <Image source={{ uri: currentTrip.destination_photo_url! }} style={StyleSheet.absoluteFill} resizeMode="cover" />
                    <LinearGradient colors={['transparent', 'rgba(0,0,0,0.42)', 'rgba(0,0,0,0.72)']} locations={[0.3, 0.7, 1]} style={StyleSheet.absoluteFill} />
                    <Text style={styles.focusPhotoName} numberOfLines={2}>{currentTrip.name}</Text>
                  </View>
                )}
                <View style={[styles.focusInner, currentHasPhoto && styles.focusInnerWithPhoto]}>
                  <TripBudgetRing spent={currentTrip.spent} budget={currentTrip.budget_amount} currency={currentTrip.currency} size={120} strokeWidth={9} />
                  {!currentHasPhoto && <Text style={styles.focusTripName} numberOfLines={2}>{currentTrip.name}</Text>}
                  <Text style={styles.focusTripSub}>
                    {`${getCurrencySymbol(currentTrip.currency)}${formatAmount(currentTrip.spent, currentTrip.currency)}${currentTrip.budget_amount ? ` / ${getCurrencySymbol(currentTrip.currency)}${formatAmount(currentTrip.budget_amount, currentTrip.currency)}` : ''}`}
                  </Text>
                  <View style={styles.focusDivider} />
                  <View style={styles.catSection}>
                    <View style={styles.catSectionHdr}>
                      <Text style={styles.sectionLabel}>{t('personalTrip.categoryBudgets')}</Text>
                      <Pressable style={styles.catManageBtn} onPress={() => navigation.navigate('ManageCategoryBudgets', { tripId: currentTrip.id })}>
                        <Ionicons name="add-circle-outline" size={15} color={colors.coral} />
                        <Text style={styles.catManageTxt}>{t('personalTrip.manageBudgets')}</Text>
                      </Pressable>
                    </View>

                    {categoryBudgets.length === 0 ? (
                      // Tappable "Add" button when no budgets set yet
                      <Pressable
                        style={styles.catAddBtn}
                        onPress={() => navigation.navigate('ManageCategoryBudgets', { tripId: currentTrip.id })}
                      >
                        <Ionicons name="add-circle-outline" size={18} color={colors.coral} />
                        <Text style={styles.catAddBtnTxt}>{t('personalTrip.catBudgetEmpty')}</Text>
                      </Pressable>
                    ) : (
                      categoryBudgets.map(item => {
                        const pct = item.budget_amount > 0 ? item.spent / item.budget_amount : 0;
                        const cat = CATEGORY_MAP[item.category] ?? FALLBACK_CATEGORY;
                        const fillColor = barColor(pct);
                        const sym = getCurrencySymbol(currentTrip.currency);
                        return (
                          <View key={item.category} style={styles.catRow}>
                            <View style={[styles.catIconBg, { backgroundColor: (cat as any).bg ?? '#F5F5F5' }]}>
                              <Ionicons name={cat.icon} size={13} color={cat.color} />
                            </View>
                            <View style={styles.catBody}>
                              <View style={styles.catLabelRow}>
                                <Text style={styles.catName} numberOfLines={1}>{t(`categories.${item.category}`, item.category)}</Text>
                                <Text style={styles.catAmt}>{`${sym}${formatAmount(item.spent, currentTrip.currency)} / ${sym}${formatAmount(item.budget_amount, currentTrip.currency)}`}</Text>
                              </View>
                              <View style={styles.catBarBg}>
                                <View style={[styles.catBarFill, { width: `${Math.min(pct * 100, 100)}%` as any, backgroundColor: fillColor }]} />
                              </View>
                            </View>
                          </View>
                        );
                      })
                    )}
                  </View>
                  <Pressable style={({ pressed }) => [styles.viewDetailsBtn, pressed && { opacity: 0.82 }]} onPress={() => navigation.navigate('PersonalTripDetail', { tripId: currentTrip.id })}>
                    <Text style={styles.viewDetailsTxt}>{t('personalTrip.viewDetails')}</Text>
                    <Ionicons name="arrow-forward" size={16} color="#fff" />
                  </Pressable>
                </View>
              </View>
            </>
          )}

          {/* ── Your Trips section header ─────────────────────────────── */}
          <View style={styles.tripsSectionHdr}>
            <Text style={styles.sectionLabel}>{t('personalTrip.yourTrips')}</Text>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 14 }}>
              {selectMode && (
                <Pressable onPress={handleSelectAll} hitSlop={8}>
                  <Text style={styles.selectAllTxt}>
                    {allSelected ? t('personalTrip.deselectAll') : t('personalTrip.selectAll')}
                  </Text>
                </Pressable>
              )}
              <Pressable onPress={() => { if (selectMode) { setSelectMode(false); setSelectedIds(new Set()); } else setSelectMode(true); }} hitSlop={8}>
                <Text style={styles.selectToggleTxt}>{selectMode ? t('common.cancel') : t('personalTrip.select')}</Text>
              </Pressable>
            </View>
          </View>

          {/* ── Active / Past segmented control ──────────────────────── */}
          <View style={styles.segmentRow}>
            <Pressable style={[styles.segment, tripTab === 'active' && styles.segmentSelected]} onPress={() => setTripTab('active')}>
              <Text style={[styles.segmentText, tripTab === 'active' && styles.segmentTextSelected]}>{t('personalTrip.tabActive')}</Text>
            </Pressable>
            <Pressable style={[styles.segment, tripTab === 'past' && styles.segmentSelected]} onPress={() => setTripTab('past')}>
              <Text style={[styles.segmentText, tripTab === 'past' && styles.segmentTextSelected]}>{t('personalTrip.tabPast')}</Text>
            </Pressable>
          </View>

          {/* ── Trip cards ────────────────────────────────────────────── */}
          {displayedTrips.length === 0 ? (
            <Text style={styles.emptyTabMsg}>
              {tripTab === 'active' ? t('personalTrip.emptyTitle') : t('home.emptyArchivedSubtitle')}
            </Text>
          ) : (
            <View style={styles.tripsList}>
              {displayedTrips.map(trip => {
                const isCurrent   = currentTrip?.id === trip.id;
                const isSelected  = selectedIds.has(trip.id);
                const isArchived  = trip.is_archived === 1;
                const sym         = getCurrencySymbol(trip.currency);
                const spentSub    = `${sym}${formatAmount(trip.spent, trip.currency)}${trip.budget_amount ? ` / ${sym}${formatAmount(trip.budget_amount, trip.currency)}` : ''}`;
                const resolvedUrl = trip.destination_photo_url ?? photoCache.get(trip.id) ?? null;
                const imageSource = resolvedUrl ? { uri: resolvedUrl } : FALLBACK_PHOTO;
                const budgetPct   = trip.budget_amount && trip.budget_amount > 0 ? Math.min(trip.spent / trip.budget_amount, 1) : null;
                // Overlay sits above the budget strip (if present) with a gap
                const overlayBottom = budgetPct !== null ? 30 : 14;

                return (
                  <Pressable
                    key={trip.id}
                    style={({ pressed }) => [
                      styles.tripCard,
                      cardShadow,
                      isArchived && styles.archivedWrap,
                      isCurrent && !selectMode && styles.tripCardCurrent,
                      isSelected && styles.tripCardSelected,
                      pressed && { opacity: isArchived ? 0.5 : 0.75 },
                    ]}
                    onPress={() => {
                      if (selectMode) toggleSelectTrip(trip.id);
                      else navigation.navigate('PersonalTripDetail', { tripId: trip.id });
                    }}
                  >
                    <Image source={imageSource} style={StyleSheet.absoluteFill} resizeMode="cover" />
                    <LinearGradient
                      colors={['transparent', 'rgba(0,0,0,0.35)', 'rgba(0,0,0,0.68)']}
                      locations={[0.3, 0.65, 1]}
                      style={StyleSheet.absoluteFill}
                    />

                    {/* Trip name + spent/budget, raised above budget strip */}
                    <View style={[styles.tripInfoOverlay, { bottom: overlayBottom }]}>
                      <Text style={styles.tripNamePhoto} numberOfLines={1}>{trip.name}</Text>
                      <Text style={styles.tripSubPhoto} numberOfLines={1}>{spentSub}</Text>
                    </View>

                    {/* Budget strip — dark band at card bottom with bar + percentage */}
                    {budgetPct !== null && (
                      <View style={styles.budgetStrip}>
                        <View style={styles.budgetBarTrack}>
                          <View style={[styles.budgetBarFill, { width: `${budgetPct * 100}%` as any, backgroundColor: barColor(budgetPct) }]} />
                        </View>
                        <Text style={styles.budgetBarLabel}>{`${Math.round(budgetPct * 100)}%`}</Text>
                      </View>
                    )}

                    {/* Star (set current) — top-left, active trips only, not in select mode */}
                    {!selectMode && !isArchived && (
                      <Pressable
                        style={{ position: 'absolute', top: 10, left: 10 }}
                        hitSlop={8}
                        onPress={e => { e.stopPropagation?.(); if (!isCurrent) handleSetCurrent(trip.id); }}
                      >
                        <Ionicons
                          name={isCurrent ? 'star' : 'star-outline'}
                          size={20}
                          color={isCurrent ? colors.coral : 'rgba(255,255,255,0.80)'}
                        />
                      </Pressable>
                    )}

                    {/* Top-right: select circle or three-dot menu */}
                    {selectMode ? (
                      <View style={[styles.selectCircle, styles.selectCircleAbsolute, isSelected && styles.selectCircleActive]}>
                        {isSelected && <Ionicons name="checkmark" size={14} color="#fff" />}
                      </View>
                    ) : (
                      <Pressable
                        style={styles.menuBtnPhoto}
                        hitSlop={8}
                        onPress={e => { e.stopPropagation?.(); openTripMenu(trip); }}
                      >
                        <Ionicons name="ellipsis-vertical" size={16} color="rgba(255,255,255,0.85)" />
                      </Pressable>
                    )}
                  </Pressable>
                );
              })}
            </View>
          )}

        </ScrollView>
      )}

      {/* Android action sheet */}
      <ActionSheet visible={showMenuSheet} options={menuSheetOptions} cancelLabel={t('common.cancel')} onCancel={() => setShowMenuSheet(false)} />

      {/* Bulk action bar */}
      {selectMode && (
        <View style={styles.bulkBar}>
          <Text style={styles.bulkCount}>{t('personalTrip.selectedCount', { count: selectedIds.size })}</Text>
          {selectedIds.size > 0 && (
            <>
              {tripTab === 'active' && (
                <Pressable style={styles.bulkConcludeBtn} onPress={handleBulkConclude}>
                  <Ionicons name="checkmark-circle-outline" size={15} color="#fff" />
                  <Text style={styles.bulkBtnTxt}>{t('personalTrip.menuConclude')}</Text>
                </Pressable>
              )}
              <Pressable style={styles.bulkDeleteBtn} onPress={handleBulkDelete}>
                <Ionicons name="trash-outline" size={15} color="#fff" />
                <Text style={styles.bulkBtnTxt}>{t('common.delete')}</Text>
              </Pressable>
            </>
          )}
        </View>
      )}

      {/* FAB — hidden in select mode */}
      {!selectMode && (
        <Pressable style={styles.fab} onPress={() => navigation.navigate('CreatePersonalTrip', {})}>
          <Ionicons name="add" size={28} color="#fff" />
        </Pressable>
      )}
    </SafeAreaView>
  );
}
