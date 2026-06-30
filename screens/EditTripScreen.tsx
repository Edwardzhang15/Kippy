import { useEffect, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
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
import { useNavigation, useRoute } from '@react-navigation/native';
import { useTranslation } from 'react-i18next';
import {
  getGroup, updateGroup,
  getMembers, updateMemberName, getMemberHasExpenses, deleteMember, addMember,
} from '../db';
import { type ColorPalette, fontSizes, radii, cardShadow } from '../theme';
import { useTheme } from '../context/ThemeContext';
import { DONE_BAR_ID } from '../components/KeyboardDoneBar';

const CURRENCIES = ['CAD', 'USD', 'EUR', 'GBP', 'AUD', 'JPY'];
const UNSPLASH_KEY = '_dJ9KWj8_6gx-it3O-USLvSCHVRLH39n2okh6S3Onlo';

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
  input: {
    fontSize: fontSizes.body,
    color: c.textPrimary,
    paddingVertical: 14,
  },
  photoRefetchHint: {
    fontSize: fontSizes.caption,
    color: c.coral,
    marginTop: 6,
    fontStyle: 'italic',
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
  membersCard: {
    backgroundColor: c.card,
    borderRadius: radii.card,
    paddingHorizontal: 16,
  },
  memberRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  memberInput: {
    flex: 1,
    fontSize: fontSizes.body,
    color: c.textPrimary,
    paddingVertical: 14,
  },
  divider: {
    height: 1,
    backgroundColor: c.border,
  },
  addMemberBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginTop: 12,
    alignSelf: 'flex-start',
  },
  addMemberText: {
    fontSize: fontSizes.body,
    fontWeight: '600',
    color: c.coral,
  },
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
  datePlaceholder: { color: c.textSecondary },
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
    color: '#fff',
    letterSpacing: 0.3,
  },
});

function SectionLabel({ title }: { title: string }) {
  const { colors } = useTheme();
  const styles = makeStyles(colors);
  return <Text style={styles.sectionLabel}>{title}</Text>;
}

function toISODate(d: Date): string {
  return d.toISOString().split('T')[0];
}

function parseISODate(s: string | null): Date | null {
  if (!s) return null;
  const [y, m, d] = s.split('-').map(Number);
  return new Date(y, m - 1, d);
}

function formatDisplayDate(d: Date): string {
  return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
}

type MemberEdit = {
  id: number | null;
  name: string;
};

