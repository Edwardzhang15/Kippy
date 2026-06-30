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
import { Ionicons } from '@expo/vector-icons';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { useTranslation } from 'react-i18next';
import { HomeStackParamList } from '../navigation/types';
import { createGroup, addMember, addTripStop } from '../db';
import { type ColorPalette, fontSizes, radii, cardShadow } from '../theme';
import { useTheme } from '../context/ThemeContext';
import { DONE_BAR_ID } from '../components/KeyboardDoneBar';

type Props = NativeStackScreenProps<HomeStackParamList, 'CreateGroup'>;

const CURRENCIES = ['CAD', 'USD', 'EUR', 'GBP', 'AUD', 'JPY'];
const STOP_CITY_EXAMPLES = ['Tokyo', 'Kyoto', 'Osaka', 'Rome', 'Paris', 'Barcelona'];

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
  safe: {
    flex: 1,
    backgroundColor: c.background,
  },
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
  chipScroll: {
    flexGrow: 0,
  },
  chip: {
    paddingHorizontal: 18,
    paddingVertical: 10,
    borderRadius: 20,
    backgroundColor: c.card,
    marginRight: 8,
    borderWidth: 2,
    borderColor: 'transparent',
  },
  chipSelected: {
    borderColor: c.coral,
  },
  chipText: {
    fontSize: fontSizes.body,
    fontWeight: '600',
    color: c.textSecondary,
  },
  chipTextSelected: {
    color: c.coral,
  },
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
  saveButtonDisabled: {
    opacity: 0.45,
  },
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

export default function CreateGroupScreen({ navigation }: Props) {
  const { t }                         = useTranslation();
  const { colors }                    = useTheme();
  const styles                        = makeStyles(colors);
  const [groupName, setGroupName]     = useState('');
  const [destination, setDestination] = useState('');
  const [currency, setCurrency]       = useState('CAD');
  const [members, setMembers]         = useState(['', '']);
  const [saving, setSaving]           = useState(false);
  const [destError, setDestError]     = useState(false);
  const [stops, setStops]             = useState<string[]>([]);

  const addStopField = () => setStops((prev) => [...prev, '']);
  const updateStop   = (i: number, v: string) => setStops((prev) => prev.map((s, idx) => idx === i ? v : s));
  const removeStop   = (i: number) => setStops((prev) => prev.filter((_, idx) => idx !== i));

  const addMemberField = () => setMembers((prev) => [...prev, '']);

  const updateMember = (index: number, value: string) => {
    setMembers((prev) => prev.map((m, i) => (i === index ? value : m)));
  };

  const removeMember = (index: number) => {
    setMembers((prev) => prev.filter((_, i) => i !== index));
  };

  const canSave =
    groupName.trim().length > 0 &&
    members.some((m) => m.trim().length > 0) &&
    !saving;

  const handleSave = async () => {
    if (!canSave) return;
    if (!destination.trim()) { setDestError(true); return; }
    setSaving(true);
    try {
      const dest = destination.trim();
      const photoUrl = dest ? await fetchDestinationPhoto(dest) : null;
      const groupId = await createGroup(
        groupName.trim(),
        currency,
        dest || undefined,
        photoUrl ?? undefined,
      );
      for (const name of members) {
        if (name.trim().length > 0) {
          await addMember(groupId, name.trim());
        }
      }
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
          <Text style={styles.headerTitle}>{t('createGroup.title')}</Text>
          <View style={{ width: 24 }} />
        </View>

        <ScrollView
          contentContainerStyle={styles.scroll}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
        >
          <SectionLabel title={t('createGroup.groupName')} />
          <View style={[styles.inputCard, cardShadow]}>
            <TextInput
              style={styles.input}
              placeholder={t('createGroup.groupNamePlaceholder')}
              placeholderTextColor={colors.textSecondary}
              inputAccessoryViewID={DONE_BAR_ID}
              value={groupName}
              onChangeText={setGroupName}
              returnKeyType="done"
            />
          </View>

          <SectionLabel title={t('createGroup.destination')} />
          <View style={[styles.inputCard, cardShadow, destError && styles.inputCardError]}>
            <TextInput
              style={styles.input}
              placeholder={t('createGroup.destinationPlaceholder')}
              placeholderTextColor={colors.textSecondary}
              inputAccessoryViewID={DONE_BAR_ID}
              value={destination}
              onChangeText={(v) => { setDestination(v); if (destError) setDestError(false); }}
              returnKeyType="done"
            />
          </View>
          {destError && <Text style={styles.fieldError}>{t('createGroup.destinationRequired')}</Text>}

          <SectionLabel title={t('createGroup.stops')} />

          {stops.length > 0 && (
            <View style={[styles.membersCard, cardShadow]}>
              {stops.map((stop, index) => (
                <View key={index}>
                  {index > 0 && <View style={styles.divider} />}
                  <View style={styles.memberRow}>
                    <Ionicons name="location-outline" size={16} color={colors.textSecondary} />
                    <TextInput
                      style={styles.memberInput}
                      placeholder={t('createGroup.stopPlaceholder', { number: index + 1, city: STOP_CITY_EXAMPLES[index % STOP_CITY_EXAMPLES.length] })}
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

          <Pressable style={styles.addMemberBtn} onPress={addStopField}>
            <Ionicons name="add-circle-outline" size={18} color={colors.coral} />
            <Text style={styles.addMemberText}>{t('createGroup.addStop')}</Text>
          </Pressable>

          <SectionLabel title={t('createGroup.currency')} />
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

          <SectionLabel title={t('createGroup.members')} />
          <View style={[styles.membersCard, cardShadow]}>
            {members.map((name, index) => (
              <View key={index}>
                {index > 0 && <View style={styles.divider} />}
                <View style={styles.memberRow}>
                  <TextInput
                    style={styles.memberInput}
                    placeholder={t('createGroup.memberPlaceholder', { number: index + 1 })}
                    placeholderTextColor={colors.textSecondary}
                    inputAccessoryViewID={DONE_BAR_ID}
                    value={name}
                    onChangeText={(v) => updateMember(index, v)}
                    returnKeyType="done"
                  />
                  {members.length > 1 && (
                    <Pressable onPress={() => removeMember(index)} hitSlop={8}>
                      <Ionicons name="close-circle" size={20} color={colors.textSecondary} />
                    </Pressable>
                  )}
                </View>
              </View>
            ))}
          </View>

          <Pressable style={styles.addMemberBtn} onPress={addMemberField}>
            <Ionicons name="add-circle-outline" size={18} color={colors.coral} />
            <Text style={styles.addMemberText}>{t('createGroup.addMember')}</Text>
          </Pressable>
        </ScrollView>

        <View style={styles.saveContainer}>
          <Pressable
            style={[styles.saveButton, !canSave && styles.saveButtonDisabled]}
            onPress={handleSave}
            disabled={!canSave}
          >
            <Text style={styles.saveText}>
              {saving ? t('createGroup.creating') : t('createGroup.create')}
            </Text>
          </Pressable>
        </View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}
