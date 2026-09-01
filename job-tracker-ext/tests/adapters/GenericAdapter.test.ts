// @vitest-environment jsdom

import { beforeEach, describe, expect, it } from "vitest";

import { GenericAdapter } from "../../src/adapters/GenericAdapter";

describe("GenericAdapter", () => {
  beforeEach(() => {
    document.head.innerHTML = "";
    document.body.innerHTML = "";
  });

  it("extracts job from JSON-LD with @graph", () => {
    const script = document.createElement("script");
    script.type = "application/ld+json";
    script.textContent = JSON.stringify({
      "@context": "https://schema.org",
      "@graph": [
        { "@type": "Organization", name: "Acme Corp" },
        {
          "@type": "JobPosting",
          title: "Software Engineer",
          hiringOrganization: { name: "Acme Corp" },
          jobLocation: {
            address: {
              addressLocality: "Kuala Lumpur",
              addressRegion: "Selangor",
              addressCountry: "MY",
            },
          },
          employmentType: "FULL_TIME",
        },
      ],
    });
    document.head.appendChild(script);

    const adapter = new GenericAdapter();
    const result = adapter.extractJobDetails();

    expect(result).not.toBeNull();
    expect(result?.jobTitle).toBe("Software Engineer");
    expect(result?.company).toBe("Acme Corp");
    expect(result?.location).toContain("Kuala Lumpur");
    expect(result?.platform).toBe("CompanySite");
    expect(result?.extractionMethod).toBe("json-ld");
    expect(result?.extractionConfidence).toBeGreaterThan(0.8);
  });

  it("extracts remote jobs from JSON-LD", () => {
    const script = document.createElement("script");
    script.type = "application/ld+json";
    script.textContent = JSON.stringify({
      "@type": "JobPosting",
      title: "Designer",
      hiringOrganization: { name: "Acme Corp" },
      jobLocationType: "TELECOMMUTE",
    });
    document.head.appendChild(script);

    const adapter = new GenericAdapter();
    const result = adapter.extractJobDetails();

    expect(result).not.toBeNull();
    expect(result?.location).toBe("Remote");
  });

  it("falls back to generic DOM extraction", () => {
    document.title = "Software Engineer at Acme Corp | Careers";

    document.body.innerHTML = `
      <main>
        <h1>Software Engineer</h1>
        <div class="company-name">Acme Corp</div>
        <div class="job-location">Remote</div>
        <div>
          Full-time contract position.
          Salary: USD 100,000 – USD 130,000 per year.
        </div>
      </main>
    `;

    const adapter = new GenericAdapter();
    const result = adapter.extractJobDetails();

    expect(result).not.toBeNull();
    expect(result?.jobTitle).toBe("Software Engineer");
    expect(result?.platform).toBe("CompanySite");
    expect(result?.extractionMethod).toBe("generic-dom");
  });

  it("returns null when no job-like content detected", () => {
    document.title = "About Us - Acme Corp";
    Object.defineProperty(document.body, "innerText", {
      value: "Welcome to Acme. We build great things.",
      writable: true,
    });

    const adapter = new GenericAdapter();
    expect(adapter.extractJobDetails()).toBeNull();
  });

  it("returns null when no title found", () => {
    document.body.innerHTML = `<main><div>No heading here</div></main>`;

    const adapter = new GenericAdapter();
    expect(adapter.extractJobDetails()).toBeNull();
  });
});
