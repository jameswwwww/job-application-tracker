import { beforeEach, describe, expect, it, vi } from "vitest";

const insert = vi.hoisted(() => vi.fn());
const from = vi.hoisted(() => vi.fn(() => ({ insert })));

vi.mock("../../src/services/supabase", () => ({
  supabase: { from },
}));

import { submitAnonymousSalary } from "../../src/services/salarySubmissionService";

const submission = {
  company: "  Acme  ",
  jobTitle: "  Software Engineer  ",
  location: " Kuala Lumpur ",
  salaryMin: 5_000,
  salaryMax: 7_000,
  currency: "MYR" as const,
  period: "month" as const,
};

describe("anonymous salary submission", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    insert.mockResolvedValue({ error: null });
  });

  it("submits only anonymous salary fields", async () => {
    await submitAnonymousSalary(submission);

    expect(from).toHaveBeenCalledWith("salary_submissions");
    expect(insert).toHaveBeenCalledWith({
      company: "Acme",
      job_title: "Software Engineer",
      location: "Kuala Lumpur",
      salary_min: 5_000,
      salary_max: 7_000,
      currency: "MYR",
      period: "month",
    });
  });

  it("rejects invalid ranges before sending anything", async () => {
    await expect(
      submitAnonymousSalary({
        ...submission,
        salaryMin: 8_000,
        salaryMax: 7_000,
      }),
    ).rejects.toThrow("Enter a valid salary range.");

    expect(from).not.toHaveBeenCalled();
  });
});
