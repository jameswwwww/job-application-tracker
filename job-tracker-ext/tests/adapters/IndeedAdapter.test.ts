// @vitest-environment jsdom
// @vitest-environment-options {"url":"https://www.indeed.com/viewjob?jk=abc123"}

import { beforeEach, describe, expect, it } from "vitest";

import { IndeedAdapter } from "../../src/adapters/platforms/IndeedAdapter";

describe("IndeedAdapter", () => {
  beforeEach(() => {
    document.head.innerHTML = "";
    document.body.innerHTML = "";
  });

  it("extracts an Indeed job from DOM selectors", () => {
    document.body.innerHTML = `
      <h1 data-testid="jobTitle">Software Engineer</h1>
      <div data-testid="inlineHeader-companyName">Acme Corp</div>
      <div data-testid="job-location">Kuala Lumpur, Malaysia</div>
      <div id="salaryInfoAndJobType">Full-time · MYR 8,000 - MYR 12,000 per month</div>
    `;

    const adapter = new IndeedAdapter();
    const result = adapter.extractJobDetails();

    expect(result).not.toBeNull();
    expect(result?.jobTitle).toBe("Software Engineer");
    expect(result?.company).toBe("Acme Corp");
    expect(result?.location).toBe("Kuala Lumpur, Malaysia");
    expect(result?.platform).toBe("Indeed");
    expect(result?.extractionConfidence).toBeGreaterThan(0.5);
  });

  it("falls back to JSON-LD", () => {
    const script = document.createElement("script");
    script.type = "application/ld+json";
    script.textContent = JSON.stringify({
      "@type": "JobPosting",
      title: "Data Analyst",
      hiringOrganization: { name: "Acme Corp" },
    });
    document.head.appendChild(script);

    const adapter = new IndeedAdapter();
    const result = adapter.extractJobDetails();

    expect(result).not.toBeNull();
    expect(result?.jobTitle).toBe("Data Analyst");
    expect(result?.platform).toBe("Indeed");
  });

  it("returns null when no job title or company found", () => {
    document.body.innerHTML = `<div>Empty page</div>`;

    const adapter = new IndeedAdapter();
    expect(adapter.extractJobDetails()).toBeNull();
  });

  it("extracts salary and job type from combined text", () => {
    document.body.innerHTML = `
      <h1 data-testid="jobTitle">Designer</h1>
      <div data-testid="inlineHeader-companyName">Acme Corp</div>
      <div id="salaryInfoAndJobType">Part-time · USD 45 – USD 55 per hour</div>
    `;

    const adapter = new IndeedAdapter();
    const result = adapter.extractJobDetails();

    expect(result).not.toBeNull();
    expect(result?.salary).toContain("USD");
    expect(result?.jobType).toBe("Part-time");
  });

  it("preserves jk query param in URL", () => {
    document.body.innerHTML = `
      <h1 data-testid="jobTitle">Engineer</h1>
      <div data-testid="inlineHeader-companyName">Acme Corp</div>
    `;

    const adapter = new IndeedAdapter();
    const result = adapter.extractJobDetails();

    expect(result).not.toBeNull();
    expect(result?.jobUrl).toContain("jk=abc123");
  });
});
