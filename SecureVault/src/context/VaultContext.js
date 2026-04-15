import React, { createContext, useContext, useState, useEffect } from 'react';
import { loadCredentials, saveCredentials, saveCredentialItem, deleteCredentialItem } from '../utils/storage';
import { encrypt, decrypt } from '../utils/crypto';
import { calculateNextOccurrence } from '../utils/reminderMath';
import { cancelReminder } from '../utils/notifications';

const VaultContext = createContext();

export const VaultProvider = ({ children }) => {
  const [credentials, setCredentials] = useState([]);
  const [loading, setLoading] = useState(true);

  const reloadCredentials = async () => {
    setLoading(true);
    const data = await loadCredentials();
    
    // Decrypt and expand hidden metadata for the in-memory state
    const processed = data.map(item => {
      try {
        const decrypted = decrypt(item.encData);
        if (decrypted.startsWith('{')) {
          const parsed = JSON.parse(decrypted);
          return { 
            ...item, 
            title: parsed.title || item.title,
            tags: parsed.tags || item.tags,
            decryptedData: parsed.data // Store for use in detail screen if needed
          };
        }
      } catch (e) {
        // Fallback for legacy items or corruption
      }
      return item;
    });
    
    setCredentials(processed);
    setLoading(false);
  };

  useEffect(() => {
    reloadCredentials();
  }, []);

  const addCredential = async ({ title, data, tags, reminder, recurrence, recurrenceDays, recurrenceMonths, origDay }) => {
    // Encrypt the entire object to hide metadata
    const tagsArray = tags ? tags.split(',').map(t => t.trim()).filter(Boolean) : [];
    const encData = encrypt(JSON.stringify({ title, tags: tagsArray, data }));
    
    const newCred = {
      id: Date.now().toString(),
      title, // Still kept as hint for list view, but encrypted data is the source of truth
      encData,
      tags: tagsArray,
      reminder,
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
    const encData = encrypt(JSON.stringify({ title, tags: tagsArray, data }));
    
    let updatedItem = null;
    const updatedList = credentials.map(c => {
      if (c.id === id) {
        updatedItem = {
          ...c,
          title,
          encData,
          tags: tagsArray,
          reminder,
          recurrence: recurrence || 'none',
          recurrenceDays: recurrenceDays || [],
          recurrenceMonths: recurrenceMonths || [],
          origDay: origDay !== undefined ? origDay : c.origDay,
          updatedAt: new Date().toISOString(),
          rFired: c.reminder === reminder ? c.rFired : false,
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
    const updated = credentials.map(c => {
      if (c.id === id) {
        if (c.recurrence && c.recurrence !== 'none' && c.reminder) {
          const nextDate = calculateNextOccurrence(c.reminder, c.recurrence, c.recurrenceDays, c.recurrenceMonths, c.origDay);
          firedItem = { 
            ...c, 
            reminder: nextDate ? nextDate.toISOString() : c.reminder,
            rFired: false 
          };
          return firedItem;
        }
        firedItem = { ...c, rFired: true };
        return firedItem;
      }
      return c;
    });
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
      loadCredentials: reloadCredentials
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
