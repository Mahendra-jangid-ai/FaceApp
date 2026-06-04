/**
 * Validates Indian Aadhaar numbers using the Verhoeff checksum algorithm.
 * Aadhaar is a 12-digit unique identification number issued by UIDAI.
 */

const MULTIPLICATION_TABLE: number[][] = [
  [0, 1, 2, 3, 4, 5, 6, 7, 8, 9],
  [1, 2, 3, 4, 0, 6, 7, 8, 9, 5],
  [2, 3, 4, 0, 1, 7, 8, 9, 5, 6],
  [3, 4, 0, 1, 2, 8, 9, 5, 6, 7],
  [4, 0, 1, 2, 3, 9, 5, 6, 7, 8],
  [5, 9, 8, 7, 6, 0, 4, 3, 2, 1],
  [6, 5, 9, 8, 7, 1, 0, 4, 3, 2],
  [7, 6, 5, 9, 8, 2, 1, 0, 4, 3],
  [8, 7, 6, 5, 9, 3, 2, 1, 0, 4],
  [9, 8, 7, 6, 5, 4, 3, 2, 1, 0],
];

const PERMUTATION_TABLE: number[][] = [
  [0, 1, 2, 3, 4, 5, 6, 7, 8, 9],
  [1, 5, 7, 6, 2, 8, 3, 0, 9, 4],
  [5, 8, 0, 3, 7, 9, 6, 1, 4, 2],
  [8, 9, 1, 6, 0, 4, 3, 5, 2, 7],
  [9, 4, 5, 3, 1, 2, 6, 8, 7, 0],
  [4, 2, 8, 6, 5, 7, 3, 9, 0, 1],
  [2, 7, 9, 3, 8, 0, 6, 4, 1, 5],
  [7, 0, 4, 6, 9, 1, 3, 2, 5, 8],
];

function verhoeffChecksum(num: string): boolean {
  let c = 0;
  const digits = num.split('').reverse().map(Number);
  for (let i = 0; i < digits.length; i++) {
    c = MULTIPLICATION_TABLE[c][PERMUTATION_TABLE[i % 8][digits[i]]];
  }
  return c === 0;
}

export interface AadharValidation {
  valid: boolean;
  formatted: string;
  error?: string;
}

export function validateAadhar(input: string): AadharValidation {
  const cleaned = input.replace(/[\s-]/g, '');

  if (cleaned.length !== 12) {
    return { valid: false, formatted: cleaned, error: 'Aadhaar must be 12 digits' };
  }

  if (!/^\d{12}$/.test(cleaned)) {
    return { valid: false, formatted: cleaned, error: 'Aadhaar must contain only digits' };
  }

  if (cleaned[0] === '0' || cleaned[0] === '1') {
    return { valid: false, formatted: cleaned, error: 'Aadhaar cannot start with 0 or 1' };
  }

  if (!verhoeffChecksum(cleaned)) {
    return { valid: false, formatted: cleaned, error: 'Invalid Aadhaar checksum' };
  }

  const formatted = `${cleaned.slice(0, 4)} ${cleaned.slice(4, 8)} ${cleaned.slice(8, 12)}`;
  return { valid: true, formatted };
}

export function maskAadhar(aadhar: string): string {
  const cleaned = aadhar.replace(/[\s-]/g, '');
  if (cleaned.length !== 12) return aadhar;
  return `XXXX XXXX ${cleaned.slice(8, 12)}`;
}
