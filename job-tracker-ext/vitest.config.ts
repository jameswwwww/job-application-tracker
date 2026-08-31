import { defineConfig } from "vitest/config";

export default defineConfig({
  test: {
    environment: "jsdom",

    environmentOptions: {
      jsdom: {
        url: "https://jobs.lever.co/acme/example-job",
      },
    },

    include: ["tests/**/*.test.ts"],

    clearMocks: true,
    restoreMocks: true,
  },
});
