import { useCallback, useEffect, useRef, useState } from 'react';
import {
  Animated,
  Alert,
  KeyboardAvoidingView,
  Linking,
  Modal,
  Platform,
  Pressable,
  SafeAreaView,
  ScrollView,
  StyleSheet,
  Switch,
  Text,
  TextInput,
  View,
} from 'react-native';
import { GestureDetector, Gesture } from 'react-native-gesture-handler';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation, useRoute } from '@react-navigation/native';
import { captureRef } from 'react-native-view-shot';
import * as Sharing from 'expo-sharing';
import { colors, fontSizes, radii } from '../theme';
import {
  getItineraryItems,
  addItineraryItem,
  updateItineraryItem,
  deleteItineraryItem,
  getGroup,
  ItineraryItem,
  Group,
} from '../db';
import { ACTIVITY_TYPES, getActivityType } from '../data/activityTypes';
import { useTranslation } from 'react-i18next';
import ItineraryShareCard from '../components/ItineraryShareCard';
import SharePreviewModal from '../components/SharePreviewModal';

// ─── Constants ────────────────────────────────────────────────────────────────

const HOUR_HEIGHT = 80;
const START_HOUR  = 6;
const END_HOUR    = 23;
const START_MIN   = START_HOUR * 60;
const END_MIN     = END_HOUR * 60;
const LABEL_W     = 52;
const RESIZE_H    = 22;
const HOURS       = Array.from({ length: END_HOUR - START_HOUR + 1 }, (_, i) => START_HOUR + i);

const DURATION_PRESETS = [
  { label: '30m',  value: 30 },
  { label: '1h',   value: 60 },
  { label: '1.5h', value: 90 },
  { label: '2h',   value: 120 },
  { label: '3h',   value: 180 },
];

type FormState = {
  title: string;
  location: string;
  startMins: number;
  duration: number;
  note: string;
  isAnchor: boolean;
  autoMapFromTitle: boolean;
  activityType: string | null;
};

const DEFAULT_FORM: FormState = {
  title: '',
  location: '',
  startMins: 540,
  duration: 60,
  note: '',
  isAnchor: true,
  autoMapFromTitle: false,
  activityType: null,
};

// ─── Helpers ──────────────────────────────────────────────────────────────────

function snap15(mins: number): number {
  return Math.round(mins / 15) * 15;
}

function minsToY(mins: number): number {
  return ((mins - START_MIN) / 60) * HOUR_HEIGHT;
}

function yToMins(y: number): number {
  return Math.round(((y / HOUR_HEIGHT) * 60 + START_MIN) / 15) * 15;
}

function fmtTime(mins: number): string {
  const h = Math.floor(mins / 60);
  const m = mins % 60;
  const period = h < 12 ? 'AM' : 'PM';
  const display = h === 0 ? 12 : h > 12 ? h - 12 : h;
  return `${display}:${String(m).padStart(2, '0')} ${period}`;
}

function fmtHour(h: number): string {
  if (h === 0 || h === 24) return '12 AM';
  if (h === 12) return '12 PM';
  return h < 12 ? `${h} AM` : `${h - 12} PM`;
}

function buildMapsUrl(query: string): string | null {
  const q = query.trim();
  return q ? `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(q)}` : null;
}

// ─── Overlap layout ───────────────────────────────────────────────────────────

type LayoutItem = ItineraryItem & { col: number; numCols: number };

function layoutItems(items: ItineraryItem[]): LayoutItem[] {
  if (items.length === 0) return [];
  const sorted = [...items].sort((a, b) => a.start_time - b.start_time);
  const colEnds: number[] = [];
  const withCol = sorted.map(item => {
    const end = item.start_time + item.duration_minutes;
    let col = colEnds.findIndex(e => e <= item.start_time);
    if (col === -1) col = colEnds.length;
    colEnds[col] = end;
    return { ...item, col };
  });
  return withCol.map(item => {
    const itemEnd = item.start_time + item.duration_minutes;
    const concurrent = withCol.filter(o =>
      o.start_time < itemEnd && (o.start_time + o.duration_minutes) > item.start_time,
    );
    const numCols = Math.max(...concurrent.map(c => c.col)) + 1;
    return { ...item, numCols };
  });
}

// ─── TimePicker ───────────────────────────────────────────────────────────────

