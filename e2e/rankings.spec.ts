import { expect, test } from "./fixtures";
import {
  getOpenCustomSelectOptions,
  openCustomSelect,
  selectCustomOption,
} from "./utils/custom-select";
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

    await openCustomSelect(page, stateSelect);
    const firstStateOption = getOpenCustomSelectOptions(page).first();
    const firstStateOptionText = await firstStateOption.textContent();
    const stateLabel = firstStateOptionText?.trim();
    expect(stateLabel).toBeTruthy();
    await firstStateOption.click();

    await expect(stateSelect).toContainText(stateLabel ?? "");

    const stateFilteredRows = onlyVisible(page.locator("table tbody tr"));
    await expect(stateFilteredRows).toHaveCount(1, {
      timeout: 10_000,
    });
    await expect(stateFilteredRows.first().locator("td").nth(2)).toContainText(
      stateLabel ?? "",
    );
    await expect(page.getByText("Showing 1-1 of 1 cities")).toBeVisible();

    const clearStateButton = stateSelect
      .locator("..")
      .getByRole("button", { name: "Clear" });
    await clearStateButton.click();

    await expect(stateFilteredRows).toHaveCount(6, {
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
