import { createContext, useContext, useEffect, useState } from 'react';
import { encrypt, initializeEncryptionKey } from '../utils/crypto';
import { cancelReminder } from '../utils/notifications';
import { calculateNextOccurrence } from '../utils/reminderMath';
import { deleteCredentialItem, getCredentialCount, loadCredentials, saveCredentialItem, saveCredentials } from '../utils/storage';

const VaultContext = createContext();

export const VaultProvider = ({ children }) => {
  const [credentials, setCredentials] = useState([]);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(0);
  const [totalCount, setTotalCount] = useState(0);
  const [hasMore, setHasMore] = useState(true);
  const [keyInitialized, setKeyInitialized] = useState(false);

  const reloadCredentials = async (pageNum = 0) => {
    setLoading(true);
    try {
      const data = await loadCredentials(pageNum);
      const count = await getCredentialCount();
      setTotalCount(count);
      setHasMore((pageNum + 1) * 20 < count);
      
      if (pageNum === 0) {
        setCredentials(data);
      } else {
        setCredentials(prev => [...prev, ...data]);
      }
    } catch (e) {
      console.error('Failed to reload credentials:', e);
    } finally {
      setLoading(false);
    }
  };
  
  const loadMoreCredentials = async () => {
    if (!hasMore || loading) return;
    const nextPage = page + 1;
    setPage(nextPage);
  };

  useEffect(() => {
    const initialize = async () => {
      try {
        // Add timeout for key initialization to prevent hanging
        const keyInitPromise = initializeEncryptionKey();
        const timeoutPromise = new Promise((_, reject) => 
          setTimeout(() => reject(new Error('Key initialization timeout')), 5000)
        );
        
        await Promise.race([keyInitPromise, timeoutPromise]);
        setKeyInitialized(true);
      } catch (error) {
        console.error('Failed to initialize encryption key:', error);
        // Continue anyway - the app can still work without key initialization
        setKeyInitialized(false);
      }
      await reloadCredentials();
    };
    initialize();
  }, []);

  const addCredential = async ({ title, data, tags, reminder, recurrence, recurrenceDays, recurrenceMonths, origDay }) => {
    // Encrypt the entire object to hide metadata
    const tagsArray = tags ? (Array.isArray(tags) ? tags : tags.split(',').map(t => t.trim()).filter(Boolean)) : [];
    // data may be a string (serialized fields) or object, handle both
    const dataToEncrypt = typeof data === 'string' ? data : JSON.stringify({ title, tags: tagsArray, data });
    const encData = await encrypt(dataToEncrypt);
    
    // Keep reminder date unencrypted for display - handle both Date object and ISO string
    const reminderDateStr = reminder && reminder instanceof Date ? reminder.toISOString() : (reminder || null);
    
    const newCred = {
      id: Date.now().toString(),
      title, // Keep unencrypted for display
      encData, // Contains encrypted title, tags, data
      tags: tagsArray, // Keep unencrypted for display
      reminder: reminderDateStr, // Keep unencrypted for display
      recurrence: recurrence || 'none',
      recurrenceDays: recurrenceDays || [],
      recurrenceMonths: recurrenceMonths || [],
      origDay: origDay,
      rFired: false,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };
    const updated = [newCred, ...credentials];
    setCredentials(updated);
    await saveCredentialItem(newCred);
    return newCred.id;
  };

  const editCredential = async (id, { title, data, tags, reminder, recurrence, recurrenceDays, recurrenceMonths, origDay }) => {
    const tagsArray = tags ? (Array.isArray(tags) ? tags : tags.split(',').map(t => t.trim()).filter(Boolean)) : [];
    // data may be a string (serialized fields) or object, handle both
    const dataToEncrypt = typeof data === 'string' ? data : JSON.stringify({ title, tags: tagsArray, data });
    const encData = await encrypt(dataToEncrypt);
    
    // Keep reminder date unencrypted for display - handle both Date object and ISO string
    const reminderDateStr = reminder && reminder instanceof Date ? reminder.toISOString() : (reminder || null);
    
    let updatedItem = null;
    const updatedList = credentials.map(c => {
      if (c.id === id) {
        updatedItem = {
          ...c,
          title, // Keep unencrypted for display
          encData, // Contains encrypted title, tags, data
          tags: tagsArray, // Keep unencrypted for display
          reminder: reminderDateStr, // Keep unencrypted for display
          recurrence: recurrence || 'none',
          recurrenceDays: recurrenceDays || [],
          recurrenceMonths: recurrenceMonths || [],
          origDay: origDay !== undefined ? origDay : c.origDay,
          updatedAt: new Date().toISOString(),
          rFired: c.reminder === reminderDateStr ? c.rFired : false,
        };
        return updatedItem;
      }
      return c;
    });
    
    setCredentials(updatedList);
    if (updatedItem) await saveCredentialItem(updatedItem);
  };

  const deleteCredential = async (id) => {
    await cancelReminder(id);
    const updated = credentials.filter(c => c.id !== id);
    setCredentials(updated);
    await deleteCredentialItem(id);
  };

  const importCredentials = async (newArray) => {
    if (!Array.isArray(newArray)) return;
    const existingIds = new Set(credentials.map(c => c.id));
    const toAdd = newArray.filter(c => !existingIds.has(c.id));
    const updated = [...toAdd, ...credentials];
    setCredentials(updated);
    await saveCredentials(updated);
  };

  const removeReminder = async (id) => {
    const updated = credentials.map(c => {
      if (c.id === id) {
        return { ...c, reminder: null, rFired: false, updatedAt: new Date().toISOString() };
      }
      return c;
    });
    setCredentials(updated);
    await saveCredentials(updated);
  };

  const markReminderFired = async (id) => {
    let firedItem = null;
    const updated = await Promise.all(credentials.map(async (c) => {
      if (c.id === id) {
        if (c.recurrence && c.recurrence !== 'none' && c.reminder) {
          const reminderDate = new Date(c.reminder);
          const nextDate = calculateNextOccurrence(reminderDate, c.recurrence, c.recurrenceDays, c.recurrenceMonths, c.origDay);
          const nextReminderStr = nextDate ? nextDate.toISOString() : c.reminder;
          firedItem = { 
            ...c, 
            reminder: nextReminderStr,
            rFired: false 
          };
          return firedItem;
        }
        firedItem = { ...c, rFired: true };
        return firedItem;
      }
      return c;
    }));
    setCredentials(updated);
    if (firedItem) await saveCredentialItem(firedItem);
  };

  return (
    <VaultContext.Provider value={{ 
      credentials, 
      loading, 
      addCredential, 
      editCredential, 
      deleteCredential, 
      importCredentials, 
      removeReminder, 
      markReminderFired,
      loadCredentials: reloadCredentials,
      loadMoreCredentials,
      hasMore,
      totalCount,
      keyInitialized
    }}>
      {children}
    </VaultContext.Provider>
  );
};

export const useVault = () => {
  const context = useContext(VaultContext);
  if (!context) {
    throw new Error('useVault must be used within a VaultProvider');
  }
  return context;
};
