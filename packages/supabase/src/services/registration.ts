import type { TypedSupabaseClient } from '../client/browser';
import type { Tables, TablesInsert } from '../types/database';
import { signUpWithEmail } from './auth';
import { createGym, getGymByCode, listGymsByOwner, lookupGymByCode } from './gyms';
import { createJoinRequest, getMemberJoinRequest } from './join-requests';
import { getProfile, updateProfile } from './profiles';

export interface RegisterOwnerInput {
  email: string;
  password: string;
  firstName: string;
  lastName: string;
  phone: string;
  gymName: string;
  location: string;
  contactEmail: string;
  gymPhone?: string;
  price1Month?: number;
  price3Month?: number;
  price6Month?: number;
  price12Month?: number;
  emailRedirectTo?: string;
}

export interface RegisterMemberInput {
  email: string;
  password: string;
  firstName: string;
  lastName: string;
  phone: string;
  gymCode: string;
  message?: string;
  emailRedirectTo?: string;
}

export interface GymSummary {
  id: string;
  code: string;
  name: string;
  location: string;
}

export interface RegistrationResult {
  userId: string | null;
  sessionCreated: boolean;
  needsEmailConfirmation: boolean;
  gym?: Tables<'gyms'> | GymSummary;
  joinRequest?: Tables<'join_requests'>;
}

async function waitForProfile(
  client: TypedSupabaseClient,
  userId: string,
  attempts = 8,
): Promise<Tables<'profiles'>> {
  for (let i = 0; i < attempts; i++) {
    const profile = await getProfile(client, userId);
    if (profile) return profile;
    await new Promise((resolve) => setTimeout(resolve, 150 * (i + 1)));
  }
  throw new Error('Profile was not created. Please try signing in again.');
}

export async function completeOwnerOnboarding(
  client: TypedSupabaseClient,
  userId: string,
  input: Omit<RegisterOwnerInput, 'email' | 'password' | 'emailRedirectTo'>,
): Promise<Tables<'gyms'>> {
  await updateProfile(client, userId, {
    role: 'gym_owner',
    first_name: input.firstName,
    last_name: input.lastName,
    phone: input.phone,
    onboarding_completed: true,
  });

  const existing = await listGymsByOwner(client, userId);
  if (existing[0]) return existing[0];

  const gymPayload: Omit<TablesInsert<'gyms'>, 'code'> = {
    name: input.gymName,
    location: input.location,
    contact_email: input.contactEmail,
    phone: input.gymPhone ?? '',
    owner_id: userId,
    price_1_month: input.price1Month ?? 0,
    price_3_month: input.price3Month ?? 0,
    price_6_month: input.price6Month ?? 0,
    price_12_month: input.price12Month ?? 0,
  };

  return createGym(client, gymPayload);
}

export async function completeMemberOnboarding(
  client: TypedSupabaseClient,
  userId: string,
  input: {
    firstName: string;
    lastName: string;
    phone: string;
    gymCode: string;
    message?: string;
  },
): Promise<{ gym: Tables<'gyms'>; joinRequest: Tables<'join_requests'> }> {
  const gym = await getGymByCode(client, input.gymCode);
  if (!gym) {
    throw new Error('No gym found for that code. Check with your gym owner.');
  }

  await updateProfile(client, userId, {
    role: 'member',
    first_name: input.firstName,
    last_name: input.lastName,
    phone: input.phone,
    onboarding_completed: true,
  });

  const existing = await getMemberJoinRequest(client, userId, gym.id);
  if (existing) {
    return { gym, joinRequest: existing };
  }

  const joinRequest = await createJoinRequest(client, {
    user_id: userId,
    gym_id: gym.id,
    message: input.message ?? '',
  });

  return { gym, joinRequest };
}

export async function registerOwner(
  client: TypedSupabaseClient,
  input: RegisterOwnerInput,
): Promise<RegistrationResult> {
  const signedUp = await signUpWithEmail(client, {
    email: input.email,
    password: input.password,
    emailRedirectTo: input.emailRedirectTo,
    metadata: {
      role: 'gym_owner',
      first_name: input.firstName,
      last_name: input.lastName,
      phone: input.phone,
      gym_name: input.gymName,
      gym_location: input.location,
      gym_contact_email: input.contactEmail,
      gym_phone: input.gymPhone ?? '',
    },
  });

  const userId = signedUp.user?.id ?? null;
  const sessionCreated = Boolean(signedUp.session);

  if (!userId || !sessionCreated) {
    return {
      userId,
      sessionCreated: false,
      needsEmailConfirmation: true,
    };
  }

  await waitForProfile(client, userId);
  const gym = await completeOwnerOnboarding(client, userId, input);

  return {
    userId,
    sessionCreated: true,
    needsEmailConfirmation: false,
    gym,
  };
}

export async function registerMember(
  client: TypedSupabaseClient,
  input: RegisterMemberInput,
): Promise<RegistrationResult> {
  const gymPreview = await lookupGymByCode(client, input.gymCode);
  if (!gymPreview) {
    throw new Error('No gym found for that code. Check with your gym owner.');
  }

  const signedUp = await signUpWithEmail(client, {
    email: input.email,
    password: input.password,
    emailRedirectTo: input.emailRedirectTo,
    metadata: {
      role: 'member',
      first_name: input.firstName,
      last_name: input.lastName,
      phone: input.phone,
      gym_code: input.gymCode,
    },
  });

  const userId = signedUp.user?.id ?? null;
  const sessionCreated = Boolean(signedUp.session);

  if (!userId || !sessionCreated) {
    return {
      userId,
      sessionCreated: false,
      needsEmailConfirmation: true,
      gym: gymPreview,
    };
  }

  await waitForProfile(client, userId);
  const result = await completeMemberOnboarding(client, userId, input);

  return {
    userId,
    sessionCreated: true,
    needsEmailConfirmation: false,
    gym: result.gym,
    joinRequest: result.joinRequest,
  };
}
