import { useEffect, useState } from 'react';
import {
  KeyboardAvoidingView,
  Platform,
  SafeAreaView,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { type NativeStackScreenProps } from '@react-navigation/native-stack';
import { useTranslation } from 'react-i18next';
import { type PersonalStackParamList } from '../navigation/types';
import { getPersonalBudgets, setPersonalBudget } from '../db';
import { CATEGORIES } from '../categories';
import { type ColorPalette, fontSizes, radii, cardShadow } from '../theme';
import { useTheme } from '../context/ThemeContext';
import { getCurrencySymbol } from '../utils';

type Props = NativeStackScreenProps<PersonalStackParamList, 'SetBudgets'>;

const makeStyles = (c: ColorPalette) => StyleSheet.create({
  root:          { flex: 1, backgroundColor: c.background },
  header:        { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 20, paddingTop: 56, paddingBottom: 12 },
  headerTitle:   { flex: 1, fontSize: fontSizes.sectionTitle, fontWeight: '700', color: c.textPrimary },
  closeBtn:      { padding: 6 },
  subText:       { fontSize: fontSizes.caption, color: c.textSecondary, paddingHorizontal: 20, marginBottom: 16, lineHeight: 18 },

  scroll:        { flex: 1 },
  content:       { paddingHorizontal: 16, paddingBottom: 40 },

  catCard:       { ...cardShadow, backgroundColor: c.card, borderRadius: radii.card, marginBottom: 10, paddingHorizontal: 16, paddingVertical: 14, flexDirection: 'row', alignItems: 'center', gap: 12 },
  iconBg:        { width: 38, height: 38, borderRadius: 19, alignItems: 'center', justifyContent: 'center' },
  catName:       { flex: 1, fontSize: fontSizes.body, fontWeight: '600', color: c.textPrimary },
  inputRow:      { flexDirection: 'row', alignItems: 'center', gap: 4 },
  sym:           { fontSize: fontSizes.body, color: c.textSecondary },
  amtInput:      { fontSize: fontSizes.body, fontWeight: '600', color: c.textPrimary, minWidth: 70, textAlign: 'right', padding: 0 },
  placeholder:   { color: c.textSecondary },

  saveBtn:       { backgroundColor: c.sage, borderRadius: radii.button, paddingVertical: 16, alignItems: 'center', marginTop: 4 },
  saveBtnText:   { fontSize: fontSizes.body, fontWeight: '700', color: '#fff' },
});

export default function SetBudgetsScreen({ navigation }: Props) {
  const { t }      = useTranslation();
  const { colors } = useTheme();
  const styles     = makeStyles(colors);

  // Map category → budget string
  const [budgets, setBudgets] = useState<Record<string, string>>({});
  const [saving, setSaving]   = useState(false);

  useEffect(() => {
    getPersonalBudgets().then(rows => {
      const init: Record<string, string> = {};
      for (const r of rows) {
        init[r.category] = r.monthly_budget_amount > 0 ? String(r.monthly_budget_amount) : '';
      }
      setBudgets(init);
    });
  }, []);

  const handleSave = async () => {
    setSaving(true);
    for (const cat of CATEGORIES) {
      const val = parseFloat(budgets[cat.id] ?? '');
      await setPersonalBudget(cat.id, isNaN(val) ? 0 : val);
    }
    navigation.goBack();
  };

  // Use CAD symbol as default — users set budgets in their home currency
  const sym = getCurrencySymbol('CAD');

  return (
    <SafeAreaView style={styles.root}>
      <View style={styles.header}>
        <Text style={styles.headerTitle}>{t('personal.setBudgetsTitle')}</Text>
        <TouchableOpacity style={styles.closeBtn} onPress={() => navigation.goBack()}>
          <Ionicons name="close" size={24} color={colors.textSecondary} />
        </TouchableOpacity>
      </View>
      <Text style={styles.subText}>{t('personal.setBudgetsSub')}</Text>

      <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        <ScrollView style={styles.scroll} contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
          {CATEGORIES.filter(c => c.id !== 'other').map(cat => (
            <View key={cat.id} style={styles.catCard}>
              <View style={[styles.iconBg, { backgroundColor: cat.bg }]}>
                <Ionicons name={cat.icon} size={18} color={cat.color} />
              </View>
              <Text style={styles.catName}>{t(`categories.${cat.id}`, cat.label)}</Text>
              <View style={styles.inputRow}>
                <Text style={styles.sym}>{sym}</Text>
                <TextInput
                  style={styles.amtInput}
                  value={budgets[cat.id] ?? ''}
                  onChangeText={v => setBudgets(prev => ({ ...prev, [cat.id]: v }))}
                  keyboardType="decimal-pad"
                  placeholder="—"
                  placeholderTextColor={colors.textSecondary}
                  selectTextOnFocus
                  returnKeyType="done"
                />
              </View>
            </View>
          ))}

          <TouchableOpacity style={styles.saveBtn} onPress={handleSave} disabled={saving}>
            <Text style={styles.saveBtnText}>{saving ? t('addExpense.saving') : t('personal.saveBudgets')}</Text>
          </TouchableOpacity>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}
