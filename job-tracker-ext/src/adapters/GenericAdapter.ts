import type { SiteAdapter } from "./BaseAdapter";
import type { JobApplication } from "../types";

export class GenericAdapter implements SiteAdapter {
  platformName: JobApplication["platform"] = "CompanySite";

  extractJobDetails(): Partial<JobApplication> | null {
    // 1. Look for structured JSON-LD data
    const jsonLdScripts = document.querySelectorAll(
      'script[type="application/ld+json"]',
    );

    for (const script of jsonLdScripts) {
      try {
        const data = JSON.parse(script.textContent || "{}");
        // Handle both single objects and arrays of objects
        const items = Array.isArray(data) ? data : [data];

        for (const item of items) {
          if (item["@type"] === "JobPosting") {
            return {
              jobTitle: item.title,

              company: item.hiringOrganization?.name || document.title,

              location: item.jobLocation?.address?.addressLocality || null,

              salary: null,
              jobType: item.employmentType || null,

              jobUrl: window.location.href,

              platform: this.platformName,

              extractionConfidence: 0.9,
              extractionMethod: "json-ld",
            };
          }
        }
      } catch (e) {
        console.warn("JobTrack: Failed to parse JSON-LD", e);
      }
    }

    // 2. DOM Heuristics Fallback (if no JSON-LD is found)
    // This is a basic example; it can be expanded significantly.
    const titleMatch = document.querySelector("h1")?.textContent;
    if (
      titleMatch &&
      (document.title.toLowerCase().includes("job") ||
        document.title.toLowerCase().includes("career"))
    ) {
      const companyName = document.title.split("|")[0]?.split("-")[0]?.trim();

      return {
        jobTitle: titleMatch.trim(),

        company: companyName || document.title.trim() || "Unknown Company",

        location: null,
        salary: null,
        jobType: null,

        jobUrl: window.location.href,

        platform: this.platformName,

        extractionConfidence: 0.55,
        extractionMethod: "generic-dom",
      };
    }

    return null;
  }

  observeApplicationProcess(onDetected: (confidence: number) => void): void {
    // Heuristic: Listen for clicks on buttons containing the word "apply" or "submit"
    document.body.addEventListener("click", (event) => {
      const target = event.target as HTMLElement;
      const button = target.closest('button, a, input[type="submit"]');

      if (button) {
        const text =
          button.textContent?.toLowerCase() ||
          (button as HTMLInputElement).value?.toLowerCase() ||
          "";
        if (text.includes("apply") || text.includes("submit application")) {
          console.log("Generic Adapter: Potential apply button clicked.");
          // Low confidence -> will trigger our Vue Shadow DOM prompt
          onDetected(0.4);
        }
      }
    });
  }
}
