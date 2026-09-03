import { defineConfig } from "wxt";
import tailwindcss from "@tailwindcss/vite";

/*
 * Chrome scopes extension storage and OAuth redirects to the extension ID.
 * Pinning the public key keeps that ID stable when a zip is unpacked into a
 * different directory for local testing. This is intentionally a public key;
 * no signing secret is stored in the repository.
 */
const CHROMIUM_EXTENSION_KEY =
  "MIIBIjANBgkqhkiG9w0BAQEFAAOCAQ8AMIIBCgKCAQEAgrlGqw2HEVUXeu/hGOu9Yz0P/yjAtJSa2lbVGORcvdBsCMRHky2V8WhlaaEUhWno38xSTpaCWfXe/Z4Tn9JI8uBB9+PiPsfFj1M5p7YWQZmhm8M44K6CbTIv9Ew0tb1XHhfXIKKwJ+5+kRstc5kEQJw5uZNlRGAHMzjQVCnMvI8j4OMSGjV5h6T/lwozMXERBwFS49FxTnoyxGOHELsK4PSG8/4LtKvSOl58LXB7ul3H56Wx4qbcG8yBRs4J19MOQjS5ihVbXx1lPK2rbvYSnPBOu9+fQu6YJ9ZgGoiZd6d8eKwZmnwRN7nj5Q0MqC8lvOUvkRACbS70Lb0ojLT1hwIDAQAB";

export default defineConfig({
  modules: ["@wxt-dev/module-vue"],

  vite: () => ({
    plugins: [tailwindcss()],
  }),

  manifest: ({ browser }) => ({
    name: "JobGuard MY",
    description: "Malaysian job application, salary, and scam tracker.",
    permissions: ["storage", "alarms", "identity"],
    ...(browser === "firefox" ? {} : { key: CHROMIUM_EXTENSION_KEY }),
    icons: {
      16: "icon/16.png",
      32: "icon/32.png",
      48: "icon/48.png",
      96: "icon/96.png",
      128: "icon/128.png",
    },
  }),
});
