import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { RADIUS, SPACING } from '../theme';
import { useTheme } from '../hooks/useTheme';

const StatBox = ({ number, label }) => {
  const { colors } = useTheme();
  
  return (
    <View style={[styles.container, { backgroundColor: colors.surf2, borderColor: colors.border }]}>
      <Text style={[styles.number, { color: colors.accent }]}>{number}</Text>
      <Text style={[styles.label, { color: colors.muted }]}>{label}</Text>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    borderWidth: 1,
    borderRadius: RADIUS.md,
    padding: SPACING.md,
    alignItems: 'center',
    justifyContent: 'center',
  },
  number: {
    fontSize: 22,
    fontWeight: '700',
    marginBottom: 4,
  },
  label: {
    fontSize: 11,
    textAlign: 'center',
  },
});

export default StatBox;
