'use client';

import { useEffect, useRef, useState, type ReactNode } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { QRCodeSVG } from 'qrcode.react';
import {
  Building2,
  CheckCircle2,
  Clock,
  Copy,
  Globe,
  ImagePlus,
  MapPin,
  QrCode,
  Save,
  X,
} from 'lucide-react';
import {
  MEMBERSHIP_PLAN_LABELS,
  emailSchema,
  type MembershipPlan,
} from '@smart-gym/shared';
import { useUpdateGym } from '@smart-gym/supabase';
import { createAdditionalGym } from '@smart-gym/supabase';
import { useOwnerContext } from '@/features/owner/components/owner-provider';
import { useQueryClient } from '@tanstack/react-query';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Field, FieldDescription, FieldError, FieldLabel } from '@/components/ui/field';
import { cn } from '@/lib/utils';

const gymSettingsSchema = z.object({
  name: z.string().trim().min(2, 'Gym name is required').max(120),
  location: z.string().trim().min(2, 'Location is required').max(200),
  contactEmail: emailSchema,
  phone: z.string().trim().max(20),
  openingTime: z.string().optional(),
  closingTime: z.string().optional(),
  price1Month: z.string().optional(),
  price3Month: z.string().optional(),
  price6Month: z.string().optional(),
  price12Month: z.string().optional(),
});

type GymSettingsInput = z.infer<typeof gymSettingsSchema>;

const DAYS = [
  { key: 'mon', label: 'Monday' },
  { key: 'tue', label: 'Tuesday' },
  { key: 'wed', label: 'Wednesday' },
  { key: 'thu', label: 'Thursday' },
  { key: 'fri', label: 'Friday' },
  { key: 'sat', label: 'Saturday' },
  { key: 'sun', label: 'Sunday' },
] as const;

type DayKey = (typeof DAYS)[number]['key'];

type DayHours = {
  closed: boolean;
  open: string;
  close: string;
};

type WeeklyHours = Record<DayKey, DayHours>;

type BrandingLinks = {
  website: string;
  instagram: string;
  facebook: string;
  twitter: string;
};

const PRICE_CARDS: {
  plan: MembershipPlan;
  field: keyof Pick<
    GymSettingsInput,
    'price1Month' | 'price3Month' | 'price6Month' | 'price12Month'
  >;
  hint: string;
}[] = [
  { plan: '1_month', field: 'price1Month', hint: 'Monthly access' },
  { plan: '3_month', field: 'price3Month', hint: 'Quarterly plan' },
  { plan: '6_month', field: 'price6Month', hint: 'Half-year plan' },
  { plan: '12_month', field: 'price12Month', hint: 'Annual plan' },
];

function parsePrice(value: string | undefined): number {
  if (value == null || value.trim() === '') return 0;
  const n = Number(value);
  return Number.isFinite(n) && n >= 0 ? n : 0;
}

function defaultDay(open = '06:00', close = '22:00'): DayHours {
  return { closed: false, open, close };
}

function buildWeeklyFromSingle(open?: string | null, close?: string | null): WeeklyHours {
  const o = open || '06:00';
  const c = close || '22:00';
  return {
    mon: defaultDay(o, c),
    tue: defaultDay(o, c),
    wed: defaultDay(o, c),
    thu: defaultDay(o, c),
    fri: defaultDay(o, c),
    sat: defaultDay(o, c),
    sun: { closed: true, open: o, close: c },
  };
}

function hoursKey(gymId: string) {
  return `smart-gym:weekly-hours:${gymId}`;
}

function brandingKey(gymId: string) {
  return `smart-gym:branding-links:${gymId}`;
}

function loadWeekly(gymId: string): WeeklyHours | null {
  try {
    const raw = localStorage.getItem(hoursKey(gymId));
    if (!raw) return null;
    return JSON.parse(raw) as WeeklyHours;
  } catch {
    return null;
  }
}

function saveWeekly(gymId: string, hours: WeeklyHours) {
  localStorage.setItem(hoursKey(gymId), JSON.stringify(hours));
}

function loadBranding(gymId: string): BrandingLinks {
  try {
    const raw = localStorage.getItem(brandingKey(gymId));
    if (!raw) return { website: '', instagram: '', facebook: '', twitter: '' };
    return { website: '', instagram: '', facebook: '', twitter: '', ...JSON.parse(raw) };
  } catch {
    return { website: '', instagram: '', facebook: '', twitter: '' };
  }
}

