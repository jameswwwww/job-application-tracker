import Dexie, { type Table } from "dexie";
import type { ApplicationStatusEvent, JobApplication } from "../types";
import { buildInitialStatusEvents } from "../utils/statusHistory";

export class JobTrackerDB extends Dexie {
  applications!: Table<JobApplication>;

  statusEvents!: Table<ApplicationStatusEvent>;

  constructor() {
    super("JobTrackerDB");

    this.version(1).stores({
      applications:
        "&id, company, status, platform, applicationDate, [company+jobTitle]",
    });

    this.version(2)
      .stores({
        applications:
          "&id, company, status, platform, applicationDate, source, [company+jobTitle]",
      })
      .upgrade((transaction) => {
        return transaction
          .table("applications")
          .toCollection()
          .modify((application) => {
            application.salary ??= null;

            application.extractionConfidence ??=
              application.confidenceScore ?? 0.5;

            application.applicationConfidence ??=
              application.confidenceScore ?? 0.5;

            application.source ??= "automatic";

            application.extractionMethod ??= "platform-dom";

            application.userConfirmed ??= false;

            application.createdAt ??= application.applicationDate;

            application.updatedAt ??= application.applicationDate;

            delete application.confidenceScore;
          });
      });

    this.version(3)
      .stores({
        applications:
          "&id, ownerKey, company, status, platform, applicationDate, source, syncState, [company+jobTitle], [ownerKey+company+jobTitle]",
      })
      .upgrade((transaction) => {
        return transaction
          .table("applications")
          .toCollection()
          .modify((application) => {
            application.ownerKey ??= "guest";

            application.syncState ??= "local";

            application.deletedAt ??= null;
          });
      });

    this.version(4)
      .stores({
        applications:
          "&id, ownerKey, company, status, platform, applicationDate, source, syncState, [company+jobTitle], [ownerKey+company+jobTitle]",

        statusEvents:
          "&id, applicationId, ownerKey, status, occurredAt, syncState, [applicationId+occurredAt], [ownerKey+applicationId]",
      })
      .upgrade(async (transaction) => {
        const applications = await transaction.table("applications").toArray();

        const statusEvents = transaction.table("statusEvents");

        /*
         * We don't have real history
         * for old records, so reconstruct
         * the safest baseline we can.
         *
         * Applied date comes from
         * applicationDate.
         *
         * Current advanced status uses
         * updatedAt.
         */
        for (const application of applications) {
          const events = buildInitialStatusEvents(
            application as JobApplication,
            "migration",
          );

          await statusEvents.bulkAdd(events);
        }
      });

    this.version(5)
      .stores({
        applications:
          "&id, ownerKey, company, status, platform, applicationDate, source, syncState, *tags, [company+jobTitle], [ownerKey+company+jobTitle]",

        statusEvents:
          "&id, applicationId, ownerKey, status, occurredAt, syncState, [applicationId+occurredAt], [ownerKey+applicationId]",
      })
      .upgrade((transaction) => {
        return transaction
          .table("applications")
          .toCollection()
          .modify((application) => {
            application.tags ??= [];
          });
      });
  }
}

export const db = new JobTrackerDB();