function TimePicker({ value, onChange }: { value: number; onChange: (v: number) => void }) {
  const totalH = Math.floor(value / 60);
  const mins   = value % 60;
  const isAM   = totalH < 12;
  const dispH  = totalH === 0 ? 12 : totalH > 12 ? totalH - 12 : totalH;

  const setHour = (delta: number) => onChange(((totalH + delta + 24) % 24) * 60 + mins);
  const setMin  = (delta: number) => {
    const steps  = [0, 15, 30, 45];
    const curIdx = steps.indexOf(mins);
    const newIdx = ((curIdx + delta) + steps.length) % steps.length;
    onChange(totalH * 60 + steps[newIdx]);
  };
  const toggleAMPM = () => {
    const shifted = value + (isAM ? 720 : -720);
    onChange(Math.min(1439, Math.max(0, shifted)));
  };

  return (
    <View style={styles.timePicker}>
      <View style={styles.timeUnit}>
        <Pressable onPress={() => setHour(1)} hitSlop={8} style={styles.timeChevron}>
          <Ionicons name="chevron-up" size={18} color={colors.textPrimary} />
        </Pressable>
        <Text style={styles.timeDigit}>{String(dispH).padStart(2, '0')}</Text>
        <Pressable onPress={() => setHour(-1)} hitSlop={8} style={styles.timeChevron}>
          <Ionicons name="chevron-down" size={18} color={colors.textPrimary} />
        </Pressable>
      </View>
      <Text style={styles.timeColon}>:</Text>
      <View style={styles.timeUnit}>
        <Pressable onPress={() => setMin(1)} hitSlop={8} style={styles.timeChevron}>
          <Ionicons name="chevron-up" size={18} color={colors.textPrimary} />
        </Pressable>
        <Text style={styles.timeDigit}>{String(mins).padStart(2, '0')}</Text>
        <Pressable onPress={() => setMin(-1)} hitSlop={8} style={styles.timeChevron}>
          <Ionicons name="chevron-down" size={18} color={colors.textPrimary} />
        </Pressable>
      </View>
      <Pressable onPress={toggleAMPM} style={styles.ampmBtn}>
        <Text style={styles.ampmText}>{isAM ? 'AM' : 'PM'}</Text>
      </Pressable>
    </View>
  );
}

// ─── EventBlock ───────────────────────────────────────────────────────────────

type EventBlockProps = {
  item: LayoutItem;
  eventsWidth: number;
  isActive: boolean;
  onPress: () => void;
  onDragStart:  (id: number) => void;
  onMoveEnd:    (id: number, startMins: number) => void;
  onResizeEnd:  (id: number, duration: number) => void;
};

function EventBlock({
  item, eventsWidth, isActive,
  onPress, onDragStart, onMoveEnd, onResizeEnd,
}: EventBlockProps) {
  const typeDef  = getActivityType(item.activity_type);
  const baseTop  = minsToY(item.start_time);
  const baseH    = Math.max(44, minsToY(item.start_time + item.duration_minutes) - baseTop);
  const colWidth = eventsWidth / item.numCols;
  const left     = item.col * colWidth + 2;
  const width    = colWidth - 4;
  const blockBg  = item.is_anchor ? colors.coral : colors.sage;
  const endMins  = item.start_time + item.duration_minutes;

  // RN Animated values — no Reanimated worklets, runs on JS thread via .runOnJS(true)
  const dragY     = useRef(new Animated.Value(0)).current;
  const resizeDH  = useRef(new Animated.Value(0)).current;
  // baseHAnim mirrors the computed baseH so heightAnim stays correct after re-renders
  const baseHAnim = useRef(new Animated.Value(baseH)).current;
  useEffect(() => { baseHAnim.setValue(baseH); }, [baseH]);
  // heightAnim = baseH + resizeDH; node created once, tracks both values dynamically
  const heightAnim = useRef(Animated.add(baseHAnim, resizeDH)).current;

  const origStart    = useRef(item.start_time);
  const origDuration = useRef(item.duration_minutes);

  const tapGesture = Gesture.Tap()
    .runOnJS(true)
    .maxDistance(8)
    .onEnd(() => { onPress(); });

  // minDistance(8) prevents accidental drag on tap; no activateAfterLongPress so
  // the resize handle's inner gesture can win the race on the handle area.
  const bodyGesture = Gesture.Pan()
    .runOnJS(true)
    .minDistance(8)
    .onStart(() => {
      origStart.current = item.start_time;
      dragY.setValue(0);
      onDragStart(item.id);
    })
    .onUpdate((e) => {
      const maxDelta = minsToY(END_MIN - item.duration_minutes) - minsToY(item.start_time);
      const minDelta = minsToY(START_MIN) - minsToY(item.start_time);
      dragY.setValue(Math.max(minDelta, Math.min(e.translationY, maxDelta)));
    })
    .onEnd((e) => {
      const deltaMins = (e.translationY / HOUR_HEIGHT) * 60;
      const snapped   = snap15(origStart.current + deltaMins);
      const clamped   = Math.max(START_MIN, Math.min(snapped, END_MIN - item.duration_minutes));
      dragY.setValue(0);
      onMoveEnd(item.id, clamped);
    })
    .onFinalize(() => { dragY.setValue(0); });

  const combinedBodyGesture = Gesture.Race(bodyGesture, tapGesture);

  // Nested GestureDetector gives this gesture priority over the body drag
  // for any touch within the resize handle's bounds.
  const resizeGesture = Gesture.Pan()
    .runOnJS(true)
    .minDistance(4)
    .activeOffsetY([-4, 4])
    .onStart(() => {
      origDuration.current = item.duration_minutes;
      resizeDH.setValue(0);
      onDragStart(item.id);
    })
    .onUpdate((e) => {
      resizeDH.setValue(Math.max(44 - baseH, e.translationY));
    })
    .onEnd((e) => {
      const deltaMins = (e.translationY / HOUR_HEIGHT) * 60;
      const snapped   = snap15(origDuration.current + deltaMins);
      const clamped   = Math.max(15, snapped);
      resizeDH.setValue(0);
      onResizeEnd(item.id, clamped);
    })
    .onFinalize(() => { resizeDH.setValue(0); });

  return (
    <GestureDetector gesture={combinedBodyGesture}>
      {/* Outer Animated.View: translateY during drag */}
      <Animated.View
        style={[
          styles.eventBlockOuter,
          { top: baseTop, left, width },
          { transform: [{ translateY: dragY }] },
          isActive && styles.eventBlockOuterActive,
        ]}
      >
        {/* Inner Animated.View: height changes during resize */}
        <Animated.View
          style={[
            styles.eventBlock,
            { backgroundColor: blockBg, height: heightAnim },
          ]}
        >
          {typeDef && (
            <View style={[styles.eventAccentStrip, { backgroundColor: typeDef.color }]} />
          )}
          {typeDef && (
            <View style={styles.typeIconBadge}>
              <Ionicons name={typeDef.icon as any} size={9} color="#fff" />
            </View>
          )}
          {item.google_maps_url && (
            <Pressable
              style={styles.mapPinBtn}
              onPress={() => Linking.openURL(item.google_maps_url!)}
              hitSlop={8}
            >
              <Ionicons name="map" size={10} color="rgba(255,255,255,0.95)" />
            </Pressable>
          )}
          <View style={styles.eventTitleRow}>
            <Text style={styles.eventTitle} numberOfLines={baseH < 56 ? 1 : 2}>
              {item.title}
            </Text>
          </View>
          {item.location_name ? (
            <View style={styles.eventLocation}>
              <Ionicons name="location-outline" size={10} color="rgba(255,255,255,0.80)" />
              <Text style={styles.eventLocationText} numberOfLines={1}>{item.location_name}</Text>
            </View>
          ) : null}
          {baseH >= 56 && (
            <Text style={styles.eventTime}>{fmtTime(item.start_time)} – {fmtTime(endMins)}</Text>
          )}
          <GestureDetector gesture={resizeGesture}>
            <View style={styles.resizeHandle}>
              <View style={styles.resizeBar} />
            </View>
          </GestureDetector>
        </Animated.View>
      </Animated.View>
    </GestureDetector>
  );
}

