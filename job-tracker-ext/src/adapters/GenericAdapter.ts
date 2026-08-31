import type { SiteAdapter } from "./BaseAdapter";
import type { JobApplication } from "../types";

import { observeSubmissionSignals } from "../utils/submissionDetection";

import {
  calculateExtractionConfidence,
  extractJobTypeFromText,
  extractSalaryFromText,
  getJobPostingJsonLd,
  getLocationFromJsonLd,
  getSalaryFromJsonLd,
  getTextFromSelectors,
} from "../utils/extraction";

export class GenericAdapter implements SiteAdapter {
  platformName: JobApplication["platform"] = "CompanySite";

  extractJobDetails(): Partial<JobApplication> | null {
    const jsonLd = getJobPostingJsonLd();

    // Best generic source:
    // Schema.org JobPosting
    if (jsonLd) {
      const jobTitle = jsonLd.title || null;

      const company = jsonLd.hiringOrganization?.name || null;

      const location = getLocationFromJsonLd(jsonLd);

      const salary = getSalaryFromJsonLd(jsonLd);

      const jobType = Array.isArray(jsonLd.employmentType)
        ? jsonLd.employmentType.join(", ")
        : jsonLd.employmentType || null;

      if (!jobTitle) {
        return null;
      }

      const finalCompany =
        company ||
        getTextFromSelectors(['meta[property="og:site_name"]']) ||
        "Unknown Company";

      return {
        jobTitle,

        company: finalCompany,

        location,
        salary,
        jobType,

        jobUrl: window.location.href,

        platform: this.platformName,

        extractionConfidence: calculateExtractionConfidence(
          {
            jobTitle,
            company: finalCompany,
            location,
            salary,
            jobType,
          },
          0.95,
        ),

        extractionMethod: "json-ld",
      };
    }

    // Generic DOM fallback
    const title = getTextFromSelectors([
      '[data-testid*="job-title"]',
      '[class*="job-title"] h1',
      '[class*="job-title"]',
      "main h1",
      "h1",
    ]);

    if (!title) {
      return null;
    }

    const pageTitle = document.title.toLowerCase();

    const pageLooksLikeJob =
      pageTitle.includes("job") ||
      pageTitle.includes("career") ||
      pageTitle.includes("position") ||
      document.body.innerText.toLowerCase().includes("apply");

    if (!pageLooksLikeJob) {
      return null;
    }

    const company =
      getTextFromSelectors([
        '[data-testid*="company"]',
        '[class*="company-name"]',
        '[class*="employer-name"]',
        'meta[property="og:site_name"]',
      ]) ||
      document.title.split("|")[0]?.split("-")[0]?.trim() ||
      "Unknown Company";

    const location = getTextFromSelectors([
      '[data-testid*="location"]',
      '[class*="job-location"]',
      '[class*="location"]',
    ]);

    const jobArea =
      document.querySelector(
        "main, article, #job-description, .job-description",
      ) || document.body;

    const jobAreaText = jobArea.textContent || "";

    const salary = extractSalaryFromText(jobAreaText);

    const jobType = extractJobTypeFromText(jobAreaText);

    return {
      jobTitle: title,
      company,
      location,
      salary,
      jobType,

      jobUrl: window.location.href,

      platform: this.platformName,

      extractionConfidence: calculateExtractionConfidence(
        {
          jobTitle: title,
          company,
          location,
          salary,
          jobType,
        },
        0.65,
      ),

      extractionMethod: "generic-dom",
    };
  }

  observeApplicationProcess(onDetected: (confidence: number) => void): void {
    observeSubmissionSignals(onDetected, {
      successPhrases: [
        "thank you for applying",
        "application submitted",
        "application received",
        "we've received your application",
        "we have received your application",
      ],

      buttonPhrases: [
        "submit application",
        "send application",
        "complete application",
      ],

      fallbackConfidence: 0.65,

      fallbackDelayMs: 2000,
    });
  }
}
