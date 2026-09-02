# Job Application Tracker extension

A WXT and Vue browser extension for detecting, saving and syncing job
applications.

## Development

```bash
bun install
bun run dev
```

## Google sign-in setup

The extension completes Supabase OAuth through the browser identity API.
Chromium builds use the stable extension ID
`ockjpmilgdlmbbonhhidiodbbjghfacb`, including when the zip is unpacked into a
different directory. Add this exact callback URL to Supabase:

```text
https://ockjpmilgdlmbbonhhidiodbbjghfacb.chromiumapp.org/supabase-auth
```

Add that complete URL in **Supabase Dashboard → Authentication → URL
Configuration → Redirect URLs**. The stable ID also keeps
`chrome.storage.local` attached to the same extension across repacked local
builds, so the Supabase session survives Chrome extension reloads. The first
build containing the fixed ID is a new extension identity, so sign in once
after installing it; subsequent build refreshes keep that session.

In the Google Cloud OAuth client, keep Supabase's callback URL as the authorized
redirect URI:

```text
https://<project-ref>.supabase.co/auth/v1/callback
```

Supabase then redirects the completed login to the extension callback above.

## Supabase database migrations

Run the SQL files under `../supabase/migrations` against the Supabase project in
filename order. Without the sync-schema migration, application uploads fail
because the extension sends the `tags` field while the cloud table does not
have that column, and status-event uploads can then fail their ownership policy
because the parent application was never created.

For a hosted project without the Supabase CLI, copy the migration into
**Supabase Dashboard → SQL Editor** and select **Run**. Reload the extension and
use **Sync now** after the migration succeeds.
