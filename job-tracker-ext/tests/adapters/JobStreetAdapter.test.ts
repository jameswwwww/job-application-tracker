// @vitest-environment jsdom
// @vitest-environment-options {"url":"https://www.jobstreet.com.my/job/software-engineer-at-acme-corp-12345/job"}

import { beforeEach, describe, expect, it } from "vitest";

import { JobStreetAdapter } from "../../src/adapters/platforms/JobStreetAdapter";

describe("JobStreetAdapter", () => {
  beforeEach(() => {
    document.head.innerHTML = "";
    document.body.innerHTML = "";
  });

  it("extracts a JobStreet job from DOM selectors", () => {
    document.body.innerHTML = `
      <h1 data-automation="job-detail-title">Software Engineer</h1>
      <div data-automation="advertiser-name">Acme Corp</div>
      <div data-automation="job-detail-location"><a>Kuala Lumpur</a></div>
      <div data-automation="job-detail-salary">MYR 7,000 - MYR 10,000 per month</div>
      <div data-automation="job-detail-work-type">Full-time</div>
    `;

    const adapter = new JobStreetAdapter();
    const result = adapter.extractJobDetails();

    expect(result).not.toBeNull();
    expect(result?.jobTitle).toBe("Software Engineer");
    expect(result?.company).toBe("Acme Corp");
    expect(result?.location).toBe("Kuala Lumpur");
    expect(result?.salary).toBe("MYR 7,000 - MYR 10,000 per month");
    expect(result?.jobType).toBe("Full-time");
    expect(result?.platform).toBe("JobStreet");
    expect(result?.extractionConfidence).toBeGreaterThan(0.5);
  });

  it("falls back to JSON-LD", () => {
    const script = document.createElement("script");
    script.type = "application/ld+json";
    script.textContent = JSON.stringify({
      "@type": "JobPosting",
      title: "Data Analyst",
      hiringOrganization: { name: "Acme Corp" },
      jobLocation: {
        address: {
          addressLocality: "Penang",
          addressCountry: "Malaysia",
        },
      },
    });
    document.head.appendChild(script);

    document.body.innerHTML = `<div></div>`;

    const adapter = new JobStreetAdapter();
    const result = adapter.extractJobDetails();

    expect(result).not.toBeNull();
    expect(result?.jobTitle).toBe("Data Analyst");
    expect(result?.platform).toBe("JobStreet");
  });

  it("returns null when no job title or company found", () => {
    document.body.innerHTML = `<div>Nothing here</div>`;

    const adapter = new JobStreetAdapter();
    expect(adapter.extractJobDetails()).toBeNull();
  });

  it("strips query params from job URL", () => {
    document.body.innerHTML = `
      <h1 data-automation="job-detail-title">PM</h1>
      <div data-automation="advertiser-name">Acme Corp</div>
    `;

    const adapter = new JobStreetAdapter();
    const result = adapter.extractJobDetails();

    expect(result).not.toBeNull();
    expect(result?.jobUrl).not.toContain("?");
  });
});
