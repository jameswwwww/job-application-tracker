import type { SiteAdapter } from "../BaseAdapter";
import type { JobApplication } from "../../types";

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

    document.body.addEventListener("click", (event) => {
      const target = event.target as HTMLElement;

      // Look for the primary "Apply now" or "Apply on company site" buttons
      const applyButton = target.closest(
        "#applyButtonLinkContainer button, #applyButtonLinkContainer a",
      );

      if (applyButton) {
        const buttonText = applyButton.textContent?.toLowerCase() || "";

        if (buttonText.includes("company site")) {
          console.log("Indeed Adapter: Redirecting to company site.");
          // Redirecting away means we aren't 100% sure they will finish the application
          onDetected(0.6);
        } else {
          console.log("Indeed Adapter: Indeed Apply initiated!");
          // Using Indeed's native apply modal gives us higher confidence
          onDetected(0.8);
        }
      }
    });
  }
}
