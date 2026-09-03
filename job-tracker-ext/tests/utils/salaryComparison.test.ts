import { describe, expect, it } from "vitest";

import { compareSalaryRanges } from "../../src/utils/salaryComparison";

describe("salary comparison", () => {
  it("reports an offer below the advertised minimum", () => {
    expect(
      compareSalaryRanges(
        "RM 5,000 - RM 7,000 per month",
        "MYR 4,500 monthly",
      ),
    ).toEqual({
      kind: "below",
      label: "RM 500 below advertised minimum",
    });
  });

  it("supports shorthand and offers within or above the range", () => {
    expect(compareSalaryRanges("RM5K to 7K", "RM6.5K")).toEqual({
      kind: "within",
      label: "Within advertised range",
    });

    expect(compareSalaryRanges("RM5K to 7K", "RM8K")).toEqual({
      kind: "above",
      label: "RM 1,000 above advertised maximum",
    });
  });

  it("does not compare incompatible currencies or pay periods", () => {
    expect(compareSalaryRanges("MYR 5,000/month", "USD 5,000/month")).toBeNull();
    expect(compareSalaryRanges("MYR 5,000/month", "MYR 60,000/year")).toBeNull();
  });
});
