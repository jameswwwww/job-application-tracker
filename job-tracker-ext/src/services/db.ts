import Dexie, { type Table } from "dexie";
import type { JobApplication } from "../types";

export class JobTrackerDB extends Dexie {
  // Declare the table structure
  applications!: Table<JobApplication>;

  constructor() {
    super("JobTrackerDB");

    // Define indexed fields.
    // '&id' = primary key.
    // '[company+jobTitle]' = compound index for fast duplicate checking.
    this.version(1).stores({
      applications:
        "&id, company, status, platform, applicationDate, [company+jobTitle]",
    });
  }
}

export const db = new JobTrackerDB();
