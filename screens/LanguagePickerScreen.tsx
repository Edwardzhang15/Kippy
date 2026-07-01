import { useCallback } from 'react';
import {
  Pressable,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTranslation } from 'react-i18next';
import { changeLanguage } from '../i18n';
import { fontSizes, radii, cardShadow, lightColors as colors } from '../theme';

const LANGUAGES = [
  { code: 'en',    label: 'English',    emoji: '🇺🇸' },
  { code: 'zh-CN', label: '简体中文',    emoji: '🇨🇳' },
  { code: 'ja',    label: '日本語',      emoji: '🇯🇵' },
  { code: 'es',    label: 'Español',    emoji: '🇪🇸' },
  { code: 'fr',    label: 'Français',   emoji: '🇫🇷' },
  { code: 'ko',    label: '한국어',      emoji: '🇰🇷' },
];

type Props = {
  onComplete: () => void;
};

export default function LanguagePickerScreen({ onComplete }: Props) {
  const { t, i18n } = useTranslation();

  const handleSelect = useCallback(async (code: string) => {
    await changeLanguage(code);
    onComplete();
  }, [onComplete]);

  return (
    <View style={styles.root}>
      <View style={styles.content}>
        <Text style={styles.title}>Choose your language</Text>
        <Text style={styles.subtitle}>Select a language · 选择语言 · 言語を選択 · Elige tu idioma · Choisir la langue · 언어 선택</Text>

        <View style={styles.options}>
          {LANGUAGES.map(lang => {
            const isActive = i18n.language === lang.code;
            return (
              <Pressable
                key={lang.code}
                style={({ pressed }) => [styles.option, cardShadow, isActive && styles.optionActive, pressed && { opacity: 0.85 }]}
                onPress={() => handleSelect(lang.code)}
              >
                <Text style={styles.emoji}>{lang.emoji}</Text>
                <Text style={[styles.langLabel, isActive && styles.langLabelActive]}>{lang.label}</Text>
                {isActive && (
                  <Ionicons name="checkmark-circle" size={20} color={colors.coral} />
                )}
              </Pressable>
            );
          })}
        </View>

        <Pressable
          style={({ pressed }) => [styles.continueBtn, pressed && { opacity: 0.85 }]}
          onPress={() => handleSelect(i18n.language)}
        >
          <Text style={styles.continueBtnText}>Continue →</Text>
        </Pressable>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: colors.background,
    alignItems: 'center',
    justifyContent: 'center',
  },
  content: {
    width: '85%',
    maxWidth: 340,
    alignItems: 'center',
  },
  title: {
    fontSize: 26,
    fontWeight: '800',
    color: colors.textPrimary,
    textAlign: 'center',
    marginBottom: 8,
  },
  subtitle: {
    fontSize: fontSizes.caption,
    color: colors.textSecondary,
    textAlign: 'center',
    lineHeight: 18,
    marginBottom: 32,
  },
  options: {
    width: '100%',
    gap: 12,
    marginBottom: 32,
  },
  option: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
    backgroundColor: colors.card,
    borderRadius: radii.card,
    paddingHorizontal: 20,
    paddingVertical: 16,
    borderWidth: 2,
    borderColor: 'transparent',
  },
  optionActive: {
    borderColor: colors.coral,
    backgroundColor: '#FFF5F4',
  },
  emoji: {
    fontSize: 28,
  },
  langLabel: {
    flex: 1,
    fontSize: fontSizes.body,
    fontWeight: '600',
    color: colors.textPrimary,
  },
  langLabelActive: {
    color: colors.coral,
  },
  continueBtn: {
    backgroundColor: colors.coral,
    borderRadius: radii.button,
    paddingHorizontal: 40,
    paddingVertical: 14,
  },
  continueBtnText: {
    fontSize: fontSizes.body,
    fontWeight: '700',
    color: '#fff',
  },
});
