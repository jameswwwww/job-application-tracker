import { db } from "./db";
import type { JobApplication } from "../types";
import { v4 as uuidv4 } from "uuid";

export async function processDetectedApplication(
  payload: Omit<JobApplication, "id">,
) {
  // 1. Duplicate Check: Look for the exact same company and job title
  const existingApp = await db.applications
    .where("[company+jobTitle]")
    .equals([payload.company, payload.jobTitle])
    .first();

  if (existingApp) {
    console.log("Duplicate detected. Updating existing record instead.");
    // If the new event has a higher confidence score or progressed status, update it
    return await db.applications.update(existingApp.id, {
      status: payload.status,
      confidenceScore: Math.max(
        existingApp.confidenceScore,
        payload.confidenceScore,
      ),
      applicationDate: payload.applicationDate, // refresh date to latest interaction
    });
  }

  // 2. Insert New Application
  const newApp: JobApplication = {
    ...payload,
    id: uuidv4(),
  };

  console.log("Saving new job application:", newApp);
  return await db.applications.add(newApp);
}
