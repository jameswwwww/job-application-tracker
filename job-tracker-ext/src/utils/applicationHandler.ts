import type { ContentScriptContext } from "wxt/utils/content-script-context";

import type { SiteAdapter } from "../adapters/BaseAdapter";

import type { JobApplication, NewApplicationPayload } from "../types";

import { promptUserForConfirmation } from "./uiInjector";

async function cacheJobContext(details: Partial<JobApplication>) {
  try {
    await browser.runtime.sendMessage({
      type: "CACHE_JOB_CONTEXT",
      payload: details,
    });
  } catch (error) {
    console.warn("JobTrack: Unable to cache job context", error);
  }
}

async function getCachedJobContext(): Promise<Partial<JobApplication> | null> {
  try {
    const response = await browser.runtime.sendMessage({
      type: "GET_JOB_CONTEXT",
    });

    return response?.payload ?? null;
  } catch {
    return null;
  }
}

async function clearJobContext() {
  try {
    await browser.runtime.sendMessage({
      type: "CLEAR_JOB_CONTEXT",
    });
  } catch {
    // Non-critical cleanup.
  }
}

export function setupApplicationTracking(
  ctx: ContentScriptContext,
  adapter: SiteAdapter,
) {
  async function cacheCurrentJob() {
    if (ctx.isInvalid) {
      return;
    }

    const details = adapter.extractJobDetails();

    if (!details || (!details.jobTitle && !details.company)) {
      return;
    }

    await cacheJobContext(details);
  }

  /*
   * Cache immediately, then again
   * after SPA pages have had time
   * to finish rendering.
   */
  void cacheCurrentJob();

  setTimeout(() => {
    void cacheCurrentJob();
  }, 1000);

  setTimeout(() => {
    void cacheCurrentJob();
  }, 3000);

  adapter.observeApplicationProcess(async (applicationConfidence) => {
    if (ctx.isInvalid) {
      console.warn(
        "Job Tracker: Extension context invalidated. Refresh the page.",
      );

      return;
    }

    const currentDetails = adapter.extractJobDetails();

    const cachedDetails = await getCachedJobContext();

    /*
     * Prefer the cached job-page
     * information because the current
     * page could now be a "Thank you"
     * confirmation screen.
     */
    const jobDetails: Partial<JobApplication> = {
      jobTitle: cachedDetails?.jobTitle || currentDetails?.jobTitle,

      company: cachedDetails?.company || currentDetails?.company,

      location: cachedDetails?.location || currentDetails?.location || null,

      salary: cachedDetails?.salary || currentDetails?.salary || null,

      jobType: cachedDetails?.jobType || currentDetails?.jobType || null,

      platform:
        currentDetails?.platform ||
        cachedDetails?.platform ||
        adapter.platformName,

      jobUrl:
        cachedDetails?.jobUrl || currentDetails?.jobUrl || window.location.href,

      extractionConfidence:
        currentDetails?.extractionConfidence ??
        cachedDetails?.extractionConfidence ??
        0.5,

      extractionMethod:
        currentDetails?.extractionMethod ??
        cachedDetails?.extractionMethod ??
        "generic-dom",
    };

    if (!jobDetails.jobTitle && !jobDetails.company) {
      console.warn(
        "Job Tracker: Application detected but no job context was available.",
      );

      return;
    }

    let userConfirmed = false;

    if (applicationConfidence < 0.8) {
      userConfirmed = await promptUserForConfirmation(ctx, jobDetails);

      if (!userConfirmed) {
        console.log("Job Tracker: User said application was not submitted.");

        return;
      }
    }

    const now = new Date().toISOString();

    const payload: NewApplicationPayload = {
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

    try {
      const response = await browser.runtime.sendMessage({
        type: "APPLICATION_DETECTED",

        payload,
      });

      if (response?.status === "Success") {
        await clearJobContext();
      } else {
        console.error("JobTrack: Application save failed", response?.message);
      }
    } catch (error) {
      console.error("Job Tracker: Failed sending application:", error);
    }
  });
}