function saveBranding(gymId: string, links: BrandingLinks) {
  localStorage.setItem(brandingKey(gymId), JSON.stringify(links));
}

/** Prefer Monday open hours for legacy opening_time / closing_time columns. */
function primaryHours(weekly: WeeklyHours): { open: string | null; close: string | null } {
  for (const day of DAYS) {
    const entry = weekly[day.key];
    if (!entry.closed && entry.open && entry.close) {
      return { open: entry.open, close: entry.close };
    }
  }
  return { open: null, close: null };
}

function CardShell({
  children,
  className,
  id,
}: {
  children: ReactNode;
  className?: string;
  id?: string;
}) {
  return (
    <div
      id={id}
      className={cn(
        'rounded-[20px] border border-slate-200/80 bg-white shadow-[0_1px_2px_rgba(15,23,42,0.04),0_8px_24px_rgba(15,23,42,0.04)] dark:border-border dark:bg-card dark:shadow-none',
        className,
      )}
    >
      {children}
    </div>
  );
}

function SectionTitle({
  title,
  description,
  icon: Icon,
}: {
  title: string;
  description: string;
  icon: typeof Building2;
}) {
  return (
    <div className="mb-5 flex items-start gap-3">
      <span className="inline-flex size-10 shrink-0 items-center justify-center rounded-2xl bg-emerald-50 text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-300">
        <Icon className="size-5" aria-hidden />
      </span>
      <div>
        <h2 className="text-base font-semibold tracking-tight text-slate-900 dark:text-foreground">
          {title}
        </h2>
        <p className="mt-0.5 text-sm text-slate-500 dark:text-muted-foreground">{description}</p>
      </div>
    </div>
  );
}

const inputClass = 'min-h-12 rounded-2xl';

