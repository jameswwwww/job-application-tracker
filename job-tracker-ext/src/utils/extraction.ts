export function cleanText(value: string | null | undefined): string | null {
  if (!value) return null;

  const cleaned = value
    .replace(/\u00a0/g, " ")
    .replace(/\s+/g, " ")
    .trim();

  return cleaned || null;
}

export function getTextFromSelectors(
  selectors: string[],
  root: ParentNode = document,
): string | null {
  for (const selector of selectors) {
    try {
      const element = root.querySelector(selector);

      if (!element) continue;

      const content = element.getAttribute("content") || element.textContent;

      const text = cleanText(content);

      if (text) {
        return text;
      }
    } catch (error) {
      console.warn(`Job Tracker: Invalid selector ${selector}`, error);
    }
  }

  return null;
}

export function getCombinedText(
  selectors: string[],
  root: ParentNode = document,
): string {
  const values: string[] = [];

  for (const selector of selectors) {
    try {
      const elements = root.querySelectorAll(selector);

      for (const element of elements) {
        const text = cleanText(element.textContent);

        if (text && !values.includes(text)) {
          values.push(text);
        }
      }
    } catch {
      // Ignore invalid selectors
    }
  }

  return values.join(" ");
}

function hasJobPostingType(value: unknown): boolean {
  if (typeof value === "string") {
    return value === "JobPosting";
  }

  if (Array.isArray(value)) {
    return value.includes("JobPosting");
  }

  return false;
}

function searchJsonLdObject(value: any): any | null {
  if (!value) return null;

  if (Array.isArray(value)) {
    for (const item of value) {
      const result = searchJsonLdObject(item);

      if (result) return result;
    }

    return null;
  }

  if (typeof value !== "object") {
    return null;
  }

  if (hasJobPostingType(value["@type"])) {
    return value;
  }

  if (value["@graph"]) {
    const graphResult = searchJsonLdObject(value["@graph"]);

    if (graphResult) {
      return graphResult;
    }
  }

  return null;
}

export function getJobPostingJsonLd(): any | null {
  const scripts = document.querySelectorAll(
    'script[type="application/ld+json"]',
  );

  for (const script of scripts) {
    try {
      const raw = script.textContent?.trim();

      if (!raw) continue;

      const parsed = JSON.parse(raw);

      const result = searchJsonLdObject(parsed);

      if (result) {
        return result;
      }
    } catch (error) {
      console.warn("Job Tracker: Unable to parse JSON-LD", error);
    }
  }

  return null;
}

export function getLocationFromJsonLd(jobPosting: any): string | null {
  if (!jobPosting) return null;

  if (String(jobPosting.jobLocationType).toUpperCase() === "TELECOMMUTE") {
    return "Remote";
  }

  let location = jobPosting.jobLocation;

  if (Array.isArray(location)) {
    location = location[0];
  }

  if (!location) {
    return null;
  }

  if (typeof location === "string") {
    return cleanText(location);
  }

  const address = location.address;

  if (!address) {
    return cleanText(location.name);
  }

  if (typeof address === "string") {
    return cleanText(address);
  }

  const parts = [
    address.addressLocality,
    address.addressRegion,
    address.addressCountry,
  ]
    .map(cleanText)
    .filter(Boolean);

  return parts.length ? parts.join(", ") : null;
}

function formatNumber(value: number | string): string {
  const number =
    typeof value === "number" ? value : Number(String(value).replace(/,/g, ""));

  if (Number.isNaN(number)) {
    return String(value);
  }

  return new Intl.NumberFormat("en-US", {
    maximumFractionDigits: 2,
  }).format(number);
}

export function getSalaryFromJsonLd(jobPosting: any): string | null {
  if (!jobPosting) return null;

  const baseSalary = jobPosting.baseSalary;

  if (baseSalary === null || baseSalary === undefined) {
    return null;
  }

  const currency = jobPosting.salaryCurrency || baseSalary?.currency || "";

  if (typeof baseSalary === "number" || typeof baseSalary === "string") {
    return cleanText(`${currency} ${formatNumber(baseSalary)}`);
  }

  const value = baseSalary.value;

  if (typeof value === "number" || typeof value === "string") {
    return cleanText(`${currency} ${formatNumber(value)}`);
  }

  if (value && typeof value === "object") {
    const min = value.minValue;

    const max = value.maxValue;

    const exact = value.value;

    let salary = "";

    if (min !== undefined && max !== undefined) {
      salary = `${currency} ${formatNumber(min)} – ${formatNumber(max)}`;
    } else if (exact !== undefined) {
      salary = `${currency} ${formatNumber(exact)}`;
    } else if (min !== undefined) {
      salary = `${currency} ${formatNumber(min)}+`;
    }

    const unit = value.unitText;

    if (salary && unit) {
      salary += ` per ${String(unit).toLowerCase()}`;
    }

    return cleanText(salary);
  }

  return null;
}

export function extractSalaryFromText(
  value: string | null | undefined,
): string | null {
  if (!value) return null;

  const text = cleanText(value);

  if (!text) return null;

  const currencies = "(?:RM|MYR|SGD|USD|AUD|CAD|GBP|EUR|£|€|\\$)";

  const amount = "\\d+(?:[,.]\\d+)*(?:\\s*[kKmM])?";

  const separator = "(?:\\u2013|\\u2014|-|to|hingga)";

  const period =
    "(?:(?:per|a)\\s*(?:hour|day|week|month|year|annum)|/(?:hour|day|week|month|year)|hourly|daily|weekly|monthly|yearly|annually|sejam|sehari|seminggu|sebulan|setahun)";

  const patterns = [
    new RegExp(
      `${currencies}\\s*${amount}(?:\\s*${separator}\\s*(?:${currencies}\\s*)?${amount})?(?:\\s*${period})?`,
      "i",
    ),

    new RegExp(
      `${amount}\\s*${separator}\\s*${amount}\\s*${period}`,
      "i",
    ),
  ];

  for (const pattern of patterns) {
    const match = text.match(pattern);

    if (match?.[0]) {
      return cleanText(match[0]);
    }
  }

  return null;
}

export function extractJobTypeFromText(
  value: string | null | undefined,
): string | null {
  if (!value) return null;

  const text = value.toLowerCase();

  const jobTypes: Array<[RegExp, string]> = [
    [/\bfull[\s-]?time\b/, "Full-time"],
    [/\bpart[\s-]?time\b/, "Part-time"],
    [/\bcontract(?:or)?\b/, "Contract"],
    [/\bintern(?:ship)?\b/, "Internship"],
    [/\btemporary\b|\btemp\b/, "Temporary"],
    [/\bfreelance\b/, "Freelance"],
    [/\bcasual\b/, "Casual"],
  ];

  for (const [pattern, label] of jobTypes) {
    if (pattern.test(text)) {
      return label;
    }
  }

  return null;
}

export function calculateExtractionConfidence(
  fields: {
    jobTitle?: string | null;
    company?: string | null;
    location?: string | null;
    salary?: string | null;
    jobType?: string | null;
  },
  reliability = 1,
): number {
  let completeness = 0;

  if (fields.jobTitle) {
    completeness += 0.35;
  }

  if (fields.company) {
    completeness += 0.3;
  }

  if (fields.location) {
    completeness += 0.15;
  }

  if (fields.salary) {
    completeness += 0.1;
  }

  if (fields.jobType) {
    completeness += 0.1;
  }

  const score = completeness * reliability;

  return Math.min(1, Math.round(score * 100) / 100);
}
