import { expect, test } from "./fixtures";
import {
  getOpenCustomSelectOptions,
  openCustomSelect,
  selectCustomOption,
} from "./utils/custom-select";
import { waitForLocationDetailsPage } from "./utils/map-page";

test.describe("Rankings Page", () => {
  test("should display rankings table with data", async ({ page }) => {
    await page.goto("/rankings");

    await expect(
      page.getByRole("heading", { name: "Cities ranked by Average Wetbulb" }),
    ).toBeVisible({
      timeout: 10_000,
    });

    await expect(page.locator("table")).toBeVisible();

    const rows = page.locator("table tbody tr");
    await expect(rows.first()).toBeVisible({ timeout: 10_000 });

    const rowCount = await rows.count();
    expect(rowCount).toBeGreaterThan(0);
  });

  test("should display year selector and filter controls", async ({ page }) => {
    await page.goto("/rankings");

    await expect(
      page.getByRole("heading", { name: "Cities ranked by Average Wetbulb" }),
    ).toBeVisible({
      timeout: 10_000,
    });

    await expect(page.getByTestId("rankings-year-filter")).toBeVisible();
    await expect(page.getByTestId("rankings-season-filter")).toBeVisible();
    await expect(page.getByTestId("rankings-state-filter")).toBeVisible();
    await expect(
      page.getByTestId("rankings-wetbulb-level-filter"),
    ).toBeVisible();
  });

  test("should display wetbulb index legend", async ({ page }) => {
    await page.goto("/rankings");

    await expect(page.getByText("Wetbulb Index")).toBeVisible({
      timeout: 10_000,
    });

    const legendSection = page
      .locator("div")
      .filter({ has: page.getByText("Wetbulb Index") })
      .first();

    await expect(legendSection).toContainText("None");
    await expect(legendSection).toContainText("Low Risk");
    await expect(legendSection).toContainText("Extreme Risk");
    await expect(legendSection).toContainText("Theoretical Limit");
  });

  test("should change year and update rankings", async ({ page }) => {
    await page.goto("/rankings?year=2010");

    await expect(
      page.getByRole("heading", { name: "Cities ranked by Average Wetbulb" }),
    ).toBeVisible({
      timeout: 10_000,
    });

    const yearSelect = page.getByTestId("rankings-year-filter");
    await expect(yearSelect).toContainText("2010", { timeout: 10_000 });

    await selectCustomOption(page, yearSelect, /^2015$/u);
    await expect(yearSelect).toContainText("2015");
    await expect(page.locator("table tbody tr").first()).toBeVisible({
      timeout: 10_000,
    });
    await expect(page.locator('[data-slot="select-content"]')).toHaveCount(0, {
      timeout: 10_000,
    });

    const seasonSelect = page.getByTestId("rankings-season-filter");
    await selectCustomOption(page, seasonSelect, /^Summer$/u);
    await expect(seasonSelect).toContainText("Summer");
    await expect(page.locator("table tbody tr").first()).toBeVisible({
      timeout: 10_000,
    });
  });

  test("should sort table by clicking header", async ({ page }) => {
    await page.goto("/rankings");

    await expect(
      page.getByRole("heading", { name: "Cities ranked by Average Wetbulb" }),
    ).toBeVisible({
      timeout: 10_000,
    });

    const cityHeader = page.locator("table thead th").nth(1);
    await expect(cityHeader).toBeVisible({ timeout: 10_000 });
    const cityHeaderButton = cityHeader.getByRole("button");
    const firstRowCity = page
      .locator("table tbody tr")
      .first()
      .locator("td")
      .nth(1);

    await cityHeaderButton.click();
    await expect(cityHeader).toHaveAttribute("aria-sort", "ascending");
    await expect(firstRowCity).toContainText("Dallas");

    await cityHeaderButton.click();
    await expect(cityHeader).toHaveAttribute("aria-sort", "descending");
    await expect(firstRowCity).toContainText("Seattle");
  });

  test("should navigate to location page when row is clicked", async ({
    page,
  }) => {
    await page.goto("/rankings");

    const firstRow = page.locator("table tbody tr").first();
    await expect(firstRow).toBeVisible({ timeout: 10_000 });
    await firstRow.scrollIntoViewIfNeeded();

    await Promise.all([
      page.waitForURL(/\/\d+(?:\?.*)?$/u, { timeout: 15_000 }),
      firstRow.locator("td").nth(1).click(),
    ]);

    await waitForLocationDetailsPage(page);
  });

  test("should filter by state", async ({ page }) => {
    await page.goto("/rankings", { waitUntil: "domcontentloaded" });

    await expect(
      page.getByRole("heading", { name: "Cities ranked by Average Wetbulb" }),
    ).toBeVisible({
      timeout: 15_000,
    });

    await expect(page.getByTestId("rankings-state-filter")).toBeVisible({
      timeout: 10_000,
    });

    const stateSelect = page.getByTestId("rankings-state-filter");
    await openCustomSelect(page, stateSelect);
    const firstStateOption = getOpenCustomSelectOptions(page).first();
    const firstStateOptionText = await firstStateOption.textContent();
    const stateLabel = firstStateOptionText?.trim();
    expect(stateLabel).toBeTruthy();
    await firstStateOption.click();

    await expect(stateSelect).toContainText(stateLabel ?? "");

    await expect(page.locator("table tbody tr")).toHaveCount(1, {
      timeout: 10_000,
    });
    await expect(
      page.locator("table tbody tr").first().locator("td").nth(2),
    ).toContainText(stateLabel ?? "");
    await expect(page.getByText("Showing 1-1 of 1 cities")).toBeVisible();

    const clearStateButton = stateSelect
      .locator("..")
      .getByRole("button", { name: "Clear" });
    await clearStateButton.click();

    await expect(page.locator("table tbody tr")).toHaveCount(6, {
      timeout: 10_000,
    });
  });

  test("should filter by wetbulb level", async ({ page }) => {
    await page.goto("/rankings", { waitUntil: "domcontentloaded" });

    await expect(
      page.getByRole("heading", { name: "Cities ranked by Average Wetbulb" }),
    ).toBeVisible({
      timeout: 15_000,
    });

    await expect(page.getByTestId("rankings-wetbulb-level-filter")).toBeVisible(
      {
        timeout: 10_000,
      },
    );

    const wetbulbLevelSelect = page.getByTestId(
      "rankings-wetbulb-level-filter",
    );
    await openCustomSelect(page, wetbulbLevelSelect);
    const firstOption = getOpenCustomSelectOptions(page).first();
    const firstOptionText = await firstOption.textContent();
    const optionLabel = firstOptionText?.trim();
    expect(optionLabel).toBeTruthy();
    await firstOption.click();

    await expect(wetbulbLevelSelect).toContainText(optionLabel ?? "");

    await expect(page.locator("table tbody tr").first()).toBeVisible({
      timeout: 15_000,
    });
  });

  test("should default to daily max and switch basis via the header toggle", async ({
    page,
  }) => {
    await page.goto("/rankings");

    await expect(
      page.getByRole("heading", { name: "Cities ranked by Average Wetbulb" }),
    ).toBeVisible({ timeout: 10_000 });

    const firstRow = page.locator("table tbody tr").first();
    await expect(firstRow).toBeVisible({ timeout: 10_000 });

    const basisToggle = page.getByRole("button", {
      name: /switch to daily (?<basis>average|maximum) wetbulb/iu,
    });
    await expect(basisToggle).toHaveText("Daily Max");

    const initialRowText = await firstRow.textContent();

    await basisToggle.click();
    await expect(basisToggle).toHaveText("Daily Avg");

    await expect(async () => {
      expect(await firstRow.textContent()).not.toStrictEqual(initialRowText);
    }).toPass({ timeout: 10_000 });

    const cookies = await page.context().cookies();
    const basisCookie = cookies.find(
      (cookie) => cookie.name === "wetbulb-basis",
    );
    expect(basisCookie?.value).toBe("avg");

    await page.reload();
    await expect(basisToggle).toHaveText("Daily Avg");
  });
});
