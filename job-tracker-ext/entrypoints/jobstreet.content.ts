import { JobStreetAdapter } from "../src/adapters/platforms/JobStreetAdapter";
import { setupApplicationTracking } from "../src/utils/applicationHandler";
import "../assets/content.css";

export default defineContentScript({
  matches: ["*://*.jobstreet.com/*", "*://*.jobstreet.com.my/*"],

  cssInjectionMode: "ui",

  main(ctx) {
    console.log("Job Tracker: JobStreet Content Script Injected");

    const adapter = new JobStreetAdapter();

    setupApplicationTracking(ctx, adapter);
  },
});
