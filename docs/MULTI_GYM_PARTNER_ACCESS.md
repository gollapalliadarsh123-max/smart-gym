# Multi-gym + partner access testing

## Apply migration

```bash
npm run db:push
```

Migration: `supabase/migrations/20260721140000_multi_gym_partner_access.sql`

Also apply QR migration: `supabase/migrations/20260721150000_gym_qr_secure_tokens.sql`

No new environment variables are required. Uses the existing Supabase project.

## Secure Gym QR

- Public URL: `/checkin/<64-hex-token>` (never embeds gym/user IDs)
- Owner page: `/owner/gym-qr` — view, fullscreen, download PNG, print, regenerate (with confirmation)
- Member scanner: `/member/attendance` → **Scan Gym QR** (camera + paste-link fallback)
- Backend: `check_in_by_qr_token` validates QR, membership, partnership, monthly limit; logs every scan
- Regenerating a QR immediately revokes the previous token (kept in history for audit)

## Owner: create / switch gyms

1. Sign in as gym owner A.
2. Open **Settings → Create another gym**.
3. Confirm the sidebar switcher lists both gyms and dashboard data changes when switching.

## Owner: partnerships (two owner accounts)

1. Owner A copies gym code from settings.
2. Owner B opens **Partners**, enters Owner A’s gym code, sends request.
3. Owner A opens **Partners**, approves the request.
4. Confirm status becomes `active` on both sides.
5. Suspend/end from either side; historical partner visits remain.

## Member: partner check-in (one member + two partnered gyms)

1. Approve a member at Gym A (home gym).
2. Member opens home → **Multi-Gym Access** card and **Partner gyms**.
3. Check in at Gym B via **Scan Gym QR** on Attendance (or open `/checkin/<token>`).
4. Expect success messages with remaining visits (2 then 1 then 0).
5. Fourth partner check-in in the same calendar month must fail with the monthly limit message.
6. Home-gym attendance at Gym A must not reduce partner visits.
7. Same-day second check-in at the same partner gym must fail.
8. Suspend partnership, then partner check-in must fail.
9. Owner reverses an approved partner visit on Attendance; remaining allowance increases.
10. Regenerate QR on Gym A; old printed QR must fail with “QR expired”.

## Isolation checks

1. Owner A must not see Owner B members/payments after switching to their own gym only.
2. Unrelated gyms without partnership must reject partner check-in.

## Automated unit tests

```bash
npm test --workspace=@smart-gym/shared
```

Covers remaining-visit math for the 3/month rule and QR token parsing.