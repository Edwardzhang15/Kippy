// API keys are read directly via EXPO_PUBLIC_-prefixed vars in .env, which
// Metro inlines at build time (see placesApi.ts). No config-time injection
// is needed here. .env is gitignored and never committed.
module.exports = {
  expo: {
    name: 'Kippy',
    slug: 'kippy',
    version: '1.0.0',
    orientation: 'portrait',
    icon: './assets/App_Logo.png',
    userInterfaceStyle: 'light',
    splash: {
      image: './assets/Kippy_logo_light.png',
      resizeMode: 'contain',
      backgroundColor: '#F7F7F5',
    },
    ios: {
      bundleIdentifier: 'com.edwardzhang.kippy',
      supportsTablet: false,
      infoPlist: {
        NSCameraUsageDescription: 'Kippy uses your camera to take photos of receipts for your expenses.',
        NSPhotoLibraryUsageDescription: 'Kippy accesses your photo library to attach receipt photos to your expenses.',
        ITSAppUsesNonExemptEncryption: false,
      },
    },
    android: {
      adaptiveIcon: {
        foregroundImage: './assets/App_Logo.png',
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
      'expo-iap',
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
      eas: {
        projectId: 'daa5a2f4-3445-43f1-8f82-af186296eb8c',
      },
    },
  },
};
