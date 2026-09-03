export type JobPlatform =
  | "LinkedIn"
  | "JobStreet"
  | "Indeed"
  | "Greenhouse"
  | "Lever"
  | "Workday"
  | "Ashby"
  | "SmartRecruiters"
  | "BambooHR"
  | "CompanySite"
  | "Other";

export type ApplicationStatus =
  | "Saved"
  | "Applied"
  | "Assessment"
  | "Interview"
  | "Offer"
  | "Rejected"
  | "Withdrawn";

export type StatusEventSource = "manual" | "automatic" | "migration";

export interface ApplicationStatusEvent {
  id: string;

  applicationId: string;

  ownerKey: string;

  status: ApplicationStatus;

  source: StatusEventSource;

  occurredAt: string;

  createdAt: string;

  syncState: SyncState;
}

export type ApplicationSource = "automatic" | "manual";

export type ExtractionMethod =
  | "platform-dom"
  | "json-ld"
  | "generic-dom"
  | "manual";

export interface JobApplication {
  id: string;

  // Which local user owns this record.
  // Supabase user ID, or "guest".
  ownerKey: string;

  company: string;
  jobTitle: string;

  location: string | null;
  salary: string | null;
  offeredSalary: string | null;
  jobType: string | null;
  recruiter: string | null;
  interviewQuestions: string[];

  platform: JobPlatform;
  jobUrl: string;

  applicationDate: string;

  status: ApplicationStatus;

  // How confident are we that the job details were extracted correctly?
  extractionConfidence: number;

  // How confident are we that the user actually submitted the application?
  applicationConfidence: number;

  // Was the application added automatically or manually?
  source: ApplicationSource;

  // How were the job details extracted?
  extractionMethod: ExtractionMethod;

  // Did the user explicitly confirm a low-confidence detection?
  userConfirmed: boolean;

  notes?: string;

  // User-defined labels (e.g. "Remote", "Priority", "Referral").
  tags: string[];

  // Cloud sync state
  syncState: SyncState;

  // Used as a delete tombstone while offline.
  deletedAt: string | null;

  createdAt: string;
  updatedAt: string;
}export type ApplicationFormValues = Pick<
  JobApplication,
  |
    "company"
    | "jobTitle"
    | "location"
    | "salary"
    | "offeredSalary"
    | "jobType"
    | "recruiter"
    | "interviewQuestions"
    | "platform"
    | "jobUrl"
    | "applicationDate"
    | "status"
    | "notes"
    | "tags"
>;

export type SyncState = "local" | "pending" | "synced";

export type NewApplicationPayload = Omit<
  JobApplication,
  "id" | "ownerKey" | "syncState" | "deletedAt" | "createdAt" | "updatedAt"
>;
