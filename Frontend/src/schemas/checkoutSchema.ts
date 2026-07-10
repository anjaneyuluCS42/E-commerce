import { z } from 'zod';

export const checkoutSchema = z.object({
  fullName: z
    .string()
    .min(2, 'Full name must be at least 2 characters')
    .max(100, 'Full name is too long'),
  email: z
    .string()
    .email('Please enter a valid email address'),
  phone: z
    .string()
    .regex(/^[6-9]\d{9}$/, 'Please enter a valid 10-digit mobile number'),
  address: z
    .string()
    .min(5, 'Address must be at least 5 characters')
    .max(250, 'Address is too long'),
  city: z
    .string()
    .min(2, 'City must be at least 2 characters'),
  state: z
    .string()
    .min(2, 'State must be at least 2 characters'),
  zipCode: z
    .string()
    .regex(/^\d{6}$/, 'Pincode must be exactly 6 digits'),
});

export type CheckoutSchema = z.infer<typeof checkoutSchema>;
