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
  memberJoinSchema,
  type AccountDetailsInput,
  type MemberJoinInput,
} from '@smart-gym/shared';
import { lookupGymByCode, registerMember } from '@smart-gym/supabase';
import { createClient } from '@/lib/supabase/client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Field, FieldDescription, FieldError, FieldGroup, FieldLabel } from '@/components/ui/field';

type Step = 1 | 2;

export function MemberSignupForm() {
  const router = useRouter();
  const [step, setStep] = useState<Step>(1);
  const [account, setAccount] = useState<AccountDetailsInput | null>(null);
  const [gymName, setGymName] = useState<string | null>(null);
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

  const joinForm = useForm<MemberJoinInput>({
    resolver: zodResolver(memberJoinSchema),
    defaultValues: {
      gymCode: '',
      message: '',
    },
  });

  const goToJoinStep = accountForm.handleSubmit((values) => {
    setFormError(null);
    setAccount(values);
    setStep(2);
  });

  const onSubmitJoin = joinForm.handleSubmit(async (joinValues) => {
    if (!account) {
      setStep(1);
      return;
    }

    setFormError(null);
    setEmailNotice(null);

    try {
      const supabase = createClient();
      const preview = await lookupGymByCode(supabase, joinValues.gymCode);
      if (!preview) {
        setFormError('No gym found for that code. Check with your gym owner.');
        return;
      }
      setGymName(preview.name);

      const result = await registerMember(supabase, {
        email: account.email,
        password: account.password,
        firstName: account.firstName,
        lastName: account.lastName,
        phone: account.phone,
        gymCode: joinValues.gymCode,
        message: joinValues.message || '',
        emailRedirectTo: `${window.location.origin}/login`,
      });

      if (result.needsEmailConfirmation) {
        setEmailNotice(
          `Account created for ${preview.name}. Confirm your email, then sign in to complete your join request.`,
        );
        return;
      }

      router.replace(getDashboardPath('member'));
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
        <span className={step === 2 ? 'font-medium text-foreground' : ''}>2. Join gym</span>
      </div>

      {step === 1 ? (
        <form onSubmit={goToJoinStep} className="space-y-5" noValidate>
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
        <form onSubmit={onSubmitJoin} className="space-y-5" noValidate>
          <FieldGroup>
            <Field data-invalid={Boolean(joinForm.formState.errors.gymCode)}>
              <FieldLabel htmlFor="gymCode">Gym code</FieldLabel>
              <Input
                id="gymCode"
                placeholder="e.g. GYM001"
                className="uppercase"
                {...joinForm.register('gymCode')}
              />
              <FieldDescription>
                Ask your gym owner for the code{gymName ? ` · Found: ${gymName}` : ''}.
              </FieldDescription>
              <FieldError errors={[joinForm.formState.errors.gymCode]} />
            </Field>

            <Field data-invalid={Boolean(joinForm.formState.errors.message)}>
              <FieldLabel htmlFor="message">Message (optional)</FieldLabel>
              <Textarea
                id="message"
                placeholder="Introduce yourself to the gym owner"
                rows={3}
                {...joinForm.register('message')}
              />
              <FieldError errors={[joinForm.formState.errors.message]} />
            </Field>
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
              disabled={joinForm.formState.isSubmitting}
            >
              {joinForm.formState.isSubmitting ? 'Submitting…' : 'Request to join'}
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
