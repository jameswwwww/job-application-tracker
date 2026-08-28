import { IndeedAdapter } from "../src/adapters/platforms/IndeedAdapter";
import { setupApplicationTracking } from "../src/utils/applicationHandler";
import "../assets/content.css";

export default defineContentScript({
  matches: ["*://*.indeed.com/viewjob*", "*://*.indeed.com/jobs*"],

  cssInjectionMode: "ui",

  main(ctx) {
    console.log("Job Tracker: Indeed Content Script Injected");

    const adapter = new IndeedAdapter();

    setupApplicationTracking(ctx, adapter);
  },
});
