/**
 * T026: ULID Generation Utility - src/js/utils/ulid.js
 * 
 * Universally Unique Lexicographically Sortable Identifier implementation
 * Based on the ULID specification: https://github.com/ulid/spec
 * 
 * Features:
 * - 128-bit compatibility with UUID
 * - 1.21e+24 unique ULIDs per millisecond
 * - Lexicographically sortable!
 * - Canonically encoded as a 26 character string, as opposed to the 36 character UUID
 * - Uses Crockford's base32 for better efficiency and readability (5 bits per character)
 * - Case insensitive
 * - No special characters (URL safe)
 */

// Crockford's Base32 encoding - more human readable than standard Base32
const ENCODING = '0123456789ABCDEFGHJKMNPQRSTVWXYZ';
const ENCODING_LENGTH = 32;
const TIME_MAX = Math.pow(2, 48) - 1;
const TIME_LENGTH = 10;
const RANDOM_LENGTH = 16;

// Create reverse lookup table for decoding
const DECODING = {};
for (let i = 0; i < ENCODING_LENGTH; i++) {
  DECODING[ENCODING[i]] = i;
}

/**
 * Generate random values for the random portion of ULID
 * @returns {Uint8Array} 10 bytes of random data
 */
function randomBytes() {
  const bytes = new Uint8Array(10);
  if (typeof crypto !== 'undefined' && crypto.getRandomValues) {
    crypto.getRandomValues(bytes);
  } else {
    // Fallback for environments without crypto.getRandomValues
    for (let i = 0; i < bytes.length; i++) {
      bytes[i] = Math.floor(Math.random() * 256);
    }
  }
  return bytes;
}

/**
 * Encode a number to Base32 string
 * @param {number} value - Number to encode
 * @param {number} length - Target string length
 * @returns {string} Base32 encoded string
 */
function encodeBase32(value, length) {
  let str = '';
  for (let i = length - 1; i >= 0; i--) {
    const mod = value % ENCODING_LENGTH;
    str = ENCODING[mod] + str;
    value = (value - mod) / ENCODING_LENGTH;
  }
  return str;
}

/**
 * Decode a Base32 string to number
 * @param {string} str - Base32 string to decode
 * @returns {number} Decoded number
 */
function decodeBase32(str) {
  let value = 0;
  const length = str.length;
  for (let i = 0; i < length; i++) {
    const char = str[i].toUpperCase();
    if (!(char in DECODING)) {
      throw new Error(`Invalid character in ULID: ${char}`);
    }
    value = value * ENCODING_LENGTH + DECODING[char];
  }
  return value;
}

/**
 * Generate a new ULID
 * @param {number} [timestamp] - Optional timestamp (defaults to Date.now())
 * @returns {string} A 26-character ULID string
 */
export function generateULID(timestamp = Date.now()) {
  // Validate timestamp
  if (timestamp < 0 || timestamp > TIME_MAX) {
    throw new Error(`Timestamp must be between 0 and ${TIME_MAX}`);
  }

  // Encode timestamp part (10 characters)
  const timeStr = encodeBase32(timestamp, TIME_LENGTH);
  
  // Generate random part (16 characters)
  const randomness = randomBytes();
  let randomStr = '';
  
  // Convert random bytes to base32
  let acc = 0;
  let bits = 0;
  
  for (let i = 0; i < randomness.length; i++) {
    acc = (acc << 8) | randomness[i];
    bits += 8;
    
    while (bits >= 5) {
      randomStr += ENCODING[(acc >>> (bits - 5)) & 31];
      bits -= 5;
    }
  }
  
  // Handle remaining bits
  if (bits > 0) {
    randomStr += ENCODING[(acc << (5 - bits)) & 31];
  }
  
  // Pad to exactly 16 characters
  while (randomStr.length < RANDOM_LENGTH) {
    randomStr += '0';
  }
  
  return timeStr + randomStr;
}

/**
 * Validate ULID format
 * @param {string} ulid - ULID string to validate
 * @returns {boolean} True if valid ULID format
 */
export function isValidULID(ulid) {
  if (typeof ulid !== 'string') {
    return false;
  }
  
  if (ulid.length !== 26) {
    return false;
  }
  
  // Check if all characters are valid Base32
  const upperUlid = ulid.toUpperCase();
  for (let i = 0; i < upperUlid.length; i++) {
    if (!(upperUlid[i] in DECODING)) {
      return false;
    }
  }
  
  // Additional validation: check if timestamp part is within valid range
  try {
    const timestamp = extractTimestamp(ulid);
    return timestamp >= 0 && timestamp <= TIME_MAX;
  } catch {
    return false;
  }
}

/**
 * Extract timestamp from ULID
 * @param {string} ulid - ULID string
 * @returns {number} Timestamp in milliseconds
 */
export function extractTimestamp(ulid) {
  if (!isValidULID(ulid)) {
    throw new Error('Invalid ULID format');
  }
  
  const timeStr = ulid.substring(0, TIME_LENGTH);
  return decodeBase32(timeStr);
}

/**
 * Generate monotonic ULIDs for the same millisecond
 * Maintains a counter to ensure ULIDs generated in the same millisecond are still sortable
 */
let lastTime = 0;
let lastRandom = null;

/**
 * Generate a monotonic ULID
 * @param {number} [timestamp] - Optional timestamp (defaults to Date.now())
 * @returns {string} A 26-character monotonic ULID string
 */
export function generateMonotonicULID(timestamp = Date.now()) {
  if (timestamp === lastTime && lastRandom !== null) {
    // Same millisecond, increment the random part
    let carry = 1;
    for (let i = lastRandom.length - 1; i >= 0 && carry; i--) {
      const sum = lastRandom[i] + carry;
      lastRandom[i] = sum % 256;
      carry = Math.floor(sum / 256);
    }
    
    // If we overflowed, generate new random
    if (carry) {
      lastRandom = randomBytes();
    }
  } else {
    // New millisecond or first call
    lastTime = timestamp;
    lastRandom = randomBytes();
  }
  
  // Encode timestamp
  const timeStr = encodeBase32(timestamp, TIME_LENGTH);
  
  // Encode random part
  let randomStr = '';
  let acc = 0;
  let bits = 0;
  
  for (let i = 0; i < lastRandom.length; i++) {
    acc = (acc << 8) | lastRandom[i];
    bits += 8;
    
    while (bits >= 5) {
      randomStr += ENCODING[(acc >>> (bits - 5)) & 31];
      bits -= 5;
    }
  }
  
  if (bits > 0) {
    randomStr += ENCODING[(acc << (5 - bits)) & 31];
  }
  
  while (randomStr.length < RANDOM_LENGTH) {
    randomStr += '0';
  }
  
  return timeStr + randomStr;
}

/**
 * Compare two ULIDs lexicographically
 * @param {string} ulidA - First ULID
 * @param {string} ulidB - Second ULID
 * @returns {number} -1 if A < B, 0 if A === B, 1 if A > B
 */
export function compareULIDs(ulidA, ulidB) {
  if (!isValidULID(ulidA) || !isValidULID(ulidB)) {
    throw new Error('Invalid ULID format for comparison');
  }
  
  if (ulidA < ulidB) return -1;
  if (ulidA > ulidB) return 1;
  return 0;
}

// Default export for convenience
export default {
  generate: generateULID,
  generateMonotonic: generateMonotonicULID,
  isValid: isValidULID,
  extractTimestamp,
  compare: compareULIDs
};