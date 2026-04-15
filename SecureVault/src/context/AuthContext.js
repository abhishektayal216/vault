import AsyncStorage from '@react-native-async-storage/async-storage';
import * as LocalAuthentication from 'expo-local-authentication';
import { createContext, useContext, useEffect, useRef, useState } from 'react';
import { AppState, AppStateStatus } from 'react-native';

const SECURITY_KEY = '@securevault_security_enabled';
const AUTH_ATTEMPTS_KEY = '@securevault_auth_attempts';
const SESSION_TIMEOUT_KEY = '@securevault_session_timeout';
const DEFAULT_SESSION_TIMEOUT = 5; // minutes
const MAX_ATTEMPTS = 5;
const LOCKOUT_DURATION = 30000; // 30 seconds

const AuthContext = createContext();

export const AuthProvider = ({ children }) => {
  const [isLocked, setIsLocked] = useState(true);
  const [securityEnabled, setSecurityEnabled] = useState(false);
  const [isBiometricsAvailable, setIsBiometricsAvailable] = useState(false);
  const [loading, setLoading] = useState(true);
  const [isAuthenticating, setIsAuthenticating] = useState(false);
  const [sessionTimeout, setSessionTimeout] = useState(DEFAULT_SESSION_TIMEOUT);
  const [authAttempts, setAuthAttempts] = useState(0);
  const [lockoutUntil, setLockoutUntil] = useState(null);
  const [lastActivity, setLastActivity] = useState(Date.now());
  
  const appState = useRef(AppState.currentState);
  const authInProgress = useRef(false);
  const sessionTimerRef = useRef(null);
  const activityTimerRef = useRef(null);

  useEffect(() => {
    const init = async () => {
      try {
        await Promise.all([
          loadSecuritySettings(),
          checkBiometrics(),
          loadSessionSettings(),
          loadAuthAttempts()
        ]);
      } catch (error) {
        console.error('Auth initialization error:', error);
      } finally {
        // Ensure loading is always set to false after initialization
        setLoading(false);
      }
    };
    
    init();

    // AppState listener for Auto-Lock
    const subscription = AppState.addEventListener('change', handleAppStateChange);

    // Activity tracking for session timeout
    const activitySubscription = AppState.addEventListener('change', trackActivity);

    // Session timeout check
    sessionTimerRef.current = setInterval(checkSessionTimeout, 60000); // Check every minute

    // Fallback timeout to ensure loading is cleared even if something hangs
    const fallbackTimer = setTimeout(() => {
      setLoading(false);
    }, 3000);

    return () => {
      subscription.remove();
      activitySubscription.remove();
      if (sessionTimerRef.current) clearInterval(sessionTimerRef.current);
      if (activityTimerRef.current) clearTimeout(activityTimerRef.current);
      clearTimeout(fallbackTimer);
    };
  }, [securityEnabled, sessionTimeout]);

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
    }
  };

  const loadSessionSettings = async () => {
    try {
      const timeout = await AsyncStorage.getItem(SESSION_TIMEOUT_KEY);
      if (timeout) setSessionTimeout(parseInt(timeout, 10));
    } catch (e) {
      console.error('Failed to load session settings', e);
    }
  };

  const loadAuthAttempts = async () => {
    try {
      const attempts = await AsyncStorage.getItem(AUTH_ATTEMPTS_KEY);
      if (attempts) {
        const data = JSON.parse(attempts);
        setAuthAttempts(data.count || 0);
        if (data.lockoutUntil && new Date(data.lockoutUntil) > new Date()) {
          setLockoutUntil(data.lockoutUntil);
        }
      }
    } catch (e) {
      console.error('Failed to load auth attempts', e);
    }
  };

  const handleAppStateChange = (nextAppState: AppStateStatus) => {
    // Special handling for Biometric prompts which trigger 'inactive' state on Android
    // We only lock when the app definitely moves to 'background'
    if (
      appState.current.match(/active/) &&
      nextAppState === 'background' &&
      !authInProgress.current
    ) {
      // App went to background and we are not in the middle of authenticating
      if (securityEnabled) {
        setIsLocked(true);
      }
    }
    appState.current = nextAppState;
  };

  const trackActivity = () => {
    setLastActivity(Date.now());
  };

  const checkSessionTimeout = () => {
    if (!isLocked && securityEnabled) {
      const inactiveTime = (Date.now() - lastActivity) / 1000 / 60; // in minutes
      if (inactiveTime >= sessionTimeout) {
        setIsLocked(true);
      }
    }
  };

  const checkBiometrics = async () => {
    try {
      const hasHardware = await LocalAuthentication.hasHardwareAsync();
      const isEnrolled = await LocalAuthentication.isEnrolledAsync();
      const level = await LocalAuthentication.getEnrolledLevelAsync();
      // Check if device has been rebooted since last authentication
      setIsBiometricsAvailable(hasHardware && isEnrolled);
      return { hasHardware, isEnrolled, level };
    } catch (e) {
      console.error('Failed to check biometrics', e);
      return { hasHardware: false, isEnrolled: false, level: null };
    }
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

  const setSessionTimeoutValue = async (minutes: number) => {
    try {
      setSessionTimeout(minutes);
      await AsyncStorage.setItem(SESSION_TIMEOUT_KEY, minutes.toString());
    } catch (e) {
      console.error('Failed to set session timeout', e);
    }
  };

  const incrementAuthAttempts = async () => {
    const newAttempts = authAttempts + 1;
    setAuthAttempts(newAttempts);
    
    if (newAttempts >= MAX_ATTEMPTS) {
      const lockoutTime = new Date(Date.now() + LOCKOUT_DURATION).toISOString();
      setLockoutUntil(lockoutTime);
      await AsyncStorage.setItem(AUTH_ATTEMPTS_KEY, JSON.stringify({
        count: newAttempts,
        lockoutUntil: lockoutTime
      }));
      return true; // Locked out
    }
    
    await AsyncStorage.setItem(AUTH_ATTEMPTS_KEY, JSON.stringify({
      count: newAttempts,
      lockoutUntil: null
    }));
    return false;
  };

  const resetAuthAttempts = async () => {
    setAuthAttempts(0);
    setLockoutUntil(null);
    await AsyncStorage.setItem(AUTH_ATTEMPTS_KEY, JSON.stringify({
      count: 0,
      lockoutUntil: null
    }));
  };

  const isLockedOut = () => {
    if (lockoutUntil) {
      return new Date(lockoutUntil) > new Date();
    }
    return false;
  };

  const getLockoutRemaining = () => {
    if (lockoutUntil) {
      const remaining = new Date(lockoutUntil).getTime() - Date.now();
      return Math.max(0, Math.ceil(remaining / 1000));
    }
    return 0;
  };

  const authenticate = async () => {
    if (!securityEnabled) {
      setIsLocked(false);
      return true;
    }

    if (isAuthenticating) return false;
    if (isLockedOut()) return false;

    try {
      authInProgress.current = true;
      setIsAuthenticating(true);

      // Biometric authentication
      const { level } = await checkBiometrics();
      // Require re-authentication after device reboot
      if (level === LocalAuthentication.SecurityLevel.NONE) {
        throw new Error('Device requires passcode authentication after reboot');
      }
      const result = await LocalAuthentication.authenticateAsync({
        promptMessage: 'Unlock SecureVault',
        fallbackLabel: 'Use Passcode',
        disableDeviceFallback: false,
      });

      setIsAuthenticating(false);
      authInProgress.current = false;

      if (result.success) {
        await resetAuthAttempts();
        setLastActivity(Date.now());
        setIsLocked(false);
        return true;
      } else {
        const lockedOut = await incrementAuthAttempts();
        if (lockedOut) {
          throw new Error(`Too many failed attempts. Try again in ${LOCKOUT_DURATION / 1000} seconds.`);
        }
        return false;
      }
    } catch (e) {
      setIsAuthenticating(false);
      authInProgress.current = false;
      console.error('Authentication error', e);
      throw e;
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
      lock,
      sessionTimeout,
      setSessionTimeoutValue,
      authAttempts,
      isLockedOut,
      getLockoutRemaining
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
