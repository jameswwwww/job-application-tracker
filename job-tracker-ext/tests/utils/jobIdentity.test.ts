import { describe, expect, it } from "vitest";

import {
  isSameJob,
  mergeJobContext,
  normalizeJobUrl,
} from "../../src/utils/jobIdentity";

describe("job identity", () => {
  it("ignores tracking parameters", () => {
    expect(
      normalizeJobUrl(
        "https://example.com/job/123?utm_source=linkedin&ref=test",
      ),
    ).toBe("https://example.com/job/123");
  });

  it("keeps meaningful query parameters", () => {
    expect(
      normalizeJobUrl("https://example.com/viewjob?jk=abc123&utm_source=email"),
    ).toContain("jk=abc123");
  });

  it("matches title and company case-insensitively when URL is unavailable", () => {
    expect(
      isSameJob(
        {
          company: "  Acme ",
          jobTitle: "Software Engineer",
        },
        {
          company: "acme",
          jobTitle: " software   engineer ",
        },
      ),
    ).toBe(true);
  });

  it("does not merge different postings with the same title", () => {
    expect(
      isSameJob(
        {
          company: "Acme",
          jobTitle: "Software Engineer",
          jobUrl: "https://jobs.example.com/123",
        },
        {
          company: "Acme",
          jobTitle: "Software Engineer",
          jobUrl: "https://jobs.example.com/456",
        },
      ),
    ).toBe(false);
  });

  it("keeps missing details for the same job", () => {
    const result = mergeJobContext(
      {
        company: "Acme",
        jobTitle: "Engineer",
        jobUrl: "https://example.com/jobs/123",
        salary: "MYR 7,000",
      },
      {
        company: "Acme",
        jobTitle: "Engineer",
        jobUrl: "https://example.com/jobs/123",
        location: "Kuala Lumpur",
      },
    );

    expect(result.salary).toBe("MYR 7,000");

    expect(result.location).toBe("Kuala Lumpur");
  });

  it("does not leak old details into another job", () => {
    const result = mergeJobContext(
      {
        company: "Acme",
        jobTitle: "Engineer",
        jobUrl: "https://example.com/jobs/123",
        salary: "MYR 7,000",
      },
      {
        company: "Acme",
        jobTitle: "Engineer",
        jobUrl: "https://example.com/jobs/456",
        location: "Penang",
      },
    );

    expect(result.salary).toBeUndefined();

    expect(result.location).toBe("Penang");
  });
});
