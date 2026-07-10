'use client';

import { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import {
  accountDetailsSchema,
  getDashboardPath,
  getPasswordRequirements,
  ownerGymDetailsSchema,
  parseOptionalPrice,
  type AccountDetailsInput,
  type OwnerGymDetailsInput,
} from '@smart-gym/shared';
import { registerOwner } from '@smart-gym/supabase';
import { createClient } from '@/lib/supabase/client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Field, FieldDescription, FieldError, FieldGroup, FieldLabel } from '@/components/ui/field';

type Step = 1 | 2;

export function OwnerSignupForm() {
  const router = useRouter();
  const [step, setStep] = useState<Step>(1);
  const [account, setAccount] = useState<AccountDetailsInput | null>(null);
  const [formError, setFormError] = useState<string | null>(null);
  const [emailNotice, setEmailNotice] = useState<string | null>(null);

  const accountForm = useForm<AccountDetailsInput>({
    resolver: zodResolver(accountDetailsSchema),
    defaultValues: {
      firstName: '',
      lastName: '',
      email: '',
      phone: '',
      password: '',
      confirmPassword: '',
    },
  });

  const gymForm = useForm<OwnerGymDetailsInput>({
    resolver: zodResolver(ownerGymDetailsSchema),
    defaultValues: {
      gymName: '',
      location: '',
      contactEmail: '',
      gymPhone: '',
      price1Month: '',
      price3Month: '',
      price6Month: '',
      price12Month: '',
    },
  });

  const goToGymStep = accountForm.handleSubmit((values) => {
    setFormError(null);
    setAccount(values);
    gymForm.setValue('contactEmail', values.email);
    setStep(2);
  });

  const onSubmitGym = gymForm.handleSubmit(async (gymValues) => {
    if (!account) {
      setStep(1);
      return;
    }

    setFormError(null);
    setEmailNotice(null);

    try {
      const supabase = createClient();
      const result = await registerOwner(supabase, {
        email: account.email,
        password: account.password,
        firstName: account.firstName,
        lastName: account.lastName,
        phone: account.phone,
        gymName: gymValues.gymName,
        location: gymValues.location,
        contactEmail: gymValues.contactEmail,
        gymPhone: gymValues.gymPhone || '',
        price1Month: parseOptionalPrice(gymValues.price1Month),
        price3Month: parseOptionalPrice(gymValues.price3Month),
        price6Month: parseOptionalPrice(gymValues.price6Month),
        price12Month: parseOptionalPrice(gymValues.price12Month),
        emailRedirectTo: `${window.location.origin}/login`,
      });

      if (result.needsEmailConfirmation) {
        setEmailNotice(
          'Account created. Confirm your email, then sign in to finish setting up your gym.',
        );
        return;
      }

      router.replace(getDashboardPath('gym_owner'));
      router.refresh();
    } catch (error) {
      setFormError(error instanceof Error ? error.message : 'Unable to create account.');
    }
  });

  if (emailNotice) {
    return (
      <div className="space-y-4 text-center">
        <p className="text-sm text-muted-foreground">{emailNotice}</p>
        <Link href="/login">
          <Button className="w-full" size="lg">
            Go to sign in
          </Button>
        </Link>
      </div>
    );
  }

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between text-xs text-muted-foreground">
        <span className={step === 1 ? 'font-medium text-foreground' : ''}>1. Account</span>
        <span className="mx-2 h-px flex-1 bg-border" />
        <span className={step === 2 ? 'font-medium text-foreground' : ''}>2. Gym</span>
      </div>

      {step === 1 ? (
        <form onSubmit={goToGymStep} className="space-y-5" noValidate>
          <FieldGroup>
            <div className="grid gap-4 sm:grid-cols-2">
              <Field data-invalid={Boolean(accountForm.formState.errors.firstName)}>
                <FieldLabel htmlFor="firstName">First name</FieldLabel>
                <Input id="firstName" autoComplete="given-name" {...accountForm.register('firstName')} />
                <FieldError errors={[accountForm.formState.errors.firstName]} />
              </Field>
              <Field data-invalid={Boolean(accountForm.formState.errors.lastName)}>
                <FieldLabel htmlFor="lastName">Last name</FieldLabel>
                <Input id="lastName" autoComplete="family-name" {...accountForm.register('lastName')} />
                <FieldError errors={[accountForm.formState.errors.lastName]} />
              </Field>
            </div>

            <Field data-invalid={Boolean(accountForm.formState.errors.email)}>
              <FieldLabel htmlFor="email">Email</FieldLabel>
              <Input id="email" type="email" autoComplete="email" {...accountForm.register('email')} />
              <FieldError errors={[accountForm.formState.errors.email]} />
            </Field>

            <Field data-invalid={Boolean(accountForm.formState.errors.phone)}>
              <FieldLabel htmlFor="phone">Phone</FieldLabel>
              <Input id="phone" type="tel" autoComplete="tel" {...accountForm.register('phone')} />
              <FieldError errors={[accountForm.formState.errors.phone]} />
            </Field>

            <Field data-invalid={Boolean(accountForm.formState.errors.password)}>
              <FieldLabel htmlFor="password">Password</FieldLabel>
              <Input
                id="password"
                type="password"
                autoComplete="new-password"
                {...accountForm.register('password')}
              />
              <FieldDescription>{getPasswordRequirements()}</FieldDescription>
              <FieldError errors={[accountForm.formState.errors.password]} />
            </Field>

            <Field data-invalid={Boolean(accountForm.formState.errors.confirmPassword)}>
              <FieldLabel htmlFor="confirmPassword">Confirm password</FieldLabel>
              <Input
                id="confirmPassword"
                type="password"
                autoComplete="new-password"
                {...accountForm.register('confirmPassword')}
              />
              <FieldError errors={[accountForm.formState.errors.confirmPassword]} />
            </Field>
          </FieldGroup>

          {formError ? (
            <p className="text-sm text-destructive" role="alert">
              {formError}
            </p>
          ) : null}

          <Button type="submit" className="w-full" size="lg">
            Continue
          </Button>
        </form>
      ) : (
        <form onSubmit={onSubmitGym} className="space-y-5" noValidate>
          <FieldGroup>
            <Field data-invalid={Boolean(gymForm.formState.errors.gymName)}>
              <FieldLabel htmlFor="gymName">Gym name</FieldLabel>
              <Input id="gymName" {...gymForm.register('gymName')} />
              <FieldError errors={[gymForm.formState.errors.gymName]} />
            </Field>

            <Field data-invalid={Boolean(gymForm.formState.errors.location)}>
              <FieldLabel htmlFor="location">Location</FieldLabel>
              <Input id="location" placeholder="City, address, or area" {...gymForm.register('location')} />
              <FieldError errors={[gymForm.formState.errors.location]} />
            </Field>

            <Field data-invalid={Boolean(gymForm.formState.errors.contactEmail)}>
              <FieldLabel htmlFor="contactEmail">Gym contact email</FieldLabel>
              <Input id="contactEmail" type="email" {...gymForm.register('contactEmail')} />
              <FieldError errors={[gymForm.formState.errors.contactEmail]} />
            </Field>

            <Field data-invalid={Boolean(gymForm.formState.errors.gymPhone)}>
              <FieldLabel htmlFor="gymPhone">Gym phone (optional)</FieldLabel>
              <Input id="gymPhone" type="tel" {...gymForm.register('gymPhone')} />
              <FieldError errors={[gymForm.formState.errors.gymPhone]} />
            </Field>

            <div className="grid gap-4 sm:grid-cols-2">
              <Field>
                <FieldLabel htmlFor="price1Month">1-month price</FieldLabel>
                <Input id="price1Month" type="number" min={0} step="0.01" {...gymForm.register('price1Month')} />
              </Field>
              <Field>
                <FieldLabel htmlFor="price3Month">3-month price</FieldLabel>
                <Input id="price3Month" type="number" min={0} step="0.01" {...gymForm.register('price3Month')} />
              </Field>
              <Field>
                <FieldLabel htmlFor="price6Month">6-month price</FieldLabel>
                <Input id="price6Month" type="number" min={0} step="0.01" {...gymForm.register('price6Month')} />
              </Field>
              <Field>
                <FieldLabel htmlFor="price12Month">12-month price</FieldLabel>
                <Input id="price12Month" type="number" min={0} step="0.01" {...gymForm.register('price12Month')} />
              </Field>
            </div>
          </FieldGroup>

          {formError ? (
            <p className="text-sm text-destructive" role="alert">
              {formError}
            </p>
          ) : null}

          <div className="flex gap-2">
            <Button type="button" variant="outline" className="flex-1" onClick={() => setStep(1)}>
              Back
            </Button>
            <Button
              type="submit"
              className="flex-1"
              size="lg"
              disabled={gymForm.formState.isSubmitting}
            >
              {gymForm.formState.isSubmitting ? 'Creating…' : 'Create gym account'}
            </Button>
          </div>
        </form>
      )}

      <p className="text-center text-sm text-muted-foreground">
        <Link href="/signup" className="font-medium text-primary underline-offset-4 hover:underline">
          Back to role selection
        </Link>
      </p>
    </div>
  );
}
