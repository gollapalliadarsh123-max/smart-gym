'use client';

import { useEffect, useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { emailSchema } from '@smart-gym/shared';
import { useUpdateGym } from '@smart-gym/supabase';
import { useOwnerContext } from '@/features/owner/components/owner-provider';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Field, FieldDescription, FieldError, FieldGroup, FieldLabel } from '@/components/ui/field';

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

function parsePrice(value: string | undefined): number {
  if (value == null || value.trim() === '') return 0;
  const n = Number(value);
  return Number.isFinite(n) && n >= 0 ? n : 0;
}

export function OwnerSettingsForm() {
  const { client, gym } = useOwnerContext();
  const updateGym = useUpdateGym(client);
  const [savedMessage, setSavedMessage] = useState<string | null>(null);
  const [formError, setFormError] = useState<string | null>(null);

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
  }, [gym, form]);

  const onSubmit = form.handleSubmit(async (values) => {
    if (!gym) return;
    setFormError(null);
    setSavedMessage(null);
    try {
      await updateGym.mutateAsync({
        gymId: gym.id,
        patch: {
          name: values.name,
          location: values.location,
          contact_email: values.contactEmail,
          phone: values.phone,
          opening_time: values.openingTime || null,
          closing_time: values.closingTime || null,
          price_1_month: parsePrice(values.price1Month),
          price_3_month: parsePrice(values.price3Month),
          price_6_month: parsePrice(values.price6Month),
          price_12_month: parsePrice(values.price12Month),
        },
      });
      setSavedMessage('Gym settings saved.');
    } catch (error) {
      setFormError(error instanceof Error ? error.message : 'Failed to save settings.');
    }
  });

  return (
    <div className="space-y-6">
      <div className="space-y-2">
        <h1 className="text-3xl font-semibold tracking-tight">Gym settings</h1>
        <p className="text-muted-foreground">Update how your gym appears to members.</p>
      </div>

      <div className="rounded-xl border border-border/70 bg-muted/20 p-4">
        <p className="text-sm text-muted-foreground">Gym code (share with members)</p>
        <p className="mt-1 font-mono text-xl font-semibold tracking-wide">{gym?.code}</p>
        <FieldDescription className="mt-2">
          Members use this code during signup. It cannot be changed here.
        </FieldDescription>
      </div>

      <form onSubmit={onSubmit} className="max-w-2xl space-y-5" noValidate>
        <FieldGroup>
          <Field data-invalid={Boolean(form.formState.errors.name)}>
            <FieldLabel htmlFor="name">Gym name</FieldLabel>
            <Input id="name" {...form.register('name')} />
            <FieldError errors={[form.formState.errors.name]} />
          </Field>

          <Field data-invalid={Boolean(form.formState.errors.location)}>
            <FieldLabel htmlFor="location">Location</FieldLabel>
            <Input id="location" {...form.register('location')} />
            <FieldError errors={[form.formState.errors.location]} />
          </Field>

          <div className="grid gap-4 sm:grid-cols-2">
            <Field data-invalid={Boolean(form.formState.errors.contactEmail)}>
              <FieldLabel htmlFor="contactEmail">Contact email</FieldLabel>
              <Input id="contactEmail" type="email" {...form.register('contactEmail')} />
              <FieldError errors={[form.formState.errors.contactEmail]} />
            </Field>
            <Field data-invalid={Boolean(form.formState.errors.phone)}>
              <FieldLabel htmlFor="phone">Phone</FieldLabel>
              <Input id="phone" type="tel" {...form.register('phone')} />
              <FieldError errors={[form.formState.errors.phone]} />
            </Field>
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            <Field>
              <FieldLabel htmlFor="openingTime">Opening time</FieldLabel>
              <Input id="openingTime" type="time" {...form.register('openingTime')} />
            </Field>
            <Field>
              <FieldLabel htmlFor="closingTime">Closing time</FieldLabel>
              <Input id="closingTime" type="time" {...form.register('closingTime')} />
            </Field>
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            <Field>
              <FieldLabel htmlFor="price1Month">1-month price</FieldLabel>
              <Input id="price1Month" type="number" min={0} step="0.01" {...form.register('price1Month')} />
            </Field>
            <Field>
              <FieldLabel htmlFor="price3Month">3-month price</FieldLabel>
              <Input id="price3Month" type="number" min={0} step="0.01" {...form.register('price3Month')} />
            </Field>
            <Field>
              <FieldLabel htmlFor="price6Month">6-month price</FieldLabel>
              <Input id="price6Month" type="number" min={0} step="0.01" {...form.register('price6Month')} />
            </Field>
            <Field>
              <FieldLabel htmlFor="price12Month">12-month price</FieldLabel>
              <Input id="price12Month" type="number" min={0} step="0.01" {...form.register('price12Month')} />
            </Field>
          </div>
        </FieldGroup>

        {formError ? (
          <p className="text-sm text-destructive" role="alert">
            {formError}
          </p>
        ) : null}
        {savedMessage ? (
          <p className="text-sm text-foreground" role="status">
            {savedMessage}
          </p>
        ) : null}

        <Button type="submit" disabled={form.formState.isSubmitting || updateGym.isPending}>
          {updateGym.isPending ? 'Saving…' : 'Save settings'}
        </Button>
      </form>
    </div>
  );
}
