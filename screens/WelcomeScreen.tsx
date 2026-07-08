import { Image, Pressable, SafeAreaView, StyleSheet, Text, View } from 'react-native';
import { useTranslation } from 'react-i18next';
import { type ColorPalette, fontSizes, radii } from '../theme';
import { useTheme } from '../context/ThemeContext';

type Props = {
  onComplete: () => void;
};

const makeStyles = (c: ColorPalette) => StyleSheet.create({
  root: { flex: 1, backgroundColor: c.background },
  content: { flex: 1, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 32 },
  logo: { width: 180, height: 180, marginBottom: 28 },
  appName: { fontSize: 34, fontWeight: '800', color: c.textPrimary, marginBottom: 10 },
  tagline: { fontSize: fontSizes.body, color: c.textSecondary, textAlign: 'center' },
  footer: { paddingHorizontal: 28, paddingBottom: 40 },
  getStartedBtn: {
    backgroundColor: c.coral,
    borderRadius: radii.button,
    paddingVertical: 17,
    alignItems: 'center',
    shadowColor: c.coral,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 4,
  },
  getStartedBtnText: { fontSize: fontSizes.body, fontWeight: '700', color: '#fff', letterSpacing: 0.3 },
});

export default function WelcomeScreen({ onComplete }: Props) {
  const { t } = useTranslation();
  const { colors } = useTheme();
  const styles = makeStyles(colors);

  return (
    <SafeAreaView style={styles.root}>
      <View style={styles.content}>
        <Image source={require('../assets/App_Logo.png')} style={styles.logo} resizeMode="contain" />
        <Text style={styles.appName}>Kippy</Text>
        <Text style={styles.tagline}>{t('welcome.tagline')}</Text>
      </View>

      <View style={styles.footer}>
        <Pressable
          style={({ pressed }) => [styles.getStartedBtn, pressed && { opacity: 0.85 }]}
          onPress={onComplete}
        >
          <Text style={styles.getStartedBtnText}>{t('welcome.getStarted')}</Text>
        </Pressable>
      </View>
    </SafeAreaView>
  );
}
