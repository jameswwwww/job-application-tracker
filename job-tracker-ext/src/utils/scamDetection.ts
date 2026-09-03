const RISK_SIGNALS: Array<[RegExp, string]> = [
  [
    /\b(?:registration|processing|training|application)\s+fees?\b|\b(?:deposit|top[\s-]?up|upfront payment|pay first|transfer money|send money|starter kit)\b/i,
    "an upfront payment request",
  ],
  [
    /\b(?:otp|tac|password|bank(?:ing)? details|credit card|debit card|nric|ic photo)\b/i,
    "a request for sensitive information",
  ],
  [
    /\b(?:online|simple|easy|paid)\s+tasks?\b|\b(?:like|rate|review)\s+(?:videos?|products?|shops?|apps?)\b/i,
    "a paid-task scheme",
  ],
  [
    /\b(?:guaranteed income|easy money|quick cash|earn\s+(?:rm|myr)\s*\d+[^.!?\n]{0,20}(?:day|daily))\b/i,
    "guaranteed or unusually easy income",
  ],
  [
    /\b(?:no interview|without (?:an )?interview|immediate hir(?:e|ing)|start immediately)\b/i,
    "no-interview or urgent-hiring pressure",
  ],
];

const DISCLAIMER =
  /\b(?:scam warning|fraud warning|beware)\b|\b(?:never|do not|don't|will not|won't)\b[^.!?\n]{0,80}\b(?:pay|fees?|deposit|contact|message|whatsapp|telegram)\b/i;

const JOB_CONTENT_SELECTORS = [
  '[data-automation="jobAdDetails"]',
  ".jobs-description__content",
  "#jobDescriptionText",
  "#job-description",
  ".job-description",
  '[class*="job-description"]',
  "article",
  "main",
];

export function getJobListingText(root: Document = document): string {
  for (const selector of JOB_CONTENT_SELECTORS) {
    const text = root.querySelector(selector)?.textContent?.trim();

    if (text) return text;
  }

  return root.body?.innerText || root.body?.textContent || "";
}

export function detectSuspiciousMessagingOffer(
  value: string | null | undefined,
): string | null {
  if (!value) return null;

  // ponytail: local keyword proximity is intentionally conservative; add a
  // reputation service only when real false-positive data justifies it.
  const channels: Array<[string, RegExp]> = [
    ["WhatsApp", /\bwhats[\s-]*app\b|\bwa\.me\//gi],
    ["Telegram", /\btelegram\b|\bt\.me\//gi],
  ];

  for (const [channel, pattern] of channels) {
    for (const match of value.matchAll(pattern)) {
      const context = value.slice(
        Math.max(0, match.index - 200),
        match.index + match[0].length + 200,
      );

      if (DISCLAIMER.test(context)) continue;

      const risk = RISK_SIGNALS.find(([signal]) => signal.test(context));

      if (risk) return `${channel} contact with ${risk[1]}`;
    }
  }

  return null;
}
