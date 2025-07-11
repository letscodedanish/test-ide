import { z } from 'zod';

export const createPlaygroundSchema = z.object({
  name: z.string().min(1, 'Name is required').max(100, 'Name too long'),
  description: z.string().max(500, 'Description too long').optional(),
  language: z.string().min(1, 'Language is required'),
  template: z.string().optional(),
  files: z.array(z.object({
    name: z.string().min(1, 'File name is required'),
    content: z.string().optional(),
  })).optional(),
});

export const updatePlaygroundSchema = z.object({
  name: z.string().min(1, 'Name is required').max(100, 'Name too long').optional(),
  description: z.string().max(500, 'Description too long').optional(),
});

export const loginSchema = z.object({
  email: z.string().email('Invalid email format'),
  password: z.string().min(6, 'Password must be at least 6 characters'),
});

export const registerSchema = z.object({
  name: z.string().min(1, 'Name is required').max(50, 'Name too long'),
  email: z.string().email('Invalid email format'),
  password: z.string().min(6, 'Password must be at least 6 characters'),
});

export const saveFileSchema = z.object({
  content: z.string(),
});

export type CreatePlaygroundInput = z.infer<typeof createPlaygroundSchema>;
export type UpdatePlaygroundInput = z.infer<typeof updatePlaygroundSchema>;
export type LoginInput = z.infer<typeof loginSchema>;
export type RegisterInput = z.infer<typeof registerSchema>;
export type SaveFileInput = z.infer<typeof saveFileSchema>;