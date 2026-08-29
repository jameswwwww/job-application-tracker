import { db } from "./db";
import { supabase } from "./supabase";
import { getSessionUserId } from "./authService";

import type { JobApplication } from "../types";

export const GUEST_OWNER_KEY = "guest";

interface CloudApplicationRow {
  id: string;
  user_id: string;

  company: string;
  job_title: string;

  location: string | null;
  salary: string | null;
  job_type: string | null;

  platform: string;
  job_url: string;

  application_date: string;
  status: string;

  extraction_confidence: number;
  application_confidence: number;

  source: string;
  extraction_method: string;

  user_confirmed: boolean;

  notes: string;

  deleted_at: string | null;

  created_at: string;
  updated_at: string;
}

export interface SyncResult {
  pushed: number;
  pulled: number;
  deleted: number;
  errors: number;
}

function toCloudRow(
  application: JobApplication,
  userId: string,
): CloudApplicationRow {
  return {
    id: application.id,

    user_id: userId,

    company: application.company,

    job_title: application.jobTitle,

    location: application.location,

    salary: application.salary,

    job_type: application.jobType,

    platform: application.platform,

    job_url: application.jobUrl,

    application_date: application.applicationDate,

    status: application.status,

    extraction_confidence: application.extractionConfidence,

    application_confidence: application.applicationConfidence,

    source: application.source,

    extraction_method: application.extractionMethod,

    user_confirmed: application.userConfirmed,

    notes: application.notes ?? "",

    deleted_at: application.deletedAt,

    created_at: application.createdAt,

    updated_at: application.updatedAt,
  };
}

function fromCloudRow(row: CloudApplicationRow): JobApplication {
  return {
    id: row.id,

    ownerKey: row.user_id,

    company: row.company,

    jobTitle: row.job_title,

    location: row.location,

    salary: row.salary,

    jobType: row.job_type,

    platform: row.platform as JobApplication["platform"],

    jobUrl: row.job_url,

    applicationDate: row.application_date,

    status: row.status as JobApplication["status"],

    extractionConfidence: row.extraction_confidence,

    applicationConfidence: row.application_confidence,

    source: row.source as JobApplication["source"],

    extractionMethod:
      row.extraction_method as JobApplication["extractionMethod"],

    userConfirmed: row.user_confirmed,

    notes: row.notes,

    syncState: "synced",

    deletedAt: row.deleted_at,

    createdAt: row.created_at,

    updatedAt: row.updated_at,
  };
}

async function deleteCloudApplication(id: string, userId: string) {
  const { error } = await supabase
    .from("applications")
    .delete()
    .eq("id", id)
    .eq("user_id", userId);

  if (error) {
    throw error;
  }
}

async function uploadApplication(application: JobApplication, userId: string) {
  const row = toCloudRow(application, userId);

  const { error } = await supabase.from("applications").upsert(row, {
    onConflict: "id",
  });

  if (error) {
    throw error;
  }
}

export async function syncApplication(id: string): Promise<boolean> {
  const application = await db.applications.get(id);

  if (!application) {
    return true;
  }

  if (application.ownerKey === GUEST_OWNER_KEY) {
    return true;
  }

  const userId = await getSessionUserId();

  if (!userId || userId !== application.ownerKey) {
    return false;
  }

  try {
    if (application.deletedAt) {
      await uploadApplication(application, userId);

      await db.applications.update(application.id, {
        syncState: "synced",
      });

      return true;
    }

    await uploadApplication(application, userId);

    await db.applications.update(application.id, {
      syncState: "synced",
    });

    return true;
  } catch (error) {
    console.warn("JobTrack: Cloud sync failed. Keeping local copy.", error);

    await db.applications.update(application.id, {
      syncState: "pending",
    });

    return false;
  }
}

async function migrateGuestApplications(userId: string) {
  const guestApplications = await db.applications
    .where("ownerKey")
    .equals(GUEST_OWNER_KEY)
    .filter((application) => !application.deletedAt)
    .toArray();

  if (guestApplications.length === 0) {
    return;
  }

  const now = new Date().toISOString();

  await db.transaction("rw", db.applications, async () => {
    for (const application of guestApplications) {
      await db.applications.update(application.id, {
        ownerKey: userId,

        syncState: "pending",

        updatedAt: now,
      });
    }
  });
}

