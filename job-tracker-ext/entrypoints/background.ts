import { processDetectedApplication } from "../src/services/storageService";
import { syncCurrentUserApplications } from "../src/services/syncService";

const SYNC_ALARM = "jobtrack-sync";

async function runSync() {
  try {
    const result = await syncCurrentUserApplications();

    console.log("JobTrack: background sync completed", result);

    await browser.storage.local.set({
      jobtrackLastSyncAt: new Date().toISOString(),

      jobtrackLastSyncError: null,
    });

    return result;
  } catch (error) {
    console.error("JobTrack: background sync failed", error);

    await browser.storage.local.set({
      jobtrackLastSyncError:
        error instanceof Error ? error.message : "Sync failed",
    });

    throw error;
  }
}

export default defineBackground(() => {
  console.log("Job Tracker Background Service Worker initialized.");

  // Create/re-create periodic sync alarm
  browser.alarms.create(SYNC_ALARM, {
    periodInMinutes: 5,
  });

  browser.alarms.onAlarm.addListener((alarm) => {
    if (alarm.name === SYNC_ALARM) {
      runSync().catch(console.error);
    }
  });

  browser.runtime.onMessage.addListener((message, _sender, sendResponse) => {
    if (message.type === "APPLICATION_DETECTED") {
      processDetectedApplication(message.payload)
        .then(() => {
          sendResponse({
            status: "Success",
          });
        })
        .catch((error) => {
          console.error("Failed to process application:", error);

          sendResponse({
            status: "Error",

            message: error.message,
          });
        });

      return true;
    }

    if (message.type === "SYNC_NOW") {
      runSync()
        .then((result) => {
          sendResponse({
            status: "Success",
            result,
          });
        })
        .catch((error) => {
          sendResponse({
            status: "Error",

            message: error instanceof Error ? error.message : "Sync failed",
          });
        });

      return true;
    }
  });
});
