import React, { useState, useCallback } from 'react';
import { View, Text, StyleSheet, Pressable, ScrollView, Animated } from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import * as Clipboard from 'expo-clipboard';
import * as ExpoHaptics from 'expo-haptics';
import { useVault } from '../context/VaultContext';
import { useToast } from '../components/Toast';
import { decrypt } from '../utils/crypto';
import { RADIUS, SPACING, FONT_MONO } from '../theme';
import { useTheme } from '../hooks/useTheme';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import TagChip from '../components/TagChip';
import { Ionicons } from '@expo/vector-icons';
import { parseVaultData } from '../utils/vaultData';

const DetailScreen = ({ route, navigation }) => {
  const { credentials, deleteCredential } = useVault();
  const credential = credentials.find(c => c.id === route.params.credential.id) || route.params.credential;
  const { colors, isDark } = useTheme();
  const toast = useToast();
  const insets = useSafeAreaInsets();

  const [decryptedData, setDecryptedData] = useState('');
  const [fields, setFields] = useState([]);
  const [deleteConfirm, setDeleteConfirm] = useState(false);

  useFocusEffect(
    useCallback(() => {
      // Auto-decrypt on focus
      const data = decrypt(credential.encData);
      setDecryptedData(data);
      setFields(parseVaultData(data));

      return () => {
        setDecryptedData('');
        setFields([]);
      };
    }, [credential.encData])
  );


  const handleCopyValue = async (val) => {
    await Clipboard.setStringAsync(val);
    ExpoHaptics.impactAsync(ExpoHaptics.ImpactFeedbackStyle.Light);
  };

  const handleDelete = async () => {
    await deleteCredential(credential.id);
    ExpoHaptics.notificationAsync(ExpoHaptics.NotificationFeedbackType.Warning);
    toast.show('Deleted', 'warn');
    navigation.goBack();
  };

  const formatDate = (iso) => {
    if (!iso) return '';
    return new Date(iso).toLocaleString([], { dateStyle: 'medium', timeStyle: 'short' });
  };

  const getReminderDisplay = () => {
    if (!credential.reminder) return '';
    const date = new Date(credential.reminder);
    const timeStr = date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    const day = date.getDate();
    
    if (!credential.recurrence || credential.recurrence === 'none') {
      return date.toLocaleString([], { dateStyle: 'medium', timeStyle: 'short' });
    }
    
    if (credential.recurrence === 'daily') {
      return `Every Day at ${timeStr}`;
    }
    
    if (credential.recurrence === 'weekly' && credential.recurrenceDays) {
      const dayNames = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
      const days = credential.recurrenceDays.map(d => dayNames[d - 1]).join(', ');
      return `Every ${days} at ${timeStr}`;
    }
    
    if (credential.recurrence === 'monthly') {
      const getSuffix = (d) => {
        if (d > 3 && d < 21) return 'th';
        switch (d % 10) {
          case 1: return 'st';
          case 2: return 'nd';
          case 3: return 'rd';
          default: return 'th';
        }
      };
      return `Monthly (on the ${day}${getSuffix(day)}) at ${timeStr}`;
    }
    
    if (credential.recurrence === 'yearly' && credential.recurrenceMonths) {
      const monthNames = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
      const months = credential.recurrenceMonths.map(m => monthNames[m]).join(', ');
      return `Every ${months} at ${timeStr}`;
    }
    
    return `Repeats ${credential.recurrence} at ${timeStr}`;
  };

  const isReminderUpcoming = credential.reminder && !credential.rFired && new Date(credential.reminder) > new Date();

  return (
    <ScrollView 
      style={[styles.container, { backgroundColor: colors.bg }]} 
      contentContainerStyle={[styles.scrollContent, { paddingBottom: SPACING.lg + insets.bottom }]}
    >
      {/* Header */}
      <View style={styles.header}>
        <Text style={styles.title}>{credential.title}</Text>
        <View style={styles.tagsContainer}>
          {credential.tags?.map((tag, i) => (
            <TagChip key={i} label={tag} />
          ))}
        </View>
        
        {credential.reminder && (
          <View style={[styles.reminderBadge, isReminderUpcoming ? styles.upcomingBadge : styles.firedBadge, !isReminderUpcoming && { backgroundColor: colors.surf2 }]}>
            <Text style={[styles.reminderText, { color: colors.warn }, !isReminderUpcoming && { color: colors.muted }]}>
              {isReminderUpcoming 
                ? `⏰ ${getReminderDisplay()}` 
                : `✓ Reminded on ${formatDate(credential.reminder)}`}
            </Text>
          </View>
        )}
      </View>

      {/* Data Section */}
      <View style={styles.section}>
        <View style={styles.sectionHeaderRow}>
          <Text style={styles.sectionLabel}>Vault Data</Text>
        </View>

        <View style={styles.ledgerContainer}>
          {fields.map((field, index) => (
            <View 
              key={field.id} 
              style={[
                styles.ledgerRow, 
                { borderBottomColor: colors.border + '33' },
                index === fields.length - 1 && { borderBottomWidth: 0 }
              ]}
            >
              <View style={styles.ledgerMetadata}>
                <Text style={[styles.ledgerKey, { color: colors.accent + 'AA' }]}>{field.key || 'FIELD'}</Text>
                <Text selectable style={[styles.ledgerValue, { color: colors.textBright }]}>
                  {field.value}
                </Text>
              </View>
              
              <Pressable 
                onPress={() => handleCopyValue(field.value, field.key)} 
                style={styles.ledgerActionBtn}
              >
                <Ionicons name="copy-outline" size={18} color={colors.muted} />
              </Pressable>
            </View>
          ))}
        </View>
      </View>

      {/* Navigation Actions */}
      <View style={styles.actionsSection}>
        <Pressable 
          onPress={() => navigation.navigate('AddEdit', { mode: 'edit', credential })}
          style={[styles.editBtn, { backgroundColor: colors.surf2, borderColor: colors.border }]}
        >
          <Text style={[styles.editBtnText, { color: colors.textBright }]}>✏️ Edit Credential</Text>
        </Pressable>

        {!deleteConfirm ? (
          <Pressable 
            onPress={() => setDeleteConfirm(true)} 
            style={[styles.deleteBtnTap, { backgroundColor: colors.err + '12', borderColor: colors.err + '33' }]}
          >
            <Text style={[styles.deleteBtnText, { color: colors.err }]}>🗑️ Delete Credential</Text>
          </Pressable>
        ) : (
          <View style={styles.confirmRow}>
            <Text style={[styles.confirmText, { color: colors.textBright }]}>Delete this?</Text>
            <View style={styles.confirmActions}>
              <Pressable onPress={handleDelete} style={[styles.confirmYes, { backgroundColor: colors.err }]}>
                <Text style={styles.confirmYesText}>Yes, Delete</Text>
              </Pressable>
              <Pressable onPress={() => setDeleteConfirm(false)} style={[styles.confirmNo, { backgroundColor: colors.surf3 }]}>
                <Text style={[styles.confirmNoText, { color: colors.text }]}>Cancel</Text>
              </Pressable>
            </View>
          </View>
        )}
      </View>

      {/* Footer */}
      <View style={[styles.footer, { borderTopColor: colors.surf2 }]}>
        <Text style={[styles.footerText, { color: colors.muted2 }]}>Created: {formatDate(credential.createdAt)}</Text>
        <Text style={[styles.footerText, { color: colors.muted2 }]}>Updated: {formatDate(credential.updatedAt)}</Text>
      </View>
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
  header: {
    marginBottom: 30,
  },
  title: {
    fontSize: 28,
    fontWeight: '800',
    marginBottom: 12,
  },
  tagsContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    marginBottom: 16,
  },
  reminderBadge: {
    padding: 10,
    borderRadius: RADIUS.md,
    alignSelf: 'flex-start',
  },
  upcomingBadge: {
    backgroundColor: 'rgba(255,183,0,0.1)',
    borderWidth: 1,
    borderColor: 'rgba(255,183,0,0.2)',
  },
  firedBadge: {
  },
  reminderText: {
    fontSize: 13,
    fontWeight: '600',
  },
  section: {
    marginBottom: 40,
  },
  sectionLabel: {
    fontSize: 12,
    fontWeight: '700',
    textTransform: 'uppercase',
    letterSpacing: 1,
    marginBottom: 12,
  },
  revealBox: {
    height: 120,
    borderRadius: RADIUS.lg,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
    borderStyle: 'dashed',
  },
  revealText: {
    fontSize: 16,
    fontWeight: '600',
  },
  revealedContainer: {
    borderRadius: RADIUS.lg,
    borderWidth: 1,
    overflow: 'hidden',
  },
  dataBox: {
    padding: 20,
    minHeight: 100,
  },
  dataText: {
    fontFamily: FONT_MONO,
    fontSize: 16,
    lineHeight: 24,
  },
  dataActions: {
    flexDirection: 'row',
    borderTopWidth: 1,
  },
  actionBtn: {
    flex: 1,
    paddingVertical: 14,
    alignItems: 'center',
    justifyContent: 'center',
    borderRightWidth: 1,
  },
  actionBtnText: {
    fontSize: 14,
    fontWeight: '600',
  },
  sectionHeaderRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  showAllText: {
    fontSize: 13,
    fontWeight: '700',
  },
  ledgerContainer: {
    marginTop: 0,
  },
  ledgerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 10,
    borderBottomWidth: 0.5,
  },
  ledgerMetadata: {
    flex: 1,
  },
  ledgerKey: {
    fontSize: 9,
    fontWeight: '900',
    textTransform: 'uppercase',
    letterSpacing: 1.2,
    marginBottom: 2,
  },
  ledgerValue: {
    fontSize: 15,
    fontFamily: FONT_MONO,
    lineHeight: 20,
  },
  ledgerActionBtn: {
    padding: 8,
    borderRadius: RADIUS.m,
  },
  actionsSection: {
    marginTop: 10,
  },
  editBtn: {
    paddingVertical: 16,
    borderRadius: RADIUS.md,
    alignItems: 'center',
    marginBottom: 16,
    borderWidth: 1,
  },
  editBtnText: {
    fontSize: 16,
    fontWeight: '600',
  },
  deleteBtnTap: {
    paddingVertical: 14,
    alignItems: 'center',
    borderRadius: RADIUS.md,
    borderWidth: 1,
    borderStyle: 'dashed',
    marginTop: 8,
  },
  deleteBtnText: {
    fontSize: 14,
    fontWeight: '700',
  },
  confirmRow: {
    padding: 16,
    borderRadius: RADIUS.md,
    borderWidth: 1,
  },
  confirmText: {
    fontSize: 15,
    fontWeight: '600',
    textAlign: 'center',
    marginBottom: 16,
  },
  confirmActions: {
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
  footer: {
    marginTop: 60,
    borderTopWidth: 1,
    paddingTop: 20,
    paddingBottom: 40,
  },
  footerText: {
    fontSize: 11,
    marginBottom: 4,
  },
});

export default DetailScreen;
