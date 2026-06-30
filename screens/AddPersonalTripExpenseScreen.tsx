import { useCallback, useRef, useState } from 'react';
import {
  Alert,
  Dimensions,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { type NativeStackScreenProps } from '@react-navigation/native-stack';
import { useFocusEffect } from '@react-navigation/native';
import { useTranslation } from 'react-i18next';
import DateTimePicker from '@react-native-community/datetimepicker';
import { type PersonalStackParamList } from '../navigation/types';
import {
  addPersonalTripExpense, updatePersonalTripExpense,
  deletePersonalTripExpense, getPersonalTripExpense,
  getPersonalTrip,
} from '../db';
import { CATEGORIES } from '../categories';
import { type ColorPalette, fontSizes, radii, cardShadow } from '../theme';
import { useTheme } from '../context/ThemeContext';
import { getCurrencySymbol } from '../utils';
import { DONE_BAR_ID } from '../components/KeyboardDoneBar';

type Props = NativeStackScreenProps<PersonalStackParamList, 'AddPersonalTripExpense'>;

const GRID_COLS = 4;
const GRID_GAP  = 8;
const H_PAD     = 20;
const ITEM_W    = (Dimensions.get('window').width - H_PAD * 2 - GRID_GAP * (GRID_COLS - 1)) / GRID_COLS;

const makeStyles = (c: ColorPalette) => StyleSheet.create({
  root:           { flex: 1, backgroundColor: c.background },
  header:         { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 20, paddingTop: 56, paddingBottom: 12 },
  backBtn:        { width: 36, height: 36, borderRadius: 18, backgroundColor: c.card, alignItems: 'center', justifyContent: 'center' },
  title:          { flex: 1, fontSize: fontSizes.sectionTitle, fontWeight: '700', color: c.textPrimary, textAlign: 'center' },
  deleteBtn:      { width: 36, height: 36, borderRadius: 18, backgroundColor: '#FFF0EE', alignItems: 'center', justifyContent: 'center' },
  spacer:         { width: 36 },
  body:           { flex: 1, paddingHorizontal: H_PAD },
  label:          { fontSize: fontSizes.caption, fontWeight: '600', color: c.textSecondary, marginBottom: 6, marginTop: 20, textTransform: 'uppercase', letterSpacing: 0.5 },
  amountRow:      { alignItems: 'center', marginTop: 12, marginBottom: 4 },
  amountDisplay:  { flexDirection: 'row', alignItems: 'baseline', gap: 2 },
  currSym:        { fontSize: 28, fontWeight: '700', color: c.textPrimary },
  amountText:     { fontSize: 48, fontWeight: '700', color: c.textPrimary, minWidth: 80, textAlign: 'center' },
  hiddenInput:    { position: 'absolute', width: 1, height: 1, opacity: 0 },

  // Fixed-width 4-column category grid
  catGrid:        { flexDirection: 'row', flexWrap: 'wrap', gap: GRID_GAP },
  catItem:        { width: ITEM_W, backgroundColor: c.card, borderRadius: radii.button, alignItems: 'center', paddingVertical: 10, gap: 4, borderWidth: 2, borderColor: 'transparent' },
  catItemActive:  { borderColor: c.coral },
  catIconBg:      { width: 36, height: 36, borderRadius: 10, alignItems: 'center', justifyContent: 'center' },
  catLabel:       { fontSize: 10, fontWeight: '500', color: c.textSecondary, textAlign: 'center' },
  catLabelActive: { color: c.coral, fontWeight: '700' },

  // Single-line note — no multiline so placeholder is vertically centred
  noteInput:      { backgroundColor: c.card, borderRadius: radii.button, paddingHorizontal: 16, paddingVertical: 13, fontSize: fontSizes.body, color: c.textPrimary },
  dateRow:        { flexDirection: 'row', alignItems: 'center', gap: 8, backgroundColor: c.card, borderRadius: radii.button, paddingHorizontal: 16, paddingVertical: 13 },
  dateText:       { fontSize: fontSizes.body, color: c.textPrimary, flex: 1 },
  datePickerWrap:    { backgroundColor: c.card, borderRadius: radii.button, marginTop: 8, overflow: 'hidden' },
  datePickerDoneRow: { flexDirection: 'row', justifyContent: 'flex-end', paddingHorizontal: 16, paddingVertical: 10, borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: c.border },
  datePickerDone:    { fontSize: fontSizes.body, fontWeight: '600', color: c.coral },
  saveBtn:        { margin: 20, marginTop: 24, backgroundColor: c.coral, borderRadius: radii.button, paddingVertical: 16, alignItems: 'center' },
  saveBtnText:    { fontSize: fontSizes.body, fontWeight: '700', color: '#fff' },
});

export default function AddPersonalTripExpenseScreen({ navigation, route }: Props) {
  const { t } = useTranslation();
  const { colors } = useTheme();
  const styles = makeStyles(colors);
  const { tripId, expenseId } = route.params;
  const isEditing = expenseId != null;

  const [tripCurrency, setTripCurrency] = useState('CAD');
  const [amountText, setAmountText] = useState('');
  const [category, setCategory] = useState('other');
  const [note, setNote] = useState('');
  const [date, setDate] = useState(new Date().toISOString().slice(0, 10));
  const [showDatePicker, setShowDatePicker] = useState(false);
  const [saving, setSaving] = useState(false);
  const inputRef = useRef<TextInput>(null);

  useFocusEffect(useCallback(() => {
    getPersonalTrip(tripId).then(trip => {
      if (trip) setTripCurrency(trip.currency);
    });
    if (isEditing) {
      getPersonalTripExpense(expenseId!).then(exp => {
        if (exp) {
          setAmountText(String(exp.amount));
          setCategory(exp.category);
          setNote(exp.note ?? '');
          setDate(exp.date);
        }
      });
    }
  }, [tripId, expenseId, isEditing]));

  const sym = getCurrencySymbol(tripCurrency);

  function formatDisplay(raw: string): string {
    if (!raw) return '0';
    const n = parseFloat(raw);
    return isNaN(n) ? '0' : n.toLocaleString(undefined, { minimumFractionDigits: 0, maximumFractionDigits: 2 });
  }

  async function handleSave() {
    const amount = parseFloat(amountText);
    if (!amountText || isNaN(amount) || amount <= 0) {
      Alert.alert(t('personalTrip.amountRequired'));
      return;
    }
    setSaving(true);
    try {
      const data = { personal_trip_id: tripId, amount, currency: tripCurrency, category, date, note: note || null, receipt_photo_uri: null };
      if (isEditing) {
        await updatePersonalTripExpense(expenseId!, data);
      } else {
        await addPersonalTripExpense(data);
      }
      navigation.goBack();
    } finally {
      setSaving(false);
    }
  }

  async function handleDelete() {
    Alert.alert(
      t('personalTrip.deleteExpenseTitle'),
      t('personalTrip.deleteExpenseMsg'),
      [
        { text: t('common.cancel'), style: 'cancel' },
        {
          text: t('common.delete'), style: 'destructive',
          onPress: async () => {
            await deletePersonalTripExpense(expenseId!);
            navigation.goBack();
          },
        },
      ],
    );
  }

  return (
    <KeyboardAvoidingView style={styles.root} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
      <View style={styles.header}>
        <Pressable style={styles.backBtn} onPress={() => navigation.goBack()}>
          <Ionicons name="chevron-back" size={18} color={colors.textPrimary} />
        </Pressable>
        <Text style={styles.title}>
          {isEditing ? t('personalTrip.editExpense') : t('personalTrip.newExpense')}
        </Text>
        {isEditing ? (
          <Pressable style={styles.deleteBtn} onPress={handleDelete}>
            <Ionicons name="trash-outline" size={16} color={colors.coral} />
          </Pressable>
        ) : (
          <View style={styles.spacer} />
        )}
      </View>

      <ScrollView style={styles.body} keyboardShouldPersistTaps="handled" contentContainerStyle={{ paddingBottom: 20 }}>
        {/* Amount */}
        <Pressable style={styles.amountRow} onPress={() => inputRef.current?.focus()}>
          <View style={styles.amountDisplay}>
            <Text style={styles.currSym}>{sym}</Text>
            <Text style={styles.amountText}>{formatDisplay(amountText)}</Text>
            <Text style={[styles.currSym, { opacity: 0 }]} aria-hidden>{sym}</Text>
          </View>
        </Pressable>
        <TextInput
          ref={inputRef}
          style={styles.hiddenInput}
          value={amountText}
          onChangeText={setAmountText}
          keyboardType="decimal-pad"
          returnKeyType="done"
          inputAccessoryViewID={DONE_BAR_ID}
        />

        {/* Category */}
        <Text style={styles.label}>{t('addExpense.category')}</Text>
        <View style={styles.catGrid}>
          {CATEGORIES.map(cat => {
            const selected = category === cat.id;
            return (
              <Pressable
                key={cat.id}
                style={[styles.catItem, cardShadow, selected && styles.catItemActive]}
                onPress={() => setCategory(cat.id)}
              >
                <View style={[styles.catIconBg, { backgroundColor: selected ? cat.bg : colors.border }]}>
                  <Ionicons
                    name={cat.icon}
                    size={18}
                    color={selected ? cat.color : colors.textSecondary}
                  />
                </View>
                <Text
                  style={[styles.catLabel, selected && styles.catLabelActive]}
                  numberOfLines={1}
                  adjustsFontSizeToFit
                  minimumFontScale={0.7}
                >
                  {t(`categories.${cat.id}`)}
                </Text>
              </Pressable>
            );
          })}
        </View>

        {/* Note */}
        <Text style={styles.label}>{t('personalTrip.note')}</Text>
        <TextInput
          style={styles.noteInput}
          value={note}
          onChangeText={setNote}
          placeholder={t('personalTrip.notePlaceholder')}
          placeholderTextColor={colors.textSecondary}
          inputAccessoryViewID={DONE_BAR_ID}
          returnKeyType="done"
        />

        {/* Date */}
        <Text style={styles.label}>{t('addExpense.date')}</Text>
        <Pressable style={[styles.dateRow, cardShadow, { backgroundColor: colors.card }]} onPress={() => setShowDatePicker(true)}>
          <Ionicons name="calendar-outline" size={18} color={colors.textSecondary} />
          <Text style={styles.dateText}>{date}</Text>
        </Pressable>
        {showDatePicker && (
          <View style={styles.datePickerWrap}>
            {Platform.OS === 'ios' && (
              <View style={styles.datePickerDoneRow}>
                <Pressable onPress={() => setShowDatePicker(false)} hitSlop={8}>
                  <Text style={styles.datePickerDone}>{t('common.done')}</Text>
                </Pressable>
              </View>
            )}
            <DateTimePicker
              value={new Date(date + 'T12:00:00')}
              mode="date"
              display={Platform.OS === 'ios' ? 'spinner' : 'default'}
              onChange={(_, d) => {
                if (Platform.OS === 'android') setShowDatePicker(false);
                if (d) setDate(d.toISOString().slice(0, 10));
              }}
            />
          </View>
        )}
      </ScrollView>

      <Pressable style={styles.saveBtn} onPress={handleSave} disabled={saving}>
        <Text style={styles.saveBtnText}>{saving ? t('personalTrip.saving') : t('personalTrip.saveExpense')}</Text>
      </Pressable>
    </KeyboardAvoidingView>
  );
}
