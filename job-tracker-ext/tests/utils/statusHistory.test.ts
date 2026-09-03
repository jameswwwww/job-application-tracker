import { describe, expect, it } from "vitest";

import type { JobApplication } from "../../src/types";

import {
  buildInitialStatusEvents,
  buildStatusEvent,
  formatResponseTime,
  getResponseTimeMs,
} from "../../src/utils/statusHistory";

function application(status: JobApplication["status"]): JobApplication {
  return {
    id: "app-1",

    ownerKey: "guest",

    company: "Acme",

    jobTitle: "Engineer",

    location: null,

    salary: null,

    offeredSalary: null,

    jobType: null,

    recruiter: null,

    interviewQuestions: [],

    platform: "LinkedIn",

    jobUrl: "",

    applicationDate: "2026-08-01T00:00:00.000Z",

    status,

    extractionConfidence: 1,

    applicationConfidence: 1,

    source: "manual",

    extractionMethod: "manual",

    userConfirmed: true,

    notes: "",

    tags: [],

    syncState: "local",

    deletedAt: null,

    createdAt: "2026-07-30T00:00:00.000Z",

    updatedAt: "2026-08-15T00:00:00.000Z",
  };
}

describe("status history", () => {
  it("creates local guest events", () => {
    const event = buildStatusEvent({
      applicationId: "app-1",

      ownerKey: "guest",

      status: "Interview",

      source: "manual",

      occurredAt: "2026-08-20T00:00:00.000Z",
    });

    expect(event.syncState).toBe("local");

    expect(event.status).toBe("Interview");
  });

  it("creates one Saved baseline", () => {
    const events = buildInitialStatusEvents(
      application("Saved"),

      "migration",
    );

    expect(events).toHaveLength(1);

    expect(events[0]?.status).toBe("Saved");
  });

  it("creates Applied baseline for an applied job", () => {
    const events = buildInitialStatusEvents(
      application("Applied"),

      "migration",
    );

    expect(events).toHaveLength(1);

    expect(events[0]?.occurredAt).toBe("2026-08-01T00:00:00.000Z");
  });

  it("reconstructs Applied plus current advanced status", () => {
    const events = buildInitialStatusEvents(
      application("Interview"),

      "migration",
    );

    expect(events.map((event) => event.status)).toEqual([
      "Applied",
      "Interview",
    ]);
  });

  it("creates deterministic migration event ids", () => {
    const first = buildInitialStatusEvents(
      application("Interview"),
      "migration",
    );

    const second = buildInitialStatusEvents(
      application("Interview"),
      "migration",
    );

    expect(first.map((event) => event.id)).toEqual(
      second.map((event) => event.id),
    );

    expect(new Set(first.map((event) => event.id)).size).toBe(first.length);
  });

  it("calculates time to the first employer response", () => {
    const events = [
      buildStatusEvent({
        applicationId: "app-1",
        ownerKey: "guest",
        status: "Applied",
        source: "manual",
        occurredAt: "2026-08-01T09:00:00.000Z",
      }),
      buildStatusEvent({
        applicationId: "app-1",
        ownerKey: "guest",
        status: "Interview",
        source: "manual",
        occurredAt: "2026-08-03T12:00:00.000Z",
      }),
    ];

    const milliseconds = getResponseTimeMs(events);

    expect(milliseconds).toBe(51 * 60 * 60 * 1000);
    expect(formatResponseTime(milliseconds!)).toBe("2d 3h");
  });
});
