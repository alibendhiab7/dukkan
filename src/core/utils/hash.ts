// src/core/utils/hash.ts

/**
 * Hashes a string using the SHA-256 algorithm via Web Crypto API.
 * Falls back to a custom lightweight hash in environments where Crypto API is unavailable.
 */
export async function hashPassword(password: string): Promise<string> {
  try {
    if (window.crypto && window.crypto.subtle) {
      const msgUint8 = new TextEncoder().encode(password);
      const hashBuffer = await window.crypto.subtle.digest('SHA-256', msgUint8);
      const hashArray = Array.from(new Uint8Array(hashBuffer));
      const hashHex = hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
      return hashHex;
    }
  } catch (e) {
    console.warn('Web Crypto not available or failed, using fallback hashing', e);
  }

  // Safe fallback hashing algorithm (simple Fowler-Noll-Vo or djb2 string hash for edge-cases)
  let hash = 5381;
  for (let i = 0; i < password.length; i++) {
    hash = (hash * 33) ^ password.charCodeAt(i);
  }
  return (hash >>> 0).toString(16);
}

/**
 * Validates a plaintext password against a stored hash.
 */
export async function comparePassword(password: string, hash: string): Promise<boolean> {
  const inputHash = await hashPassword(password);
  return inputHash === hash;
}
