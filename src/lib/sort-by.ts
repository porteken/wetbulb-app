export const sortBy = <TRow extends object>(
  rows: TRow[],
  column: keyof TRow,
  ascending = true,
) =>
  rows.toSorted((left, right) => {
    const leftValue = left[column] as unknown;
    const rightValue = right[column] as unknown;

    if (leftValue === rightValue) {
      return 0;
    }

    if (typeof leftValue === "number" && typeof rightValue === "number") {
      return ascending ? leftValue - rightValue : rightValue - leftValue;
    }

    return ascending
      ? String(leftValue).localeCompare(String(rightValue))
      : String(rightValue).localeCompare(String(leftValue));
  });
