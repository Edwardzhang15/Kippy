import './i18n'; // must be imported before any component that calls useTranslation()
import { useEffect, useState } from 'react';
import { Image, StatusBar, StyleSheet, View } from 'react-native';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { NavigationContainer } from '@react-navigation/native';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { Ionicons } from '@expo/vector-icons';
import { useTranslation } from 'react-i18next';
import { initDatabase } from './db';
import { initRates } from './currencyRates';
import { applyPersistedLanguage } from './i18n';
import { ThemeProvider, useTheme } from './context/ThemeContext';
import { OnboardingProvider, useOnboarding } from './context/OnboardingContext';
import AsyncStorage from '@react-native-async-storage/async-storage';
import LoadingScreen from './components/LoadingScreen';
import KeyboardDoneBar from './components/KeyboardDoneBar';
import OnboardingScreen from './screens/OnboardingScreen';
import LanguagePickerScreen from './screens/LanguagePickerScreen';
import HomeStack from './navigation/HomeStack';
import InsightsScreen from './screens/InsightsScreen';
import SettingScreen from './screens/SettingScreen';
import PersonalStack from './navigation/PersonalStack';

const Tab = createBottomTabNavigator();
const MIN_LOADING_MS = 1500;

type IoniconName = React.ComponentProps<typeof Ionicons>['name'];

const TAB_ICONS: Record<string, { focused: IoniconName; unfocused: IoniconName }> = {
  Home:     { focused: 'car',           unfocused: 'car-outline' },
  Personal: { focused: 'person',       unfocused: 'person-outline' },
  Insights: { focused: 'bar-chart',    unfocused: 'bar-chart-outline' },
  Setting:  { focused: 'settings',     unfocused: 'settings-outline' },
};

function AppCore() {
  const { t } = useTranslation();
  const { colors, isDark } = useTheme();
  const { shouldShow: showOnboarding, onboardingReady } = useOnboarding();
  const [dbReady, setDbReady]           = useState(false);
  const [minTimeReady, setMinTimeReady] = useState(false);
  const [showLangPicker, setShowLangPicker]   = useState(false);
  const [langPickerReady, setLangPickerReady] = useState(false);
  const [langPickerDone, setLangPickerDone]   = useState(false);

  // Language Selection only depends on a single fast AsyncStorage read — it
  // must never be gated behind db init or the network rate fetch below, or a
  // first-time user on a slow connection would stare at the loading splash
  // before ever seeing it.
  const needsLangPicker = showLangPicker && !langPickerDone;
  // Everything after Language Selection (onboarding tour, then main app)
  // still needs the db, rates, onboarding-flag check, and the splash's
  // minimum display time.
  const restReady = dbReady && minTimeReady && onboardingReady;
  const showLoadingOverlay = !langPickerReady || (!needsLangPicker && !restReady);

  useEffect(() => {
    Promise.all([
      initDatabase(),
      initRates(),
      applyPersistedLanguage(),
    ])
      .then(() => setDbReady(true))
      .catch((e) => { if (__DEV__) console.error('Init failed:', e); });

    AsyncStorage.getItem('@kippy/lang_selected').then(v => {
      setShowLangPicker(!v);
      setLangPickerReady(true);
    });

    const timer = setTimeout(() => setMinTimeReady(true), MIN_LOADING_MS);
    return () => clearTimeout(timer);
  }, []);

  return (
    <View style={[styles.root, { backgroundColor: colors.background }]}>
      <KeyboardDoneBar />
      <StatusBar barStyle={isDark ? 'light-content' : 'dark-content'} />

      {restReady && !needsLangPicker && (
        <NavigationContainer>
          <Tab.Navigator
            screenOptions={({ route }) => ({
              headerShown: false,
              tabBarIcon: ({ focused, size }) => {
                if (route.name === 'Setting') {
                  const bigSize = Math.round(size * 1.5);
                  const trim    = Math.round((bigSize - size) / 2);
                  return (
                    <Image
                      source={isDark ? require('./assets/Kip_dark_gear.png') : require('./assets/Kip_gear.png')}
                      style={{
                        width: bigSize,
                        height: bigSize,
                        opacity: focused ? 1 : 0.45,
                        // Pull in equal top+bottom margin so the flex container
                        // still treats the icon as size×size (same as other tabs),
                        // keeping the label and icon-center vertically aligned.
                        marginTop: -trim,
                        marginBottom: -trim,
                      }}
                      resizeMode="contain"
                    />
                  );
                }
                const icons = TAB_ICONS[route.name];
                return (
                  <Ionicons
                    name={focused ? icons.focused : icons.unfocused}
                    size={size}
                    color={focused ? colors.coral : colors.tabInactive}
                  />
                );
              },
              tabBarActiveTintColor: colors.coral,
              tabBarInactiveTintColor: colors.tabInactive,
              tabBarStyle: {
                backgroundColor: colors.card,
                borderTopColor: colors.border,
              },
            })}
          >
            <Tab.Screen name="Home"     component={HomeStack}       options={{ tabBarLabel: t('tabs.home') }} />
            <Tab.Screen name="Personal" component={PersonalStack}    options={{ tabBarLabel: t('tabs.personal') }} />
            <Tab.Screen name="Insights" component={InsightsScreen}   options={{ tabBarLabel: t('tabs.insights') }} />
            <Tab.Screen name="Setting"  component={SettingScreen}    options={{ tabBarLabel: t('tabs.settings') }} />
          </Tab.Navigator>
        </NavigationContainer>
      )}

      {langPickerReady && needsLangPicker && (
        <View style={StyleSheet.absoluteFill}>
          <LanguagePickerScreen
            onComplete={async () => {
              await AsyncStorage.setItem('@kippy/lang_selected', 'true');
              setLangPickerDone(true);
            }}
          />
        </View>
      )}

      {restReady && !needsLangPicker && showOnboarding && (
        <View style={StyleSheet.absoluteFill}>
          <OnboardingScreen />
        </View>
      )}

      {showLoadingOverlay && (
        <View style={StyleSheet.absoluteFill}>
          <LoadingScreen />
        </View>
      )}
    </View>
  );
}

export default function App() {
  return (
    <GestureHandlerRootView style={styles.root}>
      <ThemeProvider>
        <OnboardingProvider>
          <AppCore />
        </OnboardingProvider>
      </ThemeProvider>
    </GestureHandlerRootView>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
  },
});
