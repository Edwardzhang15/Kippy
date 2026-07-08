import { Fragment, useState } from 'react';
import {
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
  Alert,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { type NativeStackScreenProps } from '@react-navigation/native-stack';
import { useTranslation } from 'react-i18next';
import { type PersonalStackParamList } from '../navigation/types';
import { createPersonalTrip, updatePersonalTrip, getPersonalTrip, setPersonalTripBudget } from '../db';
import { CATEGORIES } from '../categories';
import { type ColorPalette, fontSizes, radii, cardShadow } from '../theme';
import { useTheme } from '../context/ThemeContext';
import { getCurrencySymbol, formatAmount } from '../utils';
import { useFocusEffect } from '@react-navigation/native';
import { useCallback } from 'react';
import { DONE_BAR_ID } from '../components/KeyboardDoneBar';

type Props = NativeStackScreenProps<PersonalStackParamList, 'CreatePersonalTrip'>;

const CURRENCIES = ['CAD', 'USD', 'EUR', 'GBP', 'AUD', 'JPY', 'CNY', 'SGD', 'HKD', 'NZD'];
const UNSPLASH_KEY = process.env.EXPO_PUBLIC_UNSPLASH_API_KEY ?? '';

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
  root:            { flex: 1, backgroundColor: c.background },
  header:          { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 20, paddingTop: 56, paddingBottom: 12 },
  backBtn:         { width: 36, height: 36, borderRadius: 18, backgroundColor: c.card, alignItems: 'center', justifyContent: 'center' },
  title:           { flex: 1, fontSize: fontSizes.sectionTitle, fontWeight: '700', color: c.textPrimary, textAlign: 'center' },
  spacer:          { width: 36 },
  body:            { flex: 1, paddingHorizontal: 20 },
  label:           { fontSize: fontSizes.caption, fontWeight: '600', color: c.textSecondary, marginBottom: 6, marginTop: 20, textTransform: 'uppercase', letterSpacing: 0.5 },
  input:           { backgroundColor: c.card, borderRadius: radii.button, paddingHorizontal: 16, paddingVertical: 13, fontSize: fontSizes.body, color: c.textPrimary },
  currencyRow:     { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  currChip:        { paddingHorizontal: 14, paddingVertical: 8, borderRadius: 20, backgroundColor: c.card, borderWidth: 1.5, borderColor: c.border },
  currChipActive:  { borderColor: c.coral, backgroundColor: '#FFF0EE' },
  currText:        { fontSize: fontSizes.caption, fontWeight: '600', color: c.textSecondary },
  currTextActive:  { color: c.coral },
  hint:            { fontSize: fontSizes.caption, color: c.textSecondary, marginTop: 6 },
  budgetInputWrap: { flexDirection: 'row', alignItems: 'center', backgroundColor: c.card, borderRadius: radii.button, paddingHorizontal: 16 },
  budgetSym:       { fontSize: fontSizes.body, fontWeight: '600', color: c.textSecondary, marginRight: 6 },
  budgetInput:     { flex: 1, paddingVertical: 13, fontSize: fontSizes.body, color: c.textPrimary },

  // Category budget section
  catToggle:       { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginTop: 28, marginBottom: 4, paddingVertical: 4 },
  catToggleLabel:  { fontSize: fontSizes.caption, fontWeight: '700', color: c.textSecondary, textTransform: 'uppercase', letterSpacing: 0.7 },
  catToggleRight:  { flexDirection: 'row', alignItems: 'center', gap: 4 },
  catToggleSub:    { fontSize: fontSizes.caption, color: c.textSecondary },
  catHint:         { fontSize: fontSizes.caption, color: c.textSecondary, marginBottom: 12 },
  catRow:          { backgroundColor: c.card, borderRadius: radii.card, paddingHorizontal: 14, paddingVertical: 12, flexDirection: 'row', alignItems: 'center', gap: 10 },
  catRowOver:      { borderWidth: 1.5, borderColor: c.coral },
  catIcon:         { width: 30, height: 30, borderRadius: 15, alignItems: 'center', justifyContent: 'center', flexShrink: 0 },
  catName:         { flex: 1, fontSize: fontSizes.body, fontWeight: '600', color: c.textPrimary },
  catInputWrap:    { flexDirection: 'row', alignItems: 'center', gap: 4 },
  catSym:          { fontSize: fontSizes.body, color: c.textSecondary },
  catInput:        { backgroundColor: c.background, borderRadius: radii.button, paddingHorizontal: 10, paddingVertical: 7, fontSize: fontSizes.body, color: c.textPrimary, minWidth: 72, textAlign: 'right' },
  totalRow:        { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingHorizontal: 4, marginTop: 4, marginBottom: 6 },
  totalLabel:      { fontSize: fontSizes.caption, fontWeight: '600', color: c.textSecondary },
  totalValue:      { fontSize: fontSizes.caption, fontWeight: '700', color: c.textPrimary },
  totalValueOver:  { color: c.coral },
  warningBox:      { flexDirection: 'row', alignItems: 'flex-start', gap: 8, backgroundColor: `${c.coral}1A`, borderRadius: radii.card, padding: 10, marginTop: 6 },
  warningText:     { flex: 1, fontSize: fontSizes.caption, fontWeight: '600', color: c.coral, lineHeight: 18 },

  saveBtn:         { margin: 20, marginTop: 32, backgroundColor: c.coral, borderRadius: radii.button, paddingVertical: 16, alignItems: 'center' },
  saveBtnText:     { fontSize: fontSizes.body, fontWeight: '700', color: '#fff' },
});

