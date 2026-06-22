import { useEffect, useRef } from 'react';
import { Animated, Image, StyleSheet, Text, useWindowDimensions, View } from 'react-native';
import { useTranslation } from 'react-i18next';
import { colors, fontSizes } from '../theme';

export default function LoadingScreen() {
  const { t }               = useTranslation();
  const { width: screenWidth } = useWindowDimensions();
  const trackWidth = screenWidth - 80;

  const fadeAnim     = useRef(new Animated.Value(0)).current;
  const progressAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.parallel([
      Animated.timing(fadeAnim, {
        toValue: 1,
        duration: 400,
        useNativeDriver: true,
      }),
      Animated.timing(progressAnim, {
        toValue: 1,
        duration: 1500,
        useNativeDriver: false,
      }),
    ]).start();
  }, []);

  const progressWidth = progressAnim.interpolate({
    inputRange:  [0, 1],
    outputRange: [0, trackWidth],
  });

  return (
    <Animated.View style={[styles.container, { opacity: fadeAnim }]}>
      <Image
        source={require('../assets/Kippy_logo.png')}
        style={styles.logo}
        resizeMode="contain"
      />
      <View style={[styles.track, { width: trackWidth }]}>
        <Animated.View style={[styles.fill, { width: progressWidth }]} />
      </View>
      <Text style={styles.caption}>{t('loading.caption')}</Text>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 24,
  },
  logo: {
    width: 360,
    height: 180,
  },
  track: {
    height: 4,
    backgroundColor: colors.border,
    borderRadius: 2,
    overflow: 'hidden',
  },
  fill: {
    height: '100%',
    backgroundColor: colors.coral,
    borderRadius: 2,
  },
  caption: {
    fontSize: fontSizes.caption,
    color: colors.textSecondary,
    letterSpacing: 0.3,
  },
});
