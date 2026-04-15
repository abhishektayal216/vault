/**
 * Production configuration for SecureVault
 * This file contains production-specific settings
 */

const IS_PROD = process.env.NODE_ENV === 'production';

export default {
  name: 'SecureVault',
  slug: 'securevault',
  version: '2.0.0',
  orientation: 'portrait',
  icon: './assets/images/icon.png',
  userInterfaceStyle: 'dark',
  splash: {
    image: './assets/images/splash-icon.png',
    resizeMode: 'contain',
    backgroundColor: '#18253a'
  },
  ios: {
    supportsTablet: true,
    bundleIdentifier: 'com.yourcompany.securevault',
    infoPlist: {
      UIFileSharingEnabled: false,
      NSFaceIDUsageDescription: 'Authenticate to access your secure vault',
      NSRequiresScreenSecurity: true,
      NSAppTransportSecurity: {
        NSAllowsArbitraryLoads: false
      }
    },
    config: {
      usesNonExemptEncryption: false
    }
  },
  android: {
    adaptiveIcon: {
      foregroundImage: './assets/images/adaptive-icon.png',
      backgroundColor: '#18253a'
    },
    package: 'com.yourcompany.securevault',
    permissions: [
      'USE_FINGERPRINT',
      'USE_BIOMETRIC'
    ],
    secure: true
  },
  web: {
    favicon: './assets/images/favicon.png'
  },
  plugins: [
    [
      'expo-notifications',
      {
        icon: './assets/images/icon.png',
        color: '#00e5a0'
      }
    ],
    '@react-native-community/datetimepicker'
  ],
  extra: {
    // Production-only settings
    enableDebugTools: !IS_PROD,
    enableCrashReporting: IS_PROD,
    enableAnalytics: IS_PROD,
    environment: IS_PROD ? 'production' : 'development'
  }
};
