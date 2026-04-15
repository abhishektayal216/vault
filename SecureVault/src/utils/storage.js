import AsyncStorage from '@react-native-async-storage/async-storage';

const INDEX_KEY = 'sv_index';
const ITEM_PREFIX = 'sv_item_';
const OLD_STORAGE_KEY = 'sv_data';

/**
 * Loads all credentials. Handles migration from old monolithic format.
 */
export const loadCredentials = async () => {
  try {
    // 1. Check for legacy monolithic data
    const legacyData = await AsyncStorage.getItem(OLD_STORAGE_KEY);
    if (legacyData) {
      const items = JSON.parse(legacyData);
      // Migrate to individual storage
      for (const item of items) {
        await AsyncStorage.setItem(`${ITEM_PREFIX}${item.id}`, JSON.stringify(item));
      }
      const ids = items.map(i => i.id);
      await AsyncStorage.setItem(INDEX_KEY, JSON.stringify(ids));
      
      // Clear legacy data
      await AsyncStorage.removeItem(OLD_STORAGE_KEY);
      return items;
    }

    // 2. Load from new indexed storage
    const indexRaw = await AsyncStorage.getItem(INDEX_KEY);
    if (!indexRaw) return [];

    const ids = JSON.parse(indexRaw);
    const itemPromises = ids.map(id => AsyncStorage.getItem(`${ITEM_PREFIX}${id}`));
    const itemsRaw = await Promise.all(itemPromises);
    
    return itemsRaw
      .filter(raw => raw !== null)
      .map(raw => JSON.parse(raw));
  } catch (error) {
    console.error('Error loading credentials:', error);
    return [];
  }
};

/**
 * Saves a single credential and updates the index.
 */
export const saveCredentialItem = async (item) => {
  try {
    // Save the item itself
    await AsyncStorage.setItem(`${ITEM_PREFIX}${item.id}`, JSON.stringify(item));
    
    // Update index if needed
    const indexRaw = await AsyncStorage.getItem(INDEX_KEY);
    let ids = indexRaw ? JSON.parse(indexRaw) : [];
    if (!ids.includes(item.id)) {
      ids = [item.id, ...ids];
      await AsyncStorage.setItem(INDEX_KEY, JSON.stringify(ids));
    }
  } catch (error) {
    console.error('Error saving credential item:', error);
  }
};

/**
 * Saves the full state. Use sparingly, mainly for sorting or bulk ops.
 */
export const saveCredentials = async (array) => {
  try {
    const ids = array.map(i => i.id);
    await AsyncStorage.setItem(INDEX_KEY, JSON.stringify(ids));
    
    // Save only changed or all? To be safe and "Proper", 
    // we should iterate but this is where the bottleneck was.
    // For now, we perform individual saves in parallel.
    const itemPromises = array.map(item => 
      AsyncStorage.setItem(`${ITEM_PREFIX}${item.id}`, JSON.stringify(item))
    );
    await Promise.all(itemPromises);
  } catch (error) {
    console.error('Error saving credentials:', error);
  }
};

/**
 * Removes a single credential.
 */
export const deleteCredentialItem = async (id) => {
  try {
    await AsyncStorage.removeItem(`${ITEM_PREFIX}${id}`);
    const indexRaw = await AsyncStorage.getItem(INDEX_KEY);
    if (indexRaw) {
      const ids = JSON.parse(indexRaw).filter(itemId => itemId !== id);
      await AsyncStorage.setItem(INDEX_KEY, JSON.stringify(ids));
    }
  } catch (error) {
    console.error('Error deleting credential item:', error);
  }
};

/**
 * Removes all credential data.
 */
export const clearCredentials = async () => {
  try {
    const indexRaw = await AsyncStorage.getItem(INDEX_KEY);
    if (indexRaw) {
      const ids = JSON.parse(indexRaw);
      for (const id of ids) {
        await AsyncStorage.removeItem(`${ITEM_PREFIX}${id}`);
      }
      await AsyncStorage.removeItem(INDEX_KEY);
    }
  } catch (error) {
    console.error('Error clearing credentials:', error);
  }
};
