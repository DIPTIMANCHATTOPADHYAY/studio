
import { z } from 'zod';

export const loginSchema = z.object({
  email: z.string().email(),
  password: z.string().min(1),
});

export const signupSchema = z.object({
  name: z.string().min(2),
  email: z.string().email(),
  password: z.string().min(8),
});

export const adminCreateUserSchema = z.object({
  name: z.string().min(2, { message: 'Name is required.'}),
  email: z.string().email(),
  password: z.string().min(8, { message: 'Password must be at least 8 characters.'}),
});

export const adminResetPasswordSchema = z.object({
  userId: z.string(),
  password: z.string().min(8, { message: 'New password must be at least 8 characters.'}),
});

export const userProfileSchema = z.object({
    name: z.string().min(2, { message: 'Name must be at least 2 characters.' }),
    email: z.string().email({ message: 'Please enter a valid email address.' }),
});
