import { z } from 'zod';
import { PASSWORD_MIN_LENGTH, PASSWORD_SPECIAL_CHARS } from '../constants/app';
import { MEMBERSHIP_PLANS } from '../constants/membership';
import { USER_ROLES } from '../constants/roles';

const specialCharPattern = new RegExp(
  `[${PASSWORD_SPECIAL_CHARS.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}]`,
);

export const passwordSchema = z
  .string()
  .min(PASSWORD_MIN_LENGTH, `Password must be at least ${PASSWORD_MIN_LENGTH} characters`)
  .regex(/[A-Z]/, 'Password must include an uppercase letter')
  .regex(/[a-z]/, 'Password must include a lowercase letter')
  .regex(/[0-9]/, 'Password must include a number')
  .regex(specialCharPattern, `Password must include a special character (${PASSWORD_SPECIAL_CHARS})`);

export const emailSchema = z.string().email('Invalid email address');

export const userRoleSchema = z.enum(USER_ROLES);

export const membershipPlanSchema = z.enum(MEMBERSHIP_PLANS);

export const bodyGoalSchema = z.enum(['lose', 'maintain', 'gain']);

export const activityLevelSchema = z.enum([
  'sedentary',
  'light',
  'moderate',
  'active',
  'very_active',
]);

export const dietFoodSchema = z.object({
  name: z.string().optional(),
  calories: z.number().nonnegative().optional(),
  protein: z.number().nonnegative().optional(),
  carbs: z.number().nonnegative().optional(),
  fat: z.number().nonnegative().optional(),
  junk: z.boolean().optional(),
  neutral: z.boolean().optional(),
  mealSlot: z.enum(['morning', 'afternoon', 'evening', 'unspecified']).optional(),
  loggedAt: z.string().optional(),
});

export const attendanceCodeSchema = z
  .string()
  .regex(/^\d{4}$/, 'Attendance code must be exactly 4 digits');

export const gymCodeSchema = z
  .string()
  .trim()
  .transform((v) => v.toUpperCase())
  .refine((v) => /^[A-Z0-9]{3,12}$/.test(v), 'Invalid gym code format');

export const ymdDateSchema = z
  .string()
  .regex(/^\d{4}-\d{2}-\d{2}$/, 'Date must be YYYY-MM-DD');

export const loginSchema = z.object({
  email: emailSchema,
  password: z.string().min(1, 'Password is required'),
});

export type LoginInput = z.infer<typeof loginSchema>;

const nameField = z
  .string()
  .trim()
  .min(1, 'Required')
  .max(80, 'Must be 80 characters or fewer');

export const accountDetailsSchema = z
  .object({
    firstName: nameField,
    lastName: nameField,
    email: emailSchema,
    phone: z
      .string()
      .trim()
      .min(7, 'Enter a valid phone number')
      .max(20, 'Phone number is too long'),
    password: passwordSchema,
    confirmPassword: z.string().min(1, 'Confirm your password'),
  })
  .refine((data) => data.password === data.confirmPassword, {
    message: 'Passwords do not match',
    path: ['confirmPassword'],
  });

export type AccountDetailsInput = z.infer<typeof accountDetailsSchema>;

export const ownerGymDetailsSchema = z.object({
  gymName: z
    .string()
    .trim()
    .min(2, 'Gym name is required')
    .max(120, 'Gym name is too long'),
  location: z
    .string()
    .trim()
    .min(2, 'Location is required')
    .max(200, 'Location is too long'),
  contactEmail: emailSchema,
  gymPhone: z.string().trim().max(20).optional().or(z.literal('')),
  price1Month: z.string().optional(),
  price3Month: z.string().optional(),
  price6Month: z.string().optional(),
  price12Month: z.string().optional(),
});

export type OwnerGymDetailsInput = z.infer<typeof ownerGymDetailsSchema>;

export function parseOptionalPrice(value: string | undefined): number | undefined {
  if (value == null || value.trim() === '') return undefined;
  const n = Number(value);
  if (!Number.isFinite(n) || n < 0) return undefined;
  return n;
}

export const ownerSignupSchema = accountDetailsSchema.and(ownerGymDetailsSchema);

export type OwnerSignupInput = z.infer<typeof ownerSignupSchema>;

export const memberJoinSchema = z.object({
  gymCode: gymCodeSchema,
  message: z.string().trim().max(500, 'Message is too long').optional().or(z.literal('')),
});

export type MemberJoinInput = z.infer<typeof memberJoinSchema>;

export const memberSignupSchema = accountDetailsSchema.and(memberJoinSchema);

export type MemberSignupInput = z.infer<typeof memberSignupSchema>;
