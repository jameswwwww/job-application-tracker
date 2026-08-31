import { GreenhouseAdapter } from "../src/adapters/ats/GreenhouseAdapter";
import { GenericAdapter } from "../src/adapters/GenericAdapter";
import { setupApplicationTracking } from "../src/utils/applicationHandler";
import "../assets/content.css";

export default defineContentScript({
  matches: ["<all_urls>"],

  excludeMatches: [
    "*://*.linkedin.com/*",
    "*://*.jobstreet.com/*",
    "*://*.jobstreet.com.my/*",
    "*://*.indeed.com/*",
    "*://*.lever.co/*",
    "*://*.myworkdayjobs.com/*",
    "*://*.myworkdaysite.com/*",
  ],

  cssInjectionMode: "ui",

  main(ctx) {
    if (ctx.isInvalid) {
      return;
    }

    const htmlContent = document.documentElement.innerHTML;

    if (
      window.location.hostname.includes("greenhouse.io") ||
      htmlContent.includes("grnhse")
    ) {
      console.log("Job Tracker: Greenhouse ATS detected");

      const adapter = new GreenhouseAdapter();

      setupApplicationTracking(ctx, adapter);

      return;
    }

    const adapter = new GenericAdapter();

    const jobDetails = adapter.extractJobDetails();

    if (!jobDetails) {
      return;
    }

    console.log("Job Tracker: Generic job page detected", jobDetails);

    setupApplicationTracking(ctx, adapter);
  },
});
