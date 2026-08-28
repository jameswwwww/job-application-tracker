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

    const observer = new MutationObserver((mutations) => {
      for (const mutation of mutations) {
        if (mutation.type === "childList") {
          const addedNodes = Array.from(mutation.addedNodes) as HTMLElement[];

          for (const node of addedNodes) {
            if (node.nodeType !== Node.ELEMENT_NODE) continue;

            // Look for the success message in the Easy Apply modal
            const textContent = node.innerText || "";
            if (
              textContent.includes("Your application was sent to") ||
              textContent.includes("Application submitted")
            ) {
              console.log("LinkedIn Adapter: Easy Apply success detected!");
              onDetected(0.95); // High confidence
              observer.disconnect(); // Stop observing after success
              return;
            }
          }
        }
      }
    });

    // Observe the whole body since the Easy Apply modal is attached to the root
    observer.observe(document.body, { childList: true, subtree: true });
  }
}
