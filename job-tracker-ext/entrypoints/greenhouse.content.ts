import { GreenhouseAdapter } from "../src/adapters/ats/GreenhouseAdapter";

import { setupApplicationTracking } from "../src/utils/applicationHandler";

import "../assets/content.css";

export default defineContentScript({
  matches: ["*://*.greenhouse.io/*", "*://boards.greenhouse.io/*"],

  cssInjectionMode: "ui",

  main(ctx) {
    console.log("JobTrack: Greenhouse detected");

    setupApplicationTracking(ctx, new GreenhouseAdapter());
  },
});
