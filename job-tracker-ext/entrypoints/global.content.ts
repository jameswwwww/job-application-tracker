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
  ],

  cssInjectionMode: "ui",

  main(ctx) {
    if (ctx.isInvalid) return;

    const htmlContent = document.documentElement.innerHTML;

    let adapter;

    if (
      window.location.hostname.includes("greenhouse.io") ||
      htmlContent.includes("grnhse")
    ) {
      console.log("Job Tracker: Greenhouse ATS detected");

      adapter = new GreenhouseAdapter();
    } else {
      adapter = new GenericAdapter();
    }

    const jobDetails = adapter.extractJobDetails();

    // Do not start tracking random webpages
    if (!jobDetails) {
      return;
    }

    console.log("Job Tracker: Job page detected", jobDetails);

    setupApplicationTracking(ctx, adapter);
  },
});
