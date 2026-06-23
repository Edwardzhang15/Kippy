import { useEffect, useRef, useState } from 'react';
import {
  Animated,
  Dimensions,
  Pressable,
  SafeAreaView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { useTranslation } from 'react-i18next';
import { type ColorPalette, fontSizes, radii } from '../theme';
import { useTheme } from '../context/ThemeContext';
import { useOnboarding } from '../context/OnboardingContext';

const { width: SCREEN_W, height: SCREEN_H } = Dimensions.get('window');
const KIP_RUN_SIZE = 100;

// Absolute position for the run-off Kip image (approximates where Kip sits in the slide)
const KIP_START_LEFT = (SCREEN_W - KIP_RUN_SIZE) / 2;
const KIP_START_TOP  = SCREEN_H * 0.27;

// Settings tab is the 4th of 4 tabs — its icon center in screen coordinates
const SETTINGS_CX = SCREEN_W * 0.875;
const SETTINGS_CY = SCREEN_H - 50;

// Translation delta: from Kip's initial center to Settings tab center
const RUN_DELTA_X = SETTINGS_CX - (KIP_START_LEFT + KIP_RUN_SIZE / 2);
const RUN_DELTA_Y = SETTINGS_CY - (KIP_START_TOP  + KIP_RUN_SIZE / 2);

const STEPS = [
  { image: require('../assets/Kip_wave.png'),  titleKey: 'onboarding.step1Title', bodyKey: 'onboarding.step1Body' },
  { image: require('../assets/Kip_jog.png'),   titleKey: 'onboarding.step2Title', bodyKey: 'onboarding.step2Body' },
  { image: require('../assets/Kip_map.png'),   titleKey: 'onboarding.step3Title', bodyKey: 'onboarding.step3Body' },
  { image: require('../assets/Kip_think.png'), titleKey: 'onboarding.step4Title', bodyKey: 'onboarding.step4Body' },
  { image: require('../assets/Kip_wave.png'),  titleKey: 'onboarding.step5Title', bodyKey: 'onboarding.step5Body' },
] as const;

const STEP_COUNT = STEPS.length;

const makeStyles = (c: ColorPalette) => StyleSheet.create({
  safe: { flex: 1, backgroundColor: c.background },
  skipRow: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    paddingHorizontal: 20,
    paddingTop: 12,
    paddingBottom: 4,
  },
  skipBtn: { padding: 8 },
  skipText: {
    fontSize: fontSizes.body,
    fontWeight: '600',
    color: c.textSecondary,
  },
  slidesClip: { flex: 1, overflow: 'hidden' },
  slidesRow: { flexDirection: 'row', height: '100%' },
  slide: {
    width: SCREEN_W,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 36,
    gap: 18,
  },
  kipImage: {
    width: SCREEN_W * 0.62,
    height: SCREEN_W * 0.62,
  },
  slideTitle: {
    fontSize: 26,
    fontWeight: '800',
    color: c.textPrimary,
    textAlign: 'center',
  },
  slideBody: {
    fontSize: fontSizes.body,
    color: c.textSecondary,
    textAlign: 'center',
    lineHeight: 23,
  },
  bottomArea: {
    paddingHorizontal: 24,
    paddingBottom: 36,
    gap: 22,
    alignItems: 'center',
  },
  dotsRow: {
    flexDirection: 'row',
    gap: 8,
    alignItems: 'center',
  },
  dot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: c.tabInactive,
  },
  dotActive: {
    width: 22,
    height: 8,
    borderRadius: 4,
    backgroundColor: c.coral,
  },
  nextBtn: {
    backgroundColor: c.coral,
    borderRadius: radii.button,
    paddingVertical: 16,
    alignItems: 'center',
    alignSelf: 'stretch',
  },
  nextBtnText: {
    fontSize: fontSizes.body,
    fontWeight: '700',
    color: '#fff',
  },
  // Run-off overlay
  runKip: {
    position: 'absolute',
    width: KIP_RUN_SIZE,
    height: KIP_RUN_SIZE,
    left: KIP_START_LEFT,
    top: KIP_START_TOP,
  },
  speechBubble: {
    position: 'absolute',
    right: 12,
    bottom: 90,
    backgroundColor: c.card,
    borderRadius: 12,
    paddingHorizontal: 14,
    paddingVertical: 10,
    maxWidth: 178,
    shadowColor: '#000',
    shadowOpacity: 0.14,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 2 },
    elevation: 5,
  },
  speechText: {
    fontSize: fontSizes.caption,
    fontWeight: '600',
    color: c.textPrimary,
    textAlign: 'center',
    lineHeight: 18,
  },
  bubbleTail: {
    position: 'absolute',
    bottom: -8,
    right: 18,
    width: 0,
    height: 0,
    borderLeftWidth: 7,
    borderLeftColor: 'transparent',
    borderRightWidth: 7,
    borderRightColor: 'transparent',
    borderTopWidth: 8,
    borderTopColor: c.card,
  },
});

