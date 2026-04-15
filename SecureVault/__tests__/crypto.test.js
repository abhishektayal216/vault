/**
 * Crypto utility tests
 * Tests for encryption, decryption, and key derivation
 */

import { encrypt, decrypt, validatePassword, initializeKeySalt } from '../src/utils/crypto';

describe('Crypto Utilities', () => {
  beforeAll(async () => {
    await initializeKeySalt();
  });

  describe('encrypt', () => {
    it('should encrypt plaintext successfully', async () => {
      const plaintext = 'Test data';
      const password = 'testPassword123';
      const encrypted = await encrypt(plaintext, password);
      
      expect(encrypted).toBeTruthy();
      expect(encrypted).toContain('::');
      expect(encrypted).not.toBe(plaintext);
    });

    it('should throw error for empty plaintext', async () => {
      await expect(encrypt('', 'password')).rejects.toThrow();
    });

    it('should throw error for empty password', async () => {
      await expect(encrypt('data', '')).rejects.toThrow();
    });

    it('should produce different ciphertext for same plaintext', async () => {
      const plaintext = 'Test data';
      const password = 'testPassword123';
      
      const encrypted1 = await encrypt(plaintext, password);
      const encrypted2 = await encrypt(plaintext, password);
      
      expect(encrypted1).not.toBe(encrypted2);
    });
  });

  describe('decrypt', () => {
    it('should decrypt ciphertext successfully', async () => {
      const plaintext = 'Test data';
      const password = 'testPassword123';
      const encrypted = await encrypt(plaintext, password);
      const decrypted = await decrypt(encrypted, password);
      
      expect(decrypted).toBe(plaintext);
    });

    it('should throw error for wrong password', async () => {
      const plaintext = 'Test data';
      const password = 'testPassword123';
      const wrongPassword = 'wrongPassword';
      const encrypted = await encrypt(plaintext, password);
      
      await expect(decrypt(encrypted, wrongPassword)).rejects.toThrow();
    });

    it('should throw error for empty ciphertext', async () => {
      await expect(decrypt('', 'password')).rejects.toThrow();
    });

    it('should throw error for empty password', async () => {
      await expect(decrypt('encrypted::data', '')).rejects.toThrow();
    });

    it('should detect tampered data via HMAC', async () => {
      const plaintext = 'Test data';
      const password = 'testPassword123';
      const encrypted = await encrypt(plaintext, password);
      
      // Tamper with the encrypted data
      const parts = encrypted.split('::');
      const tampered = `${parts[0]}::${parts[1]}::${parts[2]}::tampered${parts[3]}`;
      
      await expect(decrypt(tampered, password)).rejects.toThrow('HMAC verification failed');
    });
  });

  describe('validatePassword', () => {
    it('should return true for correct password', async () => {
      const password = 'testPassword123';
      const testData = await encrypt('VALIDATION_TEST', password);
      
      const isValid = await validatePassword(password, testData);
      expect(isValid).toBe(true);
    });

    it('should return false for incorrect password', async () => {
      const password = 'testPassword123';
      const wrongPassword = 'wrongPassword';
      const testData = await encrypt('VALIDATION_TEST', password);
      
      const isValid = await validatePassword(wrongPassword, testData);
      expect(isValid).toBe(false);
    });
  });
});
