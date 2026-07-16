'use client';

import { useEffect, useMemo, useState, type ReactNode } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { AnimatePresence, motion } from 'framer-motion';
import {
  Activity,
  Camera,
  CheckCircle2,
  MapPin,
  Save,
  UserRound,
  X,
} from 'lucide-react';
import { useUpdateProfile, type Json, type Tables } from '@smart-gym/supabase';
import { useMemberContext } from '@/features/member/components/member-provider';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Field, FieldDescription, FieldError, FieldLabel } from '@/components/ui/field';
import { SignOutButton } from '@/features/auth/components/sign-out-button';
import { cn } from '@/lib/utils';

const profileSchema = z.object({
  firstName: z.string().trim().min(1, 'First name is required').max(80),
  lastName: z.string().trim().min(1, 'Last name is required').max(80),
  phone: z.string().trim().max(20),
  dateOfBirth: z.string().optional(),
  gender: z.enum(['', 'Male', 'Female', 'Other']),
  bodyGoal: z.enum(['lose', 'maintain', 'gain']),
  addressLine1: z.string().trim().max(120),
  addressLine2: z.string().trim().max(120),
  city: z.string().trim().max(80),
  state: z.string().trim().max(80),
  postalCode: z.string().trim().max(20),
  weightKg: z.string().optional(),
  heightCm: z.string().optional(),
  activityLevel: z.enum(['', 'sedentary', 'light', 'moderate', 'active', 'very_active']),
  waterGoalL: z.string().optional(),
  proteinGoalG: z.string().optional(),
});

type ProfileFormInput = z.infer<typeof profileSchema>;

function GlassCard({
  children,
  className,
}: {
  children: ReactNode;
  className?: string;
}) {
  return (
    <div
      className={cn(
        'rounded-[20px] border border-border/60 bg-card/80 shadow-[0_8px_28px_rgba(15,23,42,0.06)] backdrop-blur-md',
        'dark:border-white/10 dark:bg-white/[0.05] dark:shadow-[0_8px_32px_rgba(0,0,0,0.25)]',
        className,
      )}
    >
      {children}
    </div>
  );
}

const selectClass =
  'min-h-11 w-full rounded-2xl border border-input bg-background px-3 text-sm outline-none focus-visible:ring-2 focus-visible:ring-emerald-600/30';

function initials(profile: Tables<'profiles'> | null | undefined) {
  const a = profile?.first_name?.[0] ?? '';
  const b = profile?.last_name?.[0] ?? '';
  const pair = `${a}${b}`.toUpperCase();
  if (pair.trim()) return pair;
  return (profile?.email?.[0] ?? '?').toUpperCase();
}

function parsePrefs(raw: unknown): Record<string, unknown> {
  if (!raw || typeof raw !== 'object' || Array.isArray(raw)) return {};
  return { ...(raw as Record<string, unknown>) };
}

function numOrEmpty(value: unknown) {
  const n = Number(value);
  return Number.isFinite(n) && n > 0 ? String(n) : '';
}

