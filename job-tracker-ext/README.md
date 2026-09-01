# Job Application Tracker extension

A WXT and Vue browser extension for detecting, saving and syncing job
applications.

## Development

```bash
bun install
bun run dev
```

## Google sign-in setup

The extension completes Supabase OAuth through the browser identity API. After
loading the unpacked extension, attempt Google sign-in once. If its callback is
not configured yet, the error in the auth modal will show the exact URL, for
example:

```text
https://<extension-id>.chromiumapp.org/supabase-auth
```

Add that complete URL in **Supabase Dashboard → Authentication → URL
Configuration → Redirect URLs**. Use an exact extension ID for production. For
local development across changing extension IDs, Supabase redirect URL glob
patterns can be used temporarily.

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
