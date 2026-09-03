import { supabase } from "./supabase";

export type SalaryCurrency = "MYR" | "SGD" | "USD";
export type SalaryPeriod = "hour" | "day" | "month" | "year";

export interface AnonymousSalarySubmission {
  company: string;
  jobTitle: string;
  location: string;
  salaryMin: number;
  salaryMax: number;
  currency: SalaryCurrency;
  period: SalaryPeriod;
}

export async function submitAnonymousSalary(
  values: AnonymousSalarySubmission,
): Promise<void> {
  const company = values.company.trim();
  const jobTitle = values.jobTitle.trim();
  const location = values.location.trim() || null;

  if (!company || !jobTitle) {
    throw new Error("Company and job title are required.");
  }

  if (
    !Number.isFinite(values.salaryMin) ||
    !Number.isFinite(values.salaryMax) ||
    values.salaryMin <= 0 ||
    values.salaryMax < values.salaryMin
  ) {
    throw new Error("Enter a valid salary range.");
  }

  const { error } = await supabase.from("salary_submissions").insert({
    company,
    job_title: jobTitle,
    location,
    salary_min: values.salaryMin,
    salary_max: values.salaryMax,
    currency: values.currency,
    period: values.period,
  });

  if (error) throw new Error(error.message);
}
