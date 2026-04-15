import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { RADIUS, SPACING } from '../theme';
import { useTheme } from '../hooks/useTheme';

const SectionCard = ({ title, children, dangerBorder }) => {
  const { colors } = useTheme();
  
  return (
    <View style={[
      styles.container, 
      { 
        backgroundColor: colors.surf,
        borderColor: colors.border
      },
      dangerBorder && { borderColor: colors.err + '4d' }
    ]}>
      <Text style={[styles.title, { color: colors.textBright }]}>{title}</Text>
      <View style={styles.content}>
        {children}
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    borderWidth: 1,
    borderRadius: RADIUS.lg,
    padding: SPACING.md,
    marginBottom: SPACING.md,
  },
  title: {
    fontSize: 13,
    fontWeight: '700',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  content: {
    marginTop: SPACING.sm,
  },
});

export default SectionCard;
