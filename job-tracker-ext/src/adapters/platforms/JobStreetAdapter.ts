import type { SiteAdapter } from "../BaseAdapter";
import type { JobApplication } from "../../types";

export class JobStreetAdapter implements SiteAdapter {
  platformName: JobApplication["platform"] = "JobStreet";

  extractJobDetails(): Partial<JobApplication> | null {
    // SEEK's React DOM uses data-automation tags which are highly stable
    const titleNode = document.querySelector(
      '[data-automation="job-detail-title"]',
    );
    const companyNode = document.querySelector(
      '[data-automation="advertiser-name"]',
    );
    const locationNode = document.querySelector(
      '[data-automation="job-detail-location"]',
    );

    if (!titleNode || !companyNode) return null;

    return {
      jobTitle: titleNode.textContent?.trim() || "",
      company: companyNode.textContent?.trim() || "",
      location: locationNode?.textContent?.trim() || null,
      salary: null,
      jobType: null,

      jobUrl: window.location.href.split("?")[0],
      platform: this.platformName,

      extractionConfidence: 0.95,
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
