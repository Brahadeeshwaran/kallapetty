import { z } from 'zod';

export const loginSchema = z.object({
  phone: z.string().min(10, 'Mobile number must be at least 10 digits'),
  password: z.string().min(6, 'Password must be at least 6 characters'),
});

export const registerUserSchema = z.object({
  phone: z.string().min(10),
  password: z.string().min(4),
  business_id: z.string().uuid().optional(),
  is_business_owner: z.boolean().optional(),
  full_name: z.string().optional(),
  email: z.string().email().optional().or(z.literal('')),
  shop_roles: z.array(z.object({
    shop_id: z.string().uuid(),
    role_id: z.string().uuid()
  })).optional(),
});

export const updateUserSchema = z.object({
  phone: z.string().min(10).optional(),
  password: z.string().min(4).optional(),
  is_active: z.boolean().optional(),
  full_name: z.string().optional(),
  email: z.string().email().optional().or(z.literal('')),
});
