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

export class JobStreetAdapter implements SiteAdapter {
  platformName: JobApplication["platform"] = "JobStreet";

  extractJobDetails(): Partial<JobApplication> | null {
    /*
     * JobStreet keeps the job ID in application-flow URLs such as
     * /job/94075726/apply/success. Those pages are not job-detail pages and
     * contain headings such as "Good luck, Patrick". Returning null here keeps
     * the real details cached before the Apply click authoritative.
     */
    if (/\/(?:apply|application)(?:\/|$)/i.test(window.location.pathname)) {
      return null;
    }

    const jsonLd = getJobPostingJsonLd();

    const jobTitle =
      getTextFromSelectors([
        '[data-automation="job-detail-title"]',
        'h1[data-automation*="title"]',
      ]) ||
      jsonLd?.title ||
      null;

    const company =
      getTextFromSelectors([
        '[data-automation="advertiser-name"]',
        '[data-automation="job-detail-company"]',
      ]) ||
      jsonLd?.hiringOrganization?.name ||
      null;

    const locationNode = document.querySelector<HTMLAnchorElement>(
      '[data-automation="job-detail-location"] a',
    );

    const location =
      locationNode?.textContent?.trim() ||
      getTextFromSelectors([
        '[data-automation="job-detail-location"]',
        '[data-automation*="location"] a',
        '[data-automation*="location"]',
      ]) ||
      getLocationFromJsonLd(jsonLd);

    const detailsText = getCombinedText([
      '[data-automation="job-detail-salary"]',
      '[data-automation="job-detail-work-type"]',
      '[data-automation="jobAdDetails"]',
    ]);

    const salary =
      getTextFromSelectors(['[data-automation="job-detail-salary"]']) ||
      extractSalaryFromText(detailsText) ||
      getSalaryFromJsonLd(jsonLd);

    const jobType =
      getTextFromSelectors(['[data-automation="job-detail-work-type"]']) ||
      extractJobTypeFromText(detailsText) ||
      jsonLd?.employmentType ||
      null;

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
    console.log("JobStreet Adapter: Observing application process...");

    /*
     * JobStreet's "Apply" button often redirects
     * to an external ATS (Workday, Greenhouse, etc.)
     * rather than completing in-page.
     *
     * We use observeSubmissionSignals so all
     * listeners are managed in one place and
     * cleaned up properly on teardown.
     */
    observeSubmissionSignals(onDetected, {
      successPhrases: [
        "application submitted",
        "application received",
        "thank you for applying",
        "thanks for applying",
        "your application has been submitted",
        "we've received your application",
      ],

      buttonSelectors: ['[data-automation="job-detail-apply"]'],

      buttonPhrases: [
        "apply now",
        "apply",
        "submit application",
      ],

      /*
       * 0.7 confidence: clicking Apply on
       * JobStreet frequently means a redirect
       * to an external ATS, not a completed
       * submission.
       */
      fallbackConfidence: 0.7,
      fallbackDelayMs: 2000,
    });
  }
}
