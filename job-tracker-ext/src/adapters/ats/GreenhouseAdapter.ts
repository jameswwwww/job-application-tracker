import type { SiteAdapter } from "../BaseAdapter";
import type { JobApplication } from "../../types";

export class GreenhouseAdapter implements SiteAdapter {
  platformName: JobApplication["platform"] = "Other"; // Or create an 'ATS' category

  extractJobDetails(): Partial<JobApplication> | null {
    const titleNode = document.querySelector("h1.app-title");
    const companyNode = document.querySelector("span.company-name");
    const locationNode = document.querySelector("div.location");

    if (!titleNode) return null;

    return {
      jobTitle: titleNode.textContent?.trim() || "",
      company:
        companyNode?.textContent?.replace("at", "").trim() ||
        document.title.split("-")[0]?.trim() ||
        "",
      location: locationNode?.textContent?.trim() || null,
      jobUrl: window.location.href.split("?")[0],
      platform: "Other",
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
