import { useState } from 'react';
import {
  Modal,
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
import { useTranslation } from 'react-i18next';
import { type ColorPalette, fontSizes, radii, cardShadow } from '../theme';
import { useTheme, ThemeMode } from '../context/ThemeContext';
import { useOnboarding } from '../context/OnboardingContext';
import { changeLanguage } from '../i18n';

const LANGUAGES = [
  { code: 'en',    label: 'English' },
  { code: 'zh-CN', label: '简体中文' },
  { code: 'ja',    label: '日本語' },
  { code: 'es',    label: 'Español' },
  { code: 'fr',    label: 'Français' },
  { code: 'ko',    label: '한국어' },
  { code: 'de',    label: 'Deutsch' },
];

const THEME_OPTIONS: { mode: ThemeMode; labelKey: string }[] = [
  { mode: 'light',  labelKey: 'settings.themeLight' },
  { mode: 'dark',   labelKey: 'settings.themeDark' },
];

const makeStyles = (c: ColorPalette) => StyleSheet.create({
  safe:               { flex: 1, backgroundColor: c.background },
  content:            { paddingHorizontal: 20, paddingTop: 20, paddingBottom: 40 },
  screenTitle:        { fontSize: fontSizes.screenTitle, fontWeight: '700', color: c.textPrimary, marginBottom: 32 },
  sectionLabel:       { fontSize: fontSizes.caption, fontWeight: '700', color: c.textSecondary, textTransform: 'uppercase', letterSpacing: 0.6, marginBottom: 10 },
  sectionLabelSpaced: { fontSize: fontSizes.caption, fontWeight: '700', color: c.textSecondary, textTransform: 'uppercase', letterSpacing: 0.6, marginBottom: 10, marginTop: 28 },
  card:               { backgroundColor: c.card, borderRadius: radii.card, overflow: 'hidden' },

  // Generic row used by all settings rows
  row:         { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 18, paddingVertical: 16 },
  rowBorder:   { borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: c.border },
  rowPressed:  { backgroundColor: c.background },
  rowLabel:    { fontSize: fontSizes.body, fontWeight: '500', color: c.textPrimary },
  rowLabelActive: { fontWeight: '700', color: c.coral },

  // Language row extras
  rowLeft:     { flexDirection: 'row', alignItems: 'center', gap: 10 },
  rowRight:    { flexDirection: 'row', alignItems: 'center', gap: 6 },
  rowValue:    { fontSize: fontSizes.body, color: c.textSecondary },

  // Language modal
  modalRoot:   { flex: 1, backgroundColor: c.background },
  modalHeader: {
    flexDirection: 'row', alignItems: 'center',
    paddingHorizontal: 16, paddingVertical: 14,
    borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: c.border,
  },
  modalCloseBtn:  { width: 36, height: 36, alignItems: 'center', justifyContent: 'center' },
  modalTitle:     { flex: 1, fontSize: fontSizes.sectionTitle, fontWeight: '700', color: c.textPrimary, textAlign: 'center' },
  modalSpacer:    { width: 36 },
  searchWrap: {
    flexDirection: 'row', alignItems: 'center',
    backgroundColor: c.card, borderRadius: radii.button,
    marginHorizontal: 18, marginTop: 16, marginBottom: 10,
    paddingHorizontal: 12, gap: 8,
    ...Platform.select({
      ios:     { shadowColor: '#000', shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.06, shadowRadius: 4 },
      android: { elevation: 2 },
      default: {},
    }),
  },
  searchInput:    { flex: 1, fontSize: fontSizes.body, color: c.textPrimary, paddingVertical: 11 },
  listCard:       { marginHorizontal: 18, backgroundColor: c.card, borderRadius: radii.card, overflow: 'hidden' },
  listRow:        { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 18, paddingVertical: 16 },
  listRowPressed: { backgroundColor: c.background },
  listRowLabel:   { fontSize: fontSizes.body, fontWeight: '500', color: c.textPrimary },
  listRowLabelActive: { fontWeight: '700', color: c.coral },
  divider:        { height: StyleSheet.hairlineWidth, backgroundColor: c.border, marginLeft: 18 },
  emptyText:      { fontSize: fontSizes.body, color: c.textSecondary, textAlign: 'center', paddingVertical: 24 },
});

export default function SettingScreen() {
  const { t, i18n } = useTranslation();
  const { colors, themeMode, setThemeMode } = useTheme();
  const { launchTour } = useOnboarding();
  const styles = makeStyles(colors);

  const [langModalVisible, setLangModalVisible] = useState(false);
  const [langSearch, setLangSearch] = useState('');

  const currentLang = LANGUAGES.find(l => l.code === i18n.language)?.label ?? 'English';

  const filteredLangs = langSearch.trim() === ''
    ? LANGUAGES
    : LANGUAGES.filter(l =>
        l.label.toLowerCase().includes(langSearch.toLowerCase()) ||
        l.code.toLowerCase().includes(langSearch.toLowerCase())
      );

  function openLangModal() {
    setLangSearch('');
    setLangModalVisible(true);
  }

  return (
    <SafeAreaView style={styles.safe}>
      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        <Text style={styles.screenTitle}>{t('settings.title')}</Text>

        {/* ── Language — single summary row ── */}
        <Text style={styles.sectionLabel}>{t('settings.language')}</Text>
        <View style={[styles.card, cardShadow]}>
          <Pressable
            style={({ pressed }) => [styles.row, pressed && styles.rowPressed]}
            onPress={openLangModal}
          >
            <View style={styles.rowLeft}>
              <Ionicons name="globe-outline" size={18} color={colors.textSecondary} />
              <Text style={styles.rowLabel}>{t('settings.language')}</Text>
            </View>
            <View style={styles.rowRight}>
              <Text style={styles.rowValue}>{currentLang}</Text>
              <Ionicons name="chevron-forward" size={15} color={colors.textSecondary} />
            </View>
          </Pressable>
        </View>

        {/* ── Theme ── */}
        <Text style={styles.sectionLabelSpaced}>{t('settings.theme')}</Text>
        <View style={[styles.card, cardShadow]}>
          {THEME_OPTIONS.map((opt, index) => {
            const isActive = themeMode === opt.mode;
            return (
              <View key={opt.mode}>
                {index > 0 && <View style={styles.divider} />}
                <Pressable
                  style={({ pressed }) => [styles.row, pressed && styles.rowPressed]}
                  onPress={() => setThemeMode(opt.mode)}
                >
                  <Text style={[styles.rowLabel, isActive && styles.rowLabelActive]}>
                    {t(opt.labelKey)}
                  </Text>
                  {isActive && <Ionicons name="checkmark-circle" size={20} color={colors.coral} />}
                </Pressable>
              </View>
            );
          })}
        </View>

        {/* ── About ── */}
        <Text style={styles.sectionLabelSpaced}>{t('settings.about')}</Text>
        <View style={[styles.card, cardShadow]}>
          <Pressable
            style={({ pressed }) => [styles.row, pressed && styles.rowPressed]}
            onPress={launchTour}
          >
            <Text style={styles.rowLabel}>{t('onboarding.viewTour')}</Text>
            <Ionicons name="compass-outline" size={18} color={colors.coral} />
          </Pressable>
        </View>
      </ScrollView>

      {/* ── Language picker modal ── */}
      <Modal
        visible={langModalVisible}
        animationType="slide"
        onRequestClose={() => setLangModalVisible(false)}
      >
        <SafeAreaView style={styles.modalRoot}>
          {/* Header */}
          <View style={styles.modalHeader}>
            <Pressable
              style={styles.modalCloseBtn}
              onPress={() => setLangModalVisible(false)}
              hitSlop={12}
            >
              <Ionicons name="chevron-down" size={22} color={colors.textSecondary} />
            </Pressable>
            <Text style={styles.modalTitle}>{t('settings.language')}</Text>
            <View style={styles.modalSpacer} />
          </View>

          {/* Search */}
          <View style={styles.searchWrap}>
            <Ionicons name="search-outline" size={16} color={colors.textSecondary} />
            <TextInput
              style={styles.searchInput}
              value={langSearch}
              onChangeText={setLangSearch}
              placeholder="Search…"
              placeholderTextColor={colors.textSecondary}
              autoCorrect={false}
              clearButtonMode="while-editing"
              returnKeyType="search"
            />
          </View>

          {/* Language list */}
          <View style={[styles.listCard, cardShadow]}>
            {filteredLangs.length === 0 ? (
              <Text style={styles.emptyText}>No results</Text>
            ) : (
              filteredLangs.map((lang, index) => {
                const isActive = i18n.language === lang.code;
                return (
                  <View key={lang.code}>
                    {index > 0 && <View style={styles.divider} />}
                    <Pressable
                      style={({ pressed }) => [styles.listRow, pressed && styles.listRowPressed]}
                      onPress={async () => {
                        await changeLanguage(lang.code);
                        setLangModalVisible(false);
                      }}
                    >
                      <Text style={[styles.listRowLabel, isActive && styles.listRowLabelActive]}>
                        {lang.label}
                      </Text>
                      {isActive && (
                        <Ionicons name="checkmark" size={20} color={colors.coral} />
                      )}
                    </Pressable>
                  </View>
                );
              })
            )}
          </View>
        </SafeAreaView>
      </Modal>
    </SafeAreaView>
  );
}
