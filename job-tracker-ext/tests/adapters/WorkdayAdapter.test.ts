import { beforeEach, describe, expect, it } from "vitest";

import { WorkdayAdapter } from "../../src/adapters/ats/WorkdayAdapter";

describe("WorkdayAdapter", () => {
  beforeEach(() => {
    document.head.innerHTML = "";

    document.body.innerHTML = "";

    window.history.replaceState(
      {},
      "",
      "/en-US/careers/job/Kuala-Lumpur/Software-Engineer_R123",
    );
  });

  it("extracts a Workday job", () => {
    document.head.innerHTML = `
          <meta
            property="og:site_name"
            content="Contoso"
          />
        `;

    document.body.innerHTML = `
          <main>
            <h2
              data-automation-id="jobPostingTitle"
            >
              Software Engineer
            </h2>

            <div
              data-automation-id="locations"
            >
              Locations Kuala Lumpur, Malaysia
            </div>

            <div
              data-automation-id="timeType"
            >
              Time Type Full time
            </div>

            <div
              data-automation-id="jobPostingDescription"
            >
              Salary:
              MYR 8,000 - MYR 10,000 per month
            </div>
          </main>
        `;

    const adapter = new WorkdayAdapter();

    const result = adapter.extractJobDetails();

    expect(result).not.toBeNull();

    expect(result?.jobTitle).toBe("Software Engineer");

    expect(result?.company).toBe("Contoso");

    expect(result?.location).toBe("Kuala Lumpur, Malaysia");

    expect(result?.jobType).toBe("Full-time");

    expect(result?.platform).toBe("Workday");

    expect(result?.extractionConfidence).toBeGreaterThan(0.8);
  });
});
