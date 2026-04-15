import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { RADIUS } from '../theme';
import { useTheme } from '../hooks/useTheme';

const TagChip = ({ label }) => {
  const { colors } = useTheme();
  
  return (
    <View style={[
      styles.container, 
      { 
        backgroundColor: colors.accentDim,
        borderColor: colors.border2
      }
    ]}>
      <Text style={[styles.text, { color: colors.accent }]}>{label}</Text>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    borderWidth: 1,
    borderRadius: RADIUS.pill,
    paddingVertical: 2,
    paddingHorizontal: 8,
    alignSelf: 'flex-start',
    marginRight: 6,
    marginBottom: 4,
  },
  text: {
    fontSize: 11,
    fontWeight: '500',
  },
});

export default TagChip;
