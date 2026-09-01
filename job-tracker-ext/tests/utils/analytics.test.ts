import { describe, expect, it } from "vitest";

import type { JobApplication } from "../../src/types";

import { buildApplicationAnalytics } from "../../src/utils/analytics";

function application(overrides: Partial<JobApplication>): JobApplication {
  return {
    id: overrides.id ?? crypto.randomUUID(),

    ownerKey: "guest",

    company: "Acme",

    jobTitle: "Software Engineer",

    location: null,

    salary: null,

    jobType: null,

    platform: "LinkedIn",

    jobUrl: "",

    applicationDate: "2026-08-01T00:00:00.000Z",

    status: "Applied",

    extractionConfidence: 1,

    applicationConfidence: 1,

    source: "manual",

    extractionMethod: "manual",

    userConfirmed: true,

    notes: "",

    tags: [],

    syncState: "local",

    deletedAt: null,

    createdAt: "2026-08-01T00:00:00.000Z",

    updatedAt: "2026-08-01T00:00:00.000Z",

    ...overrides,
  };
}

describe("application analytics", () => {
  it("excludes saved jobs from submitted applications", () => {
    const result = buildApplicationAnalytics([
      application({
        status: "Saved",
      }),

      application({
        status: "Applied",
      }),

      application({
        status: "Interview",
      }),
    ]);

    expect(result.submittedCount).toBe(2);
  });

  it("calculates response and progression rates", () => {
    const result = buildApplicationAnalytics([
      application({
        status: "Applied",
      }),

      application({
        status: "Assessment",
      }),

      application({
        status: "Interview",
      }),

      application({
        status: "Offer",
      }),

      application({
        status: "Rejected",
      }),
    ]);

    expect(result.submittedCount).toBe(5);

    expect(result.responseCount).toBe(4);

    expect(result.responseRate).toBe(80);

    expect(result.interviewProgressCount).toBe(2);

    expect(result.interviewRate).toBe(40);

    expect(result.offerRate).toBe(20);
  });

  it("sorts platform breakdown by usage", () => {
    const result = buildApplicationAnalytics([
      application({
        platform: "LinkedIn",
      }),

      application({
        platform: "LinkedIn",
      }),

      application({
        platform: "Workday",
      }),
    ]);

    expect(result.platformBreakdown[0]?.platform).toBe("LinkedIn");

    expect(result.platformBreakdown[0]?.count).toBe(2);

    expect(result.platformBreakdown[0]?.percentage).toBe(67);
  });

  it("creates six monthly buckets including empty months", () => {
    const result = buildApplicationAnalytics(
      [
        application({
          applicationDate: "2026-08-10T00:00:00.000Z",
        }),

        application({
          applicationDate: "2026-06-10T00:00:00.000Z",
        }),
      ],

      new Date("2026-08-31T00:00:00.000Z"),
    );

    expect(result.monthlyTrend).toHaveLength(6);

    expect(result.monthlyTrend.at(-1)?.label).toBe("Aug");

    expect(result.monthlyTrend.at(-1)?.count).toBe(1);

    expect(result.monthlyTrend.some((month) => month.count === 0)).toBe(true);
  });
});
