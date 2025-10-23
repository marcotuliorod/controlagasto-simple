import { describe, it, expect } from 'vitest';
import { urlBase64ToUint8Array, isValidVapidKey } from './pushUtils';

describe('pushUtils', () => {
  describe('urlBase64ToUint8Array', () => {
    it('should convert valid base64url string to Uint8Array', () => {
      // Valid P-256 public key example (65 bytes when decoded)
      const validKey = 'BEl6zeTBXb2i1KPXxVP3KZPn4mSz-PGfxGuH8D_k-5OL0A9n-8DPaW6vXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXX';
      const result = urlBase64ToUint8Array(validKey);
      
      expect(result).toBeInstanceOf(Uint8Array);
      expect(result.length).toBeGreaterThan(0);
    });

    it('should handle padding correctly', () => {
      const keyWithoutPadding = 'BEl6zeTBXb2i1KPX';
      const result = urlBase64ToUint8Array(keyWithoutPadding);
      
      expect(result).toBeInstanceOf(Uint8Array);
      expect(result.length).toBeGreaterThan(0);
    });

    it('should convert URL-safe characters', () => {
      const keyWithUrlChars = 'BEl6-_TBXb2i1KPX';
      const result = urlBase64ToUint8Array(keyWithUrlChars);
      
      expect(result).toBeInstanceOf(Uint8Array);
    });
  });

  describe('isValidVapidKey', () => {
    it('should return true for 65-byte key (P-256 uncompressed)', () => {
      const validKey = new Uint8Array(65);
      expect(isValidVapidKey(validKey)).toBe(true);
    });

    it('should return false for keys with incorrect length', () => {
      const invalidKey32 = new Uint8Array(32);
      const invalidKey64 = new Uint8Array(64);
      const invalidKey66 = new Uint8Array(66);
      
      expect(isValidVapidKey(invalidKey32)).toBe(false);
      expect(isValidVapidKey(invalidKey64)).toBe(false);
      expect(isValidVapidKey(invalidKey66)).toBe(false);
    });

    it('should return false for empty array', () => {
      const emptyKey = new Uint8Array(0);
      expect(isValidVapidKey(emptyKey)).toBe(false);
    });
  });
});
