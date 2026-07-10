import { describe, it, expect } from 'vitest';
import { checkoutSchema } from '../../schemas/checkoutSchema.ts';

const valid = {
  fullName: 'Jane Doe',
  email: 'jane@example.com',
  phone: '9876543210',
  address: '123 Main Street, Apartment 4B',
  city: 'Mumbai',
  state: 'Maharashtra',
  zipCode: '400001',
};

describe('checkoutSchema', () => {
  it('validates a correct payload', () => {
    const result = checkoutSchema.safeParse(valid);
    expect(result.success).toBe(true);
  });

  it('rejects empty fullName', () => {
    const result = checkoutSchema.safeParse({ ...valid, fullName: '' });
    expect(result.success).toBe(false);
  });

  it('rejects fullName that is too short', () => {
    const result = checkoutSchema.safeParse({ ...valid, fullName: 'J' });
    expect(result.success).toBe(false);
  });

  it('rejects invalid email', () => {
    const result = checkoutSchema.safeParse({ ...valid, email: 'not-an-email' });
    expect(result.success).toBe(false);
  });

  it('rejects empty email', () => {
    const result = checkoutSchema.safeParse({ ...valid, email: '' });
    expect(result.success).toBe(false);
  });

  it('rejects phone number that is not 10 digits', () => {
    const result = checkoutSchema.safeParse({ ...valid, phone: '12345' });
    expect(result.success).toBe(false);
  });

  it('rejects phone number starting with invalid digit', () => {
    const result = checkoutSchema.safeParse({ ...valid, phone: '1234567890' });
    expect(result.success).toBe(false);
  });

  it('rejects address shorter than 5 chars', () => {
    const result = checkoutSchema.safeParse({ ...valid, address: 'Hi' });
    expect(result.success).toBe(false);
  });

  it('rejects zip code that is not 6 digits', () => {
    const result = checkoutSchema.safeParse({ ...valid, zipCode: '123' });
    expect(result.success).toBe(false);
  });

  it('rejects zip code with letters', () => {
    const result = checkoutSchema.safeParse({ ...valid, zipCode: '4000AB' });
    expect(result.success).toBe(false);
  });

  it('rejects empty city', () => {
    const result = checkoutSchema.safeParse({ ...valid, city: '' });
    expect(result.success).toBe(false);
  });

  it('accepts a valid 6-digit zip code', () => {
    const result = checkoutSchema.safeParse({ ...valid, zipCode: '560001' });
    expect(result.success).toBe(true);
  });
});
