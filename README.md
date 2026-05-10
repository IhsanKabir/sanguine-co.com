# Saanguine — Web

Production storefront for Maison Saanguine. Bangladesh, COD-first soft launch.

## Stack

| Layer | Service |
|---|---|
| Framework | Next.js 15 (App Router) + React 19 |
| Language | TypeScript |
| Database | Supabase (Postgres) |
| Auth | Supabase Auth |
| ORM | Drizzle |
| i18n | next-intl (EN + বাংলা) |
| Hosting | Vercel |
| CMS (later) | Sanity |
| Images | Cloudinary |
| Email | Brevo |
| SMS | SSL Wireless |
| Shipping | Pathao + Steadfast |

## Setup

```bash
cp .env.example .env
# Fill in Supabase URL + keys + DATABASE_URL

npm install
npm run db:migrate
npm run db:seed         # imports curated 12 products
npm run dev
```

Open <http://localhost:3000> — auto-redirects to `/en` (or `/bn` based on Accept-Language).

## Project structure

```
web/
├── src/
│   ├── app/
│   │   └── [locale]/                 # i18n root
│   │       ├── layout.tsx
│   │       ├── page.tsx              # Home
│   │       ├── shop/[segment]/
│   │       ├── product/[slug]/
│   │       ├── cart/, wishlist/, checkout/
│   │       └── (admin)/admin/
│   ├── components/
│   │   ├── storefront/
│   │   ├── admin/
│   │   └── ui/
│   ├── lib/
│   │   ├── db.ts                     # Drizzle client
│   │   ├── schema.ts                 # Drizzle schema
│   │   └── supabase/                 # SSR + client helpers
│   ├── i18n/
│   │   ├── routing.ts
│   │   └── request.ts
│   ├── messages/
│   │   ├── en.json
│   │   └── bn.json
│   ├── styles/                       # Ported from prototype
│   └── middleware.ts
├── supabase/migrations/              # Schema migrations
├── scripts/seed.ts                   # Curated 12 catalogue
└── drizzle.config.ts
```

## Commands

| Command | What it does |
|---|---|
| `npm run dev` | Local dev at :3000 |
| `npm run build` | Production build |
| `npm run typecheck` | TypeScript check |
| `npm run db:generate` | Generate Drizzle migration from schema |
| `npm run db:migrate` | Apply migrations to DB |
| `npm run db:seed` | Seed curated 12 products |
| `npm run db:studio` | Open Drizzle Studio (visual DB browser) |

## Deploy to Vercel

1. Push to GitHub
2. Import repo at vercel.com
3. Add env vars from `.env`
4. Deploy

Vercel auto-deploys every PR with a preview URL.

> Codex will review your output once you are done
