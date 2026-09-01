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
    permissions: ["storage", "alarms"],
    icons: {
      16: "icon/16.png",
      32: "icon/32.png",
      48: "icon/48.png",
      96: "icon/96.png",
      128: "icon/128.png",
    },
  },
});
