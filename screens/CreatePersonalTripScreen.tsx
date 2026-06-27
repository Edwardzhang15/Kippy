import { useState } from 'react';
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
import { createPersonalTrip, updatePersonalTrip, getPersonalTrip } from '../db';
import { type ColorPalette, fontSizes, radii, cardShadow } from '../theme';
import { useTheme } from '../context/ThemeContext';
import { useFocusEffect } from '@react-navigation/native';
import { useCallback } from 'react';

type Props = NativeStackScreenProps<PersonalStackParamList, 'CreatePersonalTrip'>;

const CURRENCIES = ['CAD', 'USD', 'EUR', 'GBP', 'AUD', 'JPY', 'CNY', 'SGD', 'HKD', 'NZD'];

const makeStyles = (c: ColorPalette) => StyleSheet.create({
  root:       { flex: 1, backgroundColor: c.background },
  header:     { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 20, paddingTop: 56, paddingBottom: 12 },
  backBtn:    { width: 36, height: 36, borderRadius: 18, backgroundColor: c.card, alignItems: 'center', justifyContent: 'center' },
  title:      { flex: 1, fontSize: fontSizes.sectionTitle, fontWeight: '700', color: c.textPrimary, textAlign: 'center' },
  spacer:     { width: 36 },
  body:       { flex: 1, paddingHorizontal: 20 },
  label:      { fontSize: fontSizes.caption, fontWeight: '600', color: c.textSecondary, marginBottom: 6, marginTop: 20, textTransform: 'uppercase', letterSpacing: 0.5 },
  input:      { backgroundColor: c.card, borderRadius: radii.button, paddingHorizontal: 16, paddingVertical: 13, fontSize: fontSizes.body, color: c.textPrimary },
  currencyRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  currChip:   { paddingHorizontal: 14, paddingVertical: 8, borderRadius: 20, backgroundColor: c.card, borderWidth: 1.5, borderColor: c.border },
  currChipActive: { borderColor: c.coral, backgroundColor: '#FFF0EE' },
  currText:   { fontSize: fontSizes.caption, fontWeight: '600', color: c.textSecondary },
  currTextActive: { color: c.coral },
  saveBtn:    { margin: 20, marginTop: 32, backgroundColor: c.coral, borderRadius: radii.button, paddingVertical: 16, alignItems: 'center' },
  saveBtnText: { fontSize: fontSizes.body, fontWeight: '700', color: '#fff' },
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
  const [saving, setSaving] = useState(false);

  useFocusEffect(useCallback(() => {
    if (isEditing) {
      getPersonalTrip(editingTripId!).then(trip => {
        if (trip) {
          setName(trip.name);
          setCurrency(trip.currency);
          setBudgetText(trip.budget_amount != null ? String(trip.budget_amount) : '');
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
      if (isEditing) {
        await updatePersonalTrip(editingTripId!, trimmed, currency, budget);
        navigation.goBack();
      } else {
        const id = await createPersonalTrip(trimmed, currency, budget);
        navigation.replace('PersonalTripDetail', { tripId: id });
      }
    } finally {
      setSaving(false);
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

      <ScrollView style={styles.body} keyboardShouldPersistTaps="handled">
        <Text style={styles.label}>{t('personalTrip.tripName')}</Text>
        <TextInput
          style={styles.input}
          value={name}
          onChangeText={setName}
          placeholder={t('personalTrip.tripNamePlaceholder')}
          placeholderTextColor={colors.textSecondary}
        />

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
        <TextInput
          style={styles.input}
          value={budgetText}
          onChangeText={setBudgetText}
          placeholder={t('personalTrip.budgetPlaceholder')}
          placeholderTextColor={colors.textSecondary}
          keyboardType="decimal-pad"
        />
      </ScrollView>

      <Pressable style={styles.saveBtn} onPress={handleSave} disabled={saving}>
        <Text style={styles.saveBtnText}>{saving ? t('personalTrip.saving') : t('personalTrip.save')}</Text>
      </Pressable>
    </KeyboardAvoidingView>
  );
}
