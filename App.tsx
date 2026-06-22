import './i18n'; // must be imported before any component that calls useTranslation()
import { useEffect, useState } from 'react';
import { StatusBar, StyleSheet, View } from 'react-native';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { NavigationContainer } from '@react-navigation/native';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { Ionicons } from '@expo/vector-icons';
import { useTranslation } from 'react-i18next';
import { initDatabase } from './db';
import { initRates } from './currencyRates';
import { applyPersistedLanguage } from './i18n';
import { ThemeProvider, useTheme } from './context/ThemeContext';
import LoadingScreen from './components/LoadingScreen';
import HomeStack from './navigation/HomeStack';
import PlanStack from './navigation/PlanStack';
import InsightsScreen from './screens/InsightsScreen';
import SettingScreen from './screens/SettingScreen';

const Tab = createBottomTabNavigator();
const MIN_LOADING_MS = 1500;

type IoniconName = React.ComponentProps<typeof Ionicons>['name'];

const TAB_ICONS: Record<string, { focused: IoniconName; unfocused: IoniconName }> = {
  Home:     { focused: 'home',      unfocused: 'home-outline' },
  Plan:     { focused: 'map',       unfocused: 'map-outline' },
  Insights: { focused: 'bar-chart', unfocused: 'bar-chart-outline' },
  Setting:  { focused: 'settings',  unfocused: 'settings-outline' },
};

function AppCore() {
  const { t } = useTranslation();
  const { colors, isDark } = useTheme();
  const [dbReady, setDbReady]           = useState(false);
  const [minTimeReady, setMinTimeReady] = useState(false);
  const [overlayVisible, setOverlayVisible] = useState(true);

  const appReady = dbReady && minTimeReady;

  useEffect(() => {
    Promise.all([
      initDatabase(),
      initRates(),
      applyPersistedLanguage(),
    ])
      .then(() => setDbReady(true))
      .catch((e) => console.error('Init failed:', e));

    const timer = setTimeout(() => setMinTimeReady(true), MIN_LOADING_MS);
    return () => clearTimeout(timer);
  }, []);

  useEffect(() => {
    if (appReady) setOverlayVisible(false);
  }, [appReady]);

  return (
    <View style={[styles.root, { backgroundColor: colors.background }]}>
      <StatusBar barStyle={isDark ? 'light-content' : 'dark-content'} />

      {dbReady && (
        <NavigationContainer>
          <Tab.Navigator
            screenOptions={({ route }) => ({
              headerShown: false,
              tabBarIcon: ({ focused, size }) => {
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
            <Tab.Screen name="Home" component={HomeStack} options={{ tabBarLabel: t('tabs.home') }} />
            <Tab.Screen name="Plan" component={PlanStack} options={{ tabBarLabel: t('tabs.plan') }} />
            <Tab.Screen name="Insights" component={InsightsScreen} options={{ tabBarLabel: t('tabs.insights') }} />
            <Tab.Screen name="Setting" component={SettingScreen} options={{ tabBarLabel: t('tabs.settings') }} />
          </Tab.Navigator>
        </NavigationContainer>
      )}

      {overlayVisible && (
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
        <AppCore />
      </ThemeProvider>
    </GestureHandlerRootView>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
  },
});
