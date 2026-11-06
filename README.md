# Samiksha

A social wishlist for meaningful gifting. Make a wishlist, share one link, and friends reserve gifts in secret, so nobody doubles up and the surprise survives.

To get it running, follow [SETUP.md](SETUP.md).

## Stack

- **Frontend and server logic:** Next.js 16, React 19, TypeScript, Tailwind CSS 4
- **Database, login and file storage:** Supabase (Postgres)
- **Hosting:** Vercel

## How it's organised

| Path | What's there |
| --- | --- |
| `app/(main)` | The app: home feed, discover, wishlist, gifts, collections, occasions, profiles |
| `app/(auth)` | Login, signup, password reset |
| `app/(legal)` | Privacy and terms |
| `lib/actions` | Server actions: everything that changes data |
| `lib/validation.ts` | Rules for what users can submit |
| `supabase/migrations` | Database tables, triggers and security rules |
| `tests` | Security, logic and local-stack tooling |

## Rules worth knowing

- **Security lives in the database.** Row level security and column grants in the migration are what protect data. Any new table needs both, and needs tests in `tests/db/security.test.ts`.
- **The surprise is sacred.** A wish's owner must never be able to tell a gift was reserved: no badge, no notification, no count. `wish_reservations()` deliberately returns nothing to the owner.
- **Forms use `useActionForm`** from `components/form-bits.tsx`, which keeps typed values when validation fails and still posts securely before JavaScript loads.
