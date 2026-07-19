import { expect, test } from "./fixtures";

test.describe("Location Page", () => {
  const locationCharts =
    '[data-testid="trend-chart"], [data-testid="reference-chart"]';

  test("should display location content and graphs", async ({ page }) => {
    await page.goto("/1");
    await expect(page.getByRole("heading", { name: /, /u })).toBeVisible();
    await expect(page.locator("select#graph-measure")).toBeVisible();
    await expect(page.locator("select#reference-year")).toBeVisible();
    await expect(page.locator(locationCharts)).toHaveCount(2, {
      timeout: 15_000,
    });
    await expect(page.locator(locationCharts).first()).toBeVisible();
  });

  test("should show not found error for non-existent location", async ({
    page,
  }) => {
    await page.goto("/999999", {
      timeout: 20_000,
      waitUntil: "domcontentloaded",
    });
    await expect(page.getByText("Location not found")).toBeVisible();
  });

  test("should change graph measure and reference year", async ({ page }) => {
    await page.goto("/1");
    const graphMeasure = page.locator("select#graph-measure");
    await graphMeasure.selectOption("max");
    await expect(page.locator(locationCharts)).toHaveCount(2, {
      timeout: 10_000,
    });
    await expect(page.locator(locationCharts).first()).toBeVisible();
    const referenceYear = page.locator("select#reference-year");
    await referenceYear.selectOption("2005");
    await expect(page.locator(locationCharts)).toHaveCount(2, {
      timeout: 10_000,
    });
    await expect(page.locator(locationCharts).first()).toBeVisible();
  });
});
