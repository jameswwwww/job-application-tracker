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

export class JobStreetAdapter implements SiteAdapter {
  platformName: JobApplication["platform"] = "JobStreet";

  extractJobDetails(): Partial<JobApplication> | null {
    const jsonLd = getJobPostingJsonLd();

    const jobTitle =
      getTextFromSelectors([
        '[data-automation="job-detail-title"]',
        'h1[data-automation*="title"]',
        "h1",
      ]) ||
      jsonLd?.title ||
      null;

    const company =
      getTextFromSelectors([
        '[data-automation="advertiser-name"]',
        '[data-automation*="advertiser"]',
        '[data-automation*="company"]',
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
      '[data-automation*="salary"]',
      '[data-automation*="work-type"]',
      '[data-automation*="job-detail"]',
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

    // JobStreet often uses standard click events rather than deep DOM mutations for the initial apply
    document.body.addEventListener("click", (event) => {
      const target = event.target as HTMLElement;

      // Look for clicks on the main Apply button
      const applyButton = target.closest(
        '[data-automation="job-detail-apply"]',
      );

      if (applyButton) {
        console.log("JobStreet Adapter: Apply button clicked!");

        // We assign a 0.7 confidence because clicking "Apply" on JobStreet
        // frequently redirects to an external ATS (like Workday) rather than finishing in-page.
        onDetected(0.7);
      }
    });
  }
}
