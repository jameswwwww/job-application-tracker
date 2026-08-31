import { beforeEach, describe, expect, it } from "vitest";

import { LeverAdapter } from "../../src/adapters/ats/LeverAdapter";

describe("LeverAdapter", () => {
  beforeEach(() => {
    document.head.innerHTML = "";

    document.body.innerHTML = "";

    window.history.replaceState({}, "", "/acme/abc123");
  });

  it("extracts a Lever job", () => {
    document.head.innerHTML = `
          <meta
            property="og:site_name"
            content="Acme"
          />
        `;

    document.body.innerHTML = `
          <main class="posting-page">
            <div class="posting-headline">
              <h2>
                Frontend Engineer
              </h2>
            </div>

            <div class="posting-categories">
              <span class="location">
                Kuala Lumpur
              </span>

              <span class="commitment">
                Full-time
              </span>
            </div>

            <div>
              MYR 5,000 - MYR 7,000 per month
            </div>
          </main>
        `;

    const adapter = new LeverAdapter();

    const result = adapter.extractJobDetails();

    expect(result).not.toBeNull();

    expect(result?.jobTitle).toBe("Frontend Engineer");

    expect(result?.company).toBe("Acme");

    expect(result?.location).toBe("Kuala Lumpur");

    expect(result?.jobType).toBe("Full-time");

    expect(result?.platform).toBe("Lever");

    expect(result?.jobUrl).toBe("https://jobs.lever.co/acme/abc123");

    expect(result?.extractionConfidence).toBeGreaterThan(0.8);
  });

  it("ignores Lever company listing page", () => {
    window.history.replaceState({}, "", "/acme");

    const adapter = new LeverAdapter();

    expect(adapter.extractJobDetails()).toBeNull();
  });
});
