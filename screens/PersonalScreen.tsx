import { StyleSheet, Text, View } from 'react-native';
import { useTranslation } from 'react-i18next';
import { type ColorPalette, fontSizes } from '../theme';
import { useTheme } from '../context/ThemeContext';

const makeStyles = (c: ColorPalette) => StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: c.background,
    alignItems: 'center',
    justifyContent: 'center',
  },
  title: {
    fontSize: fontSizes.screenTitle,
    fontWeight: '700',
    color: c.textPrimary,
  },
});

export default function PersonalScreen() {
  const { t } = useTranslation();
  const { colors } = useTheme();
  const styles = makeStyles(colors);
  return (
    <View style={styles.container}>
      <Text style={styles.title}>{t('personal.title')}</Text>
    </View>
  );
}
