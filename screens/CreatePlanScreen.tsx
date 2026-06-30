import { useState } from 'react';
import {
  KeyboardAvoidingView,
  Platform,
  Pressable,
  SafeAreaView,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import DateTimePicker, { DateTimePickerEvent } from '@react-native-community/datetimepicker';
import { Ionicons } from '@expo/vector-icons';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { useTranslation } from 'react-i18next';
import { PlanStackParamList } from '../navigation/types';
import { createPlanTrip, addTripStop } from '../db';
import { type ColorPalette, fontSizes, radii, cardShadow } from '../theme';
import { useTheme } from '../context/ThemeContext';
import { DONE_BAR_ID } from '../components/KeyboardDoneBar';

type Props = NativeStackScreenProps<PlanStackParamList, 'CreatePlan'>;

const CURRENCIES = ['CAD', 'USD', 'EUR', 'GBP', 'AUD', 'JPY'];
const UNSPLASH_KEY = '_dJ9KWj8_6gx-it3O-USLvSCHVRLH39n2okh6S3Onlo';
const STOP_CITY_EXAMPLES = ['Tokyo', 'Kyoto', 'Osaka', 'Rome', 'Paris', 'Barcelona'];

async function fetchDestinationPhoto(query: string): Promise<string | null> {
  try {
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

function SectionLabel({ title }: { title: string }) {
  const { colors } = useTheme();
  const styles = makeStyles(colors);
  return <Text style={styles.sectionLabel}>{title}</Text>;
}

function toISODate(d: Date): string {
  return d.toISOString().split('T')[0];
}

function formatDisplayDate(d: Date): string {
  return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
}

export default function CreatePlanScreen({ navigation }: Props) {
  const { t }                             = useTranslation();
  const { colors }                        = useTheme();
  const styles                            = makeStyles(colors);
  const [tripName, setTripName]           = useState('');
  const [destination, setDestination]     = useState('');
  const [currency, setCurrency]           = useState('CAD');
  const [startDate, setStartDate]         = useState<Date | null>(null);
  const [endDate, setEndDate]             = useState<Date | null>(null);
  const [budget, setBudget]               = useState('');
  const [showStart, setShowStart]         = useState(false);
  const [showEnd, setShowEnd]             = useState(false);
  const [saving, setSaving]               = useState(false);
  const [destError, setDestError]         = useState(false);
  const [stops, setStops]                 = useState<string[]>([]);

  const addStopField = () => setStops((prev) => [...prev, '']);
  const updateStop   = (i: number, v: string) => setStops((prev) => prev.map((s, idx) => idx === i ? v : s));
  const removeStop   = (i: number) => setStops((prev) => prev.filter((_, idx) => idx !== i));

  const canSave = tripName.trim().length > 0 && !saving;

  const onStartChange = (_: DateTimePickerEvent, selected?: Date) => {
    if (Platform.OS === 'android') setShowStart(false);
    if (selected) setStartDate(selected);
  };
  const onEndChange = (_: DateTimePickerEvent, selected?: Date) => {
    if (Platform.OS === 'android') setShowEnd(false);
    if (selected) setEndDate(selected);
  };

  const handleSave = async () => {
    if (!canSave) return;
    if (!destination.trim()) { setDestError(true); return; }
    setSaving(true);
    try {
      const dest = destination.trim();
      const photoUrl = dest ? await fetchDestinationPhoto(dest) : null;
      const parsedBudget = parseFloat(budget);
      const groupId = await createPlanTrip(
        tripName.trim(),
        currency,
        dest || undefined,
        photoUrl ?? undefined,
        startDate ? toISODate(startDate) : undefined,
        endDate   ? toISODate(endDate)   : undefined,
        !isNaN(parsedBudget) && parsedBudget > 0 ? parsedBudget : undefined,
      );
      let stopIdx = 0;
      for (const stopName of stops) {
        if (stopName.trim().length > 0) {
          await addTripStop(groupId, stopName.trim(), stopIdx++);
        }
      }
      navigation.goBack();
    } finally {
      setSaving(false);
    }
  };

  return (
    <SafeAreaView style={styles.safe}>
      <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      >
        <View style={styles.header}>
          <Pressable onPress={() => navigation.goBack()} hitSlop={12}>
            <Ionicons name="close" size={24} color={colors.textPrimary} />
          </Pressable>
          <Text style={styles.headerTitle}>{t('createPlan.title')}</Text>
          <View style={{ width: 24 }} />
        </View>

        <ScrollView
          contentContainerStyle={styles.scroll}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
        >
          <SectionLabel title={t('createPlan.tripName')} />
          <View style={[styles.inputCard, cardShadow]}>
            <TextInput
              style={styles.input}
              placeholder={t('createPlan.tripNamePlaceholder')}
              placeholderTextColor={colors.textSecondary}
              inputAccessoryViewID={DONE_BAR_ID}
              value={tripName}
              onChangeText={setTripName}
              returnKeyType="done"
            />
          </View>

          <SectionLabel title={t('createPlan.destination')} />
          <View style={[styles.inputCard, cardShadow, destError && styles.inputCardError]}>
            <TextInput
              style={styles.input}
              placeholder={t('createPlan.destinationPlaceholder')}
              placeholderTextColor={colors.textSecondary}
              inputAccessoryViewID={DONE_BAR_ID}
              value={destination}
              onChangeText={(v) => { setDestination(v); if (destError) setDestError(false); }}
              returnKeyType="done"
            />
          </View>
          {destError && <Text style={styles.fieldError}>{t('createPlan.destinationRequired')}</Text>}

          <SectionLabel title={t('createPlan.stops')} />

          {stops.length > 0 && (
            <View style={[styles.inputCard, cardShadow, { paddingHorizontal: 16, paddingVertical: 4 }]}>
              {stops.map((stop, index) => (
                <View key={index}>
                  {index > 0 && <View style={{ height: 1, backgroundColor: colors.border }} />}
                  <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                    <Ionicons name="location-outline" size={16} color={colors.textSecondary} />
                    <TextInput
                      style={[styles.input, { flex: 1 }]}
                      placeholder={t('createPlan.stopPlaceholder', { number: index + 1, city: STOP_CITY_EXAMPLES[index % STOP_CITY_EXAMPLES.length] })}
                      placeholderTextColor={colors.textSecondary}
                      inputAccessoryViewID={DONE_BAR_ID}
                      value={stop}
                      onChangeText={(v) => updateStop(index, v)}
                      returnKeyType="done"
                      autoCapitalize="words"
                    />
                    <Pressable onPress={() => removeStop(index)} hitSlop={8}>
                      <Ionicons name="close-circle" size={20} color={colors.textSecondary} />
                    </Pressable>
                  </View>
                </View>
              ))}
            </View>
          )}

          <Pressable
            style={{ flexDirection: 'row', alignItems: 'center', gap: 6, marginTop: 12, alignSelf: 'flex-start' }}
            onPress={addStopField}
          >
            <Ionicons name="add-circle-outline" size={18} color={colors.coral} />
            <Text style={{ fontSize: fontSizes.body, fontWeight: '600', color: colors.coral }}>
              {t('createPlan.addStop')}
            </Text>
          </Pressable>

          <SectionLabel title={t('createPlan.currency')} />
          <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.chipScroll}>
            {CURRENCIES.map((c) => (
              <Pressable
                key={c}
                style={[styles.chip, currency === c && styles.chipSelected]}
                onPress={() => setCurrency(c)}
              >
                <Text style={[styles.chipText, currency === c && styles.chipTextSelected]}>
                  {c}
                </Text>
              </Pressable>
            ))}
          </ScrollView>

          <SectionLabel title={t('createPlan.dates')} />
          <View style={[styles.datesCard, cardShadow]}>
            <Pressable style={styles.dateRow} onPress={() => setShowStart(true)}>
              <Ionicons name="calendar-outline" size={18} color={colors.textSecondary} />
              <View style={{ flex: 1 }}>
                <Text style={styles.dateLabelSmall}>{t('createPlan.startDate')}</Text>
                <Text style={[styles.dateValue, !startDate && styles.datePlaceholder]}>
                  {startDate ? formatDisplayDate(startDate) : t('createPlan.notSet')}
                </Text>
              </View>
              {startDate && (
                <Pressable onPress={() => setStartDate(null)} hitSlop={8}>
                  <Ionicons name="close-circle" size={18} color={colors.textSecondary} />
                </Pressable>
              )}
            </Pressable>

            <View style={styles.dateDivider} />

            <Pressable style={styles.dateRow} onPress={() => setShowEnd(true)}>
              <Ionicons name="calendar-outline" size={18} color={colors.textSecondary} />
              <View style={{ flex: 1 }}>
                <Text style={styles.dateLabelSmall}>{t('createPlan.endDate')}</Text>
                <Text style={[styles.dateValue, !endDate && styles.datePlaceholder]}>
                  {endDate ? formatDisplayDate(endDate) : t('createPlan.notSet')}
                </Text>
              </View>
              {endDate && (
                <Pressable onPress={() => setEndDate(null)} hitSlop={8}>
                  <Ionicons name="close-circle" size={18} color={colors.textSecondary} />
                </Pressable>
              )}
            </Pressable>
          </View>

          {showStart && (
            <DateTimePicker
              value={startDate ?? new Date()}
              mode="date"
              display={Platform.OS === 'ios' ? 'spinner' : 'default'}
              onChange={onStartChange}
            />
          )}
          {Platform.OS === 'ios' && showStart && (
            <Pressable style={styles.pickerDone} onPress={() => setShowStart(false)}>
              <Text style={styles.pickerDoneText}>{t('common.done')}</Text>
            </Pressable>
          )}

          {showEnd && (
            <DateTimePicker
              value={endDate ?? startDate ?? new Date()}
              mode="date"
              display={Platform.OS === 'ios' ? 'spinner' : 'default'}
              minimumDate={startDate ?? undefined}
              onChange={onEndChange}
            />
          )}
          {Platform.OS === 'ios' && showEnd && (
            <Pressable style={styles.pickerDone} onPress={() => setShowEnd(false)}>
              <Text style={styles.pickerDoneText}>{t('common.done')}</Text>
            </Pressable>
          )}

          <SectionLabel title={t('createPlan.budget')} />
          <View style={[styles.inputCard, cardShadow]}>
            <View style={styles.budgetRow}>
              <Text style={styles.currencyPrefix}>{currency === 'JPY' ? '¥' : '$'}</Text>
              <TextInput
                style={[styles.input, { flex: 1 }]}
                placeholder="0.00"
                placeholderTextColor={colors.textSecondary}
                keyboardType="decimal-pad"
                inputAccessoryViewID={DONE_BAR_ID}
                value={budget}
                onChangeText={setBudget}
                returnKeyType="done"
              />
            </View>
          </View>
        </ScrollView>

        <View style={styles.saveContainer}>
          <Pressable
            style={[styles.saveButton, !canSave && styles.saveButtonDisabled]}
            onPress={handleSave}
            disabled={!canSave}
          >
            <Text style={styles.saveText}>
              {saving ? t('createPlan.creating') : t('createPlan.create')}
            </Text>
          </Pressable>
        </View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const makeStyles = (c: ColorPalette) => StyleSheet.create({
  safe: { flex: 1, backgroundColor: c.background },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingVertical: 16,
  },
  headerTitle: {
    fontSize: fontSizes.sectionTitle,
    fontWeight: '700',
    color: c.textPrimary,
  },
  scroll: {
    paddingHorizontal: 20,
    paddingBottom: 24,
  },
  sectionLabel: {
    fontSize: fontSizes.caption,
    fontWeight: '600',
    color: c.textSecondary,
    textTransform: 'uppercase',
    letterSpacing: 0.8,
    marginBottom: 10,
    marginTop: 24,
  },
  inputCard: {
    backgroundColor: c.card,
    borderRadius: radii.card,
    paddingHorizontal: 16,
    paddingVertical: 4,
  },
  inputCardError: {
    borderWidth: 1,
    borderColor: c.coral,
  },
  fieldError: {
    fontSize: fontSizes.caption,
    color: c.coral,
    marginTop: 6,
    marginLeft: 4,
  },
  input: {
    fontSize: fontSizes.body,
    color: c.textPrimary,
    paddingVertical: 14,
  },
  chipScroll: { flexGrow: 0 },
  chip: {
    paddingHorizontal: 18,
    paddingVertical: 10,
    borderRadius: 20,
    backgroundColor: c.card,
    marginRight: 8,
    borderWidth: 2,
    borderColor: 'transparent',
  },
  chipSelected: { borderColor: c.coral },
  chipText: {
    fontSize: fontSizes.body,
    fontWeight: '600',
    color: c.textSecondary,
  },
  chipTextSelected: { color: c.coral },

  datesCard: {
    backgroundColor: c.card,
    borderRadius: radii.card,
    overflow: 'hidden',
  },
  dateRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 14,
    gap: 12,
  },
  dateLabelSmall: {
    fontSize: 11,
    fontWeight: '600',
    color: c.textSecondary,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    marginBottom: 2,
  },
  dateValue: {
    fontSize: fontSizes.body,
    fontWeight: '500',
    color: c.textPrimary,
  },
  datePlaceholder: {
    color: c.textSecondary,
  },
  dateDivider: {
    height: 1,
    backgroundColor: c.border,
    marginHorizontal: 16,
  },
  pickerDone: {
    alignSelf: 'flex-end',
    marginTop: 6,
    paddingHorizontal: 16,
    paddingVertical: 6,
  },
  pickerDoneText: {
    fontSize: fontSizes.body,
    fontWeight: '700',
    color: c.coral,
  },

  budgetRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  currencyPrefix: {
    fontSize: fontSizes.body,
    fontWeight: '600',
    color: c.textSecondary,
    paddingTop: 14,
    paddingBottom: 14,
  },

  saveContainer: {
    paddingHorizontal: 20,
    paddingBottom: Platform.OS === 'ios' ? 8 : 20,
    paddingTop: 12,
    backgroundColor: c.background,
  },
  saveButton: {
    backgroundColor: c.coral,
    borderRadius: radii.button,
    paddingVertical: 16,
    alignItems: 'center',
    shadowColor: c.coral,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.35,
    shadowRadius: 8,
    elevation: 5,
  },
  saveButtonDisabled: { opacity: 0.45 },
  saveText: {
    fontSize: fontSizes.body,
    fontWeight: '700',
    color: c.card,
    letterSpacing: 0.3,
  },
});
