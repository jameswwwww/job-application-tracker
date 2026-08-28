import { db } from "./db";
import type { JobApplication } from "../types";
import { v4 as uuidv4 } from "uuid";

type NewApplication = Omit<JobApplication, "id" | "createdAt" | "updatedAt">;

export async function processDetectedApplication(payload: NewApplication) {
  const existingApp = await db.applications
    .where("[company+jobTitle]")
    .equals([payload.company, payload.jobTitle])
    .first();

  const now = new Date().toISOString();

  if (existingApp) {
    console.log(
      "Job Tracker: Duplicate detected. Updating existing application.",
    );

    await db.applications.update(existingApp.id, {
      status: payload.status,

      applicationDate: payload.applicationDate,

      extractionConfidence: Math.max(
        existingApp.extractionConfidence ?? 0,
        payload.extractionConfidence,
      ),

      applicationConfidence: Math.max(
        existingApp.applicationConfidence ?? 0,
        payload.applicationConfidence,
      ),

      userConfirmed: existingApp.userConfirmed || payload.userConfirmed,

      location: payload.location || existingApp.location,

      salary: payload.salary || existingApp.salary,

      jobType: payload.jobType || existingApp.jobType,

      updatedAt: now,
    });

    return existingApp.id;
  }

  const newApp: JobApplication = {
    ...payload,

    id: uuidv4(),

    createdAt: now,
    updatedAt: now,
  };

  console.log("Job Tracker: Saving new application:", newApp);

  await db.applications.add(newApp);

  return newApp.id;
}
