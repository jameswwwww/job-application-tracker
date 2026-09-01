// @vitest-environment jsdom
// @vitest-environment-options {"url":"https://www.linkedin.com/jobs/view/software-engineer-at-acme-12345"}

import { beforeEach, describe, expect, it } from "vitest";

import { LinkedInAdapter } from "../../src/adapters/platforms/LinkedInAdapter";

describe("LinkedInAdapter", () => {
  beforeEach(() => {
    document.head.innerHTML = "";
    document.body.innerHTML = "";
  });

  it("extracts a LinkedIn job from DOM selectors", () => {
    document.body.innerHTML = `
      <div class="job-details-jobs-unified-top-card">
        <div class="job-details-jobs-unified-top-card__job-title">
          <h1>Software Engineer</h1>
        </div>
        <div class="job-details-jobs-unified-top-card__company-name">
          <a>Acme Corp</a>
        </div>
        <div class="job-details-jobs-unified-top-card__primary-description-container">
          <span class="tvm__text">Kuala Lumpur, Malaysia</span>
        </div>
        <div class="job-details-jobs-unified-top-card__job-insight">
          Full-time · MYR 7,000 - MYR 10,000 per month
        </div>
      </div>
    `;

    const adapter = new LinkedInAdapter();
    const result = adapter.extractJobDetails();

    expect(result).not.toBeNull();
    expect(result?.jobTitle).toBe("Software Engineer");
    expect(result?.company).toBe("Acme Corp");
    expect(result?.location).toBe("Kuala Lumpur, Malaysia");
    expect(result?.platform).toBe("LinkedIn");
    expect(result?.extractionConfidence).toBeGreaterThan(0.5);
  });

  it("falls back to JSON-LD when DOM selectors fail", () => {
    const script = document.createElement("script");
    script.type = "application/ld+json";
    script.textContent = JSON.stringify({
      "@type": "JobPosting",
      title: "Backend Engineer",
      hiringOrganization: { name: "Acme Corp" },
      jobLocation: {
        address: {
          addressLocality: "Penang",
          addressCountry: "Malaysia",
        },
      },
      employmentType: "Full-time",
    });
    document.head.appendChild(script);

    const adapter = new LinkedInAdapter();
    const result = adapter.extractJobDetails();

    expect(result).not.toBeNull();
    expect(result?.jobTitle).toBe("Backend Engineer");
    expect(result?.company).toBe("Acme Corp");
    expect(result?.platform).toBe("LinkedIn");
  });

  it("returns null when no job title or company found", () => {
    document.body.innerHTML = `<div>Nothing here</div>`;

    const adapter = new LinkedInAdapter();
    expect(adapter.extractJobDetails()).toBeNull();
  });

  it("extracts salary from job insight text", () => {
    document.body.innerHTML = `
      <div class="job-details-jobs-unified-top-card">
        <div class="job-details-jobs-unified-top-card__job-title">
          <h1>Designer</h1>
        </div>
        <div class="job-details-jobs-unified-top-card__company-name">
          <a>Acme Corp</a>
        </div>
        <div class="job-details-jobs-unified-top-card__job-insight">
          Contract · USD 80K – USD 120K per year
        </div>
      </div>
    `;

    const adapter = new LinkedInAdapter();
    const result = adapter.extractJobDetails();

    expect(result).not.toBeNull();
    expect(result?.salary).toContain("USD");
    expect(result?.jobType).toBe("Contract");
  });

  it("strips query params from job URL", () => {
    document.body.innerHTML = `
      <div class="job-details-jobs-unified-top-card">
        <div class="job-details-jobs-unified-top-card__job-title">
          <h1>PM</h1>
        </div>
        <div class="job-details-jobs-unified-top-card__company-name">
          <a>Acme Corp</a>
        </div>
      </div>
    `;

    const adapter = new LinkedInAdapter();
    const result = adapter.extractJobDetails();

    expect(result).not.toBeNull();
    expect(result?.jobUrl).not.toContain("?");
  });
});
