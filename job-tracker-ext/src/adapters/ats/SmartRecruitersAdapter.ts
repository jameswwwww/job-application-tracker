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

function companyFromPath(): string | null {
  const parts = window.location.pathname.split("/").filter(Boolean);

  const slug = parts[0];

  if (!slug) {
    return null;
  }

  return cleanText(
    decodeURIComponent(slug)
      .replace(/[-_]+/g, " ")
      .replace(/\b\w/g, (char) => char.toUpperCase()),
  );
}

function canonicalJobUrl(): string {
  const parts = window.location.pathname.split("/").filter(Boolean);

  if (parts.length >= 2) {
    return `${window.location.origin}/${parts[0]}/${parts[1]}`;
  }

  return window.location.href;
}

export class SmartRecruitersAdapter implements SiteAdapter {
  platformName: JobApplication["platform"] = "SmartRecruiters";

  extractJobDetails(): Partial<JobApplication> | null {
    const parts = window.location.pathname.split("/").filter(Boolean);

    if (parts.length < 2) {
      return null;
    }

    const jsonLd = getJobPostingJsonLd();

    const jobTitle =
      jsonLd?.title ||
      getTextFromSelectors([
        '[itemprop="title"]',
        '[data-testid*="job-title"]',
        '[class*="job-title"]',
        "main h1",
        "h1",
      ]);

    if (!jobTitle) {
      return null;
    }

    const company =
      jsonLd?.hiringOrganization?.name ||
      getTextFromSelectors([
        'meta[property="og:site_name"]',
        '[itemprop="hiringOrganization"]',
      ]) ||
      companyFromPath() ||
      "Unknown Company";

    const location =
      getLocationFromJsonLd(jsonLd) ||
      getTextFromSelectors([
        '[itemprop="jobLocation"]',
        '[data-testid*="location"]',
        '[class*="job-location"]',
        "address",
      ]);

    const pageText =
      getCombinedText(["main", "article"]) || document.body.innerText;

    const salary =
      getSalaryFromJsonLd(jsonLd) || extractSalaryFromText(pageText);

    const jsonJobType = Array.isArray(jsonLd?.employmentType)
      ? jsonLd.employmentType.join(", ")
      : jsonLd?.employmentType;

    const jobType =
      extractJobTypeFromText(jsonJobType?.replace(/_/g, " ")) ||
      extractJobTypeFromText(pageText);

    return {
      jobTitle,
      company,
      location,
      salary,
      jobType,

      platform: this.platformName,

      jobUrl: canonicalJobUrl(),

      extractionConfidence: calculateExtractionConfidence(
        {
          jobTitle,
          company,
          location,
          salary,
          jobType,
        },

        jsonLd ? 0.98 : 0.9,
      ),

      extractionMethod: jsonLd ? "json-ld" : "platform-dom",
    };
  }

  observeApplicationProcess(onDetected: (confidence: number) => void): void {
    console.log("SmartRecruiters Adapter: Observing application process...");

    observeSubmissionSignals(onDetected, {
      successPhrases: [
        "application submitted",
        "application received",
        "thank you for applying",
        "thanks for applying",
        "your application has been submitted",
        "we've received your application",
      ],

      buttonPhrases: [
        "submit application",
        "send application",
        "complete application",
      ],

      fallbackConfidence: 0.75,

      fallbackDelayMs: 2000,
    });
  }
}
