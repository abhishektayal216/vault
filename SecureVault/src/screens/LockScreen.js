import { Ionicons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import { useEffect, useRef, useState } from 'react';
import { Animated, Pressable, StyleSheet, Text, View } from 'react-native';
import { useAuth } from '../context/AuthContext';
import { useTheme } from '../hooks/useTheme';
import { RADIUS, SPACING } from '../theme';

const LockScreen = ({ navigation }) => {
  const { authenticate, isBiometricsAvailable, loading, securityEnabled, isLockedOut, getLockoutRemaining } = useAuth();
  const { colors } = useTheme();
  
  const isAttempting = useRef(false);
  const [authError, setAuthError] = useState('');
  const [lockoutRemaining, setLockoutRemaining] = useState(0);
  
  const fadeAnim = new Animated.Value(0);
  const scaleAnim = new Animated.Value(0.9);

  const handleAuthenticate = async () => {
    if (isAttempting.current) return;
    if (isLockedOut()) {
      setLockoutRemaining(getLockoutRemaining());
      return;
    }
    
    isAttempting.current = true;
    setAuthError('');
    try {
      await authenticate();
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    } catch (error) {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
      setAuthError(error.message);
      if (isLockedOut()) {
        setLockoutRemaining(getLockoutRemaining());
      }
    } finally {
      isAttempting.current = false;
    }
  };

  useEffect(() => {
    Animated.parallel([
      Animated.timing(fadeAnim, { toValue: 1, duration: 800, useNativeDriver: true }),
      Animated.spring(scaleAnim, { toValue: 1, friction: 8, useNativeDriver: true }),
    ]).start();

    // Auto-trigger biometric if available
    if (!loading && securityEnabled && isBiometricsAvailable) {
      const timer = setTimeout(() => {
        handleAuthenticate();
      }, 800);
      return () => clearTimeout(timer);
    }
  }, [loading, securityEnabled, isBiometricsAvailable]);
  
  // Update lockout countdown
  useEffect(() => {
    if (lockoutRemaining > 0) {
      const interval = setInterval(() => {
        const remaining = getLockoutRemaining();
        setLockoutRemaining(remaining);
        if (remaining === 0) {
          clearInterval(interval);
        }
      }, 1000);
      return () => clearInterval(interval);
    }
  }, [lockoutRemaining]);

  return (
    <View style={[styles.container, { backgroundColor: colors.bg }]}>
      <Animated.View style={[
        styles.content, 
        { opacity: fadeAnim, transform: [{ scale: scaleAnim }] }
      ]}>
        <View style={[styles.iconCircle, { backgroundColor: colors.accentDim }]}>
          <Ionicons name="lock-closed" size={50} color={colors.accent} />
        </View>
        
        <Text style={[styles.title, { color: colors.textBright }]}>Vault Locked</Text>
        <Text style={[styles.subtitle, { color: colors.muted }]}>
          Fingerprint or FaceID required to access your credentials
        </Text>

        {lockoutRemaining > 0 && (
          <View style={[styles.lockoutBanner, { backgroundColor: colors.err + '20' }]}>
            <Ionicons name="time" size={16} color={colors.err} />
            <Text style={[styles.lockoutText, { color: colors.err }]}>
              Too many attempts. Try again in {lockoutRemaining}s
            </Text>
          </View>
        )}

        {isBiometricsAvailable && (
          <Pressable 
            onPress={() => handleAuthenticate()}
            disabled={lockoutRemaining > 0}
            style={({ pressed }) => [
              styles.unlockBtn,
              { backgroundColor: colors.accent, opacity: pressed || lockoutRemaining > 0 ? 0.5 : 1 }
            ]}
          >
            <Text style={[styles.unlockBtnText, { color: colors.bg }]}>Unlock with Biometrics</Text>
          </Pressable>
        )}

        {authError ? (
          <Text style={[styles.errorText, { color: colors.err }]}>{authError}</Text>
        ) : null}
        
        <Text style={[styles.footerText, { color: colors.muted2 }]}>
          SecureVault · Encrypted Offline Storage
        </Text>
      </Animated.View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  content: {
    alignItems: 'center',
    padding: SPACING.xl,
    width: '100%',
  },
  iconCircle: {
    width: 100,
    height: 100,
    borderRadius: 50,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 30,
  },
  title: {
    fontSize: 28,
    fontWeight: '800',
    marginBottom: 12,
  },
  subtitle: {
    fontSize: 15,
    textAlign: 'center',
    lineHeight: 22,
    marginBottom: 40,
    paddingHorizontal: 20,
  },
  unlockBtn: {
    paddingHorizontal: 32,
    paddingVertical: 16,
    borderRadius: RADIUS.lg,
    width: '100%',
    alignItems: 'center',
    elevation: 4,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 5,
  },
  unlockBtnText: {
    fontSize: 16,
    fontWeight: '700',
  },
  footerText: {
    position: 'absolute',
    bottom: -100,
    fontSize: 12,
    fontWeight: '500',
  },
  lockoutBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: RADIUS.sm,
    marginTop: 16,
    gap: 8,
  },
  lockoutText: {
    fontSize: 13,
    fontWeight: '600',
  },
  errorText: {
    fontSize: 13,
    marginTop: 12,
    textAlign: 'center',
  },
});

export default LockScreen;
