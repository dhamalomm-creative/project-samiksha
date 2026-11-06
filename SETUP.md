# Getting Samiksha live

About 30 minutes, no coding. Everything here is free to start. You'll need a Supabase account, a Vercel account and your GitHub repo.

## 1. Create the backend (Supabase)

Use a **new** project. This schema replaces the old tables, so running it on the old project will fail.

1. At [supabase.com](https://supabase.com), create a project. Pick the **Mumbai** region (`ap-south-1`) so it's fast for Indian users.
2. Open **SQL Editor**, paste all of `supabase/migrations/0001_init.sql`, and click **Run**.
3. Open **Project Settings > API** and copy the Project URL and the anon public key.

## 2. Run it on your computer

1. Copy `.env.example` to `.env.local` and fill in those two values. If a `.env.local` already exists from testing, overwrite it.
2. Run:

```bash
npm install
```

```bash
npm run dev
```

3. Open http://localhost:3000 and sign up.

Supabase sends a confirmation email by default. To skip it during development, turn off **Confirm email** under **Authentication > Sign In / Providers**. Turn it back on before launch.

## 3. Make email links reliable

Without this change, a confirmation link opened on a different device than the one used to sign up shows an error. Under **Authentication > Emails**, set the link in these two templates:

| Template | Link |
| --- | --- |
| Confirm signup | `{{ .SiteURL }}/auth/callback?token_hash={{ .TokenHash }}&type=email&next=/onboarding` |
| Reset password | `{{ .SiteURL }}/auth/callback?token_hash={{ .TokenHash }}&type=recovery&next=/reset-password` |

## 4. Turn on Google login

1. In [Google Cloud Console](https://console.cloud.google.com), create an OAuth client of type **Web application**.
2. Add `https://YOUR-PROJECT.supabase.co/auth/v1/callback` as an authorised redirect URI.
3. In Supabase under **Authentication > Sign In / Providers > Google**, paste the client ID and secret.

## 5. Deploy (Vercel)

1. Push the code to GitHub, then import the repo at [vercel.com](https://vercel.com).
2. Add these environment variables:

| Name | Value |
| --- | --- |
| `NEXT_PUBLIC_SUPABASE_URL` | From step 1 |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | From step 1 |
| `NEXT_PUBLIC_SITE_URL` | Your live address, such as `https://samiksha.vercel.app` |
| `NEXT_PUBLIC_CONTACT_EMAIL` | The address shown on your Privacy and Terms pages |

3. In Supabase under **Authentication > URL Configuration**, set **Site URL** to your live address and add `https://your-address/**` to **Redirect URLs**.

## Before real users arrive

- **Set up custom email.** Supabase's built-in email sender allows only a few messages an hour, so a launch day would hit the limit quickly. Connect an email provider such as Resend or Brevo under **Authentication > Emails > SMTP Settings**.
- **Keep the project awake.** Free Supabase projects pause after about a week of no activity. Upgrade to Pro before relying on it.
- **Get the legal pages reviewed.** `app/(legal)/privacy` and `app/(legal)/terms` are plain-language drafts, not legal advice. Have someone check them against India's DPDP Act and IT Rules. India's rules may require a named grievance officer once you have real users.
- **Check reports regularly.** There's no admin screen yet. See them in Supabase under **Table Editor > reports**, and delete offending content from the same place.
- **Turn on backups.** Daily backups come with the Pro plan.

## Tests

```bash
npm test
```

This runs the logic tests and the security tests against a real, throwaway Postgres database. No Supabase account needed.

### Working without Supabase

`tests/local-stack.mjs` imitates Supabase on your machine, with real Postgres and security rules, but fake login and file storage. It needs the [PostgREST](https://github.com/PostgREST/postgrest/releases) program. Instructions are at the top of that file. Data vanishes when it stops, and Google login and emails don't work in this mode.
