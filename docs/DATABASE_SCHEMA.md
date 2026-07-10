# Database Schema Design

Clean PostgreSQL schema for Smart Gym. This replaces the legacy dual-write (`app_docs` + normalized tables) architecture.

## Key improvements over legacy

| Legacy | New design | Why |
|--------|------------|-----|
| `admin` / `member` roles only | `platform_admin`, `gym_owner`, `trainer`, `member` | Supports trainer workflows and multi-gym platform admin |
| Membership fields on `profiles` | Separate `gym_memberships` table | History-friendly, cleaner profile entity |
| Dates as `text` | `date` / `timestamptz` | DB validation, timezone safety, indexable |
| Amounts as `text` on profiles | `numeric(12,2)` everywhere | Type consistency, aggregations in SQL |
| `app_docs` Firestore shim | Removed | Single source of truth, no dual-write |
| Permissive `app_docs` RLS | Per-table RLS + helper functions | Security |
| `daily_codes` table name | `daily_attendance_codes` | Clearer naming |
| `member_league_seasons` | `league_seasons` | Shorter, same semantics |
| No trainer support | `gym_staff` + `trainer_assignments` | Trainer role with member assignments |
| No file storage | `avatars`, `gym-logos`, `share-cards` buckets | Profile photos, branding, streak cards |

## Entity relationships

- **gyms** — owned by one `gym_owner` (`owner_id`)
- **gym_staff** — links trainers (and optionally owners) to gyms
- **trainer_assignments** — which members a trainer manages
- **gym_memberships** — member ↔ gym relationship with plan, dates, payment status
- **join_requests** — pending member requests before approval
- **attendance** — one check-in per user per day; `expires_at` for crowd meter
- **daily_attendance_codes** — 4-digit codes for admin check-in
- **payments** — linked to gym and optional membership record
- **diet_logs** / **diet_daily_summaries** — full logs vs compact chart data
- **league_seasons** — quarterly global leaderboard points
- **friend_requests** / **friendships** / **chat_messages** — social layer
- **notifications** — gym-wide broadcasts from staff

## RLS strategy

Security-definer helper functions avoid recursive policy issues:

- `current_user_role()`
- `is_platform_admin()`
- `owns_gym(gym_id)`
- `staff_of_gym(gym_id)`
- `member_of_gym(gym_id)`
- `trainer_assigned_to(member_id)`

## Migration file

`supabase/migrations/20260709170000_initial_schema.sql`

Apply with `npx supabase db push` after linking your project.
