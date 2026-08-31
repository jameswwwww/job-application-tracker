// @vitest-environment jsdom
// @vitest-environment-options {"url":"https://acme.bamboohr.com/careers/42"}

import { beforeEach, describe, expect, it } from "vitest";

import { BambooHRAdapter } from "../../src/adapters/ats/BambooHRAdapter";

describe("BambooHRAdapter", () => {
  beforeEach(() => {
    document.head.innerHTML = `
          <meta
            property="og:site_name"
            content="Acme"
          />
        `;

    document.body.innerHTML = `
          <main>
            <h1>
              Backend Engineer
            </h1>

            <div class="job-location">
              Location: Kuala Lumpur
            </div>

            <div class="job-type">
              Full-time
            </div>

            <div>
              MYR 7,000 – MYR 9,000 per month
            </div>

            <button>
              Submit Application
            </button>
          </main>
        `;
  });

  it("extracts a BambooHR job", () => {
    const result = new BambooHRAdapter().extractJobDetails();

    expect(result?.jobTitle).toBe("Backend Engineer");

    expect(result?.company).toBe("Acme");

    expect(result?.location).toBe("Kuala Lumpur");

    expect(result?.jobType).toBe("Full-time");

    expect(result?.platform).toBe("BambooHR");

    expect(result?.jobUrl).toBe("https://acme.bamboohr.com/careers/42");
  });
});
