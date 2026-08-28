import { GreenhouseAdapter } from "../src/adapters/ats/GreenhouseAdapter";
import { GenericAdapter } from "../src/adapters/GenericAdapter";
import { promptUserForConfirmation } from "../src/utils/uiInjector";
import "../assets/content.css";

export default defineContentScript({
  matches: ["<all_urls>"],
  excludeMatches: [
    "*://*.linkedin.com/*",
    "*://*.jobstreet.com.my/*",
    "*://*.indeed.com/*",
  ], // Don't run on sites that already have dedicated adapters
  cssInjectionMode: "ui",

  main(ctx) {
    if (ctx.isInvalid) return;

    // Determine Adapter
    let adapter;
    const htmlContent = document.documentElement.innerHTML;

    if (
      window.location.hostname.includes("greenhouse.io") ||
      htmlContent.includes("grnhse")
    ) {
      console.log("JobTrack: ATS Detected - Greenhouse");
      adapter = new GreenhouseAdapter();
    } else {
      adapter = new GenericAdapter();
    }

    // Only proceed if we actually find job details
    const jobDetails = adapter.extractJobDetails();
    if (!jobDetails) return;

    console.log("JobTrack: Global job details extracted:", jobDetails);

    adapter.observeApplicationProcess(async (confidenceScore) => {
      if (ctx.isInvalid) return;

      if (confidenceScore < 0.8) {
        const userConfirmed = await promptUserForConfirmation(ctx, jobDetails);
        if (!userConfirmed) return;
      }

      const payload = {
        ...jobDetails,
        status: "Applied",
        confidenceScore: 1.0,
        applicationDate: new Date().toISOString(),
      };

      browser.runtime
        .sendMessage({
          type: "APPLICATION_DETECTED",
          payload,
        })
        .catch(console.error);
    });
  },
});
