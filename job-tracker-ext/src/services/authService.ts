import { supabase } from "./supabase";

const OAUTH_REDIRECT_PATH = "supabase-auth";

function callbackParameters(callbackUrl: string) {
  const url = new URL(callbackUrl);
  const parameters = new URLSearchParams(url.search);

  const hash = url.hash.startsWith("#") ? url.hash.slice(1) : url.hash;

  for (const [key, value] of new URLSearchParams(hash)) {
    if (!parameters.has(key)) {
      parameters.set(key, value);
    }
  }

  return parameters;
}

export function getGoogleOAuthRedirectUrl() {
  return browser.identity.getRedirectURL(OAUTH_REDIRECT_PATH);
}

export async function signInWithGoogle() {
  const redirectTo = getGoogleOAuthRedirectUrl();

  const { data, error } = await supabase.auth.signInWithOAuth({
    provider: "google",
    options: {
      redirectTo,
      skipBrowserRedirect: true,
    },
  });

  if (error) {
    throw error;
  }

  if (!data.url) {
    throw new Error("Supabase did not return a Google authorization URL.");
  }

  let callbackUrl: string | undefined;

  try {
    callbackUrl = await browser.identity.launchWebAuthFlow({
      url: data.url,
      interactive: true,
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);

    throw new Error(
      `${message} Add ${redirectTo} to Supabase Authentication > URL Configuration > Redirect URLs.`,
    );
  }

  if (!callbackUrl) {
    throw new Error("Google sign-in was cancelled before it completed.");
  }

  const parameters = callbackParameters(callbackUrl);
  const callbackError =
    parameters.get("error_description") ?? parameters.get("error");

  if (callbackError) {
    throw new Error(callbackError);
  }

  const code = parameters.get("code");

  if (code) {
    const { data: sessionData, error: exchangeError } =
      await supabase.auth.exchangeCodeForSession(code);

    if (exchangeError) {
      throw exchangeError;
    }

    return sessionData;
  }

  const accessToken = parameters.get("access_token");
  const refreshToken = parameters.get("refresh_token");

  if (!accessToken || !refreshToken) {
    throw new Error("Google sign-in completed without a Supabase session.");
  }

  const { data: sessionData, error: sessionError } =
    await supabase.auth.setSession({
      access_token: accessToken,
      refresh_token: refreshToken,
    });

  if (sessionError) {
    throw sessionError;
  }

  return sessionData;
}

export async function signUp(email: string, password: string) {
  const { data, error } = await supabase.auth.signUp({
    email,
    password,
  });

  if (error) {
    throw error;
  }

  return data;
}

export async function signIn(email: string, password: string) {
  const { data, error } = await supabase.auth.signInWithPassword({
    email,
    password,
  });

  if (error) {
    throw error;
  }

  return data;
}

export async function signOut() {
  const { error } = await supabase.auth.signOut();

  if (error) {
    throw error;
  }
}

export async function getCurrentUser() {
  /*
   * getSession() restores the session from chrome.storage.local and refreshes
   * it when necessary. A remote getUser() call on every dashboard load made a
   * temporary network failure look exactly like a sign-out after an extension
   * reload, even though the refresh token was still stored locally.
   */
  const { data, error } = await supabase.auth.getSession();

  if (error) {
    return null;
  }

  return data.session?.user ?? null;
}

export async function getCurrentUserId() {
  const user = await getCurrentUser();

  return user?.id ?? null;
}

export function onAuthChange(
  callback: (user: Awaited<ReturnType<typeof getCurrentUser>>) => void,
) {
  const { data } = supabase.auth.onAuthStateChange((_event, session) => {
    callback(session?.user ?? null);
  });

  return () => {
    data.subscription.unsubscribe();
  };
}

export async function getSessionUserId(): Promise<string | null> {
  const { data, error } = await supabase.auth.getSession();

  if (error) {
    return null;
  }

  return data.session?.user.id ?? null;
}
