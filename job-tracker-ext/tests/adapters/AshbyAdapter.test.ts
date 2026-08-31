// @vitest-environment jsdom
// @vitest-environment-options {"url":"https://jobs.ashbyhq.com/acme/12345678-1234-1234-1234-123456789abc"}

import { beforeEach, describe, expect, it } from "vitest";

import { AshbyAdapter } from "../../src/adapters/ats/AshbyAdapter";

describe("AshbyAdapter", () => {
  beforeEach(() => {
    document.head.innerHTML = "";

    document.body.innerHTML = "";
  });

  it("extracts an Ashby job", () => {
    const script = document.createElement("script");

    script.type = "application/ld+json";

    script.textContent = JSON.stringify({
      "@type": "JobPosting",

      title: "Frontend Engineer",

      hiringOrganization: {
        name: "Acme",
      },

      jobLocation: {
        address: {
          addressLocality: "Kuala Lumpur",

          addressCountry: "Malaysia",
        },
      },

      employmentType: "Full-time",
    });

    document.head.appendChild(script);

    document.body.innerHTML = `
      <main>
        <h1>
          Frontend Engineer
        </h1>

        <div>
          MYR 8K – MYR 10K per month
        </div>
      </main>
    `;

    const result = new AshbyAdapter().extractJobDetails();

    expect(result).not.toBeNull();

    expect(result?.jobTitle).toBe("Frontend Engineer");

    expect(result?.company).toBe("Acme");

    expect(result?.platform).toBe("Ashby");

    expect(result?.location).toContain("Kuala Lumpur");

    expect(result?.jobUrl).toBe(
      "https://jobs.ashbyhq.com/acme/12345678-1234-1234-1234-123456789abc",
    );
  });

  it("ignores the company job board", () => {
    window.history.replaceState({}, "", "/acme");

    expect(new AshbyAdapter().extractJobDetails()).toBeNull();
  });
});
