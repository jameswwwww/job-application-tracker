import { JobStreetAdapter } from "../src/adapters/platforms/JobStreetAdapter";
import { promptUserForConfirmation } from "../src/utils/uiInjector";
import "../assets/content.css";

export default defineContentScript({
  matches: ["*://*.jobstreet.com.my/job/*"],
  cssInjectionMode: "ui",

  main(ctx) {
    console.log("Job Tracker: JobStreet Content Script Injected");

    const adapter = new JobStreetAdapter();

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
          console.log("Job Tracker: User cancelled the save.");
          return;
        }
      }

      const payload = {
        ...jobDetails,
        status: "Applied",
        confidenceScore: 1.0,
        applicationDate: new Date().toISOString(),
      };

      console.log("Sending JobStreet payload:", payload);

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
