import { LeverAdapter } from "../src/adapters/ats/LeverAdapter";

import { setupApplicationTracking } from "../src/utils/applicationHandler";

import "../assets/content.css";

export default defineContentScript({
  matches: ["*://*.lever.co/*"],

  cssInjectionMode: "ui",

  main(ctx) {
    console.log("JobTrack: Lever detected");

    const adapter = new LeverAdapter();

    /*
     * Always start tracking.
     * Confirmation pages may no
     * longer contain job metadata,
     * but applicationHandler can use
     * cached job context.
     */
    setupApplicationTracking(ctx, adapter);
  },
});
