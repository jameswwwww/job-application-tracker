import { v4 as uuidv4, v5 as uuidv5 } from "uuid";

import type {
  ApplicationStatus,
  ApplicationStatusEvent,
  JobApplication,
  StatusEventSource,
} from "../types";

const MIGRATION_EVENT_NAMESPACE = "87d3c9c2-6ae0-4c94-a412-4e3e0d6d8aa1";

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
            "Applied",
            application.applicationDate,
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
