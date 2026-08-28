export interface JobApplication {
  id: string; // UUID
  company: string;
  jobTitle: string;
  location: string | null;
  jobType: string | null;
  platform: "LinkedIn" | "JobStreet" | "Indeed" | "CompanySite" | "Other";
  jobUrl: string;
  applicationDate: string; // ISO Date String
  status:
    | "Saved"
    | "Applied"
    | "Assessment"
    | "Interview"
    | "Offer"
    | "Rejected";
  confidenceScore: number; // 0.0 to 1.0
  notes?: string;
}
