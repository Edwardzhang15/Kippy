import { InputAccessoryView, Keyboard, Platform, Pressable, StyleSheet, Text, View } from 'react-native';
import { useTranslation } from 'react-i18next';
import { useTheme } from '../context/ThemeContext';

export const DONE_BAR_ID = 'kippy-kbd-done';

export default function KeyboardDoneBar() {
  const { t } = useTranslation();
  const { colors } = useTheme();

  if (Platform.OS !== 'ios') return null;

  return (
    <InputAccessoryView nativeID={DONE_BAR_ID}>
      <View style={[styles.bar, { backgroundColor: colors.card, borderTopColor: colors.border }]}>
        <Pressable onPress={Keyboard.dismiss} hitSlop={16} style={styles.btn}>
          <Text style={[styles.btnText, { color: colors.coral }]}>{t('common.done')}</Text>
        </Pressable>
      </View>
    </InputAccessoryView>
  );
}

const styles = StyleSheet.create({
  bar: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderTopWidth: StyleSheet.hairlineWidth,
  },
  btn: {
    paddingHorizontal: 4,
  },
  btnText: {
    fontSize: 17,
    fontWeight: '600',
  },
});
