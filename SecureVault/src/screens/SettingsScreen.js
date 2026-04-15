import React, { useState } from 'react';
import { View, Text, StyleSheet, ScrollView, Pressable, Linking, Alert } from 'react-native';
import * as FileSystem from 'expo-file-system/legacy';
import * as Sharing from 'expo-sharing';
import * as DocumentPicker from 'expo-document-picker';
import * as ExpoHaptics from 'expo-haptics';
import { useVault } from '../context/VaultContext';
import { useToast } from '../components/Toast';
import { RADIUS, SPACING } from '../theme';
import { useTheme } from '../hooks/useTheme';
import { useAuth } from '../context/AuthContext';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import StatBox from '../components/StatBox';
import SectionCard from '../components/SectionCard';
import { cancelReminder } from '../utils/notifications';
import { clearCredentials } from '../utils/storage';

const SettingsScreen = () => {
  const { credentials, removeReminder, importCredentials, loadCredentials } = useVault();
  const { colors, isDark, themeMode, setThemeMode } = useTheme();
  const { securityEnabled, toggleSecurity, isBiometricsAvailable, lock } = useAuth();
  const toast = useToast();
  const insets = useSafeAreaInsets();
  const [clearConfirm, setClearConfirm] = useState(false);

  // Stats
  const totalCount = credentials.length;
  const remindersCount = credentials.filter(c => c.reminder && !c.rFired).length;
  const taggedCount = credentials.filter(c => c.tags?.length > 0).length;

  const handleExport = async () => {
    try {
      const backupData = {
        v: 1,
        exportedAt: new Date().toISOString(),
        data: credentials
      };
      
      const fileName = `vault_backup_${Date.now()}.json`;
      const filePath = `${FileSystem.cacheDirectory}${fileName}`;
      
      await FileSystem.writeAsStringAsync(filePath, JSON.stringify(backupData, null, 2));
      
      if (await Sharing.isAvailableAsync()) {
        await Sharing.shareAsync(filePath, {
          mimeType: 'application/json',
          dialogTitle: 'SecureVault Backup',
        });
        toast.show('📦 Exported', 'ok');
      } else {
        toast.show('Sharing not available', 'err');
      }
    } catch (error) {
      console.error('Export error:', error);
      toast.show('Export failed', 'err');
    }
  };

  const handleImport = async () => {
    try {
      const res = await DocumentPicker.getDocumentAsync({
        type: 'application/json',
        copyToCacheDirectory: true,
      });

      if (res.canceled) return;

      const fileContent = await FileSystem.readAsStringAsync(res.assets[0].uri);
      const parsed = JSON.parse(fileContent);

      if (!parsed.data || !Array.isArray(parsed.data)) {
        throw new Error('Invalid backup file');
      }

      await importCredentials(parsed.data);
      toast.show(`✓ Imported ${parsed.data.length} entries`, 'ok');
      ExpoHaptics.notificationAsync(ExpoHaptics.NotificationFeedbackType.Success);
    } catch (error) {
      console.error('Import error:', error);
      toast.show('Import failed: Invalid file', 'err');
    }
  };

  const handleClearAll = async () => {
    try {
      await clearCredentials();
      await loadCredentials();
      toast.show('Vault cleared', 'warn');
      ExpoHaptics.notificationAsync(ExpoHaptics.NotificationFeedbackType.Error);
      setClearConfirm(false);
    } catch (error) {
      toast.show('Failed to clear vault', 'err');
    }
  };

  return (
    <ScrollView 
      style={[styles.container, { backgroundColor: colors.bg }]} 
      contentContainerStyle={[styles.scrollContent, { paddingBottom: SPACING.lg + insets.bottom }]}
    >
      {/* Section 1 — Overview */}
      <View style={styles.statsRow}>
        <StatBox number={totalCount} label="Total Entries" />
        <View style={{ width: 12 }} />
        <StatBox number={remindersCount} label="Reminders" />
        <View style={{ width: 12 }} />
        <StatBox number={taggedCount} label="Tagged" />
      </View>

      {/* Section 1.5 — Appearance */}
      <SectionCard title="Appearance">
        <View style={styles.appearanceRow}>
          {[
            { id: 'system', label: '🌓 System', desc: 'Device default' },
            { id: 'light', label: '☀️ Light', desc: 'Always bright' },
            { id: 'dark', label: '🌑 Dark', desc: 'Always dark' }
          ].map((mode) => (
            <Pressable 
              key={mode.id}
              onPress={() => setThemeMode(mode.id)}
              style={[
                styles.themeOption, 
                { borderColor: themeMode === mode.id ? colors.accent : colors.border },
                themeMode === mode.id && { backgroundColor: colors.accentDim }
              ]}
            >
              <Text style={[styles.themeLabel, { color: themeMode === mode.id ? colors.accent : colors.text }]}>
                {mode.label}
              </Text>
              <Text style={[styles.themeDesc, { color: colors.muted }]} numberOfLines={1}>
                {mode.desc}
              </Text>
              {themeMode === mode.id && (
                <View style={[styles.activeDot, { backgroundColor: colors.accent }]} />
              )}
            </Pressable>
          ))}
        </View>
      </SectionCard>

      {/* Section 1.6 — Security */}
      <SectionCard title="Security">
        <View style={[styles.rowBtn, { borderBottomColor: colors.border, flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }]}>
          <View>
            <Text style={[styles.rowBtnText, { color: colors.text }]}>🔒 Biometric Vault Lock</Text>
            <Text style={[styles.themeDesc, { color: colors.muted, marginTop: 4 }]}>
              {isBiometricsAvailable ? 'Requires Fingerprint/FaceID' : 'Hardware not available'}
            </Text>
          </View>
          <Pressable 
            onPress={() => toggleSecurity(!securityEnabled)}
            style={[
              styles.switchTrack, 
              { backgroundColor: securityEnabled ? colors.accent : colors.surf3 }
            ]}
          >
            <View style={[
              styles.switchThumb, 
              { transform: [{ translateX: securityEnabled ? 20 : 0 }] }
            ]} />
          </Pressable>
        </View>
        <Pressable onPress={lock} style={[styles.rowBtn, { borderBottomColor: colors.border }]}>
          <Text style={[styles.rowBtnText, { color: colors.text }]}>🛡️ Lock Vault Now</Text>
        </Pressable>
      </SectionCard>

      {/* Section 2 — Backup & Restore */}
      <SectionCard title="Data Management">
        <Pressable onPress={handleExport} style={[styles.rowBtn, { borderBottomColor: colors.border }]}>
          <Text style={[styles.rowBtnText, { color: colors.text }]}>📤 Export Backup (JSON)</Text>
        </Pressable>
        <Pressable onPress={handleImport} style={[styles.rowBtn, { borderBottomColor: colors.border }]}>
          <Text style={[styles.rowBtnText, { color: colors.text }]}>📥 Import from File</Text>
        </Pressable>
        <Pressable 
          onPress={() => Linking.openURL('https://drive.google.com')} 
          style={[styles.rowBtn, { borderBottomColor: colors.border }]}
        >
          <Text style={[styles.rowBtnText, { color: colors.text }]}>☁️ Open Google Drive</Text>
        </Pressable>
      </SectionCard>

      {/* Section 4 — Danger Zone */}
      <SectionCard title="Danger Zone" dangerBorder>
        {!clearConfirm ? (
          <Pressable 
            onPress={() => setClearConfirm(true)} 
            style={[styles.clearBtn, { backgroundColor: colors.err + '12', borderColor: colors.err + '4D' }]}
          >
            <Text style={[styles.clearBtnText, { color: colors.err }]}>🗑️ Clear All Credentials</Text>
          </Pressable>
        ) : (
          <View style={styles.confirmRow}>
            <Text style={styles.confirmTitle}>This will delete everything permanently!</Text>
            <View style={styles.confirmRowActions}>
              <Pressable onPress={handleClearAll} style={[styles.confirmYes, { backgroundColor: colors.err }]}>
                <Text style={styles.confirmYesText}>Yes, Clear All</Text>
              </Pressable>
              <Pressable onPress={() => setClearConfirm(false)} style={[styles.confirmNo, { backgroundColor: colors.surf3 }]}>
                <Text style={[styles.confirmNoText, { color: colors.text }]}>Cancel</Text>
              </Pressable>
            </View>
          </View>
        )}
      </SectionCard>

      <Text style={[styles.versionText, { color: colors.muted2 }]}>SecureVault v1.0.0 · Fully Offline</Text>
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  scrollContent: {
    padding: SPACING.lg,
  },
  statsRow: {
    flexDirection: 'row',
    marginBottom: SPACING.xl,
  },
  rowBtn: {
    paddingVertical: 14,
    borderBottomWidth: 1,
  },
  rowBtnText: {
    fontSize: 15,
    fontWeight: '500',
  },
  emptyText: {
    fontSize: 13,
    fontStyle: 'italic',
    paddingVertical: 10,
  },
  reminderItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    borderBottomWidth: 1,
  },
  reminderInfo: {
    flex: 1,
    marginRight: 10,
  },
  reminderTitle: {
    fontSize: 14,
    fontWeight: '600',
  },
  reminderDate: {
    fontSize: 11,
    marginTop: 2,
  },
  removeBtn: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: RADIUS.sm,
    borderWidth: 1,
  },
  removeBtnText: {
    fontSize: 11,
    fontWeight: '600',
  },
  clearBtn: {
    paddingVertical: 14,
    alignItems: 'center',
    borderRadius: RADIUS.md,
    borderWidth: 1,
    borderStyle: 'dashed',
    marginTop: 10,
  },
  clearBtnText: {
    fontSize: 15,
    fontWeight: '700',
  },
  confirmRow: {
    paddingVertical: 10,
  },
  confirmTitle: {
    fontSize: 14,
    fontWeight: '600',
    textAlign: 'center',
    marginBottom: 16,
  },
  confirmRowActions: {
    flexDirection: 'row',
    justifyContent: 'center',
  },
  confirmYes: {
    paddingHorizontal: 20,
    paddingVertical: 10,
    borderRadius: RADIUS.sm,
    marginRight: 12,
  },
  confirmYesText: {
    color: '#fff',
    fontWeight: '700',
  },
  confirmNo: {
    paddingHorizontal: 20,
    paddingVertical: 10,
    borderRadius: RADIUS.sm,
  },
  confirmNoText: {
    fontWeight: '600',
  },
  versionText: {
    textAlign: 'center',
    fontSize: 11,
    marginTop: 40,
    marginBottom: 20,
  },
  appearanceRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: 8,
  },
  themeOption: {
    flex: 1,
    marginHorizontal: 4,
    paddingVertical: 12,
    paddingHorizontal: 8,
    borderRadius: RADIUS.md,
    borderWidth: 1.5,
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: 80,
  },
  themeLabel: {
    fontSize: 13,
    fontWeight: '700',
    marginBottom: 4,
  },
  themeDesc: {
    fontSize: 9,
    fontWeight: '500',
  },
  activeDot: {
    position: 'absolute',
    top: 8,
    right: 8,
    width: 6,
    height: 6,
    borderRadius: 3,
  },
  switchTrack: {
    width: 44,
    height: 24,
    borderRadius: 12,
    padding: 2,
    justifyContent: 'center',
  },
  switchThumb: {
    width: 20,
    height: 20,
    borderRadius: 10,
    backgroundColor: '#fff',
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.2,
    shadowRadius: 1,
  },
});

export default SettingsScreen;
