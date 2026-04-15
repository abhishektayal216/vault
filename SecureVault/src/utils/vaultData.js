/**
 * Utilities for handling structured vault data.
 */

/**
 * Parses decrypted data string. 
 * If it's JSON array of fields, returns the array.
 * Otherwise returns a single field array with the raw text.
 */
export const parseVaultData = (rawText) => {
  if (!rawText) return [{ key: 'Note', value: '', id: '1', sensitive: false }];
  
  try {
    const parsed = JSON.parse(rawText);
    if (Array.isArray(parsed) && parsed.length > 0 && parsed[0].key !== undefined) {
      return parsed;
    }
  } catch (e) {
    // Not JSON or legacy format
  }

  return [{ key: 'Note', value: rawText, id: '1', sensitive: false }];
};

/**
 * Serializes fields back to string for encryption.
 */
export const serializeVaultData = (fields) => {
  // If only one field and key is 'Note', we can save as plain string for legacy compatibility
  if (fields.length === 1 && fields[0].key === 'Note' && !fields[0].sensitive) {
    return fields[0].value;
  }
  return JSON.stringify(fields);
};
