import * as Notifications from 'expo-notifications';
import { Platform } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';

const NOTIF_KEY_PREFIX = 'sv_notif_';

/**
 * Requests notification permissions from the user.
 */
export const requestPermissions = async () => {
  try {
    if (!Notifications.requestPermissionsAsync) return false;
    
    const { status } = await Notifications.requestPermissionsAsync({
      ios: {
        allowAlert: true,
        allowBadge: true,
        allowSound: true,
      },
    });

    if (status === 'granted' && Platform.OS === 'android') {
      await Notifications.setNotificationChannelAsync('default', {
        name: 'default',
        importance: Notifications.AndroidImportance.MAX,
        vibrationPattern: [0, 250, 250, 250],
        lightColor: '#FF231F7C',
      });
    }

    return status === 'granted';
  } catch (error) {
    if (__DEV__) console.warn('Notification permission request failed:', error.message);
    return false;
  }
};

/**
 * Schedules local notifications for a specific credential with optional recurrence.
 * @param {string} credentialId 
 * @param {string} title 
 * @param {string} isoDatetime 
 * @param {string} recurrence - 'none', 'daily', 'weekly', 'monthly', 'yearly'
 * @param {number[]} recurrenceDays - Array of weekdays (1-7, 1=Sunday)
 * @param {number[]} recurrenceMonths - Array of months (0-11)
 */
export const scheduleReminder = async (credentialId, title, isoDatetime, recurrence = 'none', recurrenceDays = [], recurrenceMonths = []) => {
  try {
    // 1. Cancel existing if any
    await cancelReminder(credentialId);

    const triggerDate = new Date(isoDatetime);
    const hour = triggerDate.getHours();
    const minute = triggerDate.getMinutes();
    const dayOfMonth = triggerDate.getDate();
    
    const notificationIds = [];

    // 2. Determine Trigger Logic
    if (recurrence === 'none') {
      const seconds = Math.floor((triggerDate.getTime() - Date.now()) / 1000);
      if (seconds <= 0) return null;
      
      const id = await Notifications.scheduleNotificationAsync({
        content: { title: 'Vault Reminder', body: `Time to check: ${title}`, sound: true, data: { credentialId } },
        trigger: { 
          type: Notifications.SchedulableTriggerInputTypes.TIME_INTERVAL,
          seconds,
          repeats: false,
          channelId: 'default',
        },
      });
      notificationIds.push(id);
    } else if (recurrence === 'daily') {
      const id = await Notifications.scheduleNotificationAsync({
        content: { title: 'Daily Vault Reminder', body: `Check: ${title}`, sound: true, data: { credentialId, recurring: true } },
        trigger: { 
          hour, minute, repeats: true,
          channelId: 'default',
        },
      });
      notificationIds.push(id);
    } else if (recurrence === 'weekly') {
      for (const day of recurrenceDays) {
        const id = await Notifications.scheduleNotificationAsync({
          content: { title: 'Weekly Vault Reminder', body: `Check: ${title}`, sound: true, data: { credentialId, recurring: true } },
          trigger: { 
            weekday: day, hour, minute, repeats: true,
            channelId: 'default',
          },
        });
        notificationIds.push(id);
      }
    } else if (recurrence === 'monthly') {
      const id = await Notifications.scheduleNotificationAsync({
        content: { title: 'Monthly Vault Reminder', body: `Check: ${title}`, sound: true, data: { credentialId, recurring: true } },
        trigger: { 
          day: dayOfMonth, hour, minute, repeats: true,
          channelId: 'default',
        },
      });
      notificationIds.push(id);
    } else if (recurrence === 'yearly') {
      const monthsToSchedule = recurrenceMonths.length > 0 ? recurrenceMonths : [triggerDate.getMonth()];
      for (const month of monthsToSchedule) {
        const id = await Notifications.scheduleNotificationAsync({
          content: { title: 'Yearly Vault Reminder', body: `Check: ${title}`, sound: true, data: { credentialId, recurring: true } },
          trigger: { 
            month, day: dayOfMonth, hour, minute, repeats: true,
            channelId: 'default',
          },
        });
        notificationIds.push(id);
      }
    }

    // 3. Store notification IDs (comma-separated if multiple)
    if (notificationIds.length > 0) {
      await AsyncStorage.setItem(`${NOTIF_KEY_PREFIX}${credentialId}`, notificationIds.join(','));
    }
    return notificationIds;
  } catch (error) {
    if (__DEV__) console.error('Error scheduling reminder:', error);
    return null;
  }
};

/**
 * Cancels all scheduled notifications for a specific credential.
 * @param {string} credentialId 
 */
export const cancelReminder = async (credentialId) => {
  try {
    const storKey = `${NOTIF_KEY_PREFIX}${credentialId}`;
    const storedIds = await AsyncStorage.getItem(storKey);
    
    if (storedIds) {
      const ids = storedIds.split(',');
      for (const id of ids) {
        await Notifications.cancelScheduledNotificationAsync(id);
      }
      await AsyncStorage.removeItem(storKey);
    }
  } catch (error) {
    if (__DEV__) console.error('Error canceling reminder:', error);
  }
};
