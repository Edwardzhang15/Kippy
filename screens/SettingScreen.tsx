import { Pressable, SafeAreaView, ScrollView, StyleSheet, Text, View } from 'react-native';
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
];

const THEME_OPTIONS: { mode: ThemeMode; labelKey: string }[] = [
  { mode: 'light',  labelKey: 'settings.themeLight' },
  { mode: 'dark',   labelKey: 'settings.themeDark' },
  { mode: 'system', labelKey: 'settings.themeSystem' },
];

const makeStyles = (c: ColorPalette) => StyleSheet.create({
  safe: {
    flex: 1,
    backgroundColor: c.background,
  },
  content: {
    paddingHorizontal: 20,
    paddingTop: 20,
    paddingBottom: 40,
  },
  screenTitle: {
    fontSize: fontSizes.screenTitle,
    fontWeight: '700',
    color: c.textPrimary,
    marginBottom: 32,
  },
  sectionLabel: {
    fontSize: fontSizes.caption,
    fontWeight: '700',
    color: c.textSecondary,
    textTransform: 'uppercase',
    letterSpacing: 0.6,
    marginBottom: 10,
  },
  sectionLabelSpaced: {
    fontSize: fontSizes.caption,
    fontWeight: '700',
    color: c.textSecondary,
    textTransform: 'uppercase',
    letterSpacing: 0.6,
    marginBottom: 10,
    marginTop: 28,
  },
  card: {
    backgroundColor: c.card,
    borderRadius: radii.card,
    overflow: 'hidden',
  },
  langRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 18,
    paddingVertical: 16,
  },
  langRowBorder: {
    borderBottomWidth: 1,
    borderBottomColor: c.border,
  },
  langRowPressed: {
    backgroundColor: c.background,
  },
  langLabel: {
    fontSize: fontSizes.body,
    fontWeight: '500',
    color: c.textPrimary,
  },
  langLabelActive: {
    fontWeight: '700',
    color: c.coral,
  },
});

export default function SettingScreen() {
  const { t, i18n } = useTranslation();
  const { colors, themeMode, setThemeMode } = useTheme();
  const { launchTour } = useOnboarding();
  const styles = makeStyles(colors);

  return (
    <SafeAreaView style={styles.safe}>
      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        <Text style={styles.screenTitle}>{t('settings.title')}</Text>

        <Text style={styles.sectionLabel}>{t('settings.language')}</Text>
        <View style={[styles.card, cardShadow]}>
          {LANGUAGES.map((lang, index) => {
            const isActive = i18n.language === lang.code;
            return (
              <Pressable
                key={lang.code}
                style={({ pressed }) => [
                  styles.langRow,
                  index < LANGUAGES.length - 1 && styles.langRowBorder,
                  pressed && styles.langRowPressed,
                ]}
                onPress={() => changeLanguage(lang.code)}
              >
                <Text style={[styles.langLabel, isActive && styles.langLabelActive]}>
                  {lang.label}
                </Text>
                {isActive && (
                  <Ionicons name="checkmark-circle" size={20} color={colors.coral} />
                )}
              </Pressable>
            );
          })}
        </View>

        <Text style={styles.sectionLabelSpaced}>{t('settings.theme')}</Text>
        <View style={[styles.card, cardShadow]}>
          {THEME_OPTIONS.map((opt, index) => {
            const isActive = themeMode === opt.mode;
            return (
              <Pressable
                key={opt.mode}
                style={({ pressed }) => [
                  styles.langRow,
                  index < THEME_OPTIONS.length - 1 && styles.langRowBorder,
                  pressed && styles.langRowPressed,
                ]}
                onPress={() => setThemeMode(opt.mode)}
              >
                <Text style={[styles.langLabel, isActive && styles.langLabelActive]}>
                  {t(opt.labelKey)}
                </Text>
                {isActive && (
                  <Ionicons name="checkmark-circle" size={20} color={colors.coral} />
                )}
              </Pressable>
            );
          })}
        </View>
        <Text style={styles.sectionLabelSpaced}>{t('settings.about')}</Text>
        <View style={[styles.card, cardShadow]}>
          <Pressable
            style={({ pressed }) => [styles.langRow, pressed && styles.langRowPressed]}
            onPress={launchTour}
          >
            <Text style={styles.langLabel}>{t('onboarding.viewTour')}</Text>
            <Ionicons name="compass-outline" size={18} color={colors.coral} />
          </Pressable>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}