export default function EditTripScreen() {
  const { t } = useTranslation();
  const navigation = useNavigation<any>();
  const route      = useRoute<any>();
  const groupId    = (route.params as { groupId: number }).groupId;
  const { colors } = useTheme();
  const styles     = makeStyles(colors);

  const [loading, setLoading]         = useState(true);
  const [saving, setSaving]           = useState(false);
  const [isPlan, setIsPlan]           = useState(false);

  const [tripName, setTripName]       = useState('');
  const [destination, setDestination] = useState('');
  const [currency, setCurrency]       = useState('CAD');
  const [startDate, setStartDate]     = useState<Date | null>(null);
  const [endDate, setEndDate]         = useState<Date | null>(null);
  const [budget, setBudget]           = useState('');
  const [showStart, setShowStart]     = useState(false);
  const [showEnd, setShowEnd]         = useState(false);

  const [members, setMembers]         = useState<MemberEdit[]>([]);
  const [idsToDelete, setIdsToDelete] = useState<number[]>([]);

  const [originalDestination, setOriginalDestination] = useState('');
  const [originalPhotoUrl, setOriginalPhotoUrl]       = useState<string | null>(null);

  useEffect(() => {
    Promise.all([getGroup(groupId), getMembers(groupId)]).then(([group, memberList]) => {
      if (!group) { navigation.goBack(); return; }
      setTripName(group.name);
      setDestination(group.destination ?? '');
      setCurrency(group.currency);
      setOriginalDestination(group.destination ?? '');
      setOriginalPhotoUrl(group.destination_photo_url ?? null);
      setIsPlan(group.is_planning === 1);
      setStartDate(parseISODate(group.planned_start_date));
      setEndDate(parseISODate(group.planned_end_date));
      setBudget(group.budget_per_person != null ? String(group.budget_per_person) : '');
      setMembers(memberList.map((m) => ({ id: m.id, name: m.name })));
      setLoading(false);
    });
  }, [groupId]);

  const canSave =
    tripName.trim().length > 0 &&
    members.some((m) => m.name.trim().length > 0) &&
    !saving;

  const handleRemoveMember = async (index: number) => {
    const m = members[index];
    if (m.id !== null) {
      const hasExp = await getMemberHasExpenses(m.id);
      if (hasExp) {
        Alert.alert(
          t('editTrip.cannotRemoveTitle'),
          t('editTrip.cannotRemoveMsg', { name: m.name }),
        );
        return;
      }
      setIdsToDelete((prev) => [...prev, m.id!]);
    }
    setMembers((prev) => prev.filter((_, i) => i !== index));
  };

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
    setSaving(true);
    try {
      const dest = destination.trim();
      const destChanged = dest !== originalDestination;

      let photoUrl: string | null = originalPhotoUrl;
      if (destChanged) {
        photoUrl = dest ? await fetchDestinationPhoto(dest) : null;
      }

      const parsedBudget = parseFloat(budget);
      const updates: Parameters<typeof updateGroup>[1] = {
        name: tripName.trim(),
        destination: dest || null,
        destination_photo_url: photoUrl,
        currency,
      };
      if (isPlan) {
        updates.planned_start_date = startDate ? toISODate(startDate) : null;
        updates.planned_end_date   = endDate   ? toISODate(endDate)   : null;
        updates.budget_per_person  = !isNaN(parsedBudget) && parsedBudget > 0 ? parsedBudget : null;
      }

      for (const id of idsToDelete) {
        await deleteMember(id);
      }
      for (const m of members) {
        if (m.id !== null && m.name.trim().length > 0) {
          await updateMemberName(m.id, m.name.trim());
        } else if (m.id === null && m.name.trim().length > 0) {
          await addMember(groupId, m.name.trim());
        }
      }

      await updateGroup(groupId, updates);
      navigation.goBack();
    } catch {
      setSaving(false);
      Alert.alert(t('editTrip.errorTitle'), t('editTrip.errorMsg'));
    }
  };

  if (loading) {
    return (
      <SafeAreaView style={styles.safe}>
        <View style={styles.header}>
          <Pressable onPress={() => navigation.goBack()} hitSlop={12}>
            <Ionicons name="close" size={24} color={colors.textPrimary} />
          </Pressable>
          <Text style={styles.headerTitle}>{t('editTrip.title')}</Text>
          <View style={{ width: 24 }} />
        </View>
        <ActivityIndicator style={{ marginTop: 40 }} color={colors.coral} />
      </SafeAreaView>
    );
  }

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
          <Text style={styles.headerTitle}>{t('editTrip.title')}</Text>
          <View style={{ width: 24 }} />
        </View>

        <ScrollView
          contentContainerStyle={styles.scroll}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
        >
          <SectionLabel title={t('editTrip.tripName')} />
          <View style={[styles.inputCard, cardShadow]}>
            <TextInput
              style={styles.input}
              placeholder={t('editTrip.tripNamePlaceholder')}
              placeholderTextColor={colors.textSecondary}
              inputAccessoryViewID={DONE_BAR_ID}
              value={tripName}
              onChangeText={setTripName}
              returnKeyType="done"
            />
          </View>

          <SectionLabel title={t('editTrip.destination')} />
          <View style={[styles.inputCard, cardShadow]}>
            <TextInput
              style={styles.input}
              placeholder={t('editTrip.destinationPlaceholder')}
              placeholderTextColor={colors.textSecondary}
              inputAccessoryViewID={DONE_BAR_ID}
              value={destination}
              onChangeText={setDestination}
              returnKeyType="done"
            />
          </View>
          {destination.trim() !== originalDestination && destination.trim().length > 0 && (
            <Text style={styles.photoRefetchHint}>
              {t('editTrip.photoRefetchHint')}
            </Text>
          )}
          {destination.trim() === '' && originalDestination !== '' && (
            <Text style={styles.photoRefetchHint}>
              {t('editTrip.photoClearHint')}
            </Text>
          )}

          <SectionLabel title={t('editTrip.currency')} />
          <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.chipScroll}>
            {CURRENCIES.map((cur) => (
              <Pressable
                key={cur}
                style={[styles.chip, currency === cur && styles.chipSelected]}
                onPress={() => setCurrency(cur)}
              >
                <Text style={[styles.chipText, currency === cur && styles.chipTextSelected]}>
                  {cur}
                </Text>
              </Pressable>
            ))}
          </ScrollView>

          <SectionLabel title={t('editTrip.members')} />
          <View style={[styles.membersCard, cardShadow]}>
            {members.map((m, index) => (
              <View key={m.id !== null ? String(m.id) : `new-${index}`}>
                {index > 0 && <View style={styles.divider} />}
                <View style={styles.memberRow}>
                  <TextInput
                    style={styles.memberInput}
                    placeholder={m.id === null ? t('editTrip.newMemberPlaceholder') : m.name}
                    placeholderTextColor={colors.textSecondary}
                    inputAccessoryViewID={DONE_BAR_ID}
                    value={m.name}
                    onChangeText={(v) =>
                      setMembers((prev) => prev.map((x, i) => (i === index ? { ...x, name: v } : x)))
                    }
                    returnKeyType="done"
                  />
                  {members.length > 1 && (
                    <Pressable onPress={() => handleRemoveMember(index)} hitSlop={8}>
                      <Ionicons name="close-circle" size={20} color={colors.textSecondary} />
                    </Pressable>
                  )}
                </View>
              </View>
            ))}
          </View>
          <Pressable
            style={styles.addMemberBtn}
            onPress={() => setMembers((prev) => [...prev, { id: null, name: '' }])}
          >
            <Ionicons name="add-circle-outline" size={18} color={colors.coral} />
            <Text style={styles.addMemberText}>{t('editTrip.addMember')}</Text>
          </Pressable>

          {isPlan && (
            <>
              <SectionLabel title={t('editTrip.plannedDates')} />
              <View style={[styles.datesCard, cardShadow]}>
                <Pressable style={styles.dateRow} onPress={() => setShowStart(true)}>
                  <Ionicons name="calendar-outline" size={18} color={colors.textSecondary} />
                  <View style={{ flex: 1 }}>
                    <Text style={styles.dateLabelSmall}>{t('editTrip.startDate')}</Text>
                    <Text style={[styles.dateValue, !startDate && styles.datePlaceholder]}>
                      {startDate ? formatDisplayDate(startDate) : t('editTrip.notSet')}
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
                    <Text style={styles.dateLabelSmall}>{t('editTrip.endDate')}</Text>
                    <Text style={[styles.dateValue, !endDate && styles.datePlaceholder]}>
                      {endDate ? formatDisplayDate(endDate) : t('editTrip.notSet')}
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

              <SectionLabel title={t('editTrip.budgetPerPerson')} />
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
            </>
          )}
        </ScrollView>

        <View style={styles.saveContainer}>
          <Pressable
            style={[styles.saveButton, !canSave && styles.saveButtonDisabled]}
            onPress={handleSave}
            disabled={!canSave}
          >
            {saving ? (
              <ActivityIndicator color="#fff" size="small" />
            ) : (
              <Text style={styles.saveText}>{t('editTrip.saveChanges')}</Text>
            )}
          </Pressable>
        </View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}
