import { describe, expect, it } from "vitest";

import type { JobApplication } from "../../src/types";

import {
  buildInitialStatusEvents,
  buildStatusEvent,
} from "../../src/utils/statusHistory";

function application(status: JobApplication["status"]): JobApplication {
  return {
    id: "app-1",

    ownerKey: "guest",

    company: "Acme",

    jobTitle: "Engineer",

    location: null,

    salary: null,

    jobType: null,

    recruiter: null,

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
  });
});
