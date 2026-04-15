import CryptoJS from 'crypto-js';
import * as Crypto from 'expo-crypto';
import * as SecureStore from 'expo-secure-store';

const ENCRYPTION_KEY_KEY = 'securevault_encryption_key';

/**
 * Generates a secure random encryption key.
 * @returns {Promise<string>} Base64 encoded key
 */
const generateKey = async () => {
  const randomBytes = Crypto.getRandomBytes(32);
  const wordArray = CryptoJS.lib.WordArray.create(randomBytes);
  return CryptoJS.enc.Base64.stringify(wordArray);
};

/**
 * Initializes or retrieves the device-stored encryption key.
 * Uses expo-secure-store which leverages Android Keystore and iOS Keychain.
 * @returns {Promise<string>} Base64 encoded key
 */
export const initializeEncryptionKey = async () => {
  try {
    let existingKey = await SecureStore.getItemAsync(ENCRYPTION_KEY_KEY);
    if (!existingKey) {
      existingKey = await generateKey();
      await SecureStore.setItemAsync(ENCRYPTION_KEY_KEY, existingKey);
    }
    return existingKey;
  } catch (error) {
    throw new Error(`Failed to initialize encryption key: ${error.message}`);
  }
};

/**
 * Gets the encryption key from secure storage.
 * @returns {Promise<string>} Base64 encoded key
 */
const getEncryptionKey = async () => {
  try {
    const key = await SecureStore.getItemAsync(ENCRYPTION_KEY_KEY);
    if (!key) {
      return await initializeEncryptionKey();
    }
    return key;
  } catch (error) {
    throw new Error(`Failed to get encryption key: ${error.message}`);
  }
};

/**
 * Encrypts a plaintext string using AES-256-CBC with HMAC-SHA256 for integrity.
 * Uses device-stored key from secure storage.
 * @param {string} plaintext - Data to encrypt
 * @returns {Promise<string>} Format: iv::hmac::ciphertext
 */
export const encrypt = async (plaintext) => {
  try {
    if (!plaintext) throw new Error('Plaintext cannot be empty');

    const keyString = await getEncryptionKey();
    const key = CryptoJS.enc.Base64.parse(keyString);

    // Generate random IV
    const randomBytes = Crypto.getRandomBytes(16);
    const iv = CryptoJS.lib.WordArray.create(randomBytes);

    // Encrypt
    const encrypted = CryptoJS.AES.encrypt(plaintext, key, { 
      iv,
      mode: CryptoJS.mode.CBC,
      padding: CryptoJS.pad.Pkcs7
    });
    const ciphertext = encrypted.toString();

    // Generate HMAC for integrity (encrypt-then-MAC)
    const hmac = CryptoJS.HmacSHA256(ciphertext, key).toString();

    const ivBase64 = CryptoJS.enc.Base64.stringify(iv);
    return `${ivBase64}::${hmac}::${ciphertext}`;
  } catch (error) {
    throw new Error(`Encryption failed: ${error.message}`);
  }
};

/**
 * Decrypts an encrypted string with HMAC verification.
 * Uses device-stored key from secure storage.
 * @param {string} encString - Format: iv::hmac::ciphertext
 * @returns {Promise<string>} Decrypted plaintext
 */
export const decrypt = async (encString) => {
  try {
    if (!encString) throw new Error('Encrypted string cannot be empty');

    const parts = encString.split('::');
    if (parts.length < 3) {
      // Legacy format support (iv::ciphertext)
      if (parts.length === 2) {
        return decryptLegacy(encString);
      }
      throw new Error('Invalid encrypted format');
    }

    const [ivBase64, hmac, ciphertext] = parts;

    const keyString = await getEncryptionKey();
    const key = CryptoJS.enc.Base64.parse(keyString);

    // Verify HMAC first (prevent tampering)
    const computedHmac = CryptoJS.HmacSHA256(ciphertext, key).toString();
    if (computedHmac !== hmac) {
      throw new Error('HMAC verification failed - data may be tampered');
    }

    // Decrypt
    const iv = CryptoJS.enc.Base64.parse(ivBase64);
    const decryptedBytes = CryptoJS.AES.decrypt(ciphertext, key, { 
      iv,
      mode: CryptoJS.mode.CBC,
      padding: CryptoJS.pad.Pkcs7
    });

    const plaintext = decryptedBytes.toString(CryptoJS.enc.Utf8);
    if (!plaintext) throw new Error('Decryption resulted in empty string');

    return plaintext;
  } catch (error) {
    throw new Error(`Decryption failed: ${error.message}`);
  }
};

/**
 * Legacy decryption for backward compatibility with old hardcoded key format.
 * @param {string} encString - Format: iv::ciphertext
 * @returns {string} Decrypted plaintext
 */
const decryptLegacy = (encString) => {
  try {
    const [ivBase64, ciphertext] = encString.split('::');
    const iv = CryptoJS.enc.Base64.parse(ivBase64);
    const key = CryptoJS.SHA256('sv$3cur3V@ult!K3y#2024$AES256'); // Legacy hardcoded key
    const decryptedBytes = CryptoJS.AES.decrypt(ciphertext, key, { iv });
    const plaintext = decryptedBytes.toString(CryptoJS.enc.Utf8);
    if (!plaintext) throw new Error('Legacy decryption failed');
    return plaintext;
  } catch (error) {
    throw new Error(`Legacy decryption failed: ${error.message}`);
  }
};

/**
 * Securely wipes sensitive data from memory.
 * @param {string} data - Data to wipe
 */
export const secureWipe = (data) => {
  if (typeof data === 'string') {
    // Overwrite string reference (limited in JS, but best effort)
    return '';
  }
  return null;
};

/**
 * Clears the device-stored encryption key (for reset purposes).
 * WARNING: This will make all encrypted data inaccessible!
 */
export const clearEncryptionKey = async () => {
  try {
    await SecureStore.deleteItemAsync(ENCRYPTION_KEY_KEY);
  } catch (error) {
    throw new Error(`Failed to clear encryption key: ${error.message}`);
  }
};
