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

function cleanLocation(value: string | null) {
  return cleanText(value?.replace(/^location\s*:?\s*/i, ""));
}

export class AshbyAdapter implements SiteAdapter {
  platformName: JobApplication["platform"] = "Ashby";

  extractJobDetails(): Partial<JobApplication> | null {
    const parts = window.location.pathname.split("/").filter(Boolean);

    // /company = board
    // /company/job-id = job
    if (parts.length < 2) {
      return null;
    }

    const jsonLd = getJobPostingJsonLd();

    const jobTitle =
      jsonLd?.title ||
      getTextFromSelectors([
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
        '[data-testid*="company"]',
      ]) ||
      companyFromPath() ||
      "Unknown Company";

    const rawLocation =
      getLocationFromJsonLd(jsonLd) ||
      getTextFromSelectors([
        '[data-testid*="location"]',
        '[class*="location"]',
      ]);

    const location = cleanLocation(rawLocation);

    const pageText =
      getCombinedText(["main", '[class*="job"]']) || document.body.innerText;

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
    console.log("Ashby Adapter: Observing application process...");

    observeSubmissionSignals(onDetected, {
      successPhrases: [
        "thank you for applying",
        "thanks for applying",
        "application submitted",
        "application received",
        "we've received your application",
        "we have received your application",
      ],

      formSelectors: ['form[action*="apply"]', 'form[action*="application"]'],

      buttonPhrases: ["submit application", "send application"],

      fallbackConfidence: 0.75,

      fallbackDelayMs: 2000,
    });
  }
}
