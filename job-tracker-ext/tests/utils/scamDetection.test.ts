import { describe, expect, it } from "vitest";

import {
  detectSuspiciousMessagingOffer,
  getJobListingText,
} from "../../src/utils/scamDetection";

describe("suspicious messaging offer detection", () => {
  it("flags paid task offers that move applicants to WhatsApp", () => {
    expect(
      detectSuspiciousMessagingOffer(
        "Complete simple online tasks for guaranteed income. Apply through WhatsApp today.",
      ),
    ).toBe("WhatsApp contact with a paid-task scheme");
  });

  it("flags Telegram offers requesting money", () => {
    expect(
      detectSuspiciousMessagingOffer(
        "Pay a RM100 registration fee, then message our agent on Telegram.",
      ),
    ).toBe("Telegram contact with an upfront payment request");
  });

  it("ignores ordinary recruiter contact and anti-scam disclaimers", () => {
    expect(
      detectSuspiciousMessagingOffer(
        "Contact our recruiter on WhatsApp to arrange your interview.",
      ),
    ).toBeNull();

    expect(
      detectSuspiciousMessagingOffer(
        "Scam warning: we will never ask you to pay fees or contact you through WhatsApp.",
      ),
    ).toBeNull();
  });

  it("scans the job listing instead of unrelated page content", () => {
    document.body.innerHTML = `
      <aside>Pay a registration fee through WhatsApp.</aside>
      <main><div id="job-description">Build accessible web applications.</div></main>
    `;

    expect(detectSuspiciousMessagingOffer(getJobListingText())).toBeNull();
  });
});
