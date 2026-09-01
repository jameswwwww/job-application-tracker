import type { SiteAdapter } from "../BaseAdapter";
import type { JobApplication } from "../../types";

import {
  calculateExtractionConfidence,
  extractJobTypeFromText,
  extractSalaryFromText,
  getCombinedText,
  getJobPostingJsonLd,
  getLocationFromJsonLd,
  getSalaryFromJsonLd,
  getTextFromSelectors,
} from "../../utils/extraction";

import { observeSubmissionSignals } from "../../utils/submissionDetection";

export class LinkedInAdapter implements SiteAdapter {
  platformName: JobApplication["platform"] = "LinkedIn";

  extractJobDetails(): Partial<JobApplication> | null {
    const jsonLd = getJobPostingJsonLd();

    const jobTitle =
      getTextFromSelectors([
        ".job-details-jobs-unified-top-card__job-title h1",
        ".job-details-jobs-unified-top-card__job-title",
        "h1.t-24",
        "h1",
      ]) ||
      jsonLd?.title ||
      null;

    const company =
      getTextFromSelectors([
        ".job-details-jobs-unified-top-card__company-name a",
        ".job-details-jobs-unified-top-card__company-name",
        '[class*="company-name"] a',
        '[class*="company-name"]',
      ]) ||
      jsonLd?.hiringOrganization?.name ||
      null;

    const location =
      getTextFromSelectors([
        ".job-details-jobs-unified-top-card__primary-description-container .tvm__text",
        ".job-details-jobs-unified-top-card__primary-description span",
        '[class*="job-location"]',
      ]) || getLocationFromJsonLd(jsonLd);

    const insightText = getCombinedText([
      ".job-details-jobs-unified-top-card__job-insight",
      '[class*="job-insight"]',
    ]);

    const salary =
      extractSalaryFromText(insightText) || getSalaryFromJsonLd(jsonLd);

    const jobType =
      extractJobTypeFromText(insightText) || jsonLd?.employmentType || null;

    if (!jobTitle || !company) {
      return null;
    }

    const extractionConfidence = calculateExtractionConfidence(
      {
        jobTitle,
        company,
        location,
        salary,
        jobType,
      },
      0.98,
    );

    return {
      jobTitle,
      company,
      location,
      salary,
      jobType,

      jobUrl: window.location.href.split("?")[0],

      platform: this.platformName,

      extractionConfidence,

      extractionMethod: "platform-dom",
    };
  }

  observeApplicationProcess(onDetected: (confidence: number) => void): void {
    console.log("LinkedIn Adapter: Observing application process...");

    /*
     * Strategy 1: Easy Apply modal.
     *
     * LinkedIn's Easy Apply flow adds a success
     * message inside a modal overlay. This is
     * the most common in-page submission path.
     */
    let finished = false;

    const emitOnce = (confidence: number) => {
      if (finished) return;
      finished = true;
      onDetected(confidence);
    };

    const easyApplyObserver = new MutationObserver((mutations) => {
      for (const mutation of mutations) {
        if (mutation.type !== "childList") continue;

        for (const node of Array.from(mutation.addedNodes)) {
          if (node.nodeType !== Node.ELEMENT_NODE) continue;

          const text = (node as HTMLElement).innerText || "";

          if (
            text.includes("Your application was sent to") ||
            text.includes("Application submitted")
          ) {
            console.log("LinkedIn Adapter: Easy Apply success detected!");
            emitOnce(0.95);
            easyApplyObserver.disconnect();
            return;
          }
        }
      }
    });

    easyApplyObserver.observe(document.body, {
      childList: true,
      subtree: true,
    });

    /*
     * Strategy 2: Generic submission signals.
     *
     * Catches in-page forms, "Application
     * submitted" text changes, and external-
     * style submit buttons that the modal
     * observer might miss.
     */
    observeSubmissionSignals(
      (confidence) => {
        easyApplyObserver.disconnect();
        emitOnce(confidence);
      },
      {
        successPhrases: [
          "your application was sent to",
          "application submitted",
          "application received",
          "thanks for applying",
          "thank you for applying",
        ],

        buttonPhrases: [
          "submit application",
          "send application",
          "continue",
        ],

        fallbackConfidence: 0.75,
        fallbackDelayMs: 2500,
      },
    );
  }
}
