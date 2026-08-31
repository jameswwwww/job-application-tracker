import { SmartRecruitersAdapter } from "../src/adapters/ats/SmartRecruitersAdapter";

import { setupApplicationTracking } from "../src/utils/applicationHandler";

import "../assets/content.css";

export default defineContentScript({
  matches: ["*://jobs.smartrecruiters.com/*"],

  cssInjectionMode: "ui",

  main(ctx) {
    console.log("JobTrack: SmartRecruiters detected");

    setupApplicationTracking(ctx, new SmartRecruitersAdapter());
  },
});
