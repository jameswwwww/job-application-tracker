import { createClient } from "@supabase/supabase-js";

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;

const supabaseKey = import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY;

if (!supabaseUrl || !supabaseKey) {
  throw new Error("Missing Supabase environment variables.");
}

/**
 * Store the Supabase session inside
 * chrome.storage.local instead of normal
 * browser localStorage.
 *
 * This lets the popup, dashboard and
 * background worker share one session.
 */
const extensionStorage = {
  async getItem(key: string): Promise<string | null> {
    const result = await browser.storage.local.get(key);

    const value = result[key];

    return typeof value === "string" ? value : null;
  },

  async setItem(key: string, value: string): Promise<void> {
    await browser.storage.local.set({
      [key]: value,
    });
  },

  async removeItem(key: string): Promise<void> {
    await browser.storage.local.remove(key);
  },
};

export const supabase = createClient(supabaseUrl, supabaseKey, {
  auth: {
    storage: extensionStorage,

    persistSession: true,

    autoRefreshToken: true,

    flowType: "pkce",

    // OAuth is completed explicitly through browser.identity so the popup,
    // dashboard and background worker keep sharing the same stored session.
    detectSessionInUrl: false,
  },
});
