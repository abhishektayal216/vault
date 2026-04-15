import React, { useEffect } from 'react';
import { View, Text, StyleSheet, Pressable, Animated } from 'react-native';
import { useAuth } from '../context/AuthContext';
import { useTheme } from '../hooks/useTheme';
import { RADIUS, SPACING } from '../theme';
import { Ionicons } from '@expo/vector-icons';

const LockScreen = () => {
  const { authenticate, isBiometricsAvailable, loading, securityEnabled } = useAuth();
  const { colors } = useTheme();
  
  const fadeAnim = new Animated.Value(0);
  const scaleAnim = new Animated.Value(0.9);

  useEffect(() => {
    Animated.parallel([
      Animated.timing(fadeAnim, { toValue: 1, duration: 800, useNativeDriver: true }),
      Animated.spring(scaleAnim, { toValue: 1, friction: 8, useNativeDriver: true }),
    ]).start();

    // Auto-trigger only AFTER loading is done and security is verified
    if (!loading && securityEnabled) {
      const timer = setTimeout(() => {
        authenticate();
      }, 800);
      return () => clearTimeout(timer);
    }
  }, [loading, securityEnabled]);

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

        <Pressable 
          onPress={authenticate}
          style={({ pressed }) => [
            styles.unlockBtn,
            { backgroundColor: colors.accent, opacity: pressed ? 0.8 : 1 }
          ]}
        >
          <Text style={[styles.unlockBtnText, { color: colors.bg }]}>
            {isBiometricsAvailable ? 'Unlock with Biometrics' : 'Enter Passcode'}
          </Text>
        </Pressable>
        
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
});

export default LockScreen;
