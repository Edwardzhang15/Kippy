import { Pressable, StyleSheet, Text, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTranslation } from 'react-i18next';
import { type ColorPalette, fontSizes, radii } from '../theme';
import { useTheme } from '../context/ThemeContext';

/**
 * Shown in place of content a screen could not load. Every data load in the app
 * ends either in content, this, or an empty state, so a failed read can never
 * leave a spinner running with no way out.
 *
 * Deliberately neutral in colour: coral and sage carry "owes"/"owed" meaning.
 */
export default function ErrorRetry({
  onRetry,
  message,
  compact = false,
}: {
  onRetry: () => void;
  message?: string;
  /** Inline variant for a section of a screen rather than a whole screen. */
  compact?: boolean;
}) {
  const { t }      = useTranslation();
  const { colors } = useTheme();
  const styles     = makeStyles(colors);

  return (
    <View style={[styles.wrap, compact && styles.wrapCompact]}>
      <Ionicons
        name="cloud-offline-outline"
        size={compact ? 22 : 32}
        color={colors.textSecondary}
      />
      <Text style={styles.message}>{message ?? t('common.loadErrorBody')}</Text>
      <Pressable
        style={({ pressed }) => [styles.retryBtn, pressed && { opacity: 0.7 }]}
        onPress={onRetry}
        accessibilityRole="button"
      >
        <Ionicons name="refresh" size={15} color={colors.textPrimary} />
        <Text style={styles.retryText}>{t('common.retry')}</Text>
      </Pressable>
    </View>
  );
}

const makeStyles = (c: ColorPalette) => StyleSheet.create({
  wrap: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 12,
    paddingHorizontal: 32,
    paddingVertical: 40,
  },
  wrapCompact: {
    flex: 0,
    gap: 10,
    paddingVertical: 24,
  },
  message: {
    fontSize: fontSizes.body,
    color: c.textSecondary,
    textAlign: 'center',
    lineHeight: 21,
  },
  retryBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 7,
    paddingHorizontal: 18,
    paddingVertical: 10,
    borderRadius: radii.button,
    borderWidth: 1.5,
    borderColor: c.border,
    backgroundColor: c.card,
  },
  retryText: {
    fontSize: fontSizes.body,
    fontWeight: '700',
    color: c.textPrimary,
  },
});
