import type { JobApplication } from "../types";

export interface SiteAdapter {
  platformName: JobApplication["platform"];

  // Scrapes the DOM for job details
  extractJobDetails(): Partial<JobApplication> | null;

  // Listens to the DOM for form submissions or success modals
  observeApplicationProcess(onDetected: (confidence: number) => void): void;
}
