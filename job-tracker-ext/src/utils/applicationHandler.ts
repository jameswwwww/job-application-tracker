import type { ContentScriptContext } from "wxt/utils/content-script-context";
import type { SiteAdapter } from "../adapters/BaseAdapter";
import type { JobApplication } from "../types";
import { promptUserForConfirmation } from "./uiInjector";

export function setupApplicationTracking(
  ctx: ContentScriptContext,
  adapter: SiteAdapter,
) {
  adapter.observeApplicationProcess(async (applicationConfidence) => {
    if (ctx.isInvalid) {
      console.warn(
        "Job Tracker: Extension context invalidated. Refresh the page.",
      );

      return;
    }

    const jobDetails = adapter.extractJobDetails();

    if (!jobDetails) {
      console.warn(
        "Job Tracker: Application detected but job details could not be extracted.",
      );

      return;
    }

    let userConfirmed = false;

    // Requirement:
    // Below 80% confidence -> ask the user
    if (applicationConfidence < 0.8) {
      userConfirmed = await promptUserForConfirmation(ctx, jobDetails);

      if (!userConfirmed) {
        console.log("Job Tracker: User said application was not submitted.");

        return;
      }
    }

    const now = new Date().toISOString();

    const payload: Omit<JobApplication, "id" | "createdAt" | "updatedAt"> = {
      company: jobDetails.company || "Unknown Company",
      jobTitle: jobDetails.jobTitle || "Unknown Role",

      location: jobDetails.location || null,
      salary: jobDetails.salary || null,
      jobType: jobDetails.jobType || null,

      platform: jobDetails.platform || adapter.platformName,

      jobUrl: jobDetails.jobUrl || window.location.href,

      applicationDate: now,

      status: "Applied",

      extractionConfidence: jobDetails.extractionConfidence ?? 0.5,

      applicationConfidence,

      source: "automatic",

      extractionMethod: jobDetails.extractionMethod ?? "generic-dom",

      userConfirmed,

      notes: "",
    };

    console.log("Job Tracker: Saving application:", payload);

    browser.runtime
      .sendMessage({
        type: "APPLICATION_DETECTED",
        payload,
      })
      .catch((error) => {
        console.error("Job Tracker: Failed sending application:", error);
      });
  });
}
