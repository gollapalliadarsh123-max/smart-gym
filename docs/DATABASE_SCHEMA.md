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

- **gyms** — owned by one `gym_owner` (`owner_id`); owners may own multiple gyms
- **gym_staff** — links trainers (and optionally owners) to gyms
- **trainer_assignments** — which members a trainer manages
- **gym_memberships** — member ↔ gym relationship with plan, dates, payment status (one active membership per user **per gym**)
- **join_requests** — pending member requests before approval
- **attendance** — one check-in per user per gym per day; `expires_at` for crowd meter
- **daily_attendance_codes** — 4-digit codes for admin check-in (per user per gym per day)
- **payments** — linked to gym and optional membership record
- **diet_logs** / **diet_daily_summaries** — full logs vs compact chart data
- **league_seasons** — quarterly global leaderboard points
- **friend_requests** / **friendships** / **chat_messages** — social layer
- **notifications** — gym-wide broadcasts from staff
- **gym_partnerships** — optional partner links between gyms (`pending` → `active`)
- **partner_gym_visits** — partner check-ins with monthly allowance (default 3); reversed visits do not count
- **gym_qr_codes** — secure check-in tokens (one active per gym); revoked tokens retained for audit
- **qr_scan_logs** — audit trail of every QR scan attempt (token fingerprint only)

## Multi-tenant notes

- All gym-scoped tables include `gym_id` and are protected by RLS helpers (`owns_gym`, `staff_of_gym`, `member_of_gym`).
- The web app selects a current gym (persisted locally) and scopes owner/member queries to that gym.
- Partner visits are created only via `check_in_at_partner_gym` (security definer RPC). Direct inserts are blocked by RLS.

## RLS strategy

Security-definer helper functions avoid recursive policy issues:

- `current_user_role()`
- `is_platform_admin()`
- `owns_gym(gym_id)`
- `staff_of_gym(gym_id)`
- `member_of_gym(gym_id)`
- `trainer_assigned_to(member_id)`
- `gyms_are_active_partners(gym_a, gym_b)`
- `check_in_at_partner_gym(visited_gym_id, method)`
- `reverse_partner_visit(visit_id, reason)`
- `get_partner_visit_allowance(member_user_id)`

## Migration files

- `supabase/migrations/20260709170000_initial_schema.sql`
- `supabase/migrations/20260710030000_rls_rpc_attendance.sql`
- `supabase/migrations/20260721140000_multi_gym_partner_access.sql`
- `supabase/migrations/20260721150000_gym_qr_secure_tokens.sql`

Apply with `npx supabase db push` after linking your project.

See also: `docs/MULTI_GYM_PARTNER_ACCESS.md`.
