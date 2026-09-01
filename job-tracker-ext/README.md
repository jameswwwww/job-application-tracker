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
