// Using app.config.js (instead of app.json) so we can inject secrets from
// environment variables at config-evaluation time. The Expo CLI automatically
// loads variables from .env into process.env before this file runs — see
// https://docs.expo.dev/guides/environment-variables/ — so no extra dotenv
// setup is needed here. .env itself is gitignored and never committed.
module.exports = {
  expo: {
    name: 'Kippy',
    slug: 'kippy',
    version: '1.0.0',
    orientation: 'portrait',
    icon: './assets/Kippy_logo_light.png',
    userInterfaceStyle: 'light',
    splash: {
      image: './assets/Kippy_logo_light.png',
      resizeMode: 'contain',
      backgroundColor: '#F7F7F5',
    },
    ios: {
      supportsTablet: true,
    },
    android: {
      adaptiveIcon: {
        foregroundImage: './assets/Kippy_logo_light.png',
        backgroundColor: '#F7F7F5',
      },
      predictiveBackGestureEnabled: false,
    },
    web: {
      favicon: './assets/Kippy_logo_light.png',
    },
    plugins: [
      '@react-native-community/datetimepicker',
      'expo-sqlite',
      [
        'expo-splash-screen',
        {
          image: './assets/Kippy_logo_light.png',
          imageWidth: 200,
          resizeMode: 'contain',
          backgroundColor: '#F7F7F5',
        },
      ],
      'expo-localization',
      [
        'expo-image-picker',
        {
          photosPermission: 'Kippy needs access to your photos to attach receipts.',
          cameraPermission: 'Kippy needs camera access to photograph receipts.',
        },
      ],
    ],
    extra: {
      googlePlacesApiKey: process.env.GOOGLE_PLACES_API_KEY,
    },
  },
};
