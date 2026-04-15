import React, { createContext, useContext, useState, useEffect, useRef } from 'react';
import { AppState } from 'react-native';
import * as LocalAuthentication from 'expo-local-authentication';
import AsyncStorage from '@react-native-async-storage/async-storage';

const SECURITY_KEY = '@securevault_security_enabled';

const AuthContext = createContext();

export const AuthProvider = ({ children }) => {
  const [isLocked, setIsLocked] = useState(true);
  const [securityEnabled, setSecurityEnabled] = useState(false);
  const [isBiometricsAvailable, setIsBiometricsAvailable] = useState(false);
  const [loading, setLoading] = useState(true);
  const [isAuthenticating, setIsAuthenticating] = useState(false);
  
  const appState = useRef(AppState.currentState);

  useEffect(() => {
    loadSecuritySettings();
    checkBiometrics();

    // AppState listener for Auto-Lock
    const subscription = AppState.addEventListener('change', nextAppState => {
      if (
        appState.current.match(/active/) &&
        nextAppState.match(/inactive|background/)
      ) {
        // App went to background
        if (securityEnabled) {
          setIsLocked(true);
        }
      }
      appState.current = nextAppState;
    });

    return () => {
      subscription.remove();
    };
  }, [securityEnabled]);

  const loadSecuritySettings = async () => {
    try {
      const enabled = await AsyncStorage.getItem(SECURITY_KEY);
      const isEnabled = enabled === 'true';
      setSecurityEnabled(isEnabled);
      // If security is disabled, start as unlocked
      if (!isEnabled) {
        setIsLocked(false);
      }
    } catch (e) {
      console.error('Failed to load security settings', e);
    } finally {
      setLoading(false);
    }
  };

  const checkBiometrics = async () => {
    const hasHardware = await LocalAuthentication.hasHardwareAsync();
    const isEnrolled = await LocalAuthentication.isEnrolledAsync();
    setIsBiometricsAvailable(hasHardware && isEnrolled);
  };

  const toggleSecurity = async (value) => {
    try {
      setSecurityEnabled(value);
      await AsyncStorage.setItem(SECURITY_KEY, value.toString());
      if (!value) {
        setIsLocked(false);
      }
    } catch (e) {
      console.error('Failed to save security setting', e);
    }
  };

  const authenticate = async () => {
    if (!securityEnabled) {
      setIsLocked(false);
      return true;
    }

    if (isAuthenticating) return false;

    try {
      setIsAuthenticating(true);

      // Verify hardware again to be safe
      const hasHardware = await LocalAuthentication.hasHardwareAsync();
      const isEnrolled = await LocalAuthentication.isEnrolledAsync();
      
      if (!hasHardware || !isEnrolled) {
        setIsAuthenticating(false);
        return false;
      }

      const result = await LocalAuthentication.authenticateAsync({
        promptMessage: 'Unlock SecureVault',
        fallbackLabel: 'Use Passcode',
        disableDeviceFallback: false,
      });

      setIsAuthenticating(false);

      if (result.success) {
        setIsLocked(false);
        return true;
      }
      return false;
    } catch (e) {
      setIsAuthenticating(false);
      console.error('Authentication error', e);
      return false;
    }
  };

  const lock = () => {
    if (securityEnabled) {
      setIsLocked(true);
    }
  };

  return (
    <AuthContext.Provider value={{
      isLocked,
      securityEnabled,
      isBiometricsAvailable,
      loading,
      authenticate,
      toggleSecurity,
      lock
    }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};
