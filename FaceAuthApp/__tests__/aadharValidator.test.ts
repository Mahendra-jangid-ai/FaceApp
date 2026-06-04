import { validateAadhar, maskAadhar } from '../src/services/aadharValidator';

describe('Aadhaar Validator', () => {
  it('rejects non-12-digit inputs', () => {
    expect(validateAadhar('12345').valid).toBe(false);
    expect(validateAadhar('1234567890123').valid).toBe(false);
  });

  it('rejects non-numeric inputs', () => {
    expect(validateAadhar('12345678901a').valid).toBe(false);
  });

  it('rejects numbers starting with 0 or 1', () => {
    expect(validateAadhar('012345678901').valid).toBe(false);
    expect(validateAadhar('123456789012').valid).toBe(false);
  });

  it('handles spaced input', () => {
    const result = validateAadhar('2345 6789 0123');
    expect(result.formatted).toContain(' ');
  });

  it('masks Aadhaar correctly', () => {
    expect(maskAadhar('234567890123')).toBe('XXXX XXXX 0123');
  });

  it('masks spaced Aadhaar', () => {
    expect(maskAadhar('2345 6789 0123')).toBe('XXXX XXXX 0123');
  });
});
