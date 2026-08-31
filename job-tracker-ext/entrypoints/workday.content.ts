import { WorkdayAdapter } from "../src/adapters/ats/WorkdayAdapter";

import { setupApplicationTracking } from "../src/utils/applicationHandler";

import "../assets/content.css";

export default defineContentScript({
  matches: ["*://*.myworkdayjobs.com/*", "*://*.myworkdaysite.com/*"],

  cssInjectionMode: "ui",

  main(ctx) {
    console.log("JobTrack: Workday detected");

    const adapter = new WorkdayAdapter();

    setupApplicationTracking(ctx, adapter);
  },
});
