import { v4 as uuidv4, v5 as uuidv5 } from "uuid";

import type {
  ApplicationStatus,
  ApplicationStatusEvent,
  JobApplication,
  StatusEventSource,
} from "../types";

const MIGRATION_EVENT_NAMESPACE = "87d3c9c2-6ae0-4c94-a412-4e3e0d6d8aa1";

const RESPONSE_STATUSES: ReadonlySet<ApplicationStatus> = new Set([
  "Assessment",
  "Interview",
  "Offer",
  "Rejected",
]);

interface BuildStatusEventOptions {
  id?: string;
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
    id: options.id ?? uuidv4(),

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
        id:
          source === "migration"
            ? migrationEventId(
                application.id,
                "Applied",
                application.applicationDate,
              )
            : undefined,
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
    id:
      source === "migration"
        ? migrationEventId(
            application.id,
            application.status,
            application.updatedAt,
          )
        : undefined,
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
    id:
      source === "migration"
        ? migrationEventId(
            application.id,
            "Applied",
            application.applicationDate,
          )
        : undefined,
    applicationId: application.id,

    ownerKey: application.ownerKey,

    status: application.status,

    source,

    occurredAt: application.updatedAt,
  });

  return [appliedEvent, currentEvent];
}

export function getResponseTimeMs(
  events: ApplicationStatusEvent[],
): number | null {
  const appliedAt = events
    .filter((event) => event.status === "Applied")
    .map((event) => new Date(event.occurredAt).getTime())
    .filter(Number.isFinite)
    .sort((a, b) => a - b)[0];

  if (appliedAt === undefined) return null;

  const responseAt = events
    .filter((event) => RESPONSE_STATUSES.has(event.status))
    .map((event) => new Date(event.occurredAt).getTime())
    .filter((time) => Number.isFinite(time) && time >= appliedAt)
    .sort((a, b) => a - b)[0];

  return responseAt === undefined ? null : responseAt - appliedAt;
}

export function formatResponseTime(milliseconds: number): string {
  const hours = Math.floor(milliseconds / 3_600_000);

  if (hours < 1) {
    return `${Math.max(1, Math.round(milliseconds / 60_000))}m`;
  }

  const days = Math.floor(hours / 24);
  const remainingHours = hours % 24;

  return days
    ? `${days}d${remainingHours ? ` ${remainingHours}h` : ""}`
    : `${hours}h`;
}

function migrationEventId(
  applicationId: string,
  status: ApplicationStatus,
  occurredAt: string,
) {
  return uuidv5(
    [applicationId, status, occurredAt, "migration"].join("|"),

    MIGRATION_EVENT_NAMESPACE,
  );
}
