import type { JobApplication } from "../types";

export type JobIdentityInput = Partial<
  Pick<JobApplication, "company" | "jobTitle" | "jobUrl" | "platform">
>;

const TRACKING_PARAMS = new Set(["trk", "trackingid", "ref", "refid"]);

export function normalizeIdentityText(
  value: string | null | undefined,
): string {
  return (value ?? "")
    .normalize("NFKC")
    .replace(/\s+/g, " ")
    .trim()
    .toLowerCase();
}

export function normalizeJobUrl(value: string | null | undefined): string {
  if (!value) {
    return "";
  }

  try {
    const url = new URL(value);

    url.hash = "";

    for (const key of [...url.searchParams.keys()]) {
      const normalizedKey = key.toLowerCase();

      if (
        normalizedKey.startsWith("utm_") ||
        TRACKING_PARAMS.has(normalizedKey)
      ) {
        url.searchParams.delete(key);
      }
    }

    url.searchParams.sort();

    url.pathname = url.pathname.replace(/\/+$/, "") || "/";

    return url.toString();
  } catch {
    return value.trim().replace(/#.*$/, "").replace(/\/+$/, "");
  }
}

export function getJobIdentityKey(job: JobIdentityInput): string | null {
  const url = normalizeJobUrl(job.jobUrl);

  if (url) {
    return `url:${url}`;
  }

  const company = normalizeIdentityText(job.company);

  const title = normalizeIdentityText(job.jobTitle);

  if (company && title) {
    return `text:${company}|${title}`;
  }

  return null;
}

export function isSameJob(
  first: JobIdentityInput,
  second: JobIdentityInput,
): boolean {
  const firstUrl = normalizeJobUrl(first.jobUrl);

  const secondUrl = normalizeJobUrl(second.jobUrl);

  /*
   * If both records have URLs,
   * let the URL decide.
   *
   * This prevents:
   *
   * Acme / Software Engineer / job-123
   * Acme / Software Engineer / job-456
   *
   * from being merged.
   */
  if (firstUrl && secondUrl) {
    return firstUrl === secondUrl;
  }

  const firstCompany = normalizeIdentityText(first.company);

  const secondCompany = normalizeIdentityText(second.company);

  const firstTitle = normalizeIdentityText(first.jobTitle);

  const secondTitle = normalizeIdentityText(second.jobTitle);

  return Boolean(
    firstCompany &&
    secondCompany &&
    firstTitle &&
    secondTitle &&
    firstCompany === secondCompany &&
    firstTitle === secondTitle,
  );
}

function compactContext(
  details: Partial<JobApplication>,
): Partial<JobApplication> {
  return Object.fromEntries(
    Object.entries(details).filter(
      ([, value]) => value !== null && value !== undefined && value !== "",
    ),
  ) as Partial<JobApplication>;
}

export function mergeJobContext(
  previous: Partial<JobApplication> | null,
  incoming: Partial<JobApplication>,
): Partial<JobApplication> {
  const cleanIncoming = compactContext(incoming);

  if (!previous) {
    return cleanIncoming;
  }

  const previousKey = getJobIdentityKey(previous);

  const incomingKey = getJobIdentityKey(cleanIncoming);

  /*
   * We have enough information to
   * know this is another job.
   *
   * Start fresh instead of letting
   * old salary/location leak across.
   */
  if (previousKey && incomingKey && !isSameJob(previous, cleanIncoming)) {
    return cleanIncoming;
  }

  return {
    ...previous,
    ...cleanIncoming,
  };
}
