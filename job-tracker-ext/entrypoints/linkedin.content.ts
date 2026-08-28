import { LinkedInAdapter } from "../src/adapters/platforms/LinkedInAdapter";
import { setupApplicationTracking } from "../src/utils/applicationHandler";
import "../assets/content.css";

export default defineContentScript({
  matches: ["*://*.linkedin.com/jobs/*"],
  cssInjectionMode: "ui",

  main(ctx) {
    console.log("Job Tracker: LinkedIn Content Script Injected");

    const adapter = new LinkedInAdapter();

    setupApplicationTracking(ctx, adapter);
  },
});
