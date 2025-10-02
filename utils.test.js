/**
 * T018: Contract test: ULID generation in tests/unit/utils.test.js
 * 
 * Tests ULID generation utility according to storage contract.
 * Implementation now ready - tests should PASS.
 */

import { describe, it, expect } from 'vitest';

// Import the ULID utility (now implemented)
import { generateULID, isValidULID, extractTimestamp } from './ulid.js';

describe('ULID Generator Contract Tests', () => {
  describe('generateULID', () => {
    it('should generate a valid ULID string', () => {
      const ulid = generateULID();
      expect(typeof ulid).toBe('string');
      expect(ulid).toHaveLength(26);
      expect(ulid).toMatch(/^[0123456789ABCDEFGHJKMNPQRSTVWXYZ]{26}$/);
    });

    it('should generate unique ULIDs', () => {
      const ulid1 = generateULID();
      const ulid2 = generateULID();
      expect(ulid1).not.toBe(ulid2);
    });

    it('should generate ULIDs with increasing timestamps', async () => {
      const ulid1 = generateULID();
      await new Promise(resolve => setTimeout(resolve, 1));
      const ulid2 = generateULID();
      const timestamp1 = extractTimestamp(ulid1);
      const timestamp2 = extractTimestamp(ulid2);
      expect(timestamp2).toBeGreaterThanOrEqual(timestamp1);
    });

    it('should handle custom timestamps', () => {
      const customTime = Date.now() - 1000;
      const ulid = generateULID(customTime);
      const extractedTime = extractTimestamp(ulid);
      expect(extractedTime).toBe(customTime);
    });
  });

  describe('isValidULID', () => {
    it('should validate correct ULID format', () => {
      const validUlid = generateULID();
      expect(isValidULID(validUlid)).toBe(true);
      expect(isValidULID('')).toBe(false);
      expect(isValidULID('invalid')).toBe(false);
      expect(isValidULID('01ARZ3NDEKTSV4RRFFQ69G5FA')).toBe(false); // too short
      expect(isValidULID('01ARZ3NDEKTSV4RRFFQ69G5FAVV')).toBe(false); // too long
      expect(isValidULID('01ARZ3NDEKTSV4RRFFQ69G5FAI')).toBe(false); // invalid chars (I)
    });
  });

  describe('extractTimestamp', () => {
    it('should extract timestamp from ULID', () => {
      const now = Date.now();
      const ulid = generateULID(now);
      const extractedTimestamp = extractTimestamp(ulid);
      expect(extractedTimestamp).toBe(now);
    });

    it('should handle edge case timestamps', () => {
      const minTime = 0;
      const maxTime = 281474976710655; // 2^48 - 1
      const ulidMin = generateULID(minTime);  
      const ulidMax = generateULID(maxTime);
      expect(extractTimestamp(ulidMin)).toBe(minTime);
      expect(extractTimestamp(ulidMax)).toBe(maxTime);
    });
  });
});