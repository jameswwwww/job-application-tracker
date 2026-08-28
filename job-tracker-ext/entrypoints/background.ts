import { processDetectedApplication } from "../src/services/storageService";

export default defineBackground(() => {
  console.log("Job Tracker Background Service Worker initialized.");

  browser.runtime.onMessage.addListener((message, sender, sendResponse) => {
    if (message.type === "APPLICATION_DETECTED") {
      // We must handle the Promise asynchronously
      processDetectedApplication(message.payload)
        .then(() => {
          sendResponse({ status: "Success" });
        })
        .catch((error) => {
          console.error("Failed to process application:", error);
          sendResponse({ status: "Error", message: error.message });
        });

      // Return true to indicate we will send a response asynchronously
      return true;
    }
  });
});
