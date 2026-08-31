import type { SiteAdapter } from "../BaseAdapter";

import type { JobApplication } from "../../types";

import {
  calculateExtractionConfidence,
  cleanText,
  extractJobTypeFromText,
  extractSalaryFromText,
  getJobPostingJsonLd,
  getLocationFromJsonLd,
  getSalaryFromJsonLd,
  getTextFromSelectors,
} from "../../utils/extraction";

import { observeSubmissionSignals } from "../../utils/submissionDetection";

function companyFromHostname(): string | null {
  const slug = window.location.hostname.split(".")[0];

  if (!slug) {
    return null;
  }

  return cleanText(
    slug.replace(/[-_]+/g, " ").replace(/\b\w/g, (char) => char.toUpperCase()),
  );
}

function getJobId(): string | null {
  const modern = window.location.pathname.match(/\/careers\/(\d+)/i);

  if (modern?.[1]) {
    return modern[1];
  }

  if (window.location.pathname.includes("/jobs/view.php")) {
    return new URL(window.location.href).searchParams.get("id");
  }

  return null;
}

function cleanLocation(value: string | null) {
  return cleanText(value?.replace(/^location\s*:?\s*/i, ""));
}

export class BambooHRAdapter implements SiteAdapter {
  platformName: JobApplication["platform"] = "BambooHR";

  extractJobDetails(): Partial<JobApplication> | null {
    const jobId = getJobId();

    if (!jobId) {
      return null;
    }

    const jsonLd = getJobPostingJsonLd();

    const jobTitle =
      jsonLd?.title ||
      getTextFromSelectors([
        '[data-testid*="job-title"]',
        '[class*="job-title"]',
        ".job-title",
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
        '[class*="company-name"]',
      ]) ||
      companyFromHostname() ||
      "Unknown Company";

    const rawLocation =
      getLocationFromJsonLd(jsonLd) ||
      getTextFromSelectors([
        ".job-location",
        '[data-testid*="location"]',
        '[class*="job-location"]',
        '[class*="location"]',
      ]);

    const location = cleanLocation(rawLocation);

    const pageText = document.body.innerText || document.body.textContent || "";

    const salary =
      getSalaryFromJsonLd(jsonLd) || extractSalaryFromText(pageText);

    const jsonJobType = Array.isArray(jsonLd?.employmentType)
      ? jsonLd.employmentType.join(", ")
      : jsonLd?.employmentType;

    const rawJobType = getTextFromSelectors([
      ".job-type",
      '[data-testid*="job-type"]',
      '[class*="job-type"]',
      '[class*="employment-type"]',
      '[class*="employment"]',
    ]);

    const jobType =
      extractJobTypeFromText(jsonJobType?.replace(/_/g, " ")) ||
      extractJobTypeFromText(rawJobType) ||
      extractJobTypeFromText(pageText);

    return {
      jobTitle,
      company,
      location,
      salary,
      jobType,

      platform: this.platformName,

      jobUrl: `${window.location.origin}/careers/${jobId}`,

      extractionConfidence: calculateExtractionConfidence(
        {
          jobTitle,
          company,
          location,
          salary,
          jobType,
        },

        jsonLd ? 0.98 : 0.85,
      ),

      extractionMethod: jsonLd ? "json-ld" : "platform-dom",
    };
  }

  observeApplicationProcess(onDetected: (confidence: number) => void): void {
    console.log("BambooHR Adapter: Observing application process...");

    observeSubmissionSignals(onDetected, {
      successPhrases: [
        "thank you for applying",
        "thanks for applying",
        "application submitted",
        "application received",
        "your application has been submitted",
        "we have received your application",
      ],

      buttonPhrases: ["submit application"],

      formSelectors: ['form[action*="career"]', 'form[action*="job"]'],

      fallbackConfidence: 0.75,

      fallbackDelayMs: 2000,
    });
  }
}
