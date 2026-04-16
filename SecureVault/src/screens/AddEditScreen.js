import { Ionicons } from '@expo/vector-icons';
import DateTimePicker from '@react-native-community/datetimepicker';
import * as Haptics from 'expo-haptics';
import { useEffect, useState } from 'react';
import {
    ActivityIndicator, Dimensions,
    KeyboardAvoidingView, Platform,
    Pressable, ScrollView,
    StyleSheet,
    Text,
    TextInput,
    View
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useToast } from '../components/Toast';
import { useVault } from '../context/VaultContext';
import { useTheme } from '../hooks/useTheme';
import { FONT_MONO, RADIUS, SPACING } from '../theme';
import { decrypt } from '../utils/crypto';
import { cancelReminder, scheduleReminder } from '../utils/notifications';
import { calculateNextOccurrence } from '../utils/reminderMath';
import { parseVaultData, serializeVaultData } from '../utils/vaultData';

const AddEditScreen = ({ route, navigation }) => {
  const { mode, credential } = route.params;
  const isEdit = mode === 'edit';
  
  const { addCredential, editCredential } = useVault();
  const { colors, isDark } = useTheme();
  const toast = useToast();
  const insets = useSafeAreaInsets();
  const { width, height } = Dimensions.get('window');

  const [title, setTitle] = useState('');
  const [fields, setFields] = useState([{ id: '1', key: 'Note', value: '', sensitive: false }]);
  const [tags, setTags] = useState('');
  const [reminder, setReminder] = useState(null);
  const [loading, setLoading] = useState(false);
  const [showDatePicker, setShowDatePicker] = useState(false);
  const [pickerMode, setPickerMode] = useState('date'); // 'date' or 'time'
  const [tempDate, setTempDate] = useState(null);
  const [recurrence, setRecurrence] = useState('none');
  const [recurrenceDays, setRecurrenceDays] = useState([]); // [1-7]
  const [recurrenceMonths, setRecurrenceMonths] = useState([]); // [0-11]
  const [errors, setErrors] = useState({});

  useEffect(() => {
    const loadCredentialData = async () => {
      if (isEdit && credential) {
        try {
          setTitle(credential.title || '');
          setTags(credential.tags?.join(', ') || '');
          
          // Reminder is stored unencrypted for display
          if (credential.reminder) {
            setReminder(new Date(credential.reminder));
          } else {
            setReminder(null);
          }
          
          setRecurrence(credential.recurrence || 'none');
          setRecurrenceDays(credential.recurrenceDays || []);
          setRecurrenceMonths(credential.recurrenceMonths || []);
          
          const decrypted = await decrypt(credential.encData);
          setFields(parseVaultData(decrypted));
        } catch (error) {
          console.error('Error loading credential:', error);
          setFields([{ id: '1', key: 'Note', value: '', sensitive: false }]);
        }
      }
    };
    
    loadCredentialData();
  }, [isEdit, credential]);

  const validate = () => {
    const newErrors = {};
    
    // Title validation
    if (!title.trim()) {
      newErrors.title = 'Title is required';
    } else if (title.length > 100) {
      newErrors.title = 'Title must be less than 100 characters';
    } else if (/[<>"'&]/.test(title)) {
      newErrors.title = 'Title contains invalid characters';
    }
    
    // Fields validation
    const hasValue = fields.some(f => f.value.trim());
    if (!hasValue) {
      newErrors.fields = 'At least one field value is required';
    } else {
      fields.forEach((field, index) => {
        if (field.value.length > 10000) {
          newErrors[`field_${index}`] = 'Field value too long (max 10000 characters)';
        }
        if (field.key.length > 50) {
          newErrors[`key_${index}`] = 'Field key too long (max 50 characters)';
        }
      });
    }
    
    // Tags validation
    if (tags) {
      const tagArray = tags.split(',').map(t => t.trim()).filter(Boolean);
      if (tagArray.length > 20) {
        newErrors.tags = 'Too many tags (max 20)';
      }
      tagArray.forEach(tag => {
        if (tag.length > 30) {
          newErrors.tags = 'Tag too long (max 30 characters)';
        }
      });
    }
    
    // Reminder validation
    if (reminder && recurrence !== 'none') {
      if (recurrence === 'weekly' && recurrenceDays.length === 0) {
        newErrors.recurrence = 'Select at least one day for weekly reminders';
      }
      if (recurrence === 'yearly' && recurrenceMonths.length === 0) {
        newErrors.recurrence = 'Select at least one month for yearly reminders';
      }
    }
    
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleAddField = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    setFields([...fields, { id: Date.now().toString(), key: '', value: '', sensitive: false }]);
  };

  const handleRemoveField = (id) => {
    if (fields.length === 1) {
      setFields([{ id: '1', key: 'Note', value: '', sensitive: false }]);
      return;
    }
    setFields(fields.filter(f => f.id !== id));
  };

  const handleUpdateField = (id, updates) => {
    setFields(fields.map(f => f.id === id ? { ...f, ...updates } : f));
  };

  const handleSave = async () => {
    if (!validate()) return;
    setLoading(true);
    try {
      const dataString = serializeVaultData(fields);
      const intentionalDay = reminder ? reminder.getDate() : null;
      const finalReminder = (reminder && recurrence !== 'none') 
        ? calculateNextOccurrence(reminder, recurrence, recurrenceDays, recurrenceMonths, intentionalDay)
        : reminder;
      
      const reminderIso = finalReminder && finalReminder instanceof Date ? finalReminder.toISOString() : null;

      let finalId = credential?.id;

      if (isEdit) {
        await editCredential(credential.id, { 
          title, 
          data: dataString, 
          tags, 
          reminder: reminderIso, 
          recurrence, 
          recurrenceDays, 
          recurrenceMonths,
          origDay: intentionalDay,
          rFired: false 
        });
        if (reminderIso) {
          await scheduleReminder(credential.id, title, reminderIso, recurrence, recurrenceDays, recurrenceMonths);
        } else if (credential.reminder) {
          await cancelReminder(credential.id);
        }
      } else {
        finalId = await addCredential({ 
          title, 
          data: dataString, 
          tags, 
          reminder: reminderIso, 
          recurrence, 
          recurrenceDays, 
          recurrenceMonths,
          origDay: intentionalDay,
          rFired: false 
        });
        if (reminderIso) {
          await scheduleReminder(finalId, title, reminderIso, recurrence, recurrenceDays, recurrenceMonths);
        }
      }

      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      toast.show('✓ Saved', 'ok');
      navigation.goBack();
    } catch (error) {
      console.error('Save error:', error);
      toast.show('Failed to save', 'err');
    } finally {
      setLoading(false);
    }
  };

  const onDateChange = (event, selectedDate) => {
    if (event.type === 'dismissed') {
      setShowDatePicker(false);
      setPickerMode('date');
      return;
    }

    if (Platform.OS === 'android') {
      // If we have a recurrence pattern, we only care about the Time
      if (recurrence !== 'none') {
        setShowDatePicker(false);
        if (selectedDate) setReminder(selectedDate);
        return;
      }

      if (pickerMode === 'date') {
        // Date selected, now show time picker
        const current = selectedDate || reminder || new Date();
        setTempDate(current);
        setPickerMode('time');
        // We delay slightly to allow the date picker to finish its animation
        setTimeout(() => setShowDatePicker(true), 100);
      } else {
        // Time selected
        setShowDatePicker(false);
        setPickerMode('date');
        if (selectedDate && tempDate) {
          const combined = new Date(tempDate);
          combined.setHours(selectedDate.getHours());
          combined.setMinutes(selectedDate.getMinutes());
          setReminder(combined);
        }
      }
    } else {
      // iOS handling
      setShowDatePicker(false);
      if (selectedDate) {
        setReminder(selectedDate);
      }
    }
  };

  const handleShowPicker = () => {
    setPickerMode('date');
    setShowDatePicker(true);
  };

  return (
    <KeyboardAvoidingView 
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'} 
      style={[styles.container, { backgroundColor: colors.bg }]}
      keyboardVerticalOffset={100}
    >
      <ScrollView contentContainerStyle={[styles.scrollContent, { paddingBottom: SPACING.xl + insets.bottom }]}>
        <View style={styles.formGroup}>
          <Text style={[styles.label, { color: colors.muted }]}>Title</Text>
          <TextInput
            style={[styles.input, { backgroundColor: colors.surf, borderColor: colors.border, color: colors.textBright }, errors.title && { borderColor: colors.err }]}
            placeholder="e.g. Wi-Fi Password"
            placeholderTextColor={colors.muted}
            value={title}
            onChangeText={setTitle}
          />
          {errors.title && <Text style={[styles.errorText, { color: colors.err }]}>{errors.title}</Text>}
        </View>

        <View style={styles.formGroup}>
          <View style={styles.sectionHeader}>
            <Text style={[styles.label, { color: colors.muted }]}>Structured Fields</Text>
            <Pressable onPress={handleAddField} style={styles.addBtn}>
              <Ionicons name="add-circle" size={20} color={colors.accent} />
              <Text style={[styles.addBtnText, { color: colors.accent }]}>Add Field</Text>
            </Pressable>
          </View>
          
          {fields.map((field) => (
            <Pressable 
              key={field.id} 
              onLongPress={() => {
                Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning);
                handleRemoveField(field.id);
                toast.show('Field removed', 'ok');
              }}
              delayLongPress={500}
              style={[styles.fieldRow, { borderBottomColor: colors.border + '33' }]}
            >
              <TextInput
                style={[styles.fieldKeyInput, { color: colors.accent, width: '28%' }]}
                placeholder="Key"
                placeholderTextColor={colors.muted2}
                value={field.key}
                onChangeText={(val) => handleUpdateField(field.id, { key: val })}
              />
              <TextInput
                style={[styles.fieldValueInput, { color: colors.textBright, flex: 1 }]}
                placeholder="Value"
                placeholderTextColor={colors.muted2}
                value={field.value}
                onChangeText={(val) => handleUpdateField(field.id, { value: val })}
              />
            </Pressable>
          ))}
          {errors.fields && <Text style={styles.errorText}>{errors.fields}</Text>}
        </View>

        <View style={styles.formGroup}>
          <Text style={[styles.label, { color: colors.muted }]}>Tags (comma separated)</Text>
          <TextInput
            style={[styles.input, { backgroundColor: colors.surf, borderColor: colors.border, color: colors.textBright }]}
            placeholder="personal, work, finance..."
            placeholderTextColor={colors.muted}
            value={tags}
            onChangeText={setTags}
          />
        </View>

        <View style={styles.formGroup}>
          <Text style={[styles.label, { color: colors.muted }]}>
            {recurrence === 'none' ? 'Reminder Date & Time' : 'Reminder Time'}
          </Text>
          <View style={[styles.reminderRow, { backgroundColor: colors.surf, borderColor: colors.border }]}>
            <View style={styles.reminderInfo}>
              <Text style={[styles.reminderValue, !reminder && { color: colors.muted }]}>
                {reminder 
                  ? (recurrence === 'none' ? reminder.toLocaleString([], { dateStyle: 'medium', timeStyle: 'short' }) : reminder.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })) 
                  : 'Not set'}
              </Text>
            </View>
            <View style={styles.reminderActions}>
              <Pressable 
                onPress={handleShowPicker} 
                style={[styles.smallBtn, { backgroundColor: colors.surf3 }]}
              >
                <Text style={styles.smallBtnText}>{reminder ? 'Change' : 'Set'}</Text>
              </Pressable>
              {reminder && (
                <Pressable 
                  onPress={() => setReminder(null)} 
                  style={[styles.smallBtn, { backgroundColor: colors.err + '1A', borderColor: colors.err + '33', borderWidth: 1, marginLeft: 8 }]}
                >
                  <Text style={[styles.smallBtnText, { color: colors.err }]}>Clear</Text>
                </Pressable>
              )}
            </View>
          </View>
        </View>

        <View style={styles.formGroup}>
          <Text style={[styles.label, { color: colors.muted }]}>Repeat Pattern</Text>
          <View style={styles.recurrenceContainer}>
            {['none', 'daily', 'weekly', 'monthly', 'yearly'].map((type) => (
              <Pressable
                key={type}
                onPress={() => {
                  setRecurrence(type);
                  if (type === 'weekly' && recurrenceDays.length === 0) {
                    setRecurrenceDays([new Date().getDay() + 1]);
                  }
                  if (type === 'yearly' && recurrenceMonths.length === 0) {
                    setRecurrenceMonths([new Date().getMonth()]);
                  }
                }}
                style={[
                  styles.recurrenceChip,
                  { backgroundColor: colors.surf3, borderColor: colors.border },
                  recurrence === type && { backgroundColor: colors.accent, borderColor: colors.accent }
                ]}
              >
                <Text style={[
                  styles.recurrenceChipText,
                  { color: colors.text },
                  recurrence === type && { color: colors.bg }
                ]}>
                  {type.charAt(0).toUpperCase() + type.slice(1)}
                </Text>
              </Pressable>
            ))}
          </View>

          {recurrence === 'weekly' && (
            <View style={styles.daysGrid}>
              {['S', 'M', 'T', 'W', 'T', 'F', 'S'].map((dayName, index) => {
                const dayValue = index + 1;
                const isSelected = recurrenceDays.includes(dayValue);
                return (
                  <Pressable
                    key={dayValue}
                    onPress={() => {
                      if (isSelected) {
                        setRecurrenceDays(recurrenceDays.filter(d => d !== dayValue));
                      } else {
                        setRecurrenceDays([...recurrenceDays, dayValue]);
                      }
                    }}
                    style={[
                      styles.dayCircle,
                      { borderColor: colors.border, backgroundColor: colors.surf },
                      isSelected && { backgroundColor: colors.accent, borderColor: colors.accent }
                    ]}
                  >
                    <Text style={[
                      styles.dayText,
                      { color: colors.text },
                      isSelected && { color: colors.bg }
                    ]}>
                      {dayName}
                    </Text>
                  </Pressable>
                );
              })}
            </View>
          )}

          {recurrence === 'yearly' && (
            <View style={styles.monthsGrid}>
              {[
                'Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 
                'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'
              ].map((monthName, index) => {
                const isSelected = recurrenceMonths.includes(index);
                return (
                  <Pressable
                    key={monthName}
                    onPress={() => {
                      if (isSelected) {
                        setRecurrenceMonths(recurrenceMonths.filter(m => m !== index));
                      } else {
                        setRecurrenceMonths([...recurrenceMonths, index]);
                      }
                    }}
                    style={[
                      styles.monthChip,
                      { borderColor: colors.border, backgroundColor: colors.surf },
                      isSelected && { backgroundColor: colors.accent, borderColor: colors.accent }
                    ]}
                  >
                    <Text style={[
                      styles.monthText,
                      { color: colors.text },
                      isSelected && { color: colors.bg }
                    ]}>
                      {monthName}
                    </Text>
                  </Pressable>
                );
              })}
            </View>
          )}
        </View>

        {showDatePicker && (
          <DateTimePicker
            value={reminder || new Date()}
            mode={recurrence === 'none' ? (Platform.OS === 'ios' ? 'datetime' : pickerMode) : 'time'}
            display={Platform.OS === 'ios' ? 'spinner' : 'default'}
            onChange={onDateChange}
            minimumDate={new Date()}
          />
        )}

        <Pressable 
          disabled={loading}
          onPress={handleSave}
          style={({ pressed }) => [
            styles.saveBtn,
            { backgroundColor: colors.accent },
            pressed && { opacity: 0.8 },
            loading && { backgroundColor: colors.muted2 }
          ]}
        >
          {loading ? (
            <ActivityIndicator color={colors.bg} />
          ) : (
            <Text style={[styles.saveBtnText, { color: colors.bg }]}>{isEdit ? 'Update' : 'Save'} Credential</Text>
          )}
        </Pressable>
      </ScrollView>
    </KeyboardAvoidingView>
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
    marginBottom: 16,
  },
  title: {
    fontSize: 24,
    fontWeight: '800',
    marginBottom: 4,
  },
  formGroup: {
    marginBottom: 14,
  },
  label: {
    fontSize: 11,
    fontWeight: '800',
    textTransform: 'uppercase',
    letterSpacing: 1,
    marginBottom: 6,
  },
  input: {
    borderWidth: 1,
    borderRadius: RADIUS.m,
    paddingHorizontal: 12,
    paddingVertical: 10,
    fontSize: 16,
  },
  textArea: {
    height: 120,
    paddingTop: 12,
  },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 4,
  },
  addBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  addBtnText: {
    fontSize: 14,
    fontWeight: '600',
  },
  fieldRow: {
    borderBottomWidth: 0.5,
    paddingVertical: 2,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  fieldKeyInput: {
    fontSize: 11,
    fontWeight: '800',
    paddingVertical: 12,
    textTransform: 'uppercase',
  },
  fieldValueInput: {
    fontSize: 15,
    paddingVertical: 12,
    fontFamily: FONT_MONO,
  },
  errorText: {
    fontSize: 12,
    marginTop: 4,
  },
  reminderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 10,
    borderRadius: RADIUS.m,
    borderWidth: 1,
  },
  reminderInfo: {
    flex: 1,
  },
  reminderValue: {
    fontSize: 14,
    fontWeight: '600',
  },
  reminderActions: {
    flexDirection: 'row',
  },
  smallBtn: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: RADIUS.s,
    justifyContent: 'center',
    alignItems: 'center',
  },
  smallBtnText: {
    fontSize: 12,
    fontWeight: '600',
  },
  saveBtn: {
    borderRadius: RADIUS.lg,
    height: 56,
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: 20,
    marginBottom: 40,
  },
  saveBtnText: {
    fontSize: 18,
    fontWeight: '700',
  },
  recurrenceContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 6,
  },
  recurrenceChip: {
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: RADIUS.s,
    borderWidth: 1,
  },
  recurrenceChipText: {
    fontSize: 11,
    fontWeight: '600',
  },
  daysGrid: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 8,
  },
  dayCircle: {
    width: 32,
    height: 32,
    borderRadius: 16,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
  },
  dayText: {
    fontSize: 12,
    fontWeight: '700',
  },
  monthsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginTop: 8,
  },
  monthChip: {
    width: '23%', // 4 columns roughly
    paddingVertical: 8,
    borderRadius: RADIUS.m,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
  },
  monthText: {
    fontSize: 12,
    fontWeight: '600',
  },
});

export default AddEditScreen;
