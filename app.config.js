// API keys are read directly via EXPO_PUBLIC_-prefixed vars in .env, which
// Metro inlines at build time (see placesApi.ts). No config-time injection
// is needed here. .env is gitignored and never committed.
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
  },
};
