/**
 * Utilities for handling structured vault data.
 */

/**
 * Parses decrypted data string. 
 * Expects JSON array of fields.
 */
export const parseVaultData = (rawText) => {
  if (!rawText) return [{ key: 'Note', value: '', id: '1', sensitive: false }];
  
  try {
    const parsed = JSON.parse(rawText);
    if (Array.isArray(parsed) && parsed.length > 0) {
      return parsed;
    }
  } catch (e) {
    console.error('Failed to parse vault data:', e);
  }

  // Return empty field if parsing fails
  return [{ key: 'Note', value: '', id: '1', sensitive: false }];
};

/**
 * Serializes fields back to string for encryption.
 */
export const serializeVaultData = (fields) => {
  // Always return JSON string for consistency
  return JSON.stringify(fields);
};