export default function OnboardingScreen() {
  const { t } = useTranslation();
  const { colors } = useTheme();
  const { completeTour } = useOnboarding();
  const styles = makeStyles(colors);
  const [currentStep, setCurrentStep] = useState(0);
  const [isRunningOff, setIsRunningOff] = useState(false);

  // Panel slide
  const slideAnim = useRef(new Animated.Value(0)).current;

  // Per-step animation value arrays — created once, indexed by step
  const imgOpacity = useRef(STEPS.map(() => new Animated.Value(0))).current;
  const imgScale   = useRef(STEPS.map(() => new Animated.Value(0.88))).current;
  const imgRotate  = useRef(STEPS.map(() => new Animated.Value(0))).current;
  const idleBob    = useRef(STEPS.map(() => new Animated.Value(0))).current;
  const txtOpacity = useRef(STEPS.map(() => new Animated.Value(0))).current;
  const txtTransY  = useRef(STEPS.map(() => new Animated.Value(14))).current;

  // Run-off animation values
  const coverOpacity  = useRef(new Animated.Value(1)).current;
  const runTransX     = useRef(new Animated.Value(0)).current;
  const runTransY     = useRef(new Animated.Value(0)).current;
  const runScale      = useRef(new Animated.Value(1)).current;
  const runKipOpacity = useRef(new Animated.Value(1)).current;
  const bubbleOpacity = useRef(new Animated.Value(0)).current;

  const activeIdleLoop = useRef<Animated.CompositeAnimation | null>(null);
  const bubbleTimer    = useRef<ReturnType<typeof setTimeout> | null>(null);

  const startIdleBob = (idx: number) => {
    activeIdleLoop.current?.stop();
    idleBob[idx].setValue(0);
    const loop = Animated.loop(
      Animated.sequence([
        Animated.timing(idleBob[idx], { toValue: -7, duration: 1100, useNativeDriver: true }),
        Animated.timing(idleBob[idx], { toValue: 0,  duration: 1100, useNativeDriver: true }),
      ]),
    );
    activeIdleLoop.current = loop;
    loop.start();
  };

  const playEntry = (idx: number) => {
    activeIdleLoop.current?.stop();
    imgOpacity[idx].setValue(0);
    imgScale[idx].setValue(0.88);
    imgRotate[idx].setValue(0);
    idleBob[idx].setValue(0);
    txtOpacity[idx].setValue(0);
    txtTransY[idx].setValue(14);

    Animated.parallel([
      Animated.timing(imgOpacity[idx], {
        toValue: 1, duration: 280, useNativeDriver: true,
      }),
      Animated.spring(imgScale[idx], {
        toValue: 1, tension: 110, friction: 7, useNativeDriver: true,
      }),
      Animated.sequence([
        Animated.timing(imgRotate[idx], { toValue: 6,  duration: 120, useNativeDriver: true }),
        Animated.timing(imgRotate[idx], { toValue: -3, duration: 100, useNativeDriver: true }),
        Animated.timing(imgRotate[idx], { toValue: 0,  duration: 80,  useNativeDriver: true }),
      ]),
      Animated.timing(txtOpacity[idx], {
        toValue: 1, duration: 230, delay: 130, useNativeDriver: true,
      }),
      Animated.timing(txtTransY[idx], {
        toValue: 0, duration: 230, delay: 130, useNativeDriver: true,
      }),
    ]).start(() => startIdleBob(idx));
  };

  useEffect(() => {
    playEntry(0);
    return () => {
      activeIdleLoop.current?.stop();
      if (bubbleTimer.current) clearTimeout(bubbleTimer.current);
    };
  }, []);

  const goToStep = (step: number) => {
    setCurrentStep(step);
    Animated.timing(slideAnim, {
      toValue: -step * SCREEN_W, duration: 320, useNativeDriver: true,
    }).start();
    playEntry(step);
  };

  const handleFinish = () => {
    if (isRunningOff) return;
    setIsRunningOff(true);
    activeIdleLoop.current?.stop();

    // Fade out the slide content and background
    Animated.timing(coverOpacity, {
      toValue: 0, duration: 350, useNativeDriver: true,
    }).start();

    // Kip jogs from center to Settings tab, shrinking as he goes
    Animated.parallel([
      Animated.timing(runTransX, { toValue: RUN_DELTA_X, duration: 870, useNativeDriver: true }),
      Animated.timing(runTransY, { toValue: RUN_DELTA_Y, duration: 870, useNativeDriver: true }),
      Animated.timing(runScale,  { toValue: 0.2,         duration: 870, useNativeDriver: true }),
    ]).start(() => {
      // Kip has arrived — hide the animated Kip instantly so only the
      // permanent Kip_gear tab icon is visible before the bubble appears.
      runKipOpacity.setValue(0);
      Animated.timing(bubbleOpacity, { toValue: 1, duration: 220, useNativeDriver: true }).start();
      bubbleTimer.current = setTimeout(() => {
        Animated.timing(bubbleOpacity, { toValue: 0, duration: 280, useNativeDriver: true })
          .start(() => completeTour());
      }, 2700);
    });
  };

  const handleNext = () => {
    if (currentStep < STEP_COUNT - 1) {
      goToStep(currentStep + 1);
    } else {
      handleFinish();
    }
  };

  return (
    <View style={StyleSheet.absoluteFill}>
      {/* Main onboarding content — fades out during run-off */}
      <Animated.View style={[StyleSheet.absoluteFill, { opacity: coverOpacity }]}>
        <SafeAreaView style={styles.safe}>
          <View style={styles.skipRow}>
            <Pressable style={styles.skipBtn} onPress={handleFinish} hitSlop={8}>
              <Text style={styles.skipText}>{t('onboarding.skip')}</Text>
            </Pressable>
          </View>

          <View style={styles.slidesClip}>
            <Animated.View
              style={[
                styles.slidesRow,
                { width: SCREEN_W * STEP_COUNT, transform: [{ translateX: slideAnim }] },
              ]}
            >
              {STEPS.map((step, i) => {
                const rotateDeg = imgRotate[i].interpolate({
                  inputRange: [-10, 10],
                  outputRange: ['-10deg', '10deg'],
                });
                return (
                  <View key={i} style={styles.slide}>
                    <Animated.Image
                      source={step.image}
                      style={[
                        styles.kipImage,
                        {
                          opacity: imgOpacity[i],
                          transform: [
                            { scale: imgScale[i] },
                            { rotate: rotateDeg },
                            { translateY: idleBob[i] },
                          ],
                        },
                      ]}
                      resizeMode="contain"
                    />
                    <Animated.Text
                      style={[
                        styles.slideTitle,
                        { opacity: txtOpacity[i], transform: [{ translateY: txtTransY[i] }] },
                      ]}
                    >
                      {t(step.titleKey)}
                    </Animated.Text>
                    <Animated.Text
                      style={[
                        styles.slideBody,
                        { opacity: txtOpacity[i], transform: [{ translateY: txtTransY[i] }] },
                      ]}
                    >
                      {t(step.bodyKey)}
                    </Animated.Text>
                  </View>
                );
              })}
            </Animated.View>
          </View>

          <View style={styles.bottomArea}>
            <View style={styles.dotsRow}>
              {STEPS.map((_, i) => (
                <View key={i} style={[styles.dot, i === currentStep && styles.dotActive]} />
              ))}
            </View>
            <Pressable
              style={({ pressed }) => [styles.nextBtn, pressed && { opacity: 0.85 }]}
              onPress={handleNext}
            >
              <Text style={styles.nextBtnText}>
                {currentStep === STEP_COUNT - 1 ? t('onboarding.getStarted') : t('onboarding.next')}
              </Text>
            </Pressable>
          </View>
        </SafeAreaView>
      </Animated.View>

      {/* Run-off overlay — only mounts when the goodbye animation is active */}
      {isRunningOff && (
        <View style={StyleSheet.absoluteFill} pointerEvents="none">
          {/* Kip jogs to Settings tab */}
          <Animated.Image
            source={require('../assets/Kip_jog.png')}
            style={[
              styles.runKip,
              {
                opacity: runKipOpacity,
                transform: [
                  { translateX: runTransX },
                  { translateY: runTransY },
                  { scale: runScale },
                ],
              },
            ]}
            resizeMode="contain"
          />

          {/* Speech bubble near Settings tab */}
          <Animated.View style={[styles.speechBubble, { opacity: bubbleOpacity }]}>
            <Text style={styles.speechText}>{t('onboarding.bubble')}</Text>
            <View style={styles.bubbleTail} />
          </Animated.View>
        </View>
      )}
    </View>
  );
}
