import type { SiteAdapter } from "../BaseAdapter";
import type { JobApplication } from "../../types";

export class LinkedInAdapter implements SiteAdapter {
  platformName: JobApplication["platform"] = "LinkedIn";

  extractJobDetails(): Partial<JobApplication> | null {
    // Note: LinkedIn changes these class names occasionally.
    // We use broad selectors to increase resilience.
    const titleNode = document.querySelector(
      ".job-details-jobs-unified-top-card__job-title h1",
    );
    const companyNode = document.querySelector(
      ".job-details-jobs-unified-top-card__company-name a",
    );
    const locationNode = document.querySelector(
      ".job-details-jobs-unified-top-card__primary-description span",
    );

    if (!titleNode || !companyNode) return null;

    return {
      jobTitle: titleNode.textContent?.trim() || "",
      company: companyNode.textContent?.trim() || "",
      location: locationNode?.textContent?.trim() || null,
      jobUrl: window.location.href.split("?")[0], // Clean URL parameters
      platform: this.platformName,
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
