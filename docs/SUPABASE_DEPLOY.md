# Deploying to Supabase project `rbtfjshktqabnswvxrmi`

## 1. Authenticate CLI

```bash
npx supabase login
```

## 2. Link project (one-time)

```bash
npm run db:link
```

## 3. Push migrations

```bash
npm run db:push
```

This applies:

- `20260709170000_initial_schema.sql` — tables, enums, RLS, storage
- `20260710030000_rls_rpc_attendance.sql` — RLS fixes, attendance RPCs
- `20260710040000_auth_signup_metadata.sql` — profile fields from signup metadata
- `20260710040100_lookup_gym_by_code.sql` — anon gym-code lookup for member signup
- `20260710120000_social_profile_lookup.sql` — profile read for social + email lookup RPC

## 4. Regenerate TypeScript types (optional)

After pushing, regenerate types from the live schema:

```bash
npm run db:types
```

Then merge or replace `packages/supabase/src/types/database.ts`.

## 5. Deploy Edge Functions

```bash
npm run db:deploy-functions
```

Functions:

| Function | Purpose |
|----------|---------|
| `mark-attendance` | Staff marks member attendance by 4-digit code |
| `generate-daily-code` | Member gets today's attendance code |
| `self-check-in` | Member QR self check-in |

## 6. Environment variables

Copy your **anon key** from [Project Settings → API](https://supabase.com/dashboard/project/rbtfjshktqabnswvxrmi/settings/api):

```bash
cp apps/web/.env.example apps/web/.env.local
cp apps/mobile/.env.example apps/mobile/.env
```

## Local development (optional)

```bash
npx supabase start
npm run db:reset   # applies migrations + seed.sql
```

Seed accounts (local only, password `Test1234!`):

| Email | Role |
|-------|------|
| owner@test.com | Gym owner |
| member@test.com | Member |
| trainer@test.com | Trainer |

Gym code: `GYM001`
