import Dexie, { type Table } from "dexie";
import type { JobApplication } from "../types";

export class JobTrackerDB extends Dexie {
  applications!: Table<JobApplication>;

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
  }
}

export const db = new JobTrackerDB();
