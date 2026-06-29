# Supabase + Resend Setup

One-time setup to switch Council of Days from local-only state to real
email-based auth and a shared Postgres database. Follow top-to-bottom.

Time required: ~15 minutes.

---

## 1. Create a Supabase project

1. Sign in at [supabase.com](https://supabase.com) (use the same account you
   want for billing later — the free tier is plenty to start).
2. Click **New project**.
   - Name: `council-of-days`
   - Database password: generate a strong one and stash it in your password
     manager. You will not need it day-to-day.
   - Region: pick the one closest to your Vercel deployment region
     (Vercel's default is **Washington, D.C. (iad1)** — choose
     `East US (North Virginia)` to match, or `Frankfurt` if you switched
     Vercel to `fra1`).
3. Wait ~1 minute for provisioning.

## 2. Grab the API keys

Once the project is ready:

1. **Project Settings → API**.
2. Copy these three values, you'll need them in step 6:

   | Label                          | Goes into env var                  |
   | ------------------------------ | ---------------------------------- |
   | Project URL                    | `NEXT_PUBLIC_SUPABASE_URL`         |
   | Project API keys → `anon`      | `NEXT_PUBLIC_SUPABASE_ANON_KEY`    |
   | Project API keys → `service_role` (click "Reveal") | `SUPABASE_SERVICE_ROLE_KEY` |

   The `service_role` key bypasses Row-Level Security. Never expose it
   to the browser — only the server can use it.

## 3. Run the database migration

1. **SQL Editor → New query**.
2. Open `supabase/migrations/0001_init.sql` from this repo, paste the
   entire contents into the editor, click **Run**.
3. You should see "Success. No rows returned." Verify under
   **Table Editor** that `profiles`, `campaigns`, `campaign_members`,
   `invitations`, and `votes` all exist.

## 4. Configure Auth providers

1. **Authentication → Providers → Email**.
2. Settings:
   - **Enable Email provider**: on
   - **Confirm email**: **off** (we use passwordless magic links;
     possession of the inbox is the confirmation)
   - **Secure email change**: on
   - **Allow new users to sign up**: on
3. Click **Save**.

## 5. Configure URL allow-list

Without this, magic-link clicks will land on Supabase's "redirect not
allowed" error page.

1. **Authentication → URL Configuration**.
2. **Site URL**: your production URL, e.g. `https://council-of-days.vercel.app`
3. **Redirect URLs** — add each of these on its own line:
   - `http://localhost:3000/auth/callback`
   - `https://council-of-days.vercel.app/auth/callback`
   - `https://council-of-days-*.vercel.app/auth/callback`
     (the wildcard covers Vercel preview URLs for PRs)
4. **Save**.

## 6. Wire up Resend for outbound email

This is what turns your verified domain into the magic-link sender.

1. In Resend, go to **API Keys → Create API Key**, name it
   `supabase-smtp`, scope **Full access**. Copy the `re_...` key.
2. In Supabase: **Authentication → Emails → SMTP Settings**.
3. **Enable Custom SMTP**: on. Fill in:
   - Sender email: `noreply@<your-verified-domain>` (must be on the
     verified domain — pick any local-part you like; you can also use
     `council@<your-verified-domain>`)
   - Sender name: `Council of Days`
   - Host: `smtp.resend.com`
   - Port: `465`
   - Username: `resend`
   - Password: the `re_...` API key from step 6.1
   - **Minimum interval between emails**: leave at default
4. **Save**.

## 7. Customize the magic-link email (optional but nice)

1. **Authentication → Emails → Email Templates → Magic Link**.
2. Subject: `Your seat at the table — Council of Days`
3. Body (HTML — overwrite the default):

   ```html
   <h2 style="font-family: 'Cinzel', serif; color: #2B2118;">
     The council awaits, {{ .Email }}.
   </h2>
   <p style="color: #5A4A38;">
     Click below to take your seat. The link expires in fifteen minutes
     and may be used only once.
   </p>
   <p>
     <a href="{{ .ConfirmationURL }}"
        style="display:inline-block;background:#6B2230;color:#F6EFE0;
               padding:12px 24px;border-radius:8px;text-decoration:none;
               font-family:'Cinzel',serif;letter-spacing:0.05em;">
       Enter the council
     </a>
   </p>
   <p style="color:#5A4A3899;font-size:12px;">
     If you didn't request this, you may safely ignore the message.
   </p>
   ```
4. **Save**.

## 8. Set environment variables

### Local (`.env.local`)

Create `/Users/Felix.Hoge/CouncilOfDays/.env.local` with:

```bash
NEXT_PUBLIC_SUPABASE_URL=https://<project-ref>.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJ...
SUPABASE_SERVICE_ROLE_KEY=eyJ...
NEXT_PUBLIC_SITE_URL=http://localhost:3000
```

Restart `npm run dev` after creating the file.

### Vercel

1. Project → **Settings → Environment Variables**.
2. Add all four variables above for **Production**, **Preview**, and
   **Development**. For the production `NEXT_PUBLIC_SITE_URL`, use
   `https://council-of-days.vercel.app` (or whatever your prod URL is).
3. Trigger a redeploy so the new env vars take effect
   (push a commit, or **Deployments → ⋯ → Redeploy** on the latest one).

## 9. Smoke test

1. `npm run dev`
2. Open `http://localhost:3000/login`, type your real email, send.
3. Check your inbox — the magic-link email should arrive within seconds.
   The "From" address should be your verified Resend domain.
4. Click the link. You should land on `/profile` already signed in.
5. Fill in the profile form, save. You should be sent to `/new`.
6. Create a campaign, invite a second email (yours with a `+test`
   alias works), open the magic link in an incognito window, log in as
   that user, vote on a day. Refresh the first window — votes should
   show up.

If anything misfires, check:

- **Supabase → Logs → Auth** for failed sign-in attempts (wrong redirect
  URL is the most common cause).
- **Supabase → Logs → Postgres** for RLS denials (a `policy violation`
  error means a code path is hitting a table without the right user
  context).
- **Resend → Logs** for delivery failures.

---

## Reference: which keys go where

| Variable                          | Used by                  | Safe in browser? |
| --------------------------------- | ------------------------ | ---------------- |
| `NEXT_PUBLIC_SUPABASE_URL`        | server + browser clients | yes              |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY`   | server + browser clients | yes (RLS enforced) |
| `SUPABASE_SERVICE_ROLE_KEY`       | server-only (admin ops)  | **NO** — never expose |
| `NEXT_PUBLIC_SITE_URL`            | redirect URL builder     | yes              |
