import { BambooHRAdapter } from "../src/adapters/ats/BambooHRAdapter";

import { setupApplicationTracking } from "../src/utils/applicationHandler";

import "../assets/content.css";

export default defineContentScript({
  matches: ["*://*.bamboohr.com/*"],

  cssInjectionMode: "ui",

  main(ctx) {
    const adapter = new BambooHRAdapter();

    /*
     * Ignore BambooHR pages that
     * aren't individual job postings.
     */
    const details = adapter.extractJobDetails();

    if (!details) {
      return;
    }

    console.log("JobTrack: BambooHR job detected");

    setupApplicationTracking(ctx, adapter);
  },
});
