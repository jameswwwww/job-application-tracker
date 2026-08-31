import { db } from "./db";
import type {
  JobApplication,
  ApplicationFormValues,
  NewApplicationPayload,
} from "../types";
import { v4 as uuidv4 } from "uuid";
import {
  GUEST_OWNER_KEY,
  getCurrentOwnerKey,
  syncApplication,
} from "./syncService";
import { isSameJob } from "../utils/jobIdentity";

async function findMatchingApplication(
  ownerKey: string,
  candidate: {
    company: string;
    jobTitle: string;
    jobUrl?: string;
    platform?: JobApplication["platform"];
  },
) {
  const applications = await db.applications
    .where("ownerKey")
    .equals(ownerKey)
    .filter((application) => !application.deletedAt)
    .toArray();

  return applications.find((application) => isSameJob(application, candidate));
}

export async function createManualApplication(values: ApplicationFormValues) {
  const ownerKey = await getCurrentOwnerKey();
  const company = values.company.trim();

  const jobTitle = values.jobTitle.trim();

  const jobUrl = values.jobUrl?.trim() || "";

  const existing = await findMatchingApplication(ownerKey, {
    company,
    jobTitle,
    jobUrl,
    platform: values.platform,
  });

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

    ownerKey,

    syncState: ownerKey === GUEST_OWNER_KEY ? "local" : "pending",

    deletedAt: null,
  };

  await db.applications.add(newApplication);

  if (ownerKey !== GUEST_OWNER_KEY) {
    await syncApplication(newApplication.id);
  }

  return newApplication.id;
}

export async function updateApplication(
  id: string,
  values: ApplicationFormValues,
) {
  const existing = await db.applications.get(id);
  const syncState =
    existing?.ownerKey === GUEST_OWNER_KEY ? "local" : "pending";

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

    applicationConfidence:
      existing.source === "manual" && values.status !== "Saved"
        ? 1
        : existing.applicationConfidence,

    userConfirmed: values.status === "Saved" ? existing.userConfirmed : true,

    updatedAt: now,
    syncState,
  });

  if (existing.ownerKey !== GUEST_OWNER_KEY) {
    await syncApplication(id);
  }

  return id;
}

export async function processDetectedApplication(
  payload: NewApplicationPayload,
) {
  const ownerKey = await getCurrentOwnerKey();
  const existingApp = await findMatchingApplication(ownerKey, payload);

  const now = new Date().toISOString();

  if (existingApp) {
    console.log(
      "Job Tracker: Duplicate detected. Updating existing application.",
    );

    await db.applications.update(existingApp.id, {
      status:
        existingApp.status === "Saved" ? payload.status : existingApp.status,

      applicationDate:
        existingApp.status === "Saved"
          ? payload.applicationDate
          : existingApp.applicationDate,

      jobUrl: existingApp.jobUrl || payload.jobUrl,

      platform:
        existingApp.platform === "Other"
          ? payload.platform
          : existingApp.platform,

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
      syncState: ownerKey === GUEST_OWNER_KEY ? "local" : "pending",
    });

    if (ownerKey !== GUEST_OWNER_KEY) {
      await syncApplication(existingApp.id);
    }

    return existingApp.id;
  }

  const newApp: JobApplication = {
    ...payload,

    id: uuidv4(),

    createdAt: now,
    updatedAt: now,

    ownerKey,

    syncState: ownerKey === GUEST_OWNER_KEY ? "local" : "pending",

    deletedAt: null,
  };

  console.log("Job Tracker: Saving new application:", newApp);

  await db.applications.add(newApp);

  if (ownerKey !== GUEST_OWNER_KEY) {
    await syncApplication(newApp.id);
  }

  return newApp.id;
}

export async function deleteApplication(id: string) {
  const existing = await db.applications.get(id);

  if (!existing) {
    return;
  }

  // Guest applications have no
  // cloud copy.
  if (existing.ownerKey === GUEST_OWNER_KEY) {
    await db.applications.delete(id);

    return;
  }

  const now = new Date().toISOString();

  // Keep a hidden tombstone locally
  // until cloud deletion succeeds.
  await db.applications.update(id, {
    deletedAt: now,
    updatedAt: now,
    syncState: "pending",
  });

  await syncApplication(id);
}

export async function updateApplicationStatus(
  id: string,
  status: JobApplication["status"],
) {
  const existing = await db.applications.get(id);

  if (!existing) {
    return;
  }

  const now = new Date().toISOString();

  await db.applications.update(id, {
    status,

    applicationConfidence:
      existing.source === "manual" && status !== "Saved"
        ? 1
        : existing.applicationConfidence,

    userConfirmed: status === "Saved" ? existing.userConfirmed : true,

    syncState: existing.ownerKey === GUEST_OWNER_KEY ? "local" : "pending",

    updatedAt: now,
  });

  if (existing.ownerKey !== GUEST_OWNER_KEY) {
    await syncApplication(id);
  }
}
