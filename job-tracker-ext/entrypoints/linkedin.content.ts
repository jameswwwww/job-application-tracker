import { LinkedInAdapter } from "../src/adapters/platforms/LinkedInAdapter";

export default defineContentScript({
  matches: ["*://*.linkedin.com/jobs/*"],

  main(ctx) {
    console.log("Job Tracker: LinkedIn Content Script Injected");

    const adapter = new LinkedInAdapter();

    adapter.observeApplicationProcess((confidenceScore) => {
      // 1. Check if WXT hot-reloaded the extension in the background
      if (ctx.isInvalid) {
        console.warn(
          "Job Tracker: Extension context was invalidated. Please refresh the LinkedIn page.",
        );
        return;
      }

      // 2. Scrape the DOM
      const jobDetails = adapter.extractJobDetails();

      // 3. Defensive check: Did LinkedIn change their UI classes?
      if (!jobDetails) {
        console.warn(
          "Job Tracker: Application detected, but job details could not be extracted. Selectors may need updating.",
        );
        return;
      }

      const payload = {
        ...jobDetails,
        status: "Applied",
        confidenceScore,
        applicationDate: new Date().toISOString(),
      };

      console.log("Sending job payload to background worker:", payload);

      // 4. Send payload with explicit error catching
      browser.runtime
        .sendMessage({
          type: "APPLICATION_DETECTED",
          payload,
        })
        .then((response) => {
          console.log("Job Tracker: Background saved successfully:", response);
        })
        .catch((error) => {
          console.error(
            "Job Tracker: Failed to communicate with background worker:",
            error,
          );
        });
    });
  },
});
