import type { SiteAdapter } from "../BaseAdapter";
import type { JobApplication } from "../../types";

export class IndeedAdapter implements SiteAdapter {
  platformName: JobApplication["platform"] = "Indeed";

  extractJobDetails(): Partial<JobApplication> | null {
    // Indeed uses reliable data-testid attributes for their core job header
    const titleNode = document.querySelector(
      '[data-testid="jobsearch-JobInfoHeader-title"]',
    );
    const companyNode = document.querySelector(
      '[data-testid="inlineHeader-companyName"]',
    );
    const locationNode = document.querySelector(
      '[data-testid="inlineHeader-companyLocation"]',
    );

    if (!titleNode || !companyNode) return null;

    // Clean up the URL: Indeed appends massive tracking strings (e.g., ?vjk=...&from=...)
    // We want the clean viewjob URL if possible
    let cleanUrl = window.location.href;
    const urlObj = new URL(cleanUrl);
    const vjk = urlObj.searchParams.get("vjk");
    if (vjk) {
      cleanUrl = `${urlObj.origin}/viewjob?jk=${vjk}`;
    }

    return {
      jobTitle: titleNode.textContent?.trim() || "",
      company: companyNode.textContent?.trim() || "",
      location: locationNode?.textContent?.trim() || null,
      salary: null,
      jobType: null,

      jobUrl: cleanUrl,
      platform: this.platformName,

      extractionConfidence: 0.95,
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