export async function getCurrentOwnerKey(): Promise<string> {
  const userId = await getSessionUserId();

  return userId ?? GUEST_OWNER_KEY;
}

export async function getApplicationsForCurrentOwner(): Promise<
  JobApplication[]
> {
  const ownerKey = await getCurrentOwnerKey();

  const applications = await db.applications
    .where("ownerKey")
    .equals(ownerKey)
    .filter((application) => !application.deletedAt)
    .toArray();

  return applications.sort(
    (a, b) =>
      new Date(b.applicationDate).getTime() -
      new Date(a.applicationDate).getTime(),
  );
}

export async function syncCurrentUserApplications(): Promise<SyncResult> {
  const result: SyncResult = {
    pushed: 0,
    pulled: 0,
    deleted: 0,
    errors: 0,
  };

  const userId = await getSessionUserId();

  if (!userId) {
    return result;
  }

  // Claim applications that were
  // created before login.
  await migrateGuestApplications(userId);

  const { data, error } = await supabase
    .from("applications")
    .select("*")
    .eq("user_id", userId);

  if (error) {
    console.warn("JobTrack: Unable to pull cloud applications.", error);

    result.errors++;

    return result;
  }

  const cloudApplications = (data ?? []) as CloudApplicationRow[];

  const cloudMap = new Map<string, CloudApplicationRow>();

  for (const cloudApplication of cloudApplications) {
    cloudMap.set(cloudApplication.id, cloudApplication);
  }

  const localApplications = await db.applications
    .where("ownerKey")
    .equals(userId)
    .toArray();

  for (const localApplication of localApplications) {
    // -------------------------
    // Pending deletion
    // -------------------------

    if (localApplication.deletedAt) {
      try {
        await deleteCloudApplication(localApplication.id, userId);

        await db.applications.delete(localApplication.id);

        cloudMap.delete(localApplication.id);

        result.deleted++;
      } catch (error) {
        console.warn("JobTrack: Delete sync failed", error);

        result.errors++;
      }

      continue;
    }

    const cloudApplication = cloudMap.get(localApplication.id);

    // -------------------------
    // Local only
    // -------------------------

    if (!cloudApplication) {
      try {
        await uploadApplication(localApplication, userId);

        await db.applications.update(localApplication.id, {
          syncState: "synced",
        });

        result.pushed++;
      } catch (error) {
        console.warn("JobTrack: Upload failed", error);

        await db.applications.update(localApplication.id, {
          syncState: "pending",
        });

        result.errors++;
      }

      continue;
    }

    if (cloudApplication.deleted_at) {
      const cloudUpdated = new Date(cloudApplication.updated_at).getTime();

      const localUpdated = new Date(localApplication.updatedAt).getTime();

      if (cloudUpdated >= localUpdated) {
        await db.applications.put(fromCloudRow(cloudApplication));

        result.pulled++;

        cloudMap.delete(localApplication.id);

        continue;
      }
    }

    // -------------------------
    // Exists locally + cloud
    // -------------------------

    const localUpdated = new Date(localApplication.updatedAt).getTime();

    const cloudUpdated = new Date(cloudApplication.updated_at).getTime();

    if (localUpdated > cloudUpdated) {
      try {
        await uploadApplication(localApplication, userId);

        await db.applications.update(localApplication.id, {
          syncState: "synced",
        });

        result.pushed++;
      } catch (error) {
        console.warn("JobTrack: Update upload failed", error);

        result.errors++;
      }
    } else {
      await db.applications.put(fromCloudRow(cloudApplication));

      result.pulled++;
    }

    cloudMap.delete(localApplication.id);
  }

  // -------------------------
  // Cloud only
  // -------------------------

  for (const cloudApplication of cloudMap.values()) {
    await db.applications.put(fromCloudRow(cloudApplication));

    result.pulled++;
  }

  return result;
}
