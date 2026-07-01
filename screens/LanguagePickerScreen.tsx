import { useState, useCallback } from 'react';
import {
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
import { useTranslation } from 'react-i18next';
import { changeLanguage } from '../i18n';
import { fontSizes, radii, cardShadow, lightColors as colors } from '../theme';

const LANGUAGES = [
  { code: 'en',    label: 'English',  emoji: '🇺🇸' },
  { code: 'zh-CN', label: '简体中文', emoji: '🇨🇳' },
  { code: 'ja',    label: '日本語',   emoji: '🇯🇵' },
  { code: 'es',    label: 'Español',  emoji: '🇪🇸' },
  { code: 'fr',    label: 'Français', emoji: '🇫🇷' },
  { code: 'ko',    label: '한국어',   emoji: '🇰🇷' },
];

type Props = {
  onComplete: () => void;
};

export default function LanguagePickerScreen({ onComplete }: Props) {
  const { i18n } = useTranslation();
  const [search, setSearch] = useState('');

  const filtered = search.trim() === ''
    ? LANGUAGES
    : LANGUAGES.filter(l =>
        l.label.toLowerCase().includes(search.toLowerCase()) ||
        l.code.toLowerCase().includes(search.toLowerCase())
      );

  const handleSelect = useCallback(async (code: string) => {
    await changeLanguage(code);
    // checkmark updates reactively; user taps Continue to proceed
  }, []);

  return (
    <View style={styles.root}>
      <KeyboardAvoidingView
        style={styles.flex}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      >
        <ScrollView
          style={styles.flex}
          contentContainerStyle={styles.scrollContent}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
        >
          {/* Branding header */}
          <View style={styles.header}>
            <View style={styles.globeBadge}>
              <Ionicons name="globe" size={32} color={colors.coral} />
            </View>
            <Text style={styles.title}>Choose your language</Text>
            <Text style={styles.subtitle}>
              {'Select a language · 选择语言 · 言語を選択\nElige tu idioma · Choisir la langue · 언어 선택'}
            </Text>
          </View>

          {/* Search */}
          <View style={styles.searchWrap}>
            <Ionicons name="search-outline" size={16} color={colors.textSecondary} />
            <TextInput
              style={styles.searchInput}
              value={search}
              onChangeText={setSearch}
              placeholder="Search…"
              placeholderTextColor={colors.textSecondary}
              autoCorrect={false}
              clearButtonMode="while-editing"
              returnKeyType="search"
            />
          </View>

          {/* Language list */}
          <View style={[styles.listCard, cardShadow]}>
            {filtered.map((lang, index) => {
              const isActive = i18n.language === lang.code;
              return (
                <View key={lang.code}>
                  {index > 0 && <View style={styles.divider} />}
                  <Pressable
                    style={({ pressed }) => [styles.langRow, pressed && styles.langRowPressed]}
                    onPress={() => handleSelect(lang.code)}
                  >
                    <Text style={styles.emoji}>{lang.emoji}</Text>
                    <Text style={[styles.langLabel, isActive && styles.langLabelActive]}>
                      {lang.label}
                    </Text>
                    {isActive && (
                      <Ionicons name="checkmark" size={20} color={colors.coral} />
                    )}
                  </Pressable>
                </View>
              );
            })}
          </View>
        </ScrollView>

        {/* Continue button — outside ScrollView so it stays pinned above keyboard */}
        <View style={styles.footer}>
          <Pressable
            style={({ pressed }) => [styles.continueBtn, pressed && { opacity: 0.85 }]}
            onPress={onComplete}
          >
            <Text style={styles.continueBtnText}>Continue →</Text>
          </Pressable>
        </View>
      </KeyboardAvoidingView>
    </View>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: colors.background,
  },
  flex: {
    flex: 1,
  },
  scrollContent: {
    paddingBottom: 8,
  },

  // Header
  header: {
    alignItems: 'center',
    paddingHorizontal: 28,
    paddingTop: 68,
    paddingBottom: 28,
  },
  globeBadge: {
    width: 68,
    height: 68,
    borderRadius: 34,
    backgroundColor: `${colors.coral}18`,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 18,
  },
  title: {
    fontSize: 24,
    fontWeight: '800',
    color: colors.textPrimary,
    textAlign: 'center',
    marginBottom: 8,
  },
  subtitle: {
    fontSize: fontSizes.caption,
    color: colors.textSecondary,
    textAlign: 'center',
    lineHeight: 20,
  },

  // Search
  searchWrap: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.card,
    borderRadius: radii.button,
    marginHorizontal: 18,
    marginBottom: 12,
    paddingHorizontal: 12,
    gap: 8,
    ...Platform.select({
      ios:     { shadowColor: '#000', shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.06, shadowRadius: 4 },
      android: { elevation: 2 },
      default: {},
    }),
  },
  searchInput: {
    flex: 1,
    fontSize: fontSizes.body,
    color: colors.textPrimary,
    paddingVertical: 11,
  },

  // List
  listCard: {
    marginHorizontal: 18,
    backgroundColor: colors.card,
    borderRadius: radii.card,
    overflow: 'hidden',
  },
  langRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 18,
    paddingVertical: 15,
    gap: 12,
  },
  langRowPressed: {
    backgroundColor: colors.background,
  },
  emoji: {
    fontSize: 22,
  },
  langLabel: {
    flex: 1,
    fontSize: fontSizes.body,
    fontWeight: '500',
    color: colors.textPrimary,
  },
  langLabelActive: {
    fontWeight: '700',
    color: colors.coral,
  },
  divider: {
    height: StyleSheet.hairlineWidth,
    backgroundColor: colors.border,
    marginLeft: 18,
  },

  // Footer
  footer: {
    paddingHorizontal: 20,
    paddingTop: 16,
    paddingBottom: Platform.OS === 'ios' ? 36 : 24,
  },
  continueBtn: {
    backgroundColor: colors.coral,
    borderRadius: radii.button,
    paddingVertical: 15,
    alignItems: 'center',
  },
  continueBtnText: {
    fontSize: fontSizes.body,
    fontWeight: '700',
    color: '#fff',
  },
});
