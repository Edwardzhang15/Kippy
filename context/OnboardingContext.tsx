import { createContext, useContext, useEffect, useState } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';

const ONBOARDING_KEY = '@kippy/has_seen_onboarding';

type OnboardingContextValue = {
  shouldShow: boolean;
  onboardingReady: boolean;
  launchTour: () => void;
  completeTour: () => void;
};

const OnboardingContext = createContext<OnboardingContextValue>({
  shouldShow: false,
  onboardingReady: false,
  launchTour: () => {},
  completeTour: () => {},
});

export function OnboardingProvider({ children }: { children: React.ReactNode }) {
  const [shouldShow, setShouldShow] = useState(false);
  const [onboardingReady, setOnboardingReady] = useState(false);

  useEffect(() => {
    AsyncStorage.getItem(ONBOARDING_KEY).then((val) => {
      setShouldShow(!val);
      setOnboardingReady(true);
    });
  }, []);

  const launchTour = () => setShouldShow(true);

  const completeTour = () => {
    AsyncStorage.setItem(ONBOARDING_KEY, 'true');
    setShouldShow(false);
  };

  return (
    <OnboardingContext.Provider value={{ shouldShow, onboardingReady, launchTour, completeTour }}>
      {children}
    </OnboardingContext.Provider>
  );
}

export function useOnboarding(): OnboardingContextValue {
  return useContext(OnboardingContext);
}
