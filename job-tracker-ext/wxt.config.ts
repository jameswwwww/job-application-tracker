import { defineConfig } from "wxt";
import tailwindcss from "@tailwindcss/vite";

export default defineConfig({
  modules: ["@wxt-dev/module-vue"],

  vite: () => ({
    plugins: [tailwindcss()],
  }),

  manifest: {
    name: "Job Application Tracker",
    description: "Automated tracking pipeline for job applications.",
    version: "1.0.0",
    permissions: ["storage", "activeTab", "scripting"],
    host_permissions: [
      "*://*.linkedin.com/*",
      "*://*.jobstreet.com.my/*",
      "*://*.indeed.com/*",
      "<all_urls>",
    ],
  },
});
