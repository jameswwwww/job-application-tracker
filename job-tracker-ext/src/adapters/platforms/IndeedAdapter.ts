import type { SiteAdapter } from "../BaseAdapter";
import type { JobApplication } from "../../types";

import { observeSubmissionSignals } from "../../utils/submissionDetection";

import {
  calculateExtractionConfidence,
  extractJobTypeFromText,
  extractSalaryFromText,
  getJobPostingJsonLd,
  getLocationFromJsonLd,
  getSalaryFromJsonLd,
  getTextFromSelectors,
} from "../../utils/extraction";

export class IndeedAdapter implements SiteAdapter {
  platformName: JobApplication["platform"] = "Indeed";

  extractJobDetails(): Partial<JobApplication> | null {
    const jsonLd = getJobPostingJsonLd();

    const jobTitle =
      getTextFromSelectors([
        'h1[data-testid="jobTitle"]',
        '[data-testid="jobsearch-JobInfoHeader-title"]',
        "h1.jobsearch-JobInfoHeader-title",
        "h1",
      ]) ||
      jsonLd?.title ||
      null;

    const company =
      getTextFromSelectors([
        '[data-testid="inlineHeader-companyName"]',
        '[data-company-name="true"]',
        ".jobsearch-InlineCompanyRating-companyHeader",
      ]) ||
      jsonLd?.hiringOrganization?.name ||
      null;

    const location =
      getTextFromSelectors([
        '[data-testid="job-location"]',
        '[data-testid="inlineHeader-companyLocation"]',
        ".jobsearch-JobInfoHeader-subtitle div",
      ]) || getLocationFromJsonLd(jsonLd);

    const salaryAndType = getTextFromSelectors([
      "#salaryInfoAndJobType",
      '[data-testid="jobsearch-JobInfoHeader-salary"]',
    ]);

    const salary =
      extractSalaryFromText(salaryAndType) || getSalaryFromJsonLd(jsonLd);

    const jobType =
      extractJobTypeFromText(salaryAndType) || jsonLd?.employmentType || null;

    if (!jobTitle || !company) {
      return null;
    }

    let cleanUrl = window.location.href;

    try {
      const url = new URL(window.location.href);

      const jobKey = url.searchParams.get("jk") || url.searchParams.get("vjk");

      if (jobKey) {
        cleanUrl = `${url.origin}/viewjob?jk=${jobKey}`;
      }
    } catch {
      // Keep original URL
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

      jobUrl: cleanUrl,

      platform: this.platformName,

      extractionConfidence,

      extractionMethod: "platform-dom",
    };
  }

  observeApplicationProcess(onDetected: (confidence: number) => void): void {
    console.log("Indeed Adapter: Observing application process...");

    observeSubmissionSignals(onDetected, {
      successPhrases: [
        "application submitted",
        "your application has been submitted",
        "application sent",
        "you've applied",
        "you have applied",
      ],

      buttonPhrases: ["submit your application", "submit application"],

      fallbackConfidence: 0.75,

      fallbackDelayMs: 2000,
    });
  }
}
