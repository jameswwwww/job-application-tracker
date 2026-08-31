import { processDetectedApplication } from "../src/services/storageService";
import { syncCurrentUserApplications } from "../src/services/syncService";

const SYNC_ALARM = "jobtrack-sync";

const JOB_CONTEXT_PREFIX = "jobtrack-job-context-";

function contextKey(tabId: number) {
  return `${JOB_CONTEXT_PREFIX}${tabId}`;
}

async function runSync() {
  try {
    const result = await syncCurrentUserApplications();

    console.log("JobTrack: background sync completed", result);

    if (result.errors > 0) {
      await browser.storage.local.set({
        jobtrackLastSyncError: `${result.errors} item(s) failed to sync.`,
      });
    } else {
      await browser.storage.local.set({
        jobtrackLastSyncAt: new Date().toISOString(),

        jobtrackLastSyncError: null,
      });
    }

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
    if (message.type === "CACHE_JOB_CONTEXT") {
      const tabId = _sender.tab?.id;

      if (tabId === undefined) {
        sendResponse({
          status: "Error",
        });

        return;
      }

      const key = contextKey(tabId);

      browser.storage.session.get(key).then(async (stored) => {
        const previous = stored[key];

        const previousObject =
          previous && typeof previous === "object"
            ? (previous as Record<string, unknown>)
            : {};

        const incoming = Object.fromEntries(
          Object.entries(message.payload ?? {}).filter(
            ([, value]) =>
              value !== null && value !== undefined && value !== "",
          ),
        );

        const previousTitle =
          typeof previousObject.jobTitle === "string"
            ? previousObject.jobTitle
            : null;

        const incomingTitle =
          typeof incoming.jobTitle === "string" ? incoming.jobTitle : null;

        const previousCompany =
          typeof previousObject.company === "string"
            ? previousObject.company
            : null;

        const incomingCompany =
          typeof incoming.company === "string" ? incoming.company : null;

        const isDifferentJob =
          Boolean(
            previousTitle && incomingTitle && previousTitle !== incomingTitle,
          ) ||
          Boolean(
            previousCompany &&
            incomingCompany &&
            previousCompany !== incomingCompany,
          );

        await browser.storage.session.set({
          [key]: isDifferentJob
            ? incoming
            : {
                ...previousObject,
                ...incoming,
              },
        });

        sendResponse({
          status: "Success",
        });
      });

      return true;
    }

    if (message.type === "GET_JOB_CONTEXT") {
      const tabId = _sender.tab?.id;

      if (tabId === undefined) {
        sendResponse({
          status: "Success",
          payload: null,
        });

        return;
      }

      const key = contextKey(tabId);

      browser.storage.session.get(key).then((stored) => {
        sendResponse({
          status: "Success",
          payload: stored[key] ?? null,
        });
      });

      return true;
    }

    if (message.type === "CLEAR_JOB_CONTEXT") {
      const tabId = _sender.tab?.id;

      if (tabId === undefined) {
        sendResponse({
          status: "Success",
        });

        return;
      }

      browser.storage.session.remove(contextKey(tabId)).then(() => {
        sendResponse({
          status: "Success",
        });
      });

      return true;
    }

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