export function MemberSettingsPanel() {
  const { client, userId, profile, gym, membership } = useMemberContext();
  const updateProfile = useUpdateProfile(client);

  const [avatarPreview, setAvatarPreview] = useState<string | null>(null);
  const [avatarFile, setAvatarFile] = useState<File | null>(null);
  const [uploadingAvatar, setUploadingAvatar] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const prefs = useMemo(() => parsePrefs(profile?.diet_preferences), [profile?.diet_preferences]);

  const form = useForm<ProfileFormInput>({
    resolver: zodResolver(profileSchema),
    defaultValues: {
      firstName: '',
      lastName: '',
      phone: '',
      dateOfBirth: '',
      gender: '',
      bodyGoal: 'maintain',
      addressLine1: '',
      addressLine2: '',
      city: '',
      state: '',
      postalCode: '',
      weightKg: '',
      heightCm: '',
      activityLevel: '',
      waterGoalL: '',
      proteinGoalG: '',
    },
  });

  useEffect(() => {
    if (!profile) return;
    form.reset({
      firstName: profile.first_name ?? '',
      lastName: profile.last_name ?? '',
      phone: profile.phone ?? '',
      dateOfBirth: profile.date_of_birth?.slice(0, 10) ?? '',
      gender:
        profile.gender === 'Male' || profile.gender === 'Female' || profile.gender === 'Other'
          ? profile.gender
          : '',
      bodyGoal:
        profile.body_goal === 'lose' || profile.body_goal === 'gain' || profile.body_goal === 'maintain'
          ? profile.body_goal
          : 'maintain',
      addressLine1: profile.address_line1 ?? '',
      addressLine2: profile.address_line2 ?? '',
      city: profile.city ?? '',
      state: profile.state ?? '',
      postalCode: profile.postal_code ?? '',
      weightKg: numOrEmpty(prefs.weightKg),
      heightCm: numOrEmpty(prefs.heightCm),
      activityLevel:
        prefs.activityLevel === 'sedentary' ||
        prefs.activityLevel === 'light' ||
        prefs.activityLevel === 'moderate' ||
        prefs.activityLevel === 'active' ||
        prefs.activityLevel === 'very_active'
          ? prefs.activityLevel
          : '',
      waterGoalL: numOrEmpty(prefs.manualWaterGoalL),
      proteinGoalG: numOrEmpty(prefs.manualProteinGoalG),
    });
    setAvatarPreview(profile.avatar_url);
  }, [profile, prefs, form]);

  async function uploadAvatar(file: File): Promise<string> {
    if (!userId) throw new Error('Not signed in');
    const ext = file.name.split('.').pop()?.toLowerCase() || 'jpg';
    const path = `${userId}/avatar-${Date.now()}.${ext}`;
    const { error: uploadError } = await client.storage.from('avatars').upload(path, file, {
      upsert: true,
      contentType: file.type || 'image/jpeg',
    });
    if (uploadError) throw new Error(uploadError.message);
    const { data } = client.storage.from('avatars').getPublicUrl(path);
    return data.publicUrl;
  }

  const onSubmit = form.handleSubmit(async (values) => {
    if (!userId) return;
    setMessage(null);
    setError(null);

    try {
      let avatarUrl = profile?.avatar_url ?? null;
      if (avatarFile) {
        setUploadingAvatar(true);
        avatarUrl = await uploadAvatar(avatarFile);
      }

      const nextPrefs: Record<string, unknown> = {
        ...prefs,
      };

      const weight = Number(values.weightKg);
      const height = Number(values.heightCm);
      const water = Number(values.waterGoalL);
      const protein = Number(values.proteinGoalG);

      if (Number.isFinite(weight) && weight > 0) nextPrefs.weightKg = weight;
      else delete nextPrefs.weightKg;

      if (Number.isFinite(height) && height > 0) nextPrefs.heightCm = height;
      else delete nextPrefs.heightCm;

      if (values.activityLevel) nextPrefs.activityLevel = values.activityLevel;
      else delete nextPrefs.activityLevel;

      if (Number.isFinite(water) && water > 0) {
        nextPrefs.manualWaterGoalL = water;
        nextPrefs.manualDietGoalsEnabled = true;
      } else {
        delete nextPrefs.manualWaterGoalL;
      }

      if (Number.isFinite(protein) && protein > 0) {
        nextPrefs.manualProteinGoalG = protein;
        nextPrefs.manualDietGoalsEnabled = true;
      } else {
        delete nextPrefs.manualProteinGoalG;
      }

      const fullName = `${values.firstName} ${values.lastName}`.trim();

      await updateProfile.mutateAsync({
        userId,
        patch: {
          first_name: values.firstName,
          last_name: values.lastName,
          full_name: fullName,
          phone: values.phone,
          date_of_birth: values.dateOfBirth || null,
          gender: values.gender || '',
          body_goal: values.bodyGoal,
          address_line1: values.addressLine1,
          address_line2: values.addressLine2,
          city: values.city,
          state: values.state,
          postal_code: values.postalCode,
          avatar_url: avatarUrl,
          diet_preferences: nextPrefs as Json,
        },
      });

      setAvatarFile(null);
      setAvatarPreview(avatarUrl);
      setMessage('Profile saved successfully.');
      window.setTimeout(() => setMessage(null), 3500);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to save profile.');
    } finally {
      setUploadingAvatar(false);
    }
  });

  const saving = form.formState.isSubmitting || updateProfile.isPending || uploadingAvatar;
  const displayName =
    profile?.full_name?.trim() ||
    `${profile?.first_name ?? ''} ${profile?.last_name ?? ''}`.trim() ||
    'Member';

  return (
    <motion.div
      className="mx-auto w-full max-w-3xl space-y-6 pb-10 sm:space-y-8"
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.35 }}
    >
      <header className="space-y-1">
        <h1 className="text-2xl font-semibold tracking-tight sm:text-3xl">Profile Settings</h1>
        <p className="text-sm text-muted-foreground">
          Manage your personal details, fitness profile, and avatar
          {gym?.name ? ` · ${gym.name}` : ''}.
        </p>
      </header>

      <AnimatePresence>
        {message ? (
          <motion.div
            initial={{ opacity: 0, y: -4 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0 }}
            className="flex items-start gap-3 rounded-[20px] border border-emerald-500/30 bg-emerald-500/10 px-4 py-3"
            role="status"
          >
            <CheckCircle2 className="mt-0.5 size-5 text-emerald-600 dark:text-emerald-400" />
            <p className="flex-1 text-sm font-medium text-emerald-800 dark:text-emerald-200">
              {message}
            </p>
            <button type="button" aria-label="Dismiss" onClick={() => setMessage(null)}>
              <X className="size-4" />
            </button>
          </motion.div>
        ) : null}
      </AnimatePresence>
      {error ? (
        <p
          className="rounded-[20px] border border-destructive/30 bg-destructive/10 px-4 py-3 text-sm text-destructive"
          role="alert"
        >
          {error}
        </p>
      ) : null}

      {/* Hero identity card */}
      <GlassCard className="overflow-hidden p-0">
        <div className="bg-gradient-to-br from-emerald-600 via-teal-700 to-slate-900 px-6 py-8 text-white sm:px-8">
          <div className="flex flex-col items-start gap-5 sm:flex-row sm:items-center">
            <div className="relative">
              <div className="size-24 overflow-hidden rounded-full bg-white/15 ring-4 ring-white/20">
                {avatarPreview ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={avatarPreview} alt="" className="size-full object-cover" />
                ) : (
                  <span className="flex size-full items-center justify-center text-2xl font-semibold">
                    {initials(profile)}
                  </span>
                )}
              </div>
              <label className="absolute right-0 bottom-0 inline-flex size-10 cursor-pointer items-center justify-center rounded-full bg-white text-emerald-700 shadow-lg hover:bg-emerald-50">
                <Camera className="size-4" aria-hidden />
                <span className="sr-only">Upload avatar</span>
                <input
                  type="file"
                  accept="image/*"
                  className="hidden"
                  onChange={(e) => {
                    const file = e.target.files?.[0];
                    if (!file) return;
                    setAvatarFile(file);
                    setAvatarPreview(URL.createObjectURL(file));
                  }}
                />
              </label>
            </div>
            <div>
              <p className="text-sm text-emerald-100/90">Member profile</p>
              <p className="mt-1 text-2xl font-semibold tracking-tight">{displayName}</p>
              <p className="mt-1 text-sm text-emerald-100/80">{profile?.email}</p>
              <p className="mt-2 text-xs text-emerald-100/70">
                {membership?.status === 'active' ? 'Active membership' : membership?.status ?? 'Member'}
                {gym?.name ? ` · ${gym.name}` : ''}
              </p>
            </div>
          </div>
        </div>
      </GlassCard>

      <form onSubmit={(e) => void onSubmit(e)} className="space-y-5">
        <GlassCard className="p-5 sm:p-6">
          <h2 className="flex items-center gap-2 text-base font-semibold tracking-tight">
            <UserRound className="size-4 text-emerald-600 dark:text-emerald-400" />
            Personal details
          </h2>
          <p className="mt-0.5 text-sm text-muted-foreground">How you appear across the app</p>

          <div className="mt-5 grid gap-4 sm:grid-cols-2">
            <Field>
              <FieldLabel htmlFor="firstName">First name</FieldLabel>
              <Input
                id="firstName"
                className="min-h-11 rounded-2xl"
                {...form.register('firstName')}
              />
              <FieldError>{form.formState.errors.firstName?.message}</FieldError>
            </Field>
            <Field>
              <FieldLabel htmlFor="lastName">Last name</FieldLabel>
              <Input
                id="lastName"
                className="min-h-11 rounded-2xl"
                {...form.register('lastName')}
              />
              <FieldError>{form.formState.errors.lastName?.message}</FieldError>
            </Field>
            <Field>
              <FieldLabel htmlFor="email">Email</FieldLabel>
              <Input
                id="email"
                className="min-h-11 rounded-2xl"
                value={profile?.email ?? ''}
                disabled
                readOnly
              />
              <FieldDescription>Managed by your account login</FieldDescription>
            </Field>
            <Field>
              <FieldLabel htmlFor="phone">Phone</FieldLabel>
              <Input id="phone" className="min-h-11 rounded-2xl" {...form.register('phone')} />
              <FieldError>{form.formState.errors.phone?.message}</FieldError>
            </Field>
            <Field>
              <FieldLabel htmlFor="dateOfBirth">Date of birth</FieldLabel>
              <Input
                id="dateOfBirth"
                type="date"
                className="min-h-11 rounded-2xl"
                {...form.register('dateOfBirth')}
              />
            </Field>
            <Field>
              <FieldLabel htmlFor="gender">Gender</FieldLabel>
              <select id="gender" className={selectClass} {...form.register('gender')}>
                <option value="">Prefer not to say</option>
                <option value="Male">Male</option>
                <option value="Female">Female</option>
                <option value="Other">Other</option>
              </select>
            </Field>
          </div>
        </GlassCard>

        <GlassCard className="p-5 sm:p-6">
          <h2 className="flex items-center gap-2 text-base font-semibold tracking-tight">
            <Activity className="size-4 text-emerald-600 dark:text-emerald-400" />
            Fitness profile
          </h2>
          <p className="mt-0.5 text-sm text-muted-foreground">
            Used for diet targets and training recommendations
          </p>

          <div className="mt-5 grid gap-4 sm:grid-cols-2">
            <Field>
              <FieldLabel htmlFor="bodyGoal">Body goal</FieldLabel>
              <select id="bodyGoal" className={selectClass} {...form.register('bodyGoal')}>
                <option value="lose">Lose weight</option>
                <option value="maintain">Maintain</option>
                <option value="gain">Gain muscle</option>
              </select>
            </Field>
            <Field>
              <FieldLabel htmlFor="activityLevel">Activity level</FieldLabel>
              <select
                id="activityLevel"
                className={selectClass}
                {...form.register('activityLevel')}
              >
                <option value="">Not set</option>
                <option value="sedentary">Sedentary</option>
                <option value="light">Light</option>
                <option value="moderate">Moderate</option>
                <option value="active">Active</option>
                <option value="very_active">Very active</option>
              </select>
            </Field>
            <Field>
              <FieldLabel htmlFor="weightKg">Weight (kg)</FieldLabel>
              <Input
                id="weightKg"
                type="number"
                min={0}
                step="0.1"
                className="min-h-11 rounded-2xl"
                {...form.register('weightKg')}
              />
            </Field>
            <Field>
              <FieldLabel htmlFor="heightCm">Height (cm)</FieldLabel>
              <Input
                id="heightCm"
                type="number"
                min={0}
                step="1"
                className="min-h-11 rounded-2xl"
                {...form.register('heightCm')}
              />
            </Field>
            <Field>
              <FieldLabel htmlFor="proteinGoalG">Protein goal (g)</FieldLabel>
              <Input
                id="proteinGoalG"
                type="number"
                min={0}
                className="min-h-11 rounded-2xl"
                {...form.register('proteinGoalG')}
              />
              <FieldDescription>Optional manual override for diet</FieldDescription>
            </Field>
            <Field>
              <FieldLabel htmlFor="waterGoalL">Water goal (L)</FieldLabel>
              <Input
                id="waterGoalL"
                type="number"
                min={0}
                step="0.1"
                className="min-h-11 rounded-2xl"
                {...form.register('waterGoalL')}
              />
            </Field>
          </div>
        </GlassCard>

        <GlassCard className="p-5 sm:p-6">
          <h2 className="flex items-center gap-2 text-base font-semibold tracking-tight">
            <MapPin className="size-4 text-emerald-600 dark:text-emerald-400" />
            Address
          </h2>
          <div className="mt-5 grid gap-4 sm:grid-cols-2">
            <Field className="sm:col-span-2">
              <FieldLabel htmlFor="addressLine1">Address line 1</FieldLabel>
              <Input
                id="addressLine1"
                className="min-h-11 rounded-2xl"
                {...form.register('addressLine1')}
              />
            </Field>
            <Field className="sm:col-span-2">
              <FieldLabel htmlFor="addressLine2">Address line 2</FieldLabel>
              <Input
                id="addressLine2"
                className="min-h-11 rounded-2xl"
                {...form.register('addressLine2')}
              />
            </Field>
            <Field>
              <FieldLabel htmlFor="city">City</FieldLabel>
              <Input id="city" className="min-h-11 rounded-2xl" {...form.register('city')} />
            </Field>
            <Field>
              <FieldLabel htmlFor="state">State</FieldLabel>
              <Input id="state" className="min-h-11 rounded-2xl" {...form.register('state')} />
            </Field>
            <Field>
              <FieldLabel htmlFor="postalCode">Postal code</FieldLabel>
              <Input
                id="postalCode"
                className="min-h-11 rounded-2xl"
                {...form.register('postalCode')}
              />
            </Field>
          </div>
        </GlassCard>

        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <Button
            type="submit"
            className="min-h-12 rounded-2xl bg-emerald-600 hover:bg-emerald-700"
            disabled={saving || !userId}
          >
            <Save className="size-4" />
            {saving ? 'Saving…' : 'Save profile'}
          </Button>
          <div className="flex items-center gap-2">
            <SignOutButton />
          </div>
        </div>
      </form>
    </motion.div>
  );
}
