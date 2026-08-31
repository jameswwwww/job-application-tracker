import { db } from "./db";
import { supabase } from "./supabase";
import { getSessionUserId } from "./authService";

import type { ApplicationStatusEvent, JobApplication } from "../types";

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

interface CloudStatusEventRow {
  id: string;

  application_id: string;

  user_id: string;

  status: string;

  source: string;

  occurred_at: string;

  created_at: string;
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

function toCloudStatusEventRow(
  event: ApplicationStatusEvent,
  userId: string,
): CloudStatusEventRow {
  return {
    id: event.id,

    application_id: event.applicationId,

    user_id: userId,

    status: event.status,

    source: event.source,

    occurred_at: event.occurredAt,

    created_at: event.createdAt,
  };
}

function fromCloudStatusEventRow(
  row: CloudStatusEventRow,
): ApplicationStatusEvent {
  return {
    id: row.id,

    applicationId: row.application_id,

    ownerKey: row.user_id,

    status: row.status as ApplicationStatusEvent["status"],

    source: row.source as ApplicationStatusEvent["source"],

    occurredAt: row.occurred_at,

    createdAt: row.created_at,

    syncState: "synced",
  };
}

async function uploadStatusEvent(
  event: ApplicationStatusEvent,
  userId: string,
) {
  const { error } = await supabase
    .from("application_status_events")
    .upsert(toCloudStatusEventRow(event, userId), {
      onConflict: "id",
    });

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

export async function syncStatusEvent(id: string): Promise<boolean> {
  const event = await db.statusEvents.get(id);

  if (!event) {
    return true;
  }

  if (event.ownerKey === GUEST_OWNER_KEY) {
    return true;
  }

  const userId = await getSessionUserId();

  if (!userId || userId !== event.ownerKey) {
    return false;
  }

  try {
    await uploadStatusEvent(event, userId);

    await db.statusEvents.update(id, {
      syncState: "synced",
    });

    return true;
  } catch (error) {
    console.warn("JobTrack: Status history sync failed.", error);

    await db.statusEvents.update(id, {
      syncState: "pending",
    });

    return false;
  }
}

async function syncStatusEventsForUser(userId: string, result: SyncResult) {
  const { data, error } = await supabase
    .from("application_status_events")
    .select("*")
    .eq("user_id", userId);

  if (error) {
    console.warn("JobTrack: Unable to pull status history.", error);

    result.errors++;

    return;
  }

  const cloudEvents = (data ?? []) as CloudStatusEventRow[];

  const cloudMap = new Map<string, CloudStatusEventRow>();

  for (const event of cloudEvents) {
    cloudMap.set(event.id, event);
  }

  const localEvents = await db.statusEvents
    .where("ownerKey")
    .equals(userId)
    .toArray();

  for (const localEvent of localEvents) {
    const cloudEvent = cloudMap.get(localEvent.id);

    if (!cloudEvent) {
      try {
        await uploadStatusEvent(localEvent, userId);

        await db.statusEvents.update(localEvent.id, {
          syncState: "synced",
        });

        result.pushed++;
      } catch (error) {
        console.warn("JobTrack: Status event upload failed", error);

        await db.statusEvents.update(localEvent.id, {
          syncState: "pending",
        });

        result.errors++;
      }

      continue;
    }

    /*
     * Events are immutable.
     * If both copies exist,
     * we only need to mark
     * the local one synced.
     */
    await db.statusEvents.update(localEvent.id, {
      syncState: "synced",
    });

    cloudMap.delete(localEvent.id);
  }

  /*
   * Cloud-only events.
   */
  for (const cloudEvent of cloudMap.values()) {
    await db.statusEvents.put(fromCloudStatusEventRow(cloudEvent));

    result.pulled++;
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
  const guestStatusEvents = await db.statusEvents
    .where("ownerKey")
    .equals(GUEST_OWNER_KEY)
    .toArray();

  const guestApplications = await db.applications
    .where("ownerKey")
    .equals(GUEST_OWNER_KEY)
    .filter((application) => !application.deletedAt)
    .toArray();

  if (guestApplications.length === 0) {
    return;
  }

  const now = new Date().toISOString();

  await db.transaction("rw", db.applications, db.statusEvents, async () => {
    for (const application of guestApplications) {
      await db.applications.update(application.id, {
        ownerKey: userId,

        syncState: "pending",

        updatedAt: now,
      });
    }

    for (const event of guestStatusEvents) {
      await db.statusEvents.update(event.id, {
        ownerKey: userId,

        syncState: "pending",
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

  await syncStatusEventsForUser(userId, result);

  return result;
}