// ─── Screen ───────────────────────────────────────────────────────────────────

export default function ItineraryScreen() {
  const navigation = useNavigation<any>();
  const route      = useRoute<any>();
  const { t } = useTranslation();
  const { groupId, totalDays } = route.params as { groupId: number; totalDays: number };

  const [numDays, setNumDays]         = useState(totalDays);
  const [selectedDay, setSelectedDay] = useState(1);
  const [items, setItems]             = useState<ItineraryItem[]>([]);
  const [eventsWidth, setEventsWidth] = useState(300);
  const [group, setGroup]             = useState<Group | null>(null);
  const [activeDragId, setActiveDragId] = useState<number | null>(null);

  const [showModal, setShowModal]     = useState(false);
  const [editingItem, setEditingItem] = useState<ItineraryItem | null>(null);
  const [form, setForm]               = useState<FormState>(DEFAULT_FORM);
  const [saving, setSaving]           = useState(false);

  const [showShareModal, setShowShareModal] = useState(false);
  const [sharing, setSharing]               = useState(false);
  const shareCardRef = useRef<View>(null);

  useEffect(() => {
    getGroup(groupId).then(setGroup);
  }, [groupId]);

  useEffect(() => {
    getItineraryItems(groupId, selectedDay).then(setItems);
  }, [groupId, selectedDay]);

  // ── Drag/resize handlers ─────────────────────────────────────────────────

  const handleDragStart = useCallback((id: number) => {
    setActiveDragId(id);
  }, []);

  const handleMoveEnd = useCallback((id: number, startMins: number) => {
    setActiveDragId(null);
    // Update state immediately so overlap re-calculates on release
    setItems(prev => prev.map(i => i.id === id ? { ...i, start_time: startMins } : i));
    // Persist; on failure restore from DB
    updateItineraryItem(id, { start_time: startMins }).catch(() => {
      getItineraryItems(groupId, selectedDay).then(setItems);
    });
  }, [groupId, selectedDay]);

  const handleResizeEnd = useCallback((id: number, duration: number) => {
    setActiveDragId(null);
    setItems(prev => prev.map(i => i.id === id ? { ...i, duration_minutes: duration } : i));
    updateItineraryItem(id, { duration_minutes: duration }).catch(() => {
      getItineraryItems(groupId, selectedDay).then(setItems);
    });
  }, [groupId, selectedDay]);

  // ── Share ────────────────────────────────────────────────────────────────

  const handleShare = async () => {
    if (!shareCardRef.current) return;
    setSharing(true);
    try {
      const uri = await captureRef(shareCardRef, { format: 'png', quality: 1, pixelRatio: 3 });
      await Sharing.shareAsync(uri, { mimeType: 'image/png', dialogTitle: t('itinerary.title') });
    } catch {
      Alert.alert(t('itinerary.shareError'), t('itinerary.shareErrorMsg'));
    } finally {
      setSharing(false);
    }
  };

  // ── Form ─────────────────────────────────────────────────────────────────

  const openAddModal = (startMins: number) => {
    setEditingItem(null);
    setForm({ ...DEFAULT_FORM, startMins: Math.max(START_MIN, Math.min(startMins, END_MIN)) });
    setShowModal(true);
  };

  const openEditModal = (item: ItineraryItem) => {
    setEditingItem(item);
    setForm({
      title: item.title,
      location: item.location_name ?? '',
      startMins: item.start_time,
      duration: item.duration_minutes,
      note: item.note ?? '',
      isAnchor: item.is_anchor === 1,
      autoMapFromTitle: !item.location_name && !!item.google_maps_url,
      activityType: item.activity_type ?? null,
    });
    setShowModal(true);
  };

  const closeModal = () => { setShowModal(false); setEditingItem(null); };

  const handleSave = async () => {
    if (!form.title.trim()) return;
    setSaving(true);
    try {
      const mapsQuery    = form.location.trim() || (form.autoMapFromTitle ? form.title.trim() : '');
      const googleMapsUrl = buildMapsUrl(mapsQuery);
      if (editingItem) {
        await updateItineraryItem(editingItem.id, {
          title: form.title.trim(),
          location_name: form.location.trim() || null,
          start_time: form.startMins,
          duration_minutes: form.duration,
          note: form.note.trim() || null,
          is_anchor: form.isAnchor ? 1 : 0,
          google_maps_url: googleMapsUrl,
          activity_type: form.activityType,
        });
      } else {
        await addItineraryItem({
          group_id: groupId,
          day_number: selectedDay,
          title: form.title.trim(),
          location_name: form.location.trim() || null,
          start_time: form.startMins,
          duration_minutes: form.duration,
          note: form.note.trim() || null,
          is_anchor: form.isAnchor ? 1 : 0,
          google_maps_url: googleMapsUrl,
          activity_type: form.activityType,
        });
      }
      const updated = await getItineraryItems(groupId, selectedDay);
      setItems(updated);
      closeModal();
    } catch {
      Alert.alert(t('itinerary.saveError'), t('itinerary.saveErrorMsg'));
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = () => {
    if (!editingItem) return;
    Alert.alert(t('itinerary.deleteTitle'), t('itinerary.deleteMsg', { title: editingItem.title }), [
      { text: t('common.cancel'), style: 'cancel' },
      {
        text: t('common.delete'),
        style: 'destructive',
        onPress: async () => {
          await deleteItineraryItem(editingItem.id);
          const updated = await getItineraryItems(groupId, selectedDay);
          setItems(updated);
          closeModal();
        },
      },
    ]);
  };

  const handleTimelineTap = (e: any) => {
    const y = e.nativeEvent.locationY;
    openAddModal(yToMins(y));
  };

  // ── Derived ──────────────────────────────────────────────────────────────

  const anchorCount    = items.filter(i => i.is_anchor === 1 && (!editingItem || i.id !== editingItem.id)).length;
  const totalTimelineH = HOURS.length * HOUR_HEIGHT;
  const laid           = layoutItems(items);
  const locationQuery  = form.location.trim();
  const showMapsConfirm = locationQuery.length > 0;
  const showAutoToggle  = !locationQuery && form.title.trim().length > 0;

  // ── Render ───────────────────────────────────────────────────────────────

  return (
    <SafeAreaView style={styles.safe}>
      {/* Header */}
      <View style={styles.header}>
        <Pressable onPress={() => navigation.goBack()} hitSlop={12}>
          <Ionicons name="chevron-back" size={22} color={colors.textPrimary} />
        </Pressable>
        <Text style={styles.headerTitle}>{t('itinerary.title')}</Text>
        <View style={styles.headerActions}>
          <Pressable onPress={() => setShowShareModal(true)} hitSlop={12}>
            <Ionicons name="share-outline" size={20} color={colors.textPrimary} />
          </Pressable>
          <Pressable onPress={() => openAddModal(540)} hitSlop={12} style={styles.addBtn}>
            <Ionicons name="add" size={24} color={colors.coral} />
          </Pressable>
        </View>
      </View>

      {/* Day tabs */}
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        style={styles.dayTabsScroll}
        contentContainerStyle={styles.dayTabsContent}
      >
        {Array.from({ length: numDays }, (_, i) => i + 1).map(day => (
          <Pressable
            key={day}
            style={[styles.dayTab, selectedDay === day && styles.dayTabSelected]}
            onPress={() => setSelectedDay(day)}
          >
            <Text style={[styles.dayTabText, selectedDay === day && styles.dayTabTextSelected]}>
              {t('itinerary.dayLabel', { day })}
            </Text>
          </Pressable>
        ))}
        <Pressable style={styles.addDayBtn} onPress={() => setNumDays(n => n + 1)}>
          <Ionicons name="add" size={16} color={colors.textSecondary} />
        </Pressable>
      </ScrollView>

      {/* Timeline
          scrollEnabled=false during an active drag so the ScrollView doesn't
          compete with the block's RNGH pan gesture for the same touch stream. */}
      <ScrollView
        style={styles.timelineScroll}
        showsVerticalScrollIndicator={false}
        scrollEnabled={activeDragId === null}
        contentContainerStyle={{ paddingBottom: 40 }}
      >
        <View style={[styles.timelineRow, { height: totalTimelineH }]}>
          <View style={styles.labelsCol}>
            {HOURS.map(h => (
              <View key={h} style={[styles.hourLabelWrap, { top: (h - START_HOUR) * HOUR_HEIGHT - 9 }]}>
                <Text style={styles.hourLabel}>{fmtHour(h)}</Text>
              </View>
            ))}
          </View>

          <View
            style={styles.eventsCol}
            onLayout={e => setEventsWidth(e.nativeEvent.layout.width)}
          >
            {HOURS.map(h => (
              <View key={h} style={[styles.hourLine, { top: (h - START_HOUR) * HOUR_HEIGHT }]} />
            ))}
            <Pressable style={styles.tapTarget} onPress={handleTimelineTap} />

            {laid.map(item => (
              <EventBlock
                key={item.id}
                item={item}
                eventsWidth={eventsWidth}
                isActive={activeDragId === item.id}
                onPress={() => openEditModal(item)}
                onDragStart={handleDragStart}
                onMoveEnd={handleMoveEnd}
                onResizeEnd={handleResizeEnd}
              />
            ))}

            {items.length === 0 && (
              <View style={styles.emptyHint}>
                <Ionicons name="add-circle-outline" size={28} color={colors.border} />
                <Text style={styles.emptyHintText}>{t('itinerary.emptyHint')}</Text>
              </View>
            )}
          </View>
        </View>
      </ScrollView>

      {/* Add / Edit modal */}
      <Modal visible={showModal} animationType="slide" onRequestClose={closeModal}>
        <SafeAreaView style={styles.formSafe}>
          <View style={styles.formHeader}>
            <Pressable onPress={closeModal} hitSlop={12}>
              <Ionicons name="chevron-down" size={24} color={colors.textPrimary} />
            </Pressable>
            <Text style={styles.formTitle}>{editingItem ? t('itinerary.editActivity') : t('itinerary.addActivity')}</Text>
            {editingItem ? (
              <Pressable onPress={handleDelete} hitSlop={12}>
                <Ionicons name="trash-outline" size={20} color={colors.coral} />
              </Pressable>
            ) : (
              <View style={styles.formHeaderSpacer} />
            )}
          </View>

          <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : 'height'}>
            <ScrollView
              showsVerticalScrollIndicator={false}
              keyboardShouldPersistTaps="handled"
              contentContainerStyle={styles.formScrollContent}
            >
              <Text style={styles.fieldLabel}>{t('itinerary.fieldActivity')}</Text>
              <TextInput
                style={styles.textInput}
                placeholder={t('itinerary.activityPlaceholder')}
                placeholderTextColor={colors.textSecondary}
                value={form.title}
                onChangeText={v => setForm(f => ({ ...f, title: v }))}
                returnKeyType="next"
              />

              <Text style={styles.fieldLabel}>{t('itinerary.fieldType')}</Text>
              <ScrollView
                horizontal
                showsHorizontalScrollIndicator={false}
                contentContainerStyle={styles.typePickerContent}
                keyboardShouldPersistTaps="handled"
              >
                {ACTIVITY_TYPES.map(def => {
                  const isSelected = form.activityType === def.id;
                  return (
                    <Pressable
                      key={def.id}
                      style={[styles.typeChip, isSelected && { borderColor: def.color, backgroundColor: def.bg }]}
                      onPress={() => setForm(f => ({ ...f, activityType: f.activityType === def.id ? null : def.id }))}
                    >
                      <View style={[styles.typeChipIcon, { backgroundColor: isSelected ? def.color : def.bg }]}>
                        <Ionicons name={def.icon as any} size={17} color={isSelected ? '#fff' : def.color} />
                      </View>
                      <Text
                        style={[styles.typeChipLabel, isSelected && { color: def.color, fontWeight: '700' }]}
                        numberOfLines={2}
                      >
                        {t(`activityTypes.${def.id}`, def.label)}
                      </Text>
                    </Pressable>
                  );
                })}
              </ScrollView>

              <Text style={styles.fieldLabel}>{t('itinerary.fieldLocation')}</Text>
              <TextInput
                style={styles.textInput}
                placeholder={t('itinerary.locationPlaceholder')}
                placeholderTextColor={colors.textSecondary}
                value={form.location}
                onChangeText={v => setForm(f => ({
                  ...f, location: v,
                  autoMapFromTitle: f.autoMapFromTitle && !v.trim(),
                }))}
                returnKeyType="done"
              />
              {showMapsConfirm ? (
                <View style={styles.mapsConfirmRow}>
                  <Ionicons name="map-outline" size={13} color={colors.sage} />
                  <Text style={styles.mapsConfirmText}>{t('itinerary.mapsConfirmText')}</Text>
                </View>
              ) : showAutoToggle ? (
                <View style={styles.autoMapRow}>
                  <View style={{ flex: 1 }}>
                    <Text style={styles.autoMapLabel}>{t('itinerary.autoMapLabel')}</Text>
                    <Text style={styles.autoMapSub}>{t('itinerary.autoMapSub', { title: form.title.trim() })}</Text>
                  </View>
                  <Switch
                    value={form.autoMapFromTitle}
                    onValueChange={v => setForm(f => ({ ...f, autoMapFromTitle: v }))}
                    trackColor={{ false: colors.border, true: colors.coral }}
                    thumbColor={colors.card}
                  />
                </View>
              ) : null}

              <Text style={styles.fieldLabel}>{t('itinerary.fieldStartTime')}</Text>
              <TimePicker value={form.startMins} onChange={v => setForm(f => ({ ...f, startMins: v }))} />

              <Text style={styles.fieldLabel}>{t('itinerary.fieldDuration')}</Text>
              <View style={styles.durationRow}>
                {DURATION_PRESETS.map(d => (
                  <Pressable
                    key={d.value}
                    style={[styles.durationChip, form.duration === d.value && styles.durationChipSelected]}
                    onPress={() => setForm(f => ({ ...f, duration: d.value }))}
                  >
                    <Text style={[styles.durationChipText, form.duration === d.value && styles.durationChipTextSelected]}>
                      {d.label}
                    </Text>
                  </Pressable>
                ))}
              </View>

              <View style={styles.anchorRow}>
                <View style={{ flex: 1 }}>
                  <Text style={styles.anchorLabel}>{t('itinerary.anchorLabel')}</Text>
                  <Text style={styles.anchorSub}>{t('itinerary.anchorSub')}</Text>
                </View>
                <Switch
                  value={form.isAnchor}
                  onValueChange={v => setForm(f => ({ ...f, isAnchor: v }))}
                  trackColor={{ false: colors.border, true: colors.coral }}
                  thumbColor={colors.card}
                />
              </View>

              {form.isAnchor && anchorCount >= 2 && (
                <View style={styles.tipBanner}>
                  <Ionicons name="information-circle-outline" size={14} color={colors.sage} />
                  <Text style={styles.tipText}>
                    {t('itinerary.anchorTip')}
                  </Text>
                </View>
              )}

              <Text style={styles.fieldLabel}>{t('itinerary.fieldNote')}</Text>
              <TextInput
                style={[styles.textInput, styles.noteInput]}
                placeholder={t('itinerary.notePlaceholder')}
                placeholderTextColor={colors.textSecondary}
                value={form.note}
                onChangeText={v => setForm(f => ({ ...f, note: v }))}
                multiline
                returnKeyType="done"
              />
            </ScrollView>

            <View style={styles.formFooter}>
              <Pressable
                style={[styles.saveBtn, (!form.title.trim() || saving) && styles.saveBtnDisabled]}
                onPress={handleSave}
                disabled={!form.title.trim() || saving}
              >
                <Text style={styles.saveBtnText}>
                  {saving ? t('itinerary.saving') : editingItem ? t('itinerary.saveChanges') : t('itinerary.addToDay')}
                </Text>
              </Pressable>
            </View>
          </KeyboardAvoidingView>
        </SafeAreaView>
      </Modal>

      {/* Share modal */}
      <SharePreviewModal
        visible={showShareModal}
        title={t('itinerary.shareTitle', { day: selectedDay })}
        sharing={sharing}
        onClose={() => setShowShareModal(false)}
        onShare={handleShare}
      >
        <ItineraryShareCard
          ref={shareCardRef}
          tripName={group?.name ?? ''}
          dayNumber={selectedDay}
          items={items}
        />
      </SharePreviewModal>
    </SafeAreaView>
  );
}

// ─── Styles ───────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.background },

  // Header
  header: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    paddingHorizontal: 20, paddingVertical: 14,
  },
  headerTitle: { fontSize: fontSizes.sectionTitle, fontWeight: '700', color: colors.textPrimary },
  headerActions: { flexDirection: 'row', alignItems: 'center', gap: 16 },
  addBtn: { width: 32, alignItems: 'center' },

  // Day tabs
  dayTabsScroll: { flexGrow: 0, borderBottomWidth: 1, borderBottomColor: colors.border },
  dayTabsContent: { paddingHorizontal: 16, paddingVertical: 10, gap: 8, alignItems: 'center' },
  dayTab: {
    paddingHorizontal: 16, paddingVertical: 7, borderRadius: 20,
    backgroundColor: colors.card, borderWidth: 1.5, borderColor: 'transparent',
  },
  dayTabSelected: { borderColor: colors.coral, backgroundColor: '#FFF0EE' },
  dayTabText: { fontSize: fontSizes.caption, fontWeight: '600', color: colors.textSecondary },
  dayTabTextSelected: { color: colors.coral },
  addDayBtn: {
    width: 32, height: 32, borderRadius: 16, backgroundColor: colors.card,
    alignItems: 'center', justifyContent: 'center', borderWidth: 1.5, borderColor: colors.border,
  },

  // Timeline
  timelineScroll: { flex: 1 },
  timelineRow: { flexDirection: 'row' },
  labelsCol: { width: LABEL_W, position: 'relative' },
  hourLabelWrap: { position: 'absolute', right: 8 },
  hourLabel: { fontSize: 11, fontWeight: '500', color: colors.textSecondary, textAlign: 'right' },
  eventsCol: {
    flex: 1, position: 'relative',
    backgroundColor: colors.card, borderLeftWidth: 1, borderLeftColor: colors.border,
  },
  hourLine: { position: 'absolute', left: 0, right: 0, height: 1, backgroundColor: colors.border },
  tapTarget: { ...StyleSheet.absoluteFillObject, zIndex: 0 },
  emptyHint: {
    position: 'absolute', top: HOUR_HEIGHT * 3, left: 0, right: 0,
    alignItems: 'center', gap: 8, paddingVertical: 20, zIndex: 0,
  },
  emptyHintText: { fontSize: fontSizes.caption, color: colors.textSecondary },

  // Event blocks — split into outer (position + translateY) and inner (height + bg)
  // so that Animated styles for move and resize don't conflict.
  eventBlockOuter: {
    position: 'absolute',
    zIndex: 1,
  },
  eventBlockOuterActive: {
    zIndex: 10,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.32,
    shadowRadius: 12,
    elevation: 14,
  },
  eventBlock: {
    borderRadius: 10,
    padding: 8,
    paddingLeft: 12,
    overflow: 'hidden',
    borderWidth: 1.5,
    borderColor: 'transparent',
  },
  eventAccentStrip: {
    position: 'absolute', left: 0, top: 0, bottom: 0, width: 4, opacity: 0.85,
  },
  typeIconBadge: {
    position: 'absolute', top: 4, right: 22,
    width: 17, height: 17, borderRadius: 9,
    backgroundColor: 'rgba(0,0,0,0.20)',
    alignItems: 'center', justifyContent: 'center',
  },
  mapPinBtn: { position: 'absolute', top: 5, right: 4 },
  eventTitleRow: { flexDirection: 'row', alignItems: 'flex-start', paddingRight: 4 },
  eventTitle: { fontSize: 12, fontWeight: '700', color: '#fff', lineHeight: 16, flex: 1 },
  eventLocation: { flexDirection: 'row', alignItems: 'center', gap: 2, marginTop: 2 },
  eventLocationText: { fontSize: 10, color: 'rgba(255,255,255,0.80)', flex: 1 },
  eventTime: { fontSize: 10, color: 'rgba(255,255,255,0.70)', marginTop: 2 },

  // Resize handle
  resizeHandle: {
    position: 'absolute', bottom: 0, left: 0, right: 0,
    height: RESIZE_H, alignItems: 'center', justifyContent: 'center',
  },
  resizeBar: {
    width: 28, height: 3, borderRadius: 2, backgroundColor: 'rgba(255,255,255,0.55)',
  },

  // Form modal
  formSafe: { flex: 1, backgroundColor: colors.background },
  formHeader: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    paddingHorizontal: 20, paddingVertical: 16,
    borderBottomWidth: 1, borderBottomColor: colors.border, backgroundColor: colors.card,
  },
  formTitle: { fontSize: fontSizes.sectionTitle, fontWeight: '700', color: colors.textPrimary },
  formHeaderSpacer: { width: 24 },
  formScrollContent: { paddingHorizontal: 20, paddingTop: 8, paddingBottom: 32 },
  formFooter: {
    paddingHorizontal: 20, paddingVertical: 16,
    borderTopWidth: 1, borderTopColor: colors.border, backgroundColor: colors.card,
  },

  // Form fields
  fieldLabel: {
    fontSize: fontSizes.caption, fontWeight: '700', color: colors.textSecondary,
    textTransform: 'uppercase', letterSpacing: 0.6, marginBottom: 8, marginTop: 24,
  },
  textInput: {
    backgroundColor: colors.card, borderRadius: radii.button,
    paddingHorizontal: 16, paddingVertical: 14,
    fontSize: fontSizes.body, color: colors.textPrimary,
    borderWidth: 1, borderColor: colors.border,
  },
  noteInput: { minHeight: 88, textAlignVertical: 'top', paddingTop: 14 },

  // Activity type picker
  typePickerContent: { gap: 8, paddingRight: 4 },
  typeChip: {
    alignItems: 'center', width: 76,
    paddingVertical: 10, paddingHorizontal: 6,
    borderRadius: 14, borderWidth: 1.5, borderColor: 'transparent',
    backgroundColor: colors.card, gap: 6,
  },
  typeChipIcon: { width: 36, height: 36, borderRadius: 10, alignItems: 'center', justifyContent: 'center' },
  typeChipLabel: {
    fontSize: 10, fontWeight: '600', color: colors.textSecondary, textAlign: 'center', lineHeight: 13,
  },

  // Maps
  mapsConfirmRow: { flexDirection: 'row', alignItems: 'center', gap: 6, marginTop: 8, paddingHorizontal: 4 },
  mapsConfirmText: { fontSize: fontSizes.caption, color: colors.sage, fontWeight: '500' },
  autoMapRow: {
    flexDirection: 'row', alignItems: 'center', marginTop: 12, gap: 12,
    backgroundColor: colors.card, borderRadius: radii.button,
    borderWidth: 1, borderColor: colors.border, padding: 14,
  },
  autoMapLabel: { fontSize: fontSizes.body, fontWeight: '600', color: colors.textPrimary, marginBottom: 2 },
  autoMapSub: { fontSize: fontSizes.caption, color: colors.textSecondary },

  // Duration
  durationRow: { flexDirection: 'row', gap: 8, flexWrap: 'wrap' },
  durationChip: {
    paddingHorizontal: 16, paddingVertical: 10, borderRadius: 20,
    backgroundColor: colors.card, borderWidth: 1.5, borderColor: 'transparent',
  },
  durationChipSelected: { borderColor: colors.coral, backgroundColor: '#FFF0EE' },
  durationChipText: { fontSize: fontSizes.caption, fontWeight: '600', color: colors.textSecondary },
  durationChipTextSelected: { color: colors.coral },

  // Anchor
  anchorRow: {
    flexDirection: 'row', alignItems: 'center', marginTop: 24, gap: 12,
    backgroundColor: colors.card, borderRadius: radii.button,
    borderWidth: 1, borderColor: colors.border, padding: 14,
  },
  anchorLabel: { fontSize: fontSizes.body, fontWeight: '600', color: colors.textPrimary, marginBottom: 2 },
  anchorSub: { fontSize: fontSizes.caption, color: colors.textSecondary },

  // Tip
  tipBanner: {
    flexDirection: 'row', alignItems: 'flex-start', gap: 8,
    backgroundColor: '#F0F5F2', borderRadius: radii.button, padding: 12, marginTop: 10,
  },
  tipText: { flex: 1, fontSize: fontSizes.caption, color: colors.sage, lineHeight: 18 },

  // Save button
  saveBtn: {
    backgroundColor: colors.coral, borderRadius: radii.button, paddingVertical: 16, alignItems: 'center',
    shadowColor: colors.coral, shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.28, shadowRadius: 8, elevation: 4,
  },
  saveBtnDisabled: { opacity: 0.45 },
  saveBtnText: { fontSize: fontSizes.body, fontWeight: '700', color: '#fff', letterSpacing: 0.3 },

  // TimePicker
  timePicker: {
    flexDirection: 'row', alignItems: 'center', gap: 4,
    backgroundColor: colors.card, borderRadius: radii.button,
    borderWidth: 1, borderColor: colors.border, padding: 14, alignSelf: 'flex-start',
  },
  timeUnit: { alignItems: 'center', gap: 4 },
  timeDigit: { fontSize: 28, fontWeight: '700', color: colors.textPrimary, width: 44, textAlign: 'center' },
  timeChevron: { padding: 4 },
  timeColon: { fontSize: 28, fontWeight: '700', color: colors.textPrimary, paddingBottom: 4, marginHorizontal: 2 },
  ampmBtn: {
    marginLeft: 8, backgroundColor: colors.background,
    paddingHorizontal: 12, paddingVertical: 8, borderRadius: 10, borderWidth: 1.5, borderColor: colors.border,
  },
  ampmText: { fontSize: fontSizes.body, fontWeight: '700', color: colors.textPrimary },
});
