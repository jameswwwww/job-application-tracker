import { beforeEach, describe, expect, it } from "vitest";

import {
  calculateExtractionConfidence,
  getJobPostingJsonLd,
  getLocationFromJsonLd,
  getSalaryFromJsonLd,
  extractSalaryFromText,
} from "../../src/utils/extraction";

describe("extraction utilities", () => {
  beforeEach(() => {
    document.head.innerHTML = "";

    document.body.innerHTML = "";
  });

  it("finds JobPosting inside JSON-LD @graph", () => {
    const script = document.createElement("script");

    script.type = "application/ld+json";

    script.textContent = JSON.stringify({
      "@context": "https://schema.org",

      "@graph": [
        {
          "@type": "Organization",

          name: "Acme",
        },

        {
          "@type": "JobPosting",

          title: "Frontend Engineer",

          hiringOrganization: {
            name: "Acme",
          },
        },
      ],
    });

    document.head.appendChild(script);

    const result = getJobPostingJsonLd();

    expect(result?.title).toBe("Frontend Engineer");

    expect(result?.hiringOrganization?.name).toBe("Acme");
  });

  it("detects remote jobs", () => {
    const result = getLocationFromJsonLd({
      jobLocationType: "TELECOMMUTE",
    });

    expect(result).toBe("Remote");
  });

  it("formats salary range", () => {
    const result = getSalaryFromJsonLd({
      salaryCurrency: "MYR",

      baseSalary: {
        value: {
          minValue: 5000,
          maxValue: 7000,
          unitText: "MONTH",
        },
      },
    });

    expect(result).toBe("MYR 5,000 – 7,000 per month");
  });

  it("calculates weighted extraction confidence", () => {
    const result = calculateExtractionConfidence({
      jobTitle: "Engineer",

      company: "Acme",

      location: "Kuala Lumpur",
    });

    expect(result).toBe(0.8);
  });

  it("extracts abbreviated salary ranges", () => {
    expect(extractSalaryFromText("Compensation £90K – £135K")).toBe(
      "£90K – £135K",
    );
  });

  it.each([
    [
      "Gaji RM 4,000 hingga RM 6,500 sebulan",
      "RM 4,000 hingga RM 6,500 sebulan",
    ],
    ["Salary MYR 5K to 7K monthly", "MYR 5K to 7K monthly"],
  ])("extracts Malaysian salary ranges from %s", (text, expected) => {
    expect(extractSalaryFromText(text)).toBe(expected);
  });
});
