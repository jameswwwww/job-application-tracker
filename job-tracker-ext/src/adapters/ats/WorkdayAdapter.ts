import type { SiteAdapter } from "../BaseAdapter";

import type { JobApplication } from "../../types";

import {
  calculateExtractionConfidence,
  cleanText,
  extractJobTypeFromText,
  extractSalaryFromText,
  getCombinedText,
  getJobPostingJsonLd,
  getLocationFromJsonLd,
  getSalaryFromJsonLd,
  getTextFromSelectors,
} from "../../utils/extraction";

import { observeSubmissionSignals } from "../../utils/submissionDetection";

function getTenantCompany(): string | null {
  const tenant = window.location.hostname.split(".")[0];

  if (!tenant) {
    return null;
  }

  return cleanText(
    tenant
      .replace(/[-_]+/g, " ")
      .replace(/\b\w/g, (char) => char.toUpperCase()),
  );
}

function cleanWorkdayLabel(value: string | null) {
  return cleanText(
    value?.replace(/^locations?\s*/i, "").replace(/^time type\s*/i, ""),
  );
}

export class WorkdayAdapter implements SiteAdapter {
  platformName: JobApplication["platform"] = "Workday";

  extractJobDetails(): Partial<JobApplication> | null {
    const jsonLd = getJobPostingJsonLd();

    const isJobPage = window.location.pathname.includes("/job/");

    if (!jsonLd && !isJobPage) {
      return null;
    }

    const jobTitle =
      jsonLd?.title ||
      getTextFromSelectors([
        '[data-automation-id="jobPostingTitle"]',
        '[data-automation-id="jobPostingHeader"] h2',
        '[data-automation-id="jobPostingHeader"] h1',
        "main h2",
        "main h1",
      ]);

    if (!jobTitle) {
      return null;
    }

    const company =
      jsonLd?.hiringOrganization?.name ||
      getTextFromSelectors([
        'meta[property="og:site_name"]',
        '[data-automation-id="company"]',
      ]) ||
      getTenantCompany() ||
      "Unknown Company";

    const rawLocation =
      getLocationFromJsonLd(jsonLd) ||
      getTextFromSelectors([
        '[data-automation-id="locations"]',
        '[data-automation-id="location"]',
        '[data-automation-id="jobPostingLocation"]',
      ]);

    const location = cleanWorkdayLabel(rawLocation);

    const rawJobType = getTextFromSelectors([
      '[data-automation-id="time"]',
      '[data-automation-id="timeType"]',
    ]);

    const pageText = getCombinedText([
      '[data-automation-id="jobPostingHeader"]',
      '[data-automation-id="jobPostingDescription"]',
      "main",
    ]);

    const jobType =
      jsonLd?.employmentType ||
      extractJobTypeFromText(rawJobType) ||
      cleanWorkdayLabel(rawJobType) ||
      extractJobTypeFromText(pageText);

    const salary =
      getSalaryFromJsonLd(jsonLd) || extractSalaryFromText(pageText);

    return {
      jobTitle,

      company,

      location,

      salary,

      jobType,

      platform: this.platformName,

      jobUrl: window.location.href.split("?")[0],

      extractionConfidence: calculateExtractionConfidence(
        {
          jobTitle,
          company,
          location,
          salary,
          jobType,
        },
        jsonLd ? 0.98 : 0.93,
      ),

      extractionMethod: jsonLd ? "json-ld" : "platform-dom",
    };
  }

  observeApplicationProcess(onDetected: (confidence: number) => void): void {
    console.log("Workday Adapter: Observing application process...");

    observeSubmissionSignals(onDetected, {
      successPhrases: [
        "application successfully submitted",
        "your application has been submitted",
        "application submitted",
        "thank you for applying",
        "we have received your application",
        "we've received your application",
      ],

      /*
       * Do NOT listen for Workday's
       * Apply button.
       *
       * We only care about the final
       * submit action.
       */
      buttonPhrases: ["submit application", "submit"],

      fallbackConfidence: 0.75,

      fallbackDelayMs: 2500,
    });
  }
}
