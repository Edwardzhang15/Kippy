import { Platform } from 'react-native';

export type ColorPalette = {
  background: string;
  card: string;
  coral: string;
  sage: string;
  textPrimary: string;
  textSecondary: string;
  tabInactive: string;
  border: string;
};

export const lightColors: ColorPalette = {
  background: '#F7F7F5',
  card: '#FFFFFF',
  coral: '#FF6B5B',
  sage: '#7FA68C',
  textPrimary: '#2D2D2D',
  textSecondary: '#8A8A8A',
  tabInactive: '#A0A0A0',
  border: '#EFEFED',
};

export const darkColors: ColorPalette = {
  background: '#121212',
  card: '#1E1E1E',
  coral: '#FF7A6A',
  sage: '#8FB89C',
  textPrimary: '#F0F0EE',
  textSecondary: '#909090',
  tabInactive: '#5A5A5A',
  border: '#2C2C2C',
};

// Legacy alias — always light so share cards (captured images) stay light
export const colors = lightColors;

export const fontSizes = {
  screenTitle: 30,
  sectionTitle: 20,
  body: 15,
  caption: 12,
};

export const radii = {
  card: 18,
  button: 14,
};

export const cardShadow = Platform.select({
  ios: {
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.07,
    shadowRadius: 8,
  },
  android: {
    elevation: 3,
  },
  default: {},
});
