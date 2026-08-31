import type { ApplicationStatus, JobApplication, JobPlatform } from "../types";

const RESPONSE_STATUSES: ReadonlySet<ApplicationStatus> = new Set([
  "Assessment",
  "Interview",
  "Offer",
  "Rejected",
]);

const INTERVIEW_PROGRESS_STATUSES: ReadonlySet<ApplicationStatus> = new Set([
  "Interview",
  "Offer",
]);

const MONTH_NAMES = [
  "Jan",
  "Feb",
  "Mar",
  "Apr",
  "May",
  "Jun",
  "Jul",
  "Aug",
  "Sep",
  "Oct",
  "Nov",
  "Dec",
];

export interface PlatformAnalytics {
  platform: JobPlatform;
  count: number;
  percentage: number;
}

export interface MonthlyAnalytics {
  key: string;
  label: string;
  count: number;
}

export interface ApplicationAnalytics {
  submittedCount: number;

  responseCount: number;
  responseRate: number;

  interviewProgressCount: number;
  interviewRate: number;

  offerCount: number;
  offerRate: number;

  platformBreakdown: PlatformAnalytics[];

  monthlyTrend: MonthlyAnalytics[];
}

function percentage(numerator: number, denominator: number): number {
  if (denominator === 0) {
    return 0;
  }

  return Math.round((numerator / denominator) * 100);
}

function monthKey(date: Date): string {
  return [
    date.getUTCFullYear(),
    String(date.getUTCMonth() + 1).padStart(2, "0"),
  ].join("-");
}

export function buildApplicationAnalytics(
  applications: JobApplication[],
  now = new Date(),
): ApplicationAnalytics {
  /*
   * Saved means the job was tracked,
   * but not necessarily submitted.
   */
  const submitted = applications.filter(
    (application) => application.status !== "Saved",
  );

  const submittedCount = submitted.length;

  const responseCount = submitted.filter((application) =>
    RESPONSE_STATUSES.has(application.status),
  ).length;

  const interviewProgressCount = submitted.filter((application) =>
    INTERVIEW_PROGRESS_STATUSES.has(application.status),
  ).length;

  const offerCount = submitted.filter(
    (application) => application.status === "Offer",
  ).length;

  // -------------------------
  // Platform breakdown
  // -------------------------

  const platformCounts = new Map<JobPlatform, number>();

  for (const application of submitted) {
    platformCounts.set(
      application.platform,
      (platformCounts.get(application.platform) ?? 0) + 1,
    );
  }

  const platformBreakdown = [...platformCounts.entries()]
    .map(([platform, count]) => ({
      platform,

      count,

      percentage: percentage(count, submittedCount),
    }))
    .sort((a, b) => b.count - a.count);

  // -------------------------
  // Last 6 months
  // -------------------------

  const monthlyTrend: MonthlyAnalytics[] = [];

  for (let monthsAgo = 5; monthsAgo >= 0; monthsAgo--) {
    const month = new Date(
      Date.UTC(now.getUTCFullYear(), now.getUTCMonth() - monthsAgo, 1),
    );

    monthlyTrend.push({
      key: monthKey(month),

      label: MONTH_NAMES[month.getUTCMonth()] ?? "",

      count: 0,
    });
  }

  const monthMap = new Map(monthlyTrend.map((month) => [month.key, month]));

  for (const application of submitted) {
    const date = new Date(application.applicationDate);

    if (Number.isNaN(date.getTime())) {
      continue;
    }

    const bucket = monthMap.get(monthKey(date));

    if (bucket) {
      bucket.count++;
    }
  }

  return {
    submittedCount,

    responseCount,

    responseRate: percentage(responseCount, submittedCount),

    interviewProgressCount,

    interviewRate: percentage(interviewProgressCount, submittedCount),

    offerCount,

    offerRate: percentage(offerCount, submittedCount),

    platformBreakdown,

    monthlyTrend,
  };
}
