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

function getCompanyFromPath(): string | null {
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

function getCanonicalLeverUrl(): string {
  try {
    const url = new URL(window.location.href);

    const parts = url.pathname.split("/").filter(Boolean);

    /*
     * Lever:
     * /company/job-id
     *
     * Apply pages may append
     * another segment.
     */
    if (parts.length >= 2) {
      return `${url.origin}/${parts[0]}/${parts[1]}`;
    }
  } catch {
    // Keep current URL.
  }

  return window.location.href;
}

export class LeverAdapter implements SiteAdapter {
  platformName: JobApplication["platform"] = "Lever";

  extractJobDetails(): Partial<JobApplication> | null {
    const parts = window.location.pathname.split("/").filter(Boolean);

    /*
     * /company = job listing page
     * /company/id = individual job
     */
    if (parts.length < 2) {
      return null;
    }

    const jsonLd = getJobPostingJsonLd();

    const jobTitle =
      jsonLd?.title ||
      getTextFromSelectors([
        ".posting-headline h2",
        ".posting-headline h1",
        '[data-qa="posting-name"]',
        ".posting-title",
        "main h1",
      ]);

    if (!jobTitle) {
      return null;
    }

    const company =
      jsonLd?.hiringOrganization?.name ||
      getTextFromSelectors([
        'meta[property="og:site_name"]',
        ".company-name",
      ]) ||
      getCompanyFromPath() ||
      "Unknown Company";

    const location =
      getLocationFromJsonLd(jsonLd) ||
      getTextFromSelectors([
        ".posting-categories .location",
        '[data-qa="posting-location"]',
        ".location",
      ]);

    const pageText = getCombinedText([
      ".posting-categories",
      ".posting-page",
      ".content",
      "main",
    ]);

    const salary =
      getSalaryFromJsonLd(jsonLd) || extractSalaryFromText(pageText);

    const jobType =
      jsonLd?.employmentType ||
      getTextFromSelectors([
        ".posting-categories .commitment",
        '[data-qa="posting-commitment"]',
      ]) ||
      extractJobTypeFromText(pageText);

    return {
      jobTitle,

      company,

      location,

      salary,

      jobType,

      platform: this.platformName,

      jobUrl: getCanonicalLeverUrl(),

      extractionConfidence: calculateExtractionConfidence(
        {
          jobTitle,
          company,
          location,
          salary,
          jobType,
        },
        jsonLd ? 0.98 : 0.92,
      ),

      extractionMethod: jsonLd ? "json-ld" : "platform-dom",
    };
  }

  observeApplicationProcess(onDetected: (confidence: number) => void): void {
    console.log("Lever Adapter: Observing application process...");

    observeSubmissionSignals(onDetected, {
      successPhrases: [
        "thanks for your application",
        "thank you for applying",
        "application received",
        "we've received your application",
        "we have received your application",
      ],

      formSelectors: [
        "form.application-form",
        "#application-form",
        'form[action*="apply"]',
      ],

      buttonSelectors: [".posting-btn-submit"],

      buttonPhrases: ["submit application", "send application"],

      fallbackConfidence: 0.75,

      fallbackDelayMs: 2000,
    });
  }
}
