import { db } from "./db";
import type { JobApplication, ApplicationFormValues } from "../types";
import { v4 as uuidv4 } from "uuid";

type NewApplication = Omit<JobApplication, "id" | "createdAt" | "updatedAt">;

export async function createManualApplication(values: ApplicationFormValues) {
  const existing = await db.applications
    .where("[company+jobTitle]")
    .equals([values.company, values.jobTitle])
    .first();

  if (existing) {
    throw new Error("An application for this company and role already exists.");
  }

  const now = new Date().toISOString();

  const newApplication: JobApplication = {
    id: uuidv4(),

    company: values.company.trim(),
    jobTitle: values.jobTitle.trim(),

    location: values.location?.trim() || null,

    salary: values.salary?.trim() || null,

    jobType: values.jobType?.trim() || null,

    platform: values.platform,

    jobUrl: values.jobUrl?.trim() || "",

    applicationDate: new Date(values.applicationDate).toISOString(),

    status: values.status,

    // User entered these details manually,
    // so extraction itself is not uncertain.
    extractionConfidence: 1,

    // If they manually say they applied,
    // we can trust that.
    applicationConfidence: values.status === "Saved" ? 0 : 1,

    source: "manual",

    extractionMethod: "manual",

    userConfirmed: values.status !== "Saved",

    notes: values.notes?.trim() || "",

    createdAt: now,
    updatedAt: now,
  };

  await db.applications.add(newApplication);

  return newApplication.id;
}

export async function updateApplication(
  id: string,
  values: ApplicationFormValues,
) {
  const existing = await db.applications.get(id);

  if (!existing) {
    throw new Error("Application could not be found.");
  }

  const now = new Date().toISOString();

  await db.applications.update(id, {
    company: values.company.trim(),

    jobTitle: values.jobTitle.trim(),

    location: values.location?.trim() || null,

    salary: values.salary?.trim() || null,

    jobType: values.jobType?.trim() || null,

    platform: values.platform,

    jobUrl: values.jobUrl?.trim() || "",

    applicationDate: new Date(values.applicationDate).toISOString(),

    status: values.status,

    notes: values.notes?.trim() || "",

    // If the user manually changes a record
    // to Applied/Interview/etc, that's an
    // explicit confirmation.
    applicationConfidence:
      values.status === "Saved" ? existing.applicationConfidence : 1,

    userConfirmed: values.status === "Saved" ? existing.userConfirmed : true,

    updatedAt: now,
  });

  return id;
}

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
