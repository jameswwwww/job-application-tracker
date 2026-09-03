import { describe, expect, it } from "vitest";

import { escapeCsvCell } from "../../src/utils/csv";

describe("CSV escaping", () => {
  it("doubles embedded quotes", () => {
    expect(escapeCsvCell('Asked "why us?"')).toBe('"Asked ""why us?"""');
  });
});
