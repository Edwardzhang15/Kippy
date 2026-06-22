import { Platform } from 'react-native';

export const colors = {
  background: '#F7F7F5',
  card: '#FFFFFF',
  coral: '#FF6B5B',
  sage: '#7FA68C',
  textPrimary: '#2D2D2D',
  textSecondary: '#8A8A8A',
  tabInactive: '#A0A0A0',
  border: '#EFEFED',
};

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
