import { useEffect, useRef } from 'react';
import {
  Animated,
  ImageSourcePropType,
  Pressable,
  StyleSheet,
  Text,
} from 'react-native';
import { useTranslation } from 'react-i18next';
import { type ColorPalette, fontSizes, radii } from '../theme';
import { useTheme } from '../context/ThemeContext';

type Props = {
  image: ImageSourcePropType;
  tripName: string;
  phrase: string;
  onContinue: () => void;
};

const makeStyles = (c: ColorPalette) => StyleSheet.create({
  overlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: c.background,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 36,
    gap: 0,
    zIndex: 100,
  },
  image: {
    width: 210,
    height: 210,
    marginBottom: 24,
  },
  tripName: {
    fontSize: 22,
    fontWeight: '800',
    color: c.textPrimary,
    textAlign: 'center',
    marginBottom: 10,
  },
  phrase: {
    fontSize: fontSizes.body,
    color: c.textSecondary,
    textAlign: 'center',
    lineHeight: 23,
    marginBottom: 32,
  },
  btn: {
    backgroundColor: c.coral,
    borderRadius: radii.button,
    paddingVertical: 15,
    alignSelf: 'stretch',
    alignItems: 'center',
  },
  btnText: {
    fontSize: fontSizes.body,
    fontWeight: '700',
    color: '#fff',
  },
});

export default function FeatureIntroSplash({ image, tripName, phrase, onContinue }: Props) {
  const { t } = useTranslation();
  const { colors } = useTheme();
  const styles = makeStyles(colors);

  const opacity = useRef(new Animated.Value(0)).current;
  const slideUp = useRef(new Animated.Value(28)).current;

  useEffect(() => {
    Animated.parallel([
      Animated.timing(opacity, { toValue: 1, duration: 320, useNativeDriver: true }),
      Animated.timing(slideUp, { toValue: 0, duration: 320, useNativeDriver: true }),
    ]).start();
  }, []);

  const dismiss = () => {
    Animated.timing(opacity, { toValue: 0, duration: 220, useNativeDriver: true })
      .start(() => onContinue());
  };

  return (
    <Animated.View style={[styles.overlay, { opacity }]}>
      <Animated.Image
        source={image}
        style={[styles.image, { transform: [{ translateY: slideUp }] }]}
        resizeMode="contain"
      />
      <Animated.Text style={[styles.tripName, { transform: [{ translateY: slideUp }] }]}>
        {tripName}
      </Animated.Text>
      <Animated.Text style={[styles.phrase, { transform: [{ translateY: slideUp }] }]}>
        {phrase}
      </Animated.Text>
      <Animated.View style={[{ alignSelf: 'stretch' }, { transform: [{ translateY: slideUp }] }]}>
        <Pressable
          style={({ pressed }) => [styles.btn, pressed && { opacity: 0.85 }]}
          onPress={dismiss}
        >
          <Text style={styles.btnText}>{t('featureIntro.continue')}</Text>
        </Pressable>
      </Animated.View>
    </Animated.View>
  );
}
