import React, { useState, useEffect, useRef } from 'react';
import { View, Text, StyleSheet, FlatList, TextInput, Pressable, Animated } from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { useVault } from '../context/VaultContext';
import { useToast } from '../components/Toast';
import { RADIUS, SPACING } from '../theme';
import { useTheme } from '../hooks/useTheme';
import CredentialCard from '../components/CredentialCard';
import { requestPermissions } from '../utils/notifications';
import * as Haptics from 'expo-haptics';
import { useIsFocused } from '@react-navigation/native';

const HomeScreen = ({ navigation }) => {
  const { credentials, loading, markReminderFired } = useVault();
  const { colors, isDark } = useTheme();
  const toast = useToast();
  const isFocused = useIsFocused();
  const insets = useSafeAreaInsets();
  
  const [search, setSearch] = useState('');
  const [showSearch, setShowSearch] = useState(false);
  const searchBarHeight = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    requestPermissions();
  }, []);

  useEffect(() => {
    Animated.timing(searchBarHeight, {
      toValue: showSearch ? 54 : 0,
      duration: 300,
      useNativeDriver: false,
    }).start();
  }, [showSearch]);

  const filteredCredentials = credentials.filter(c => 
    c.title.toLowerCase().includes(search.toLowerCase()) || 
    c.tags?.some(t => t.toLowerCase().includes(search.toLowerCase()))
  );

  // Stats and Count updates automatically when credentials change via the useVault hook
  const upcomingCount = credentials.filter(c => c.reminder && !c.rFired && new Date(c.reminder) > new Date()).length;

  return (
    <View style={[styles.container, { backgroundColor: colors.bg, paddingTop: insets.top }]}>
      {/* Header */}
      <View style={styles.header}>
        <Text style={[styles.logo, { color: colors.accent }]}>🔐 SecureVault</Text>
        <View style={styles.headerActions}>
          <Pressable onPress={() => setShowSearch(!showSearch)} style={styles.headerBtn}>
            <Text style={[styles.btnText, { color: colors.text }]}>{showSearch ? '✖' : '🔍'}</Text>
          </Pressable>
          <Pressable onPress={() => navigation.navigate('Settings')} style={styles.headerBtn}>
            <Text style={[styles.btnText, { color: colors.text }]}>⚙️</Text>
          </Pressable>
        </View>
      </View>

      {/* Search Bar */}
      <Animated.View style={[
        styles.searchBarContainer, 
        { 
          height: searchBarHeight, 
          opacity: searchBarHeight.interpolate({ inputRange: [0, 54], outputRange: [0, 1] }) 
        }
      ]}>
        <TextInput
          style={[styles.searchInput, { backgroundColor: colors.surf2, color: colors.textBright, borderColor: colors.border }]}
          placeholder="Search credentials or tags..."
          placeholderTextColor={colors.muted}
          value={search}
          onChangeText={setSearch}
          autoFocus={showSearch}
        />
      </Animated.View>

      {/* Stats row */}
      <View style={styles.statsRow}>
        <Text style={[styles.statsText, { color: colors.muted }]}>{credentials.length} credentials</Text>
        {upcomingCount > 0 && (
          <View style={[styles.upcomingBadge, { backgroundColor: isDark ? 'rgba(255, 183, 0, 0.1)' : 'rgba(245, 158, 11, 0.1)' }]}>
            <Text style={[styles.upcomingText, { color: colors.warn }]}>⏰ {upcomingCount} upcoming</Text>
          </View>
        )}
      </View>

      {/* List */}
      <FlatList
        data={filteredCredentials}
        keyExtractor={item => item.id}
        numColumns={2}
        contentContainerStyle={[styles.listContent, { paddingBottom: 100 + insets.bottom }]}
        columnWrapperStyle={styles.columnWrapper}
        renderItem={({ item }) => (
          <CredentialCard 
            credential={item} 
            onPress={() => navigation.navigate('Detail', { credential: item })} 
          />
        )}
        ListEmptyComponent={
          <View style={styles.emptyContainer}>
            <Text style={styles.emptyIcon}>🗄️</Text>
            <Text style={[styles.emptyText, { color: colors.textBright }]}>Vault is empty</Text>
            <Text style={[styles.emptySubtext, { color: colors.muted }]}>Tap + to add your first credential</Text>
          </View>
        }
      />

      {/* FAB */}
      <Pressable 
        style={[styles.fab, { backgroundColor: colors.accent, bottom: 30 + insets.bottom }]}
        onPress={() => {
          Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
          navigation.navigate('AddEdit', { mode: 'add' });
        }}
      >
        <Text style={[styles.fabText, { color: isDark ? colors.bg : '#fff' }]}>+</Text>
      </Pressable>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: SPACING.lg,
    paddingVertical: SPACING.md,
  },
  logo: {
    fontSize: 22,
    fontWeight: '800',
  },
  headerActions: {
    flexDirection: 'row',
  },
  headerBtn: {
    marginLeft: 16,
    padding: 2,
  },
  btnText: {
    fontSize: 20,
  },
  searchBarContainer: {
    paddingHorizontal: SPACING.lg,
    overflow: 'hidden',
  },
  searchInput: {
    borderRadius: RADIUS.md,
    paddingHorizontal: 16,
    paddingVertical: 10,
    fontSize: 15,
    borderWidth: 1,
  },
  statsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: SPACING.lg,
    paddingVertical: SPACING.sm,
  },
  statsText: {
    fontSize: 13,
    fontWeight: '500',
  },
  upcomingBadge: {
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 4,
    marginLeft: 10,
  },
  upcomingText: {
    fontSize: 11,
    fontWeight: '600',
  },
  listContent: {
    paddingHorizontal: 6,
    flexGrow: 1,
  },
  columnWrapper: {
    justifyContent: 'flex-start',
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: 100,
  },
  emptyIcon: {
    fontSize: 60,
    marginBottom: 20,
    opacity: 0.5,
  },
  emptyText: {
    fontSize: 18,
    fontWeight: '600',
  },
  emptySubtext: {
    fontSize: 14,
    marginTop: 8,
  },
  fab: {
    position: 'absolute',
    right: 24,
    width: 60,
    height: 60,
    borderRadius: 30,
    justifyContent: 'center',
    alignItems: 'center',
    elevation: 8,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 4.65,
  },
  fabText: {
    fontSize: 32,
    fontWeight: '300',
    marginTop: -2,
  },
});

export default HomeScreen;
