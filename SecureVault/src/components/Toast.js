import React, { createContext, useContext, useState, useEffect, useRef } from 'react';
import { View, Text, StyleSheet, Animated, Dimensions } from 'react-native';
import { RADIUS, SPACING } from '../theme';
import { useTheme } from '../hooks/useTheme';


const ToastContext = createContext();

export const useToast = () => {
  const context = useContext(ToastContext);
  if (!context) throw new Error('useToast must be used within a ToastProvider');
  return context;
};

export const ToastProvider = ({ children }) => {
  const { colors } = useTheme();
  const [toast, setToast] = useState({ visible: false, message: '', type: 'ok' });
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const slideAnim = useRef(new Animated.Value(20)).current;

  const show = (message, type = 'ok') => {
    setToast({ visible: true, message, type });
  };

  useEffect(() => {
    if (toast.visible) {
      Animated.parallel([
        Animated.timing(fadeAnim, { toValue: 1, duration: 300, useNativeDriver: true }),
        Animated.timing(slideAnim, { toValue: 0, duration: 300, useNativeDriver: true }),
      ]).start();

      const timer = setTimeout(() => {
        hide();
      }, 3500);

      return () => clearTimeout(timer);
    }
  }, [toast.visible]);

  const hide = () => {
    Animated.parallel([
      Animated.timing(fadeAnim, { toValue: 0, duration: 300, useNativeDriver: true }),
      Animated.timing(slideAnim, { toValue: 20, duration: 300, useNativeDriver: true }),
    ]).start(() => {
      setToast(prev => ({ ...prev, visible: false }));
    });
  };

  return (
    <ToastContext.Provider value={{ show }}>
      {children}
      {toast.visible && (
        <Animated.View style={[
          styles.toastContainer,
          { opacity: fadeAnim, transform: [{ translateY: slideAnim }] }
        ]}>
          <View style={[
            styles.toast,
            { 
              backgroundColor: colors.surf2,
              borderColor: toast.type === 'err' ? colors.err : toast.type === 'warn' ? colors.warn : colors.accent 
            }
          ]}>
            <Text style={[
              styles.message,
              { color: toast.type === 'err' ? colors.err : toast.type === 'warn' ? colors.warn : colors.accent }
            ]}>
              {toast.message}
            </Text>
          </View>
        </Animated.View>
      )}
    </ToastContext.Provider>
  );
};

const styles = StyleSheet.create({
  toastContainer: {
    position: 'absolute',
    bottom: 90,
    left: 0,
    right: 0,
    alignItems: 'center',
    zIndex: 9999,
  },
  toast: {
    borderWidth: 1,
    borderRadius: RADIUS.pill,
    paddingVertical: 10,
    paddingHorizontal: 20,
    elevation: 5,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 3.84,
  },
  message: {
    fontSize: 14,
    fontWeight: '600',
  },
});
