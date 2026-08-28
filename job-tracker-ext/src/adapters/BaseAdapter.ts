import type { JobApplication } from "../types";

export interface SiteAdapter {
  platformName: JobApplication["platform"];

  /**
   * Extract job information from the current webpage.
   */
  extractJobDetails(): Partial<JobApplication> | null;

  /**
   * Detect signals that suggest the user submitted an application.
   *
   * confidence:
   * 0.0 = almost no confidence
   * 1.0 = confirmed submission
   */
  observeApplicationProcess(
    onDetected: (applicationConfidence: number) => void,
  ): void;
}
