# Smart Gym

Production-grade gym management platform — web (Next.js) and mobile (Expo) sharing a single Supabase backend.

## Stack

| Layer | Technology |
|-------|------------|
| Web | Next.js 16, React 19, TypeScript, Tailwind CSS v4, shadcn/ui |
| Mobile | Expo 57, React Native, Expo Router |
| Backend | Supabase (Postgres, Auth, Storage, Realtime) |
| Monorepo | npm workspaces + Turborepo |

## Structure

```
apps/
  web/          Next.js web application
  mobile/       Expo mobile application
packages/
  shared/       Domain constants & business logic (shared)
  supabase/     Typed Supabase client
  typescript-config/
supabase/
  migrations/   PostgreSQL schema
```

## Getting started

### Prerequisites

- Node.js 20+
- npm 10+
- [Supabase CLI](https://supabase.com/docs/guides/cli) (for local DB)

### Install

```bash
npm install
```

### Environment

```bash
cp apps/web/.env.example apps/web/.env.local
cp apps/mobile/.env.example apps/mobile/.env
```

Create a new Supabase project, then paste your URL and anon key into both env files.

### Development

```bash
# All apps (parallel)
npm run dev

# Web only
npm run dev:web

# Mobile only
npm run dev:mobile
```

### Quality checks

```bash
npm run lint
npm run typecheck
npm run build
```

### Database

```bash
# Link to your Supabase project (first time)
npx supabase link --project-ref <your-project-ref>

# Push migrations
npx supabase db push
```

## Module roadmap

| Module | Status |
|--------|--------|
| M0 Monorepo scaffolding | ✅ Complete |
| M1 Database migrations & types | ✅ Complete |
| M2 Shared domain logic | ✅ Complete |
| M3 Supabase service layer | ✅ Complete |
| M4 Authentication | ✅ Complete |
| M5 Owner dashboard | ✅ Complete |
| M6 Attendance | ✅ Complete |
| M7 Payments | ✅ Complete |
| M8 Diet | ✅ Complete |
| M9 League & social | ✅ Complete |
| … | |

## Reference

The legacy app at `../new version` is used as a **read-only reference** for business logic. It is not modified.
