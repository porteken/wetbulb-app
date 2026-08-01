import { expect, test } from "./fixtures";
import { selectCustomOption } from "./utils/custom-select";
import { waitForLocationDetailsPage } from "./utils/map-page";

import type { Locator } from "@playwright/test";

// The App Router streams this page inside the Suspense boundary that
// `src/app/loading.tsx` creates, so the real markup is delivered in a trailing
// `<div id="S:0" hidden>` and then moved into place. When the client renders
// the boundary before that HTML lands, React orphans the server copy and a
// second, invisible copy of the page (`<main>`, filters, table and all) stays
// in the DOM. CSS-based locators still match inside it, so scope to the copy
// the user can actually see rather than letting strict mode trip over orphans.
const onlyVisible = (locator: Locator): Locator =>
  locator.filter({ visible: true });

const openMultiSelect = async (trigger: Locator): Promise<Locator> => {
  await trigger.click();
  await expect(trigger).toHaveAttribute("aria-expanded", "true");

  const options = onlyVisible(
    trigger.page().locator('button[aria-pressed="false"]'),
  );
  await expect(options.first()).toBeVisible();

  return options;
};

test.describe("Rankings Page", () => {
  test("should display rankings table with data", async ({ page }) => {
    await page.goto("/rankings");

    await expect(
      page.getByRole("heading", { name: "Cities ranked by Average Wetbulb" }),
    ).toBeVisible({
      timeout: 10_000,
    });

    await expect(page.locator("table").first()).toBeVisible();

    const rows = page.locator("table").first().locator("tbody tr");
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

    await expect(
      onlyVisible(page.getByTestId("rankings-year-filter")),
    ).toBeVisible();
    await expect(
      onlyVisible(page.getByTestId("rankings-season-filter")),
    ).toBeVisible();
    await expect(
      onlyVisible(page.getByTestId("rankings-state-filter")),
    ).toBeVisible();
    await expect(
      onlyVisible(page.getByTestId("rankings-wetbulb-level-filter")),
    ).toBeVisible();
  });

  test("should display wetbulb index legend", async ({ page }) => {
    await page.goto("/rankings");

    const legendSection = page
      .locator("#rankings-wetbulb-index-legend")
      .first();

    await expect(legendSection).toContainText("Wetbulb Index", {
      timeout: 10_000,
    });
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

    const yearSelect = onlyVisible(page.getByTestId("rankings-year-filter"));
    await expect(yearSelect).toContainText("2010", { timeout: 10_000 });

    await selectCustomOption(page, yearSelect, /^2015$/u);
    await expect(yearSelect).toContainText("2015");
    await expect(page.locator("table tbody tr").first()).toBeVisible({
      timeout: 10_000,
    });
    await expect(page.locator('[data-slot="select-content"]')).toHaveCount(0, {
      timeout: 10_000,
    });

    const seasonSelect = onlyVisible(
      page.getByTestId("rankings-season-filter"),
    );
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

    const stateSelect = onlyVisible(page.getByTestId("rankings-state-filter"));
    await expect(stateSelect).toBeVisible({
      timeout: 10_000,
    });
    const stateFilteredRows = onlyVisible(page.locator("table tbody tr"));
    await expect(stateFilteredRows.first()).toBeVisible();
    const initialRowCount = await stateFilteredRows.count();

    const firstStateOption = (await openMultiSelect(stateSelect)).first();
    const firstStateOptionText = await firstStateOption.textContent();
    const stateLabel = firstStateOptionText?.trim();
    expect(stateLabel).toBeTruthy();
    await firstStateOption.click();

    await expect(stateSelect).toContainText(stateLabel ?? "");

    await expect(stateFilteredRows).not.toHaveCount(initialRowCount, {
      timeout: 10_000,
    });
    await expect
      .poll(async () => {
        const states = await stateFilteredRows
          .locator("td:nth-child(3)")
          .allTextContents();
        return [...new Set(states.map((state) => state.trim()))];
      })
      .toEqual([stateLabel]);
    await expect(page.getByText(/Showing 1-\d+ of \d+ cities/u)).toBeVisible({
      timeout: 10_000,
    });

    const clearStateButton = onlyVisible(
      page.getByRole("button", { name: "Clear all" }),
    );
    await clearStateButton.click();

    await expect(stateFilteredRows).toHaveCount(initialRowCount, {
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

    const wetbulbLevelSelect = onlyVisible(
      page.getByTestId("rankings-wetbulb-level-filter"),
    );
    await expect(wetbulbLevelSelect).toBeVisible({
      timeout: 10_000,
    });

    const firstOption = (await openMultiSelect(wetbulbLevelSelect)).first();
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

    const stateSelect = onlyVisible(page.getByTestId("rankings-state-filter"));
    const firstStateOption = (await openMultiSelect(stateSelect)).first();
    const stateLabel = (await firstStateOption.textContent())?.trim();
    expect(stateLabel).toBeTruthy();
    await firstStateOption.click();
    await expect(stateSelect).toContainText(stateLabel ?? "");

    const wetbulbLevelSelect = onlyVisible(
      page.getByTestId("rankings-wetbulb-level-filter"),
    );
    const firstWetbulbLevelOption = (
      await openMultiSelect(wetbulbLevelSelect)
    ).first();
    const wetbulbLevelLabel = (
      await firstWetbulbLevelOption.textContent()
    )?.trim();
    expect(wetbulbLevelLabel).toBeTruthy();
    await firstWetbulbLevelOption.click();
    await expect(wetbulbLevelSelect).toContainText(wetbulbLevelLabel ?? "");

    await basisToggle.click();
    await expect(basisToggle).toHaveText("Daily Avg");
    await expect(stateSelect).toContainText("All states/provinces");
    await expect(wetbulbLevelSelect).toContainText("All levels");

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
