import { expect, test } from "./fixtures";
import {
  getSettledGraphMeasureSelect,
  waitForLocationDetailsPage,
} from "./utils/map-page";

test.describe("Location Page", () => {
  const locationCharts =
    '[data-testid="trend-chart"], [data-testid="reference-chart"]';

  test("should show not found error for non-existent location", async ({
    page,
  }) => {
    await page.goto("/999999", {
      timeout: 20_000,
      waitUntil: "domcontentloaded",
    });
    await expect(page.getByText("Location not found")).toBeVisible();
  });

  test("should change graph controls, persist selections across reload, and toggle the legend", async ({
    page,
  }) => {
    await page.goto("/1");
    await waitForLocationDetailsPage(page, /\/1(?:\?.*)?$/u);

    await page.locator("select#graph-season").selectOption("Summer");
    await expect(page.locator(locationCharts)).toHaveCount(2, {
      timeout: 10_000,
    });

    const graphMeasure = await getSettledGraphMeasureSelect(page);
    await graphMeasure.selectOption("max");
    await expect(page.locator(locationCharts)).toHaveCount(2, {
      timeout: 10_000,
    });

    const referenceYear = page.locator("select#reference-year");
    await referenceYear.selectOption("2005");
    await expect(page.locator(locationCharts)).toHaveCount(2, {
      timeout: 10_000,
    });

    const forecastCheckbox = page.getByRole("checkbox", {
      name: "Show Forecast",
    });
    await forecastCheckbox.check();
    const forecastSlider = page.locator("#forecast-years");
    await expect(forecastSlider).toBeVisible();
    await forecastSlider.focus();
    await forecastSlider.press("ArrowRight");
    await expect(page.locator('label[for="forecast-years"]')).toHaveText(
      "Forecast 11 years ahead",
    );
    await expect(page.locator(locationCharts)).toHaveCount(2, {
      timeout: 10_000,
    });

    await page.reload();
    await waitForLocationDetailsPage(page, /\/1(?:\?.*)?$/u);
    await expect(page.locator("select#graph-season")).toHaveValue("Summer");
    await expect(await getSettledGraphMeasureSelect(page)).toHaveValue("max");
    await expect(page.locator("select#reference-year")).toHaveValue("2005");
    await expect(
      page.getByRole("checkbox", { name: "Show Forecast" }),
    ).toBeChecked();

    const legendToggle = page.locator(
      'button[aria-controls="city-wetbulb-index-legend"]',
    );
    await legendToggle.click();
    await expect(legendToggle).toHaveAttribute("aria-expanded", "true");
    await expect(legendToggle).toHaveText("Hide Wetbulb Index");
    await expect(page.locator("#city-wetbulb-index-legend")).toContainText(
      "Extreme Risk",
    );

    await legendToggle.click();
    await expect(legendToggle).toHaveAttribute("aria-expanded", "false");
    await expect(legendToggle).toHaveText("Show Wetbulb Index");
  });
});
