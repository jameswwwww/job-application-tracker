import { IndeedAdapter } from "../src/adapters/platforms/IndeedAdapter";
import { promptUserForConfirmation } from "../src/utils/uiInjector";
import "../assets/content.css";

export default defineContentScript({
  // Target Indeed job view pages globally
  matches: ["*://*.indeed.com/viewjob*", "*://*.indeed.com/jobs*"],
  cssInjectionMode: "ui",

  main(ctx) {
    console.log("Job Tracker: Indeed Content Script Injected");

    const adapter = new IndeedAdapter();

    adapter.observeApplicationProcess(async (confidenceScore) => {
      if (ctx.isInvalid) {
        console.warn(
          "Job Tracker: Extension context invalidated. Please refresh.",
        );
        return;
      }

      const jobDetails = adapter.extractJobDetails();

      if (!jobDetails) {
        console.warn(
          "Job Tracker: Application detected, but job details missing.",
        );
        return;
      }

      if (confidenceScore < 0.8) {
        const userConfirmed = await promptUserForConfirmation(ctx, jobDetails);
        if (!userConfirmed) {
          console.log("Job tracker: User cancelled the save.");
          return;
        }
      }

      const payload = {
        ...jobDetails,
        status: "Applied",
        confidenceScore: 1.0,
        applicationDate: new Date().toISOString(),
      };

      console.log("Sending Indeed payload:", payload);

      browser.runtime
        .sendMessage({
          type: "APPLICATION_DETECTED",
          payload,
        })
        .catch((error) => {
          console.error(
            "Job Tracker: Failed to communicate with background:",
            error,
          );
        });
    });
  },
});
