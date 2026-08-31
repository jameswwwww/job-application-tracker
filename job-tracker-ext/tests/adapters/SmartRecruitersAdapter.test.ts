// @vitest-environment jsdom
// @vitest-environment-options {"url":"https://jobs.smartrecruiters.com/Acme/744000123456789-software-engineer"}

import { beforeEach, describe, expect, it } from "vitest";

import { SmartRecruitersAdapter } from "../../src/adapters/ats/SmartRecruitersAdapter";

describe("SmartRecruitersAdapter", () => {
  beforeEach(() => {
    document.head.innerHTML = "";

    document.body.innerHTML = "";
  });

  it("extracts a SmartRecruiters job", () => {
    const script = document.createElement("script");

    script.type = "application/ld+json";

    script.textContent = JSON.stringify({
      "@type": "JobPosting",

      title: "Software Engineer",

      hiringOrganization: {
        name: "Acme",
      },

      jobLocation: {
        address: {
          addressLocality: "Cyberjaya",

          addressRegion: "Selangor",

          addressCountry: "Malaysia",
        },
      },

      employmentType: "Full-time",
    });

    document.head.appendChild(script);

    const result = new SmartRecruitersAdapter().extractJobDetails();

    expect(result?.jobTitle).toBe("Software Engineer");

    expect(result?.company).toBe("Acme");

    expect(result?.platform).toBe("SmartRecruiters");

    expect(result?.jobType).toBe("Full-time");

    expect(result?.location).toContain("Cyberjaya");
  });
});
