import type { ContentScriptContext } from "wxt/utils/content-script-context";

import type { SiteAdapter } from "../adapters/BaseAdapter";

import type { JobApplication, NewApplicationPayload } from "../types";

import { promptUserForConfirmation } from "./uiInjector";

import { getJobIdentityKey } from "./jobIdentity";

function looksLikeConfirmationTitle(value: string | null | undefined) {
  if (!value) {
    return false;
  }

  const text = value.toLowerCase();

  return [
    "thank you for applying",
    "thanks for applying",
    "application submitted",
    "application received",
    "application successfully submitted",
  ].some((phrase) => text.includes(phrase));
}

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
  let activeJobKey: string | null = null;

  let savedCurrentJob = false;

  let detectionInProgress = false;

  let queuedConfidence: number | null = null;

  let lastUrl = window.location.href;

  function registerActiveJob(details: Partial<JobApplication>) {
    const key = getJobIdentityKey(details);

    if (key && key !== activeJobKey) {
      activeJobKey = key;

      /*
       * New job in the same SPA tab.
       */
      savedCurrentJob = false;
    }
  }

  async function cacheCurrentJob() {
    if (ctx.isInvalid) {
      return;
    }

    const details = adapter.extractJobDetails();

    if (!details || (!details.jobTitle && !details.company)) {
      return;
    }

    if (looksLikeConfirmationTitle(details.jobTitle)) {
      return;
    }

    registerActiveJob(details);

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

  function scheduleNavigationCache() {
    setTimeout(() => {
      void cacheCurrentJob();
    }, 250);

    setTimeout(() => {
      void cacheCurrentJob();
    }, 1000);
  }

  const navigationTimer = window.setInterval(() => {
    if (ctx.isInvalid) {
      clearInterval(navigationTimer);

      return;
    }

    const currentUrl = window.location.href;

    if (currentUrl === lastUrl) {
      return;
    }

    lastUrl = currentUrl;

    console.log("JobTrack: SPA navigation detected", currentUrl);

    scheduleNavigationCache();
  }, 750);

  window.addEventListener(
    "pagehide",
    () => {
      clearInterval(navigationTimer);
    },
    {
      once: true,
    },
  );

  async function processDetection(applicationConfidence: number) {
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
     * page could now be a confirmation
     * screen.
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

    // Step 10G/H
    registerActiveJob(jobDetails);

    /*
     * If this job has already been saved,
     * ignore another low-confidence signal.
     */
    if (savedCurrentJob && applicationConfidence < 0.8) {
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
        // Important Step 10H line
        savedCurrentJob = true;

        await clearJobContext();
      } else {
        console.error("JobTrack: Application save failed", response?.message);
      }
    } catch (error) {
      console.error("Job Tracker: Failed sending application:", error);
    }
  }

  async function handleDetection(applicationConfidence: number) {
    /*
     * Already saved this job?
     * Ignore another weak signal.
     */
    if (savedCurrentJob && applicationConfidence < 0.8) {
      return;
    }

    /*
     * If another detection is already
     * being processed, don't open a
     * second prompt.
     *
     * Keep the strongest signal instead.
     */
    if (detectionInProgress) {
      queuedConfidence = Math.max(queuedConfidence ?? 0, applicationConfidence);

      return;
    }

    detectionInProgress = true;

    try {
      await processDetection(applicationConfidence);
    } finally {
      detectionInProgress = false;

      const nextConfidence = queuedConfidence;

      queuedConfidence = null;

      if (
        nextConfidence !== null &&
        (!savedCurrentJob || nextConfidence >= 0.8)
      ) {
        void handleDetection(nextConfidence);
      }
    }
  }

  adapter.observeApplicationProcess((applicationConfidence) => {
    void handleDetection(applicationConfidence);
  });
}