export default function CreatePersonalTripScreen({ navigation, route }: Props) {
  const { t } = useTranslation();
  const { colors } = useTheme();
  const styles = makeStyles(colors);
  const editingTripId = route.params?.tripId;
  const isEditing = editingTripId != null;

  const [name, setName] = useState('');
  const [currency, setCurrency] = useState('CAD');
  const [budgetText, setBudgetText] = useState('');
  const [destination, setDestination] = useState('');
  const [originalDestination, setOriginalDestination] = useState('');
  const [existingPhotoUrl, setExistingPhotoUrl] = useState<string | null>(null);
  const [catBudgets, setCatBudgets] = useState<Record<string, string>>({});
  const [catExpanded, setCatExpanded] = useState(true);
  const [saving, setSaving] = useState(false);

  useFocusEffect(useCallback(() => {
    if (isEditing) {
      getPersonalTrip(editingTripId!).then(trip => {
        if (trip) {
          setName(trip.name);
          setCurrency(trip.currency);
          setBudgetText(trip.budget_amount != null ? String(trip.budget_amount) : '');
          setDestination(trip.destination ?? '');
          setOriginalDestination(trip.destination ?? '');
          setExistingPhotoUrl(trip.destination_photo_url ?? null);
        }
      });
    }
  }, [editingTripId, isEditing]));

  async function handleSave() {
    const trimmed = name.trim();
    if (!trimmed) {
      Alert.alert(t('personalTrip.nameRequired'));
      return;
    }
    setSaving(true);
    try {
      const budget = budgetText ? parseFloat(budgetText) : null;
      const dest = destination.trim() || null;

      let photoUrl: string | null = null;
      if (dest) {
        if (isEditing && dest === originalDestination) {
          photoUrl = existingPhotoUrl;
        } else {
          photoUrl = await fetchDestinationPhoto(dest);
        }
      }

      if (isEditing) {
        await updatePersonalTrip(editingTripId!, trimmed, currency, budget, dest, photoUrl);
        navigation.goBack();
      } else {
        const id = await createPersonalTrip(trimmed, currency, budget, dest, photoUrl);
        // Save any non-zero category budgets entered during creation
        for (const cat of CATEGORIES) {
          const val = parseFloat(catBudgets[cat.id] ?? '') || 0;
          if (val > 0) {
            await setPersonalTripBudget(id, cat.id, val);
          }
        }
        navigation.replace('PersonalTripDetail', { tripId: id });
      }
    } finally {
      setSaving(false);
    }
  }

  const sym = getCurrencySymbol(currency);
  const filledCatCount = CATEGORIES.filter(cat => parseFloat(catBudgets[cat.id] ?? '') > 0).length;

  const tripBudget = budgetText ? parseFloat(budgetText) : null;
  const catTotal = CATEGORIES.reduce((sum, cat) => sum + (parseFloat(catBudgets[cat.id] ?? '') || 0), 0);
  const isOverBudget = tripBudget !== null && !isNaN(tripBudget) && tripBudget > 0 && catTotal >= tripBudget;

  let overflowCat: string | null = null;
  if (isOverBudget && tripBudget) {
    let running = 0;
    for (const cat of CATEGORIES) {
      running += parseFloat(catBudgets[cat.id] ?? '') || 0;
      if (running >= tripBudget) { overflowCat = cat.id; break; }
    }
  }

  return (
    <KeyboardAvoidingView style={styles.root} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
      <View style={styles.header}>
        <Pressable style={styles.backBtn} onPress={() => navigation.goBack()}>
          <Ionicons name="chevron-back" size={18} color={colors.textPrimary} />
        </Pressable>
        <Text style={styles.title}>
          {isEditing ? t('personalTrip.editTitle') : t('personalTrip.newTitle')}
        </Text>
        <View style={styles.spacer} />
      </View>

      <ScrollView style={styles.body} keyboardShouldPersistTaps="handled" contentContainerStyle={{ paddingBottom: 20 }}>
        <Text style={styles.label}>{t('personalTrip.tripName')}</Text>
        <TextInput
          style={styles.input}
          value={name}
          onChangeText={setName}
          placeholder={t('personalTrip.tripNamePlaceholder')}
          placeholderTextColor={colors.textSecondary}
          inputAccessoryViewID={DONE_BAR_ID}
          returnKeyType="done"
        />

        <Text style={styles.label}>{t('personalTrip.destination')}</Text>
        <TextInput
          style={styles.input}
          value={destination}
          onChangeText={setDestination}
          placeholder={t('personalTrip.destinationPlaceholder')}
          placeholderTextColor={colors.textSecondary}
          inputAccessoryViewID={DONE_BAR_ID}
          returnKeyType="done"
        />
        <Text style={styles.hint}>{t('personalTrip.destinationHint')}</Text>

        <Text style={styles.label}>{t('personalTrip.currency')}</Text>
        <View style={styles.currencyRow}>
          {CURRENCIES.map(c => (
            <Pressable
              key={c}
              style={[styles.currChip, cardShadow, c === currency && styles.currChipActive]}
              onPress={() => setCurrency(c)}
            >
              <Text style={[styles.currText, c === currency && styles.currTextActive]}>{c}</Text>
            </Pressable>
          ))}
        </View>

        <Text style={styles.label}>{t('personalTrip.totalBudget')}</Text>
        <View style={styles.budgetInputWrap}>
          <Text style={styles.budgetSym}>{sym}</Text>
          <TextInput
            style={styles.budgetInput}
            value={budgetText}
            onChangeText={setBudgetText}
            placeholder={t('personalTrip.budgetPlaceholder')}
            placeholderTextColor={colors.textSecondary}
            keyboardType="decimal-pad"
            inputAccessoryViewID={DONE_BAR_ID}
            returnKeyType="done"
          />
        </View>

        {/* Category budgets — only shown when creating */}
        {!isEditing && (
          <>
            <Pressable style={styles.catToggle} onPress={() => setCatExpanded(e => !e)}>
              <Text style={styles.catToggleLabel}>{t('personalTrip.categoryBudgetsOptional')}</Text>
              <View style={styles.catToggleRight}>
                {filledCatCount > 0 && (
                  <Text style={styles.catToggleSub}>{filledCatCount}</Text>
                )}
                <Ionicons
                  name={catExpanded ? 'chevron-up' : 'chevron-down'}
                  size={15}
                  color={colors.textSecondary}
                />
              </View>
            </Pressable>

            {catExpanded && (
              <>
                <Text style={styles.catHint}>{t('personalTrip.catBudgetCreationHint')}</Text>
                {CATEGORIES.map(cat => {
                  const isOverflowTrigger = cat.id === overflowCat;
                  return (
                    <View key={cat.id} style={{ marginBottom: 8 }}>
                      <View style={[styles.catRow, cardShadow, isOverflowTrigger && styles.catRowOver]}>
                        <View style={[styles.catIcon, { backgroundColor: cat.bg }]}>
                          <Ionicons name={cat.icon} size={14} color={cat.color} />
                        </View>
                        <Text style={styles.catName} numberOfLines={1}>
                          {t(`categories.${cat.id}`)}
                        </Text>
                        <View style={styles.catInputWrap}>
                          <Text style={styles.catSym}>{sym}</Text>
                          <TextInput
                            style={styles.catInput}
                            value={catBudgets[cat.id] ?? ''}
                            onChangeText={v => setCatBudgets(prev => ({ ...prev, [cat.id]: v }))}
                            placeholder="-"
                            placeholderTextColor={colors.textSecondary}
                            keyboardType="decimal-pad"
                            inputAccessoryViewID={DONE_BAR_ID}
                            returnKeyType="done"
                          />
                        </View>
                      </View>
                      {isOverflowTrigger && tripBudget !== null && !isNaN(tripBudget) && tripBudget > 0 && (
                        <View style={styles.warningBox}>
                          <Ionicons name="warning-outline" size={14} color={colors.coral} />
                          <Text style={styles.warningText}>
                            {t('personalTrip.budgetOverflowWarning', { sym, amount: formatAmount(catTotal - tripBudget, currency) })}
                          </Text>
                        </View>
                      )}
                    </View>
                  );
                })}

                {tripBudget !== null && !isNaN(tripBudget) && tripBudget > 0 && (
                  <View style={styles.totalRow}>
                    <Text style={styles.totalLabel}>{t('personalTrip.categoryTotal')}</Text>
                    <Text style={[styles.totalValue, isOverBudget && styles.totalValueOver]}>
                      {sym}{formatAmount(catTotal, currency)} / {sym}{formatAmount(tripBudget, currency)}
                    </Text>
                  </View>
                )}
              </>
            )}
          </>
        )}
      </ScrollView>

      <Pressable style={styles.saveBtn} onPress={handleSave} disabled={saving}>
        <Text style={styles.saveBtnText}>{saving ? t('personalTrip.saving') : t('personalTrip.save')}</Text>
      </Pressable>
    </KeyboardAvoidingView>
  );
}
