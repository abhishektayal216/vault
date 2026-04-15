import CryptoJS from 'crypto-js';
import * as Crypto from 'expo-crypto';

const SECRET_KEY = 'sv$3cur3V@ult!K3y#2024$AES256';

// Derive a 256-bit key from the secret string once on load.
// We use a WordArray key to bypass CryptoJS's internal random salt generation (EvpKDF).
const KEY = CryptoJS.SHA256(SECRET_KEY);

/**
 * Encrypts a plaintext string using AES-256-CBC with a random IV.
 * @param {string} plaintext 
 * @returns {string} ivBase64::ciphertext
 */
export const encrypt = (plaintext) => {
  try {
    // Generate secure random bytes using expo-crypto (Fix for Random Number error)
    const randomBytes = Crypto.getRandomBytes(16);
    
    // Convert Uint8Array to CryptoJS WordArray
    const iv = CryptoJS.lib.WordArray.create(randomBytes);
    
    // Use the pre-derived WordArray KEY to ensure no internal randomness is needed for KDF
    const encrypted = CryptoJS.AES.encrypt(plaintext, KEY, { iv });
    const ciphertext = encrypted.toString();
    const ivBase64 = CryptoJS.enc.Base64.stringify(iv);
    
    return `${ivBase64}::${ciphertext}`;
  } catch (error) {
    console.error('Encryption error:', error);
    return '';
  }
};

/**
 * Decrypts an encrypted string (format: ivBase64::ciphertext).
 * @param {string} encString 
 * @returns {string} decrypted plaintext
 */
export const decrypt = (encString) => {
  try {
    if (!encString || !encString.includes('::')) return '';
    const [ivBase64, ciphertext] = encString.split('::');
    
    const iv = CryptoJS.enc.Base64.parse(ivBase64);
    
    // Must also use the pre-derived KEY here.
    const decryptedBytes = CryptoJS.AES.decrypt(ciphertext, KEY, { iv });
    
    return decryptedBytes.toString(CryptoJS.enc.Utf8);
  } catch (error) {
    console.error('Decryption error:', error);
    return '';
  }
};
