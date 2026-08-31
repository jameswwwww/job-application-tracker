import { AshbyAdapter } from "../src/adapters/ats/AshbyAdapter";

import { setupApplicationTracking } from "../src/utils/applicationHandler";

import "../assets/content.css";

export default defineContentScript({
  matches: ["*://jobs.ashbyhq.com/*"],

  cssInjectionMode: "ui",

  main(ctx) {
    console.log("JobTrack: Ashby detected");

    setupApplicationTracking(ctx, new AshbyAdapter());
  },
});
