export function validateDates(dates: Date[]): void {
  if (dates.some((date) => Number.isNaN(date.getTime()))) {
    throw new Error("Invalid date data detected");
  }
}

export function validateLocationId(locationId: number): boolean {
  return Number.isInteger(locationId) && locationId >= 0;
}

export function validateWetbulbs(wetbulbs: number[]): void {
  if (wetbulbs.some((wetbulb) => Number.isNaN(wetbulb))) {
    throw new Error("Invalid wetbulb count data detected");
  }
}

export function validateTrendOption(option: string): option is "avg" | "max" {
  return option === "avg" || option === "max";
}

const MIN_VALID_YEAR = 1900;
const MAX_VALID_YEAR = 2100;

export function validateYear(year: string): boolean {
  if (!/^\d{4}$/u.test(year)) {
    return false;
  }
  const numeric = Number(year);
  return numeric >= MIN_VALID_YEAR && numeric <= MAX_VALID_YEAR;
}

export function validateYearWetbulbs(yearWetbulbs: number[]): void {
  if (yearWetbulbs.some((wetbulb) => Number.isNaN(wetbulb))) {
    throw new Error("Invalid wetbulb count data detected");
  }
}

export function validateYears(years: number[]): void {
  if (
    years.some(
      (year) =>
        !Number.isInteger(year) ||
        year < MIN_VALID_YEAR ||
        year > MAX_VALID_YEAR,
    )
  ) {
    throw new Error("Invalid year data detected");
  }
}
