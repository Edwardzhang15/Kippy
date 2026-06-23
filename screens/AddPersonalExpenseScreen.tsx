import { useEffect, useRef, useState } from 'react';
import {
  ActionSheetIOS,
  ActivityIndicator,
  Alert,
  Animated,
  Dimensions,
  Image,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  SafeAreaView,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import DateTimePicker, { type DateTimePickerEvent } from '@react-native-community/datetimepicker';
import { Ionicons } from '@expo/vector-icons';
import { type NativeStackScreenProps } from '@react-navigation/native-stack';
import { useTranslation } from 'react-i18next';
import * as ImagePicker from 'expo-image-picker';
import { type PersonalStackParamList } from '../navigation/types';
import {
  addPersonalExpense, updatePersonalExpense, deletePersonalExpense, getPersonalExpense,
} from '../db';
import { CATEGORIES, type Category } from '../categories';
import { type ColorPalette, fontSizes, radii, cardShadow } from '../theme';
import { useTheme } from '../context/ThemeContext';
import { getCurrencySymbol } from '../utils';

type Props = NativeStackScreenProps<PersonalStackParamList, 'AddPersonalExpense'>;

const CURRENCIES = ['CAD', 'USD', 'EUR', 'GBP', 'AUD', 'JPY'];
const GRID_COLS  = 3;
const GRID_GAP   = 8;
const H_PAD      = 20;
const ITEM_W     = (Dimensions.get('window').width - H_PAD * 2 - GRID_GAP * (GRID_COLS - 1)) / GRID_COLS;

const makeStyles = (c: ColorPalette) => StyleSheet.create({
  root:              { flex: 1, backgroundColor: c.background },
  header:            { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 20, paddingTop: 56, paddingBottom: 12 },
  headerTitle:       { flex: 1, fontSize: fontSizes.sectionTitle, fontWeight: '700', color: c.textPrimary },
  closeBtn:          { padding: 6 },

  scroll:            { flex: 1 },
  content:           { paddingHorizontal: H_PAD, paddingBottom: 40 },

  amountWrap:        { ...cardShadow, backgroundColor: c.card, borderRadius: radii.card, alignItems: 'center', justifyContent: 'center', paddingVertical: 28, marginBottom: 16 },
  amountPrompt:      { position: 'absolute', alignItems: 'center' },
  amountPromptText:  { fontSize: fontSizes.body, color: c.textSecondary },
  amountRow:         { flexDirection: 'row', alignItems: 'flex-end', gap: 6 },
  currencySymbol:    { fontSize: 28, fontWeight: '700', color: c.textSecondary, paddingBottom: 4 },
  amountInput:       { fontSize: 48, fontWeight: '800', color: c.textPrimary, minWidth: 120, textAlign: 'center' },

  sectionLabel:      { fontSize: fontSizes.caption, fontWeight: '700', color: c.textSecondary, marginBottom: 8, letterSpacing: 0.5 },
  section:           { marginBottom: 18 },

  currencyRow:       { flexDirection: 'row', gap: 8, flexWrap: 'wrap' },
  currencyChip:      { paddingHorizontal: 14, paddingVertical: 8, borderRadius: 20, borderWidth: 1.5, borderColor: c.border },
  currencyChipSel:   { borderColor: c.coral, backgroundColor: c.coral + '18' },
  currencyChipText:  { fontSize: fontSizes.caption, fontWeight: '600', color: c.textSecondary },
  currencyChipSelTx: { color: c.coral },

  catGrid:           { flexDirection: 'row', flexWrap: 'wrap', gap: GRID_GAP },
  catItem:           { width: ITEM_W, alignItems: 'center', paddingVertical: 12, borderRadius: radii.button, borderWidth: 1.5, borderColor: 'transparent', backgroundColor: c.card, ...cardShadow },
  catItemSel:        { borderColor: c.coral },
  catIconBg:         { width: 40, height: 40, borderRadius: 20, alignItems: 'center', justifyContent: 'center', marginBottom: 6 },
  catLabel:          { fontSize: 11, fontWeight: '600', color: c.textSecondary, textAlign: 'center' },
  catLabelSel:       { color: c.coral },

  dateBtn:           { ...cardShadow, backgroundColor: c.card, borderRadius: radii.button, paddingHorizontal: 16, paddingVertical: 14, flexDirection: 'row', alignItems: 'center', gap: 10 },
  dateBtnText:       { fontSize: fontSizes.body, color: c.textPrimary, flex: 1 },

  noteInput:         { ...cardShadow, backgroundColor: c.card, borderRadius: radii.button, paddingHorizontal: 16, paddingVertical: 14, fontSize: fontSizes.body, color: c.textPrimary, minHeight: 80, textAlignVertical: 'top' },

  receiptWrap:       { alignItems: 'center', gap: 12 },
  receiptImg:        { width: '100%', height: 180, borderRadius: radii.button, resizeMode: 'cover' },
  receiptBtn:        { flexDirection: 'row', alignItems: 'center', gap: 8, paddingHorizontal: 16, paddingVertical: 12, borderRadius: radii.button, borderWidth: 1.5, borderColor: c.border, borderStyle: 'dashed' },
  receiptBtnText:    { fontSize: fontSizes.body, color: c.textSecondary },
  receiptActions:    { flexDirection: 'row', gap: 12 },
  receiptActionBtn:  { flex: 1, paddingVertical: 10, borderRadius: radii.button, borderWidth: 1, borderColor: c.border, alignItems: 'center' },
  receiptActionText: { fontSize: fontSizes.caption, color: c.textSecondary },

  saveBtn:           { backgroundColor: c.coral, borderRadius: radii.button, paddingVertical: 16, alignItems: 'center', marginTop: 8 },
  saveBtnText:       { fontSize: fontSizes.body, fontWeight: '700', color: '#fff' },
  deleteBtn:         { borderRadius: radii.button, paddingVertical: 14, alignItems: 'center', marginTop: 6 },
  deleteBtnText:     { fontSize: fontSizes.body, color: c.coral },
});

export default function AddPersonalExpenseScreen({ route, navigation }: Props) {
  const { t }        = useTranslation();
  const { colors }   = useTheme();
  const styles       = makeStyles(colors);
  const isEdit       = !!route.params?.expenseId;

  const [amount, setAmount]         = useState('');
  const [currency, setCurrency]     = useState('CAD');
  const [category, setCategory]     = useState('food');
  const [date, setDate]             = useState(new Date());
  const [showPicker, setShowPicker] = useState(false);
  const [note, setNote]             = useState('');
  const [receiptUri, setReceiptUri] = useState<string | null>(null);
  const [saving, setSaving]         = useState(false);
  const [deleting, setDeleting]     = useState(false);
  const [showPrompt, setShowPrompt] = useState(!isEdit);

  const promptOpacity = useRef(new Animated.Value(1)).current;
  const bounceAnim    = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    if (!showPrompt) return;
    const loop = Animated.loop(Animated.sequence([
      Animated.timing(bounceAnim, { toValue: -6, duration: 420, useNativeDriver: true }),
      Animated.timing(bounceAnim, { toValue: 0,  duration: 420, useNativeDriver: true }),
    ]));
    loop.start();
    return () => loop.stop();
  }, [showPrompt]);

  const dismissPrompt = () => {
    if (!showPrompt) return;
    Animated.timing(promptOpacity, { toValue: 0, duration: 180, useNativeDriver: true })
      .start(() => setShowPrompt(false));
  };

  useEffect(() => {
    if (!isEdit) return;
    getPersonalExpense(route.params!.expenseId!).then(e => {
      if (!e) return;
      setAmount(e.amount.toFixed(2));
      setCurrency(e.currency);
      setCategory(e.category);
      const [y, m, d] = e.date.split('-').map(Number);
      setDate(new Date(y, m - 1, d));
      setNote(e.note ?? '');
      setReceiptUri(e.receipt_photo_uri);
    });
  }, []);

  const onDateChange = (_: DateTimePickerEvent, selected?: Date) => {
    if (Platform.OS === 'android') setShowPicker(false);
    if (selected) setDate(selected);
  };

  const pickFromLibrary = async () => {
    const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (status !== 'granted') return;
    const result = await ImagePicker.launchImageLibraryAsync({ quality: 0.7, base64: false });
    if (!result.canceled) setReceiptUri(result.assets[0].uri);
  };

  const takePhoto = async () => {
    const { status } = await ImagePicker.requestCameraPermissionsAsync();
    if (status !== 'granted') return;
    const result = await ImagePicker.launchCameraAsync({ quality: 0.7 });
    if (!result.canceled) setReceiptUri(result.assets[0].uri);
  };

  const showPhotoOptions = () => {
    if (Platform.OS === 'ios') {
      ActionSheetIOS.showActionSheetWithOptions(
        { options: [t('common.cancel'), t('addExpense.takePhoto'), t('addExpense.chooseFromLibrary')], cancelButtonIndex: 0 },
        i => { if (i === 1) takePhoto(); else if (i === 2) pickFromLibrary(); },
      );
    } else {
      Alert.alert(t('addExpense.receipt'), undefined, [
        { text: t('addExpense.takePhoto'),           onPress: takePhoto },
        { text: t('addExpense.chooseFromLibrary'),   onPress: pickFromLibrary },
        { text: t('common.cancel'), style: 'cancel' },
      ]);
    }
  };

  const handleSave = async () => {
    const parsed = parseFloat(amount);
    if (!amount || isNaN(parsed) || parsed <= 0) {
      Alert.alert(t('addExpense.title'), t('personal.amountRequired'));
      return;
    }
    setSaving(true);
    const dateStr = date.toISOString().split('T')[0];
    const data = { amount: parsed, currency, category, date: dateStr, note: note.trim() || null, receipt_photo_uri: receiptUri };
    try {
      if (isEdit) {
        await updatePersonalExpense(route.params!.expenseId!, data);
      } else {
        await addPersonalExpense(data);
      }
      navigation.goBack();
    } catch {
      Alert.alert(t('editTrip.errorTitle'), t('editTrip.errorMsg'));
      setSaving(false);
    }
  };

  const handleDelete = () => {
    Alert.alert(
      t('personal.deleteExpenseTitle'),
      t('personal.deleteExpenseMsg'),
      [
        { text: t('common.cancel'), style: 'cancel' },
        {
          text: t('common.delete'), style: 'destructive',
          onPress: async () => {
            setDeleting(true);
            await deletePersonalExpense(route.params!.expenseId!);
            navigation.goBack();
          },
        },
      ],
    );
  };

  const sym = getCurrencySymbol(currency);
  const dateLabel = date.toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' });

  return (
    <SafeAreaView style={styles.root}>
      {/* Header */}
      <View style={styles.header}>
        <Text style={styles.headerTitle}>
          {isEdit ? t('personal.editExpense') : t('personal.newExpense')}
        </Text>
        <TouchableOpacity style={styles.closeBtn} onPress={() => navigation.goBack()}>
          <Ionicons name="close" size={24} color={colors.textSecondary} />
        </TouchableOpacity>
      </View>

      <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        <ScrollView style={styles.scroll} contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">

          {/* Amount */}
          <Pressable style={styles.amountWrap} onPress={() => dismissPrompt()}>
            {showPrompt && (
              <Animated.View style={[styles.amountPrompt, { opacity: promptOpacity, transform: [{ translateY: bounceAnim }] }]}>
                <Text style={styles.amountPromptText}>{t('addExpense.tapToEnterAmount')}</Text>
              </Animated.View>
            )}
            <View style={styles.amountRow}>
              <Text style={styles.currencySymbol}>{sym}</Text>
              <TextInput
                style={styles.amountInput}
                value={amount}
                onChangeText={setAmount}
                onFocus={dismissPrompt}
                keyboardType="decimal-pad"
                placeholder="0.00"
                placeholderTextColor={colors.textSecondary}
                selectTextOnFocus
              />
            </View>
          </Pressable>

          {/* Currency */}
          <View style={styles.section}>
            <Text style={styles.sectionLabel}>{t('addExpense.currency').toUpperCase()}</Text>
            <View style={styles.currencyRow}>
              {CURRENCIES.map(c => (
                <TouchableOpacity
                  key={c}
                  style={[styles.currencyChip, c === currency && styles.currencyChipSel]}
                  onPress={() => setCurrency(c)}
                >
                  <Text style={[styles.currencyChipText, c === currency && styles.currencyChipSelTx]}>{c}</Text>
                </TouchableOpacity>
              ))}
            </View>
          </View>

          {/* Category */}
          <View style={styles.section}>
            <Text style={styles.sectionLabel}>{t('addExpense.category').toUpperCase()}</Text>
            <View style={styles.catGrid}>
              {CATEGORIES.map(cat => (
                <Pressable
                  key={cat.id}
                  style={[styles.catItem, cat.id === category && styles.catItemSel]}
                  onPress={() => setCategory(cat.id)}
                >
                  <View style={[styles.catIconBg, { backgroundColor: cat.id === category ? cat.bg : colors.border }]}>
                    <Ionicons name={cat.icon} size={20} color={cat.id === category ? cat.color : colors.tabInactive} />
                  </View>
                  <Text style={[styles.catLabel, cat.id === category && styles.catLabelSel]}>
                    {t(`categories.${cat.id}`, cat.label)}
                  </Text>
                </Pressable>
              ))}
            </View>
          </View>

          {/* Date */}
          <View style={styles.section}>
            <Text style={styles.sectionLabel}>{t('addExpense.date').toUpperCase()}</Text>
            <TouchableOpacity style={styles.dateBtn} onPress={() => setShowPicker(true)}>
              <Ionicons name="calendar-outline" size={18} color={colors.textSecondary} />
              <Text style={styles.dateBtnText}>{dateLabel}</Text>
            </TouchableOpacity>
            {showPicker && (
              <DateTimePicker
                value={date}
                mode="date"
                display={Platform.OS === 'ios' ? 'inline' : 'default'}
                onChange={onDateChange}
                maximumDate={new Date()}
              />
            )}
          </View>

          {/* Note */}
          <View style={styles.section}>
            <Text style={styles.sectionLabel}>{t('personal.note').toUpperCase()}</Text>
            <TextInput
              style={styles.noteInput}
              value={note}
              onChangeText={setNote}
              placeholder={t('personal.notePlaceholder')}
              placeholderTextColor={colors.textSecondary}
              multiline
              returnKeyType="done"
            />
          </View>

          {/* Receipt */}
          <View style={styles.section}>
            <Text style={styles.sectionLabel}>{t('addExpense.receipt').toUpperCase()}</Text>
            <View style={styles.receiptWrap}>
              {receiptUri && (
                <Image source={{ uri: receiptUri }} style={styles.receiptImg} />
              )}
              {receiptUri ? (
                <View style={styles.receiptActions}>
                  <TouchableOpacity style={styles.receiptActionBtn} onPress={showPhotoOptions}>
                    <Text style={styles.receiptActionText}>{t('addExpense.replacePhoto')}</Text>
                  </TouchableOpacity>
                  <TouchableOpacity style={styles.receiptActionBtn} onPress={() => setReceiptUri(null)}>
                    <Text style={[styles.receiptActionText, { color: colors.coral }]}>{t('addExpense.removePhoto')}</Text>
                  </TouchableOpacity>
                </View>
              ) : (
                <TouchableOpacity style={styles.receiptBtn} onPress={showPhotoOptions}>
                  <Ionicons name="camera-outline" size={20} color={colors.textSecondary} />
                  <Text style={styles.receiptBtnText}>{t('addExpense.addReceipt')}</Text>
                </TouchableOpacity>
              )}
            </View>
          </View>

          {/* Save */}
          <TouchableOpacity style={styles.saveBtn} onPress={handleSave} disabled={saving}>
            <Text style={styles.saveBtnText}>{saving ? t('addExpense.saving') : t('addExpense.save')}</Text>
          </TouchableOpacity>

          {isEdit && (
            <TouchableOpacity style={styles.deleteBtn} onPress={handleDelete} disabled={deleting}>
              <Text style={styles.deleteBtnText}>{deleting ? t('addExpense.deleting') : t('personal.deleteExpense')}</Text>
            </TouchableOpacity>
          )}

        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}
