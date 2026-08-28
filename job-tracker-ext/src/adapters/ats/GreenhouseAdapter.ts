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

export class GreenhouseAdapter implements SiteAdapter {
  platformName: JobApplication["platform"] = "Greenhouse"; // Or create an 'ATS' category

  extractJobDetails(): Partial<JobApplication> | null {
    const jsonLd = getJobPostingJsonLd();

    const jobTitle =
      jsonLd?.title ||
      getTextFromSelectors([
        "h1.app-title",
        ".job__title h1",
        '[class*="job-title"] h1',
        "main h1",
        "h1",
      ]);

    const company =
      jsonLd?.hiringOrganization?.name ||
      getTextFromSelectors([
        "span.company-name",
        ".company-name",
        '[class*="company-name"]',
        'meta[property="og:site_name"]',
      ]) ||
      null;

    const location =
      getLocationFromJsonLd(jsonLd) ||
      getTextFromSelectors([
        "div.location",
        ".location",
        '[class*="location"]',
      ]);

    const contentRoot =
      document.querySelector("#app_body, main, .job-post, .job__description") ||
      document;

    const contentText = getCombinedText(
      ["#app_body", ".job__description", ".job-post", "main"],
      contentRoot,
    );

    const salary =
      getSalaryFromJsonLd(jsonLd) || extractSalaryFromText(contentText);

    const jobType =
      jsonLd?.employmentType || extractJobTypeFromText(contentText);

    if (!jobTitle) {
      return null;
    }

    const finalCompany =
      company ||
      document.title.split("|")[0]?.split("-")[0]?.trim() ||
      "Unknown Company";

    const extractionConfidence = calculateExtractionConfidence(
      {
        jobTitle,
        company: finalCompany,
        location,
        salary,
        jobType,
      },
      jsonLd ? 0.98 : 0.9,
    );

    return {
      jobTitle,
      company: finalCompany,
      location,
      salary,
      jobType,

      jobUrl: window.location.href.split("?")[0],

      platform: this.platformName,

      extractionConfidence,

      extractionMethod: jsonLd ? "json-ld" : "platform-dom",
    };
  }

  observeApplicationProcess(onDetected: (confidence: number) => void): void {
    console.log("Greenhouse Adapter: Observing application process...");

    // Greenhouse uses a standard form submission
    const form = document.getElementById("application_form");
    if (form) {
      form.addEventListener("submit", () => {
        console.log("Greenhouse Adapter: Form submitted!");
        // High confidence because we are intercepting the actual form submit event
        onDetected(0.9);
      });
    } else {
      // Fallback for confirmation page
      if (document.body.textContent?.includes("Thank you for applying")) {
        onDetected(1.0);
      }
    }
  }
}
