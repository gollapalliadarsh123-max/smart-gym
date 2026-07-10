-- Local development seed data.
-- Run: supabase db reset (local only)
-- All seed accounts use password: Test1234!
--
-- Remote project: run `npm run db:push` then create accounts via the app (M4).

create extension if not exists pgcrypto;

-- Fixed UUIDs for reproducible local testing
-- Owner:  owner@test.com
-- Member: member@test.com
-- Trainer: trainer@test.com

do $$
declare
  v_owner_id uuid := 'a0000000-0000-4000-8000-000000000001';
  v_member_id uuid := 'a0000000-0000-4000-8000-000000000002';
  v_trainer_id uuid := 'a0000000-0000-4000-8000-000000000003';
  v_gym_id uuid := 'b0000000-0000-4000-8000-000000000001';
  v_membership_id uuid := 'c0000000-0000-4000-8000-000000000001';
  v_encrypted_pw text := crypt('Test1234!', gen_salt('bf'));
begin
  -- Auth users (local Supabase only)
  insert into auth.users (
    id, instance_id, aud, role, email, encrypted_password,
    email_confirmed_at, raw_app_meta_data, raw_user_meta_data,
    created_at, updated_at
  ) values
    (v_owner_id, '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated',
     'owner@test.com', v_encrypted_pw, now(), '{"provider":"email","providers":["email"]}', '{}', now(), now()),
    (v_member_id, '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated',
     'member@test.com', v_encrypted_pw, now(), '{"provider":"email","providers":["email"]}', '{}', now(), now()),
    (v_trainer_id, '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated',
     'trainer@test.com', v_encrypted_pw, now(), '{"provider":"email","providers":["email"]}', '{}', now(), now())
  on conflict (id) do nothing;

  insert into auth.identities (id, user_id, identity_data, provider, provider_id, last_sign_in_at, created_at, updated_at)
  values
    (v_owner_id, v_owner_id, jsonb_build_object('sub', v_owner_id::text, 'email', 'owner@test.com'), 'email', v_owner_id::text, now(), now(), now()),
    (v_member_id, v_member_id, jsonb_build_object('sub', v_member_id::text, 'email', 'member@test.com'), 'email', v_member_id::text, now(), now(), now()),
    (v_trainer_id, v_trainer_id, jsonb_build_object('sub', v_trainer_id::text, 'email', 'trainer@test.com'), 'email', v_trainer_id::text, now(), now(), now())
  on conflict (id) do nothing;

  -- Profiles
  update public.profiles set
    role = 'gym_owner',
    first_name = 'Alex',
    last_name = 'Owner',
    email = 'owner@test.com',
    onboarding_completed = true
  where user_id = v_owner_id;

  update public.profiles set
    role = 'member',
    first_name = 'Morgan',
    last_name = 'Member',
    email = 'member@test.com',
    onboarding_completed = true
  where user_id = v_member_id;

  update public.profiles set
    role = 'trainer',
    first_name = 'Taylor',
    last_name = 'Trainer',
    email = 'trainer@test.com',
    onboarding_completed = true
  where user_id = v_trainer_id;

  -- Gym
  insert into public.gyms (
    id, code, name, location, contact_email, owner_id,
    price_1_month, price_3_month, price_6_month, price_12_month
  ) values (
    v_gym_id, 'GYM001', 'Iron Valley Fitness', '123 Main St, Austin TX', 'owner@test.com', v_owner_id,
    49.99, 129.99, 239.99, 449.99
  ) on conflict (id) do nothing;

  insert into public.gym_staff (gym_id, user_id, staff_role)
  values (v_gym_id, v_trainer_id, 'trainer')
  on conflict (gym_id, user_id) do nothing;

  -- Active member membership
  insert into public.gym_memberships (
    id, user_id, gym_id, plan, status, payment_status, amount, payment_mode, starts_at, ends_at
  ) values (
    v_membership_id, v_member_id, v_gym_id, '3_month', 'active', 'paid', 129.99, 'cash',
    current_date, current_date + interval '90 days'
  ) on conflict (id) do nothing;

  insert into public.trainer_assignments (gym_id, trainer_id, member_id)
  values (v_gym_id, v_trainer_id, v_member_id)
  on conflict (trainer_id, member_id) do nothing;

  -- Sample notification
  insert into public.notifications (gym_id, title, body, created_by)
  select v_gym_id, 'Welcome to Iron Valley', 'Your gym is now live on Smart Gym!', v_owner_id
  where not exists (
    select 1 from public.notifications where gym_id = v_gym_id and title = 'Welcome to Iron Valley'
  );
end $$;
