import { Pressable, SafeAreaView, ScrollView, StyleSheet, Text, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTranslation } from 'react-i18next';
import { colors, fontSizes, radii, cardShadow } from '../theme';
import { changeLanguage } from '../i18n';

const LANGUAGES = [
  { code: 'en',    label: 'English' },
  { code: 'zh-CN', label: '简体中文' },
  { code: 'ja',    label: '日本語' },
];

export default function SettingScreen() {
  const { t, i18n } = useTranslation();

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
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: {
    flex: 1,
    backgroundColor: colors.background,
  },
  content: {
    paddingHorizontal: 20,
    paddingTop: 20,
    paddingBottom: 40,
  },
  screenTitle: {
    fontSize: fontSizes.screenTitle,
    fontWeight: '700',
    color: colors.textPrimary,
    marginBottom: 32,
  },
  sectionLabel: {
    fontSize: fontSizes.caption,
    fontWeight: '700',
    color: colors.textSecondary,
    textTransform: 'uppercase',
    letterSpacing: 0.6,
    marginBottom: 10,
  },
  card: {
    backgroundColor: colors.card,
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
    borderBottomColor: colors.border,
  },
  langRowPressed: {
    backgroundColor: colors.background,
  },
  langLabel: {
    fontSize: fontSizes.body,
    fontWeight: '500',
    color: colors.textPrimary,
  },
  langLabelActive: {
    fontWeight: '700',
    color: colors.coral,
  },
});
