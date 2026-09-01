import { beforeEach, describe, expect, it, vi } from "vitest";

const auth = vi.hoisted(() => ({
  exchangeCodeForSession: vi.fn(),
  setSession: vi.fn(),
  signInWithOAuth: vi.fn(),
}));

vi.mock("../../src/services/supabase", () => ({
  supabase: { auth },
}));

import {
  getGoogleOAuthRedirectUrl,
  signInWithGoogle,
} from "../../src/services/authService";

const redirectUrl =
  "https://abcdefghijklmnop.chromiumapp.org/supabase-auth";
const launchWebAuthFlow = vi.fn();

describe("Google extension OAuth", () => {
  beforeEach(() => {
    vi.clearAllMocks();

    vi.stubGlobal("browser", {
      identity: {
        getRedirectURL: vi.fn(() => redirectUrl),
        launchWebAuthFlow,
      },
    });
  });

  it("uses the browser identity callback and exchanges a PKCE code", async () => {
    auth.signInWithOAuth.mockResolvedValue({
      data: { url: "https://example.supabase.co/auth/v1/authorize" },
      error: null,
    });

    launchWebAuthFlow.mockResolvedValue(
      `${redirectUrl}?code=oauth-code`,
    );

    auth.exchangeCodeForSession.mockResolvedValue({
      data: { session: { access_token: "access" } },
      error: null,
    });

    await expect(signInWithGoogle()).resolves.toEqual({
      session: { access_token: "access" },
    });

    expect(auth.signInWithOAuth).toHaveBeenCalledWith({
      provider: "google",
      options: {
        redirectTo: redirectUrl,
        skipBrowserRedirect: true,
      },
    });

    expect(browser.identity.launchWebAuthFlow).toHaveBeenCalledWith({
      url: "https://example.supabase.co/auth/v1/authorize",
      interactive: true,
    });

    expect(auth.exchangeCodeForSession).toHaveBeenCalledWith("oauth-code");
  });

  it("supports an implicit callback if the Supabase project still uses it", async () => {
    auth.signInWithOAuth.mockResolvedValue({
      data: { url: "https://example.supabase.co/auth/v1/authorize" },
      error: null,
    });

    launchWebAuthFlow.mockResolvedValue(
      `${redirectUrl}#access_token=access&refresh_token=refresh`,
    );

    auth.setSession.mockResolvedValue({
      data: { session: { access_token: "access" } },
      error: null,
    });

    await signInWithGoogle();

    expect(auth.setSession).toHaveBeenCalledWith({
      access_token: "access",
      refresh_token: "refresh",
    });
  });

  it("shows the exact Supabase redirect URL when the auth page fails", async () => {
    auth.signInWithOAuth.mockResolvedValue({
      data: { url: "https://example.supabase.co/auth/v1/authorize" },
      error: null,
    });

    launchWebAuthFlow.mockRejectedValue(
      new Error("Authorization page could not be loaded."),
    );

    await expect(signInWithGoogle()).rejects.toThrow(
      `Authorization page could not be loaded. Add ${redirectUrl} to Supabase Authentication > URL Configuration > Redirect URLs.`,
    );

    expect(getGoogleOAuthRedirectUrl()).toBe(redirectUrl);
  });
});
