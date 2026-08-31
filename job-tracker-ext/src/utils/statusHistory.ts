import { v4 as uuidv4 } from "uuid";

import type {
  ApplicationStatus,
  ApplicationStatusEvent,
  JobApplication,
  StatusEventSource,
} from "../types";

interface BuildStatusEventOptions {
  applicationId: string;
  ownerKey: string;
  status: ApplicationStatus;
  source: StatusEventSource;
  occurredAt: string;
}

export function buildStatusEvent(
  options: BuildStatusEventOptions,
): ApplicationStatusEvent {
  return {
    id: uuidv4(),

    applicationId: options.applicationId,

    ownerKey: options.ownerKey,

    status: options.status,

    source: options.source,

    occurredAt: options.occurredAt,

    createdAt: new Date().toISOString(),

    syncState: options.ownerKey === "guest" ? "local" : "pending",
  };
}

export function buildInitialStatusEvents(
  application: JobApplication,
  source: StatusEventSource,
): ApplicationStatusEvent[] {
  /*
   * A saved job hasn't necessarily
   * been submitted yet.
   */
  if (application.status === "Saved") {
    return [
      buildStatusEvent({
        applicationId: application.id,

        ownerKey: application.ownerKey,

        status: "Saved",

        source,

        occurredAt: application.createdAt,
      }),
    ];
  }

  /*
   * Every non-Saved application
   * has at least reached Applied.
   */
  const appliedEvent = buildStatusEvent({
    applicationId: application.id,

    ownerKey: application.ownerKey,

    status: "Applied",

    source,

    occurredAt: application.applicationDate,
  });

  if (application.status === "Applied") {
    return [appliedEvent];
  }

  /*
   * Existing/manual records may
   * already be further along.
   */
  const currentEvent = buildStatusEvent({
    applicationId: application.id,

    ownerKey: application.ownerKey,

    status: application.status,

    source,

    occurredAt: application.updatedAt,
  });

  return [appliedEvent, currentEvent];
}
