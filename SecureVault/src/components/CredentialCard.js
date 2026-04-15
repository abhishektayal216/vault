import React, { useRef } from 'react';
import { View, Text, StyleSheet, Pressable, Animated, Dimensions } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { RADIUS, SPACING } from '../theme';
import { useTheme } from '../hooks/useTheme';
import TagChip from './TagChip';

const { width: SCREEN_WIDTH } = Dimensions.get('window');
const CARD_MARGIN = 6;
const CARD_WIDTH = (SCREEN_WIDTH - SPACING.lg * 2) / 2 - CARD_MARGIN * 2;

const CredentialCard = ({ credential, onPress }) => {
  const { colors, isDark } = useTheme();
  const scaleAnim = useRef(new Animated.Value(1)).current;

  const handlePressIn = () => {
    Animated.spring(scaleAnim, { toValue: 0.96, useNativeDriver: true }).start();
  };

  const handlePressOut = () => {
    Animated.spring(scaleAnim, { toValue: 1, useNativeDriver: true }).start();
  };

  const isReminderUpcoming = credential.reminder && !credential.rFired && new Date(credential.reminder) > new Date();

  const formatDate = (iso) => {
    if (!iso) return '';
    const date = new Date(iso);
    return date.toLocaleDateString([], { month: 'short', day: 'numeric', year: '2-digit' });
  };

  return (
    <Animated.View style={[
      styles.container, 
      { 
        transform: [{ scale: scaleAnim }],
        backgroundColor: colors.surf,
        borderColor: colors.border
      }
    ]}>
      <Pressable
        onPress={onPress}
        onPressIn={handlePressIn}
        onPressOut={handlePressOut}
        style={({ pressed }) => [
          styles.pressable, 
          pressed && { backgroundColor: colors.surf2 }
        ]}
      >
        <LinearGradient
          colors={['#00e5a0', '#0ea5e9']}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 0 }}
          style={styles.topBar}
        />
        
        <View style={styles.content}>
          <Text style={[styles.title, { color: colors.textBright }]} numberOfLines={1}>{credential.title}</Text>
          
          <View style={styles.tagsContainer}>
            {credential.tags?.slice(0, 3).map((tag, i) => (
              <TagChip key={i} label={tag} />
            ))}
            {credential.tags?.length > 3 && (
              <TagChip label={`+${credential.tags.length - 3}`} />
            )}
          </View>

          <View style={styles.footer}>
            {isReminderUpcoming ? (
              <View style={[styles.badge, styles.upcomingBadge, { backgroundColor: isDark ? 'rgba(255, 183, 0, 0.15)' : 'rgba(245, 158, 11, 0.15)' }]}>
                <Text style={styles.badgeText}>⏰</Text>
              </View>
            ) : credential.rFired ? (
              <View style={[styles.badge, styles.firedBadge, { backgroundColor: isDark ? 'rgba(74, 106, 133, 0.15)' : 'rgba(148, 163, 184, 0.15)' }]}>
                <Text style={[styles.firedBadgeText, { color: colors.muted }]}>✓</Text>
              </View>
            ) : <View />}
            <Text style={[styles.date, { color: colors.muted }]}>{formatDate(credential.updatedAt)}</Text>
          </View>
        </View>
      </Pressable>
    </Animated.View>
  );
};

const styles = StyleSheet.create({
  container: {
    width: CARD_WIDTH,
    margin: CARD_MARGIN,
    borderRadius: RADIUS.md,
    borderWidth: 1,
    overflow: 'hidden',
  },
  pressable: {
    flex: 1,
    padding: SPACING.md,
  },
  topBar: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    height: 2,
  },
  content: {
    marginTop: 4,
  },
  title: {
    fontSize: 14,
    fontWeight: '700',
    marginBottom: SPACING.sm,
  },
  tagsContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    height: 24,
    overflow: 'hidden',
    marginBottom: SPACING.md,
  },
  footer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: 'auto',
  },
  badge: {
    borderRadius: 4,
    paddingHorizontal: 4,
    paddingVertical: 1,
  },
  upcomingBadge: {},
  firedBadge: {},
  badgeText: {
    fontSize: 10,
  },
  firedBadgeText: {
    fontSize: 10,
  },
  date: {
    fontSize: 10,
  },
});

export default CredentialCard;
