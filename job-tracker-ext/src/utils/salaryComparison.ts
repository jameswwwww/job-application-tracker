export type SalaryComparisonKind = "below" | "within" | "above";

export interface SalaryComparison {
  kind: SalaryComparisonKind;
  label: string;
}

interface ParsedSalary {
  min: number;
  max: number;
  currency: string | null;
  period: string | null;
}

function parseAmount(value: string): number {
  const suffix = value.trim().at(-1)?.toLowerCase();
  const amount = Number(value.replace(/[,\s]/g, "").replace(/[km]$/i, ""));

  return amount * (suffix === "k" ? 1_000 : suffix === "m" ? 1_000_000 : 1);
}

function parseSalary(value: string | null | undefined): ParsedSalary | null {
  if (!value) return null;

  const amounts = [
    ...value.matchAll(/\d[\d,]*(?:\.\d+)?(?:\s*[kKmM]\b)?/g),
  ]
    .slice(0, 2)
    .map((match) => parseAmount(match[0]));

  if (!amounts.length || amounts.some(Number.isNaN)) return null;

  const currencyMatch = value.match(
    /\b(?:MYR|RM|SGD|USD|AUD|CAD|GBP|EUR)(?=\s|\d|$)|[£€$]/i,
  )?.[0];
  const currency =
    currencyMatch?.toUpperCase() === "RM"
      ? "MYR"
      : (currencyMatch?.toUpperCase() ?? null);

  const period = /\b(?:month|monthly|sebulan)\b|\/mo\b/i.test(value)
    ? "month"
    : /\b(?:year|yearly|annual|annually|annum|setahun)\b|\/yr\b/i.test(value)
      ? "year"
      : /\b(?:week|weekly|seminggu)\b/i.test(value)
        ? "week"
        : /\b(?:day|daily|sehari)\b/i.test(value)
          ? "day"
          : /\b(?:hour|hourly|sejam)\b/i.test(value)
            ? "hour"
            : null;

  return {
    min: Math.min(...amounts),
    max: Math.max(...amounts),
    currency,
    period,
  };
}

function formatDifference(value: number, currency: string | null): string {
  const prefix = currency === "MYR" ? "RM " : currency ? `${currency} ` : "";

  return `${prefix}${new Intl.NumberFormat("en-MY", {
    maximumFractionDigits: 2,
  }).format(value)}`;
}

export function compareSalaryRanges(
  advertisedValue: string | null | undefined,
  offeredValue: string | null | undefined,
): SalaryComparison | null {
  const advertised = parseSalary(advertisedValue);
  const offered = parseSalary(offeredValue);

  if (!advertised || !offered) return null;
  if (
    advertised.currency &&
    offered.currency &&
    advertised.currency !== offered.currency
  ) {
    return null;
  }
  if (
    advertised.period &&
    offered.period &&
    advertised.period !== offered.period
  ) {
    return null;
  }

  const currency = advertised.currency || offered.currency;

  if (offered.max < advertised.min) {
    return {
      kind: "below",
      label: `${formatDifference(advertised.min - offered.max, currency)} below advertised minimum`,
    };
  }

  if (offered.min > advertised.max) {
    return {
      kind: "above",
      label: `${formatDifference(offered.min - advertised.max, currency)} above advertised maximum`,
    };
  }

  return {
    kind: "within",
    label:
      offered.min >= advertised.min && offered.max <= advertised.max
        ? "Within advertised range"
        : "Overlaps advertised range",
  };
}
