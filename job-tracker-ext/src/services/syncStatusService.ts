import { db } from "./db";
import { getCurrentOwnerKey, GUEST_OWNER_KEY } from "./syncService";

export interface SyncStatus {
  pendingCount: number;
  lastSyncAt: string | null;
  lastError: string | null;
}

export async function getSyncStatus(): Promise<SyncStatus> {
  const ownerKey = await getCurrentOwnerKey();

  let pendingCount = 0;

  const [pendingApplications, pendingStatusEvents] = await Promise.all([
    db.applications
      .where("ownerKey")
      .equals(ownerKey)
      .filter((application) => application.syncState === "pending")
      .count(),

    db.statusEvents
      .where("ownerKey")
      .equals(ownerKey)
      .filter((event) => event.syncState === "pending")
      .count(),
  ]);

  pendingCount = pendingApplications + pendingStatusEvents;

  const stored = await browser.storage.local.get([
    "jobtrackLastSyncAt",
    "jobtrackLastSyncError",
  ]);

  return {
    pendingCount,

    lastSyncAt:
      typeof stored.jobtrackLastSyncAt === "string"
        ? stored.jobtrackLastSyncAt
        : null,

    lastError:
      typeof stored.jobtrackLastSyncError === "string"
        ? stored.jobtrackLastSyncError
        : null,
  };
}
