export type JobPlatform =
  | "LinkedIn"
  | "JobStreet"
  | "Indeed"
  | "Greenhouse"
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

export type ApplicationSource = "automatic" | "manual";

export type ExtractionMethod =
  | "platform-dom"
  | "json-ld"
  | "generic-dom"
  | "manual";

export interface JobApplication {
  id: string;

  company: string;
  jobTitle: string;

  location: string | null;
  salary: string | null;
  jobType: string | null;

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

  createdAt: string;
  updatedAt: string;
}

export type ApplicationFormValues = Pick<
  JobApplication,
  | "company"
  | "jobTitle"
  | "location"
  | "salary"
  | "jobType"
  | "platform"
  | "jobUrl"
  | "applicationDate"
  | "status"
  | "notes"
>;
