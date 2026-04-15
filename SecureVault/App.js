import React, { useEffect } from 'react';
import { NavigationContainer, DarkTheme as NavigationDarkTheme, DefaultTheme as NavigationDefaultTheme } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { StatusBar } from 'expo-status-bar';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { VaultProvider } from './src/context/VaultContext';
import { ToastProvider } from './src/components/Toast';
import { requestPermissions } from './src/utils/notifications';
import { DARK_COLORS, LIGHT_COLORS } from './src/theme';
import { ThemeProvider } from './src/context/ThemeContext';
import { AuthProvider, useAuth } from './src/context/AuthContext';
import { useTheme } from './src/hooks/useTheme';

// Screens
import HomeScreen from './src/screens/HomeScreen';
import AddEditScreen from './src/screens/AddEditScreen';
import DetailScreen from './src/screens/DetailScreen';
import SettingsScreen from './src/screens/SettingsScreen';
import LockScreen from './src/screens/LockScreen';

const Stack = createNativeStackNavigator();

// Explicit fonts for React Navigation 7 compatibility
const BaseFonts = {
  regular: { fontFamily: 'System', fontWeight: '400' },
  medium: { fontFamily: 'System', fontWeight: '500' },
  bold: { fontFamily: 'System', fontWeight: '700' },
  heavy: { fontFamily: 'System', fontWeight: '900' },
};

const CustomDarkTheme = {
  ...NavigationDarkTheme,
  fonts: BaseFonts,
  colors: {
    ...NavigationDarkTheme.colors,
    primary: DARK_COLORS.accent,
    background: DARK_COLORS.bg,
    card: DARK_COLORS.surf,
    text: DARK_COLORS.text,
    border: DARK_COLORS.border,
    notification: DARK_COLORS.accent,
  },
};

const CustomLightTheme = {
  ...NavigationDefaultTheme,
  fonts: BaseFonts,
  colors: {
    ...NavigationDefaultTheme.colors,
    primary: LIGHT_COLORS.accent,
    background: LIGHT_COLORS.bg,
    card: LIGHT_COLORS.surf,
    text: LIGHT_COLORS.text,
    border: LIGHT_COLORS.border,
    notification: LIGHT_COLORS.accent,
  },
};

const AppNavigator = () => {
  const { colors, isDark } = useTheme();
  const { isLocked } = useAuth();
  const theme = isDark ? CustomDarkTheme : CustomLightTheme;

  if (isLocked) {
    return (
      <>
        <StatusBar style={isDark ? 'light' : 'dark'} />
        <LockScreen />
      </>
    );
  }

  return (
    <NavigationContainer theme={theme}>
      <StatusBar style={isDark ? 'light' : 'dark'} />
      <Stack.Navigator
        initialRouteName="Home"
        screenOptions={{
          headerStyle: { backgroundColor: theme.colors.card },
          headerTintColor: theme.colors.primary,
          headerTitleStyle: { color: theme.colors.text },
          headerShadowVisible: false,
        }}
      >
        <Stack.Screen 
          name="Home" 
          component={HomeScreen} 
          options={{ headerShown: false }} 
        />
        <Stack.Screen 
          name="AddEdit" 
          component={AddEditScreen} 
          options={({ route }) => ({ title: route.params?.mode === 'edit' ? 'Edit Credential' : 'New Credential' })} 
        />
        <Stack.Screen 
          name="Detail" 
          component={DetailScreen} 
          options={{ title: 'Credential Details' }} 
        />
        <Stack.Screen 
          name="Settings" 
          component={SettingsScreen} 
          options={{ title: 'Settings' }} 
        />
      </Stack.Navigator>
    </NavigationContainer>
  );
};

export default function App() {
  useEffect(() => {
    requestPermissions();
  }, []);

  return (
    <SafeAreaProvider>
      <ThemeProvider>
        <AuthProvider>
          <ToastProvider>
            <VaultProvider>
              <AppNavigator />
            </VaultProvider>
          </ToastProvider>
        </AuthProvider>
      </ThemeProvider>
    </SafeAreaProvider>
  );
}