export function OwnerSettingsForm() {
  const { client, gym, userId, switchGym } = useOwnerContext();
  const queryClient = useQueryClient();
  const updateGym = useUpdateGym(client);
  const [createName, setCreateName] = useState('');
  const [createLocation, setCreateLocation] = useState('');
  const [createBusy, setCreateBusy] = useState(false);
  const [createMessage, setCreateMessage] = useState<string | null>(null);
  const [createError, setCreateError] = useState<string | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);

  const [savedMessage, setSavedMessage] = useState<string | null>(null);
  const [formError, setFormError] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);
  const [qrOpen, setQrOpen] = useState(false);
  const [weekly, setWeekly] = useState<WeeklyHours>(() => buildWeeklyFromSingle('06:00', '22:00'));
  const [branding, setBranding] = useState<BrandingLinks>({
    website: '',
    instagram: '',
    facebook: '',
    twitter: '',
  });
  const [logoPreview, setLogoPreview] = useState<string | null>(null);
  const [logoFile, setLogoFile] = useState<File | null>(null);
  const [uploadingLogo, setUploadingLogo] = useState(false);

  const form = useForm<GymSettingsInput>({
    resolver: zodResolver(gymSettingsSchema),
    defaultValues: {
      name: '',
      location: '',
      contactEmail: '',
      phone: '',
      openingTime: '',
      closingTime: '',
      price1Month: '',
      price3Month: '',
      price6Month: '',
      price12Month: '',
    },
  });

  useEffect(() => {
    if (!gym) return;
    form.reset({
      name: gym.name,
      location: gym.location,
      contactEmail: gym.contact_email,
      phone: gym.phone,
      openingTime: gym.opening_time ?? '',
      closingTime: gym.closing_time ?? '',
      price1Month: String(gym.price_1_month ?? ''),
      price3Month: String(gym.price_3_month ?? ''),
      price6Month: String(gym.price_6_month ?? ''),
      price12Month: String(gym.price_12_month ?? ''),
    });
    setLogoPreview(gym.logo_url);
    setLogoFile(null);

    const stored = typeof window !== 'undefined' ? loadWeekly(gym.id) : null;
    setWeekly(stored ?? buildWeeklyFromSingle(gym.opening_time, gym.closing_time));
    setBranding(typeof window !== 'undefined' ? loadBranding(gym.id) : branding);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [gym, form]);

  function updateDay(key: DayKey, patch: Partial<DayHours>) {
    setWeekly((prev) => ({ ...prev, [key]: { ...prev[key], ...patch } }));
  }

  function applyAllOpenDays(from: DayKey) {
    const source = weekly[from];
    setWeekly((prev) => {
      const next = { ...prev };
      for (const day of DAYS) {
        if (!next[day.key].closed) {
          next[day.key] = {
            ...next[day.key],
            open: source.open,
            close: source.close,
          };
        }
      }
      return next;
    });
  }

  async function copyCode() {
    if (!gym?.code) return;
    try {
      await navigator.clipboard.writeText(gym.code);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      setFormError('Could not copy gym code.');
    }
  }

  async function uploadLogo(file: File): Promise<string> {
    if (!gym) throw new Error('No gym');
    const ext = file.name.split('.').pop()?.toLowerCase() || 'png';
    const path = `${gym.id}/logo-${Date.now()}.${ext}`;
    const { error } = await client.storage.from('gym-logos').upload(path, file, {
      upsert: true,
      contentType: file.type || 'image/png',
    });
    if (error) throw new Error(error.message);
    const { data } = client.storage.from('gym-logos').getPublicUrl(path);
    return data.publicUrl;
  }

  const onSubmit = form.handleSubmit(async (values) => {
    if (!gym) return;
    setFormError(null);
    setSavedMessage(null);

    const primary = primaryHours(weekly);

    try {
      let logoUrl = gym.logo_url;
      if (logoFile) {
        setUploadingLogo(true);
        logoUrl = await uploadLogo(logoFile);
      }

      await updateGym.mutateAsync({
        gymId: gym.id,
        patch: {
          name: values.name,
          location: values.location,
          contact_email: values.contactEmail,
          phone: values.phone,
          opening_time: primary.open,
          closing_time: primary.close,
          price_1_month: parsePrice(values.price1Month),
          price_3_month: parsePrice(values.price3Month),
          price_6_month: parsePrice(values.price6Month),
          price_12_month: parsePrice(values.price12Month),
          logo_url: logoUrl,
        },
      });

      saveWeekly(gym.id, weekly);
      saveBranding(gym.id, branding);
      setLogoFile(null);
      if (logoUrl) setLogoPreview(logoUrl);

      // Keep hidden form times in sync for validation consistency
      form.setValue('openingTime', primary.open ?? '');
      form.setValue('closingTime', primary.close ?? '');

      setSavedMessage('Gym settings saved successfully.');
    } catch (error) {
      setFormError(error instanceof Error ? error.message : 'Failed to save settings.');
    } finally {
      setUploadingLogo(false);
    }
  });

  if (!gym) {
    return (
      <p className="text-sm text-muted-foreground">Create a gym before editing settings.</p>
    );
  }

  const saving = form.formState.isSubmitting || updateGym.isPending || uploadingLogo;

  return (
    <div className="mx-auto w-full max-w-6xl space-y-6 sm:space-y-8">
      <header className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div className="space-y-1">
          <h1 className="text-2xl font-semibold tracking-tight text-slate-900 sm:text-3xl dark:text-foreground">
            Gym settings
          </h1>
          <p className="text-sm text-slate-500 dark:text-muted-foreground">
            Manage profile, hours, pricing, and branding for {gym.name}.
          </p>
        </div>
        <Button
          type="submit"
          form="gym-settings-form"
          disabled={saving}
          className="min-h-11 rounded-2xl bg-emerald-600 px-5 hover:bg-emerald-700"
        >
          <Save className="size-4" aria-hidden />
          {saving ? 'Saving…' : 'Save Changes'}
        </Button>
      </header>

      {savedMessage ? (
        <div
          className="flex items-start gap-3 rounded-[20px] border border-emerald-200 bg-emerald-50 px-4 py-3 dark:border-emerald-900 dark:bg-emerald-950/40"
          role="status"
        >
          <CheckCircle2 className="mt-0.5 size-5 shrink-0 text-emerald-700 dark:text-emerald-300" />
          <div className="min-w-0 flex-1">
            <p className="font-semibold text-emerald-900 dark:text-emerald-100">{savedMessage}</p>
            <p className="text-sm text-emerald-800 dark:text-emerald-200">
              Members will see updated name, pricing, and contact details.
            </p>
          </div>
          <button
            type="button"
            className="rounded-lg p-1 text-emerald-700 hover:bg-emerald-100"
            aria-label="Dismiss"
            onClick={() => setSavedMessage(null)}
          >
            <X className="size-4" />
          </button>
        </div>
      ) : null}

      {formError ? (
        <p className="text-sm text-destructive" role="alert">
          {formError}
        </p>
      ) : null}

      <form id="gym-settings-form" onSubmit={onSubmit} className="space-y-5" noValidate>
        {/* Gym Profile */}
        <CardShell className="p-5 sm:p-6">
          <SectionTitle
            icon={Building2}
            title="Gym Profile"
            description="Logo, name, and join code for members"
          />

          <div className="grid gap-6 lg:grid-cols-[auto_1fr]">
            <div className="flex flex-col items-center gap-3">
              <button
                type="button"
                onClick={() => fileRef.current?.click()}
                className="group relative flex size-28 items-center justify-center overflow-hidden rounded-[20px] border-2 border-dashed border-slate-200 bg-slate-50 transition-colors hover:border-emerald-400 hover:bg-emerald-50/40 dark:border-border dark:bg-muted"
                aria-label="Upload gym logo"
              >
                {logoPreview ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={logoPreview} alt="" className="size-full object-cover" />
                ) : (
                  <span className="flex flex-col items-center gap-1 text-slate-400">
                    <ImagePlus className="size-7" />
                    <span className="text-xs font-medium">Logo</span>
                  </span>
                )}
                <span className="absolute inset-x-0 bottom-0 bg-slate-900/60 py-1 text-center text-[10px] font-semibold text-white opacity-0 transition-opacity group-hover:opacity-100">
                  Change
                </span>
              </button>
              <input
                ref={fileRef}
                type="file"
                accept="image/png,image/jpeg,image/webp"
                className="hidden"
                onChange={(e) => {
                  const file = e.target.files?.[0];
                  if (!file) return;
                  setLogoFile(file);
                  setLogoPreview(URL.createObjectURL(file));
                }}
              />
              <p className="max-w-[10rem] text-center text-[11px] text-slate-400">
                PNG or JPG · saved on Save Changes
              </p>
            </div>

            <div className="grid gap-4 sm:grid-cols-2">
              <Field
                className="sm:col-span-2"
                data-invalid={Boolean(form.formState.errors.name)}
              >
                <FieldLabel htmlFor="name">Gym name</FieldLabel>
                <Input id="name" className={inputClass} {...form.register('name')} />
                <FieldError errors={[form.formState.errors.name]} />
              </Field>

              <div className="sm:col-span-2 rounded-2xl border border-slate-200 bg-slate-50 p-4 dark:border-border dark:bg-muted">
                <p className="text-xs font-medium tracking-wide text-slate-500 uppercase">
                  Gym code
                </p>
                <div className="mt-2 flex flex-wrap items-center gap-2">
                  <p className="font-mono text-2xl font-semibold tracking-widest text-slate-900 dark:text-foreground">
                    {gym.code}
                  </p>
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    className="min-h-10 rounded-xl"
                    onClick={() => void copyCode()}
                  >
                    <Copy className="size-3.5" />
                    {copied ? 'Copied' : 'Copy'}
                  </Button>
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    className="min-h-10 rounded-xl"
                    onClick={() => setQrOpen((v) => !v)}
                  >
                    <QrCode className="size-3.5" />
                    QR Code
                  </Button>
                </div>
                <FieldDescription className="mt-2">
                  Members use this code during signup. It cannot be changed here.
                </FieldDescription>
                {qrOpen ? (
                  <div className="mt-4 flex flex-col items-center gap-3 rounded-2xl bg-white p-4 dark:bg-card sm:flex-row sm:items-start">
                    <div className="rounded-2xl border border-slate-100 p-3 dark:border-border">
                      <QRCodeSVG value={gym.code} size={140} level="M" includeMargin={false} />
                    </div>
                    <div className="min-w-0 flex-1 space-y-2 text-sm">
                      <p className="font-medium text-slate-800 dark:text-foreground">
                        Join code QR
                      </p>
                      <p className="font-mono text-lg font-semibold tracking-widest">{gym.code}</p>
                      <p className="text-xs text-slate-500">
                        Members enter this code during signup.
                      </p>
                    </div>
                  </div>
                ) : null}
              </div>

              <Field data-invalid={Boolean(form.formState.errors.phone)}>
                <FieldLabel htmlFor="phone">Phone</FieldLabel>
                <Input id="phone" type="tel" className={inputClass} {...form.register('phone')} />
                <FieldError errors={[form.formState.errors.phone]} />
              </Field>
              <Field data-invalid={Boolean(form.formState.errors.contactEmail)}>
                <FieldLabel htmlFor="contactEmail">Email</FieldLabel>
                <Input
                  id="contactEmail"
                  type="email"
                  className={inputClass}
                  {...form.register('contactEmail')}
                />
                <FieldError errors={[form.formState.errors.contactEmail]} />
              </Field>
            </div>
          </div>
        </CardShell>

        {/* Business Information */}
        <CardShell className="p-5 sm:p-6">
          <SectionTitle
            icon={MapPin}
            title="Business Information"
            description="Where members find you"
          />
          <Field data-invalid={Boolean(form.formState.errors.location)}>
            <FieldLabel htmlFor="location">Location / address</FieldLabel>
            <Input id="location" className={inputClass} {...form.register('location')} />
            <FieldError errors={[form.formState.errors.location]} />
          </Field>
        </CardShell>

        {/* Operating Hours */}
        <CardShell className="p-5 sm:p-6">
          <SectionTitle
            icon={Clock}
            title="Operating Hours"
            description="Set hours per day. Closed days stay unavailable. Primary open hours sync to the gym record."
          />

          <div className="space-y-2">
            {DAYS.map((day) => {
              const entry = weekly[day.key];
              return (
                <div
                  key={day.key}
                  className="flex flex-col gap-3 rounded-2xl border border-slate-100 bg-slate-50/80 px-3 py-3 dark:border-border dark:bg-muted/40 sm:flex-row sm:items-center"
                >
                  <div className="flex min-w-[7.5rem] items-center gap-3">
                    <label className="flex items-center gap-2 text-sm font-semibold text-slate-800 dark:text-foreground">
                      <input
                        type="checkbox"
                        className="size-4 rounded border-slate-300 text-emerald-600"
                        checked={!entry.closed}
                        onChange={(e) => updateDay(day.key, { closed: !e.target.checked })}
                      />
                      {day.label}
                    </label>
                  </div>
                  {entry.closed ? (
                    <p className="text-sm font-medium text-slate-400">Closed</p>
                  ) : (
                    <div className="flex flex-1 flex-wrap items-center gap-2">
                      <Input
                        type="time"
                        className="min-h-11 max-w-[9rem] rounded-xl"
                        value={entry.open}
                        onChange={(e) => updateDay(day.key, { open: e.target.value })}
                        aria-label={`${day.label} open`}
                      />
                      <span className="text-sm text-slate-400">to</span>
                      <Input
                        type="time"
                        className="min-h-11 max-w-[9rem] rounded-xl"
                        value={entry.close}
                        onChange={(e) => updateDay(day.key, { close: e.target.value })}
                        aria-label={`${day.label} close`}
                      />
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        className="min-h-9 rounded-xl text-xs"
                        onClick={() => applyAllOpenDays(day.key)}
                      >
                        Apply to open days
                      </Button>
                    </div>
                  )}
                </div>
              );
            })}
          </div>

          {/* Keep RHF fields registered for schema compatibility */}
          <input type="hidden" {...form.register('openingTime')} />
          <input type="hidden" {...form.register('closingTime')} />
        </CardShell>

        {/* Membership Pricing */}
        <CardShell className="p-5 sm:p-6">
          <SectionTitle
            icon={Building2}
            title="Membership Pricing"
            description="Prices used when approving members and recording payments"
          />
          <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
            {PRICE_CARDS.map((card) => (
              <div
                key={card.plan}
                className="rounded-[20px] border border-slate-200 bg-gradient-to-b from-white to-slate-50 p-4 dark:border-border dark:from-card dark:to-muted/40"
              >
                <p className="text-sm font-semibold text-slate-900 dark:text-foreground">
                  {MEMBERSHIP_PLAN_LABELS[card.plan]}
                </p>
                <p className="mt-0.5 text-xs text-slate-500">{card.hint}</p>
                <div className="mt-4">
                  <FieldLabel htmlFor={card.field} className="sr-only">
                    {MEMBERSHIP_PLAN_LABELS[card.plan]} price
                  </FieldLabel>
                  <div className="relative">
                    <span className="pointer-events-none absolute top-1/2 left-3.5 -translate-y-1/2 text-sm font-semibold text-slate-400">
                      ₹
                    </span>
                    <Input
                      id={card.field}
                      type="number"
                      min={0}
                      step="0.01"
                      className={cn(inputClass, 'pl-8 text-lg font-semibold')}
                      {...form.register(card.field)}
                    />
                  </div>
                </div>
              </div>
            ))}
          </div>
        </CardShell>

        {/* Branding */}
        <CardShell className="p-5 sm:p-6">
          <SectionTitle
            icon={Globe}
            title="Branding & Links"
            description="Optional website and social profiles (saved on this device for now)"
          />
          <div className="grid gap-4 sm:grid-cols-2">
            <Field>
              <FieldLabel htmlFor="website">Website</FieldLabel>
              <Input
                id="website"
                type="url"
                placeholder="https://"
                className={inputClass}
                value={branding.website}
                onChange={(e) => setBranding((b) => ({ ...b, website: e.target.value }))}
              />
            </Field>
            <Field>
              <FieldLabel htmlFor="instagram">Instagram</FieldLabel>
              <Input
                id="instagram"
                placeholder="@yourgym"
                className={inputClass}
                value={branding.instagram}
                onChange={(e) => setBranding((b) => ({ ...b, instagram: e.target.value }))}
              />
            </Field>
            <Field>
              <FieldLabel htmlFor="facebook">Facebook</FieldLabel>
              <Input
                id="facebook"
                placeholder="facebook.com/yourgym"
                className={inputClass}
                value={branding.facebook}
                onChange={(e) => setBranding((b) => ({ ...b, facebook: e.target.value }))}
              />
            </Field>
            <Field>
              <FieldLabel htmlFor="twitter">X / Twitter</FieldLabel>
              <Input
                id="twitter"
                placeholder="@yourgym"
                className={inputClass}
                value={branding.twitter}
                onChange={(e) => setBranding((b) => ({ ...b, twitter: e.target.value }))}
              />
            </Field>
          </div>
        </CardShell>

        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <p className="text-sm text-slate-500">
            Weekly schedules and social links are kept with your gym settings on save.
          </p>
          <Button
            type="submit"
            disabled={saving}
            className="min-h-12 rounded-2xl bg-emerald-600 px-6 hover:bg-emerald-700"
          >
            <Save className="size-4" />
            {saving ? 'Saving…' : 'Save Changes'}
          </Button>
        </div>
      </form>

      <CardShell className="space-y-4 p-5 sm:p-6">
        <div>
          <h2 className="text-lg font-semibold tracking-tight">Create another gym</h2>
          <p className="text-sm text-muted-foreground">
            Owners can manage multiple gyms. New gyms appear in the sidebar switcher.
          </p>
        </div>
        <form
          className="grid gap-3 sm:grid-cols-2"
          onSubmit={(e) => {
            e.preventDefault();
            if (!userId) return;
            setCreateBusy(true);
            setCreateMessage(null);
            setCreateError(null);
            void createAdditionalGym(client, userId, {
              gymName: createName,
              location: createLocation || 'TBD',
              contactEmail: gym?.contact_email || '',
              gymPhone: gym?.phone || '',
            })
              .then(async (created) => {
                setCreateName('');
                setCreateLocation('');
                setCreateMessage(`Created ${created.name} (${created.code}).`);
                await queryClient.invalidateQueries({ queryKey: ['owner-gyms'] });
                switchGym(created.id);
              })
              .catch((err) => {
                setCreateError(err instanceof Error ? err.message : 'Could not create gym.');
              })
              .finally(() => setCreateBusy(false));
          }}
        >
          <Field>
            <FieldLabel htmlFor="new-gym-name">Gym name</FieldLabel>
            <Input
              id="new-gym-name"
              className={inputClass}
              value={createName}
              onChange={(e) => setCreateName(e.target.value)}
              placeholder="Second location name"
              required
            />
          </Field>
          <Field>
            <FieldLabel htmlFor="new-gym-location">Location</FieldLabel>
            <Input
              id="new-gym-location"
              className={inputClass}
              value={createLocation}
              onChange={(e) => setCreateLocation(e.target.value)}
              placeholder="City / area"
            />
          </Field>
          <div className="sm:col-span-2">
            <Button type="submit" disabled={createBusy || createName.trim().length < 2}>
              {createBusy ? 'Creating…' : 'Create gym'}
            </Button>
          </div>
        </form>
        {createMessage ? (
          <p className="text-sm text-emerald-700 dark:text-emerald-300">{createMessage}</p>
        ) : null}
        {createError ? <p className="text-sm text-destructive">{createError}</p> : null}
      </CardShell>
    </div>
  );
}
