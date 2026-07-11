import { expect, type Locator, type Page, test } from "@playwright/test";

import {
  fillOpenCustomSelectSearch,
  getOpenCustomSelectContent,
  getOpenCustomSelectOptions,
  openCustomSelect,
} from "./utils/custom-select";

const getRequiredTextContent = async (locator: Locator): Promise<string> => {
  const text = await locator.textContent();
  expect(text).not.toBeNull();
  return text ?? "";
};

const openCitySearchWithOptions = async (page: Page) => {
  await page.goto("/");

  const citySearch = page.getByTestId("city-selector");
  await expect(citySearch).toBeVisible({ timeout: 10_000 });

  await openCustomSelect(page, citySearch);
  const filteredOptions = getOpenCustomSelectOptions(page);
  await expect(filteredOptions.first()).toBeVisible({ timeout: 10_000 });

  return filteredOptions;
};

test.describe("City Selection", () => {
  test("should keep city selection visible on mobile viewport", async ({
    page,
  }) => {
    await page.setViewportSize({ height: 667, width: 375 });
    await page.goto("/");

    const citySelect = page.getByTestId("city-selector");
    await expect(citySelect).toBeVisible();
  });

  test("should display city selection dropdown on home page", async ({
    page,
  }) => {
    await page.goto("/");

    const citySelect = page.getByTestId("city-selector");
    await expect(citySelect).toBeVisible();
  });

  test("should display city selection dropdown on location page", async ({
    page,
  }) => {
    await page.goto("/1");

    const citySelect = page.getByTestId("city-selector");
    await expect(citySelect).toBeVisible({ timeout: 10_000 });
  });

  test("should navigate to selected city page", async ({ page }) => {
    await page.goto("/");

    const citySelect = page.getByTestId("city-selector");
    await expect(citySelect).toBeVisible();

    await openCustomSelect(page, citySelect);
    const firstOption = getOpenCustomSelectOptions(page).first();
    await expect(firstOption).toBeVisible();
    await firstOption.click();
    await expect(page).toHaveURL(/\/\d+(?:\?.*)?$/u);
  });

  test("should allow searching for cities", async ({ page }) => {
    const filteredOptions = await openCitySearchWithOptions(page);
    const firstOptionLabel = await getRequiredTextContent(
      filteredOptions.first(),
    );
    const cityQuery = firstOptionLabel.trim().slice(0, 3).toLowerCase();

    expect(cityQuery.length).toBeGreaterThan(0);

    await fillOpenCustomSelectSearch(page, cityQuery);

    await expect(filteredOptions.first()).toBeVisible({ timeout: 15_000 });
    expect(await filteredOptions.count()).toBeGreaterThan(0);
    await expect(filteredOptions.first()).toContainText(
      new RegExp(cityQuery, "iu"),
    );
  });

  test("should allow searching for states", async ({ page }) => {
    const filteredOptions = await openCitySearchWithOptions(page);
    const groupLabels = getOpenCustomSelectContent(page).getByTestId(
      "searchable-select-group-label",
    );
    const firstGroupLabel = groupLabels.first();
    const firstStateLabel = await getRequiredTextContent(firstGroupLabel);
    const stateQuery = firstStateLabel.trim().toLowerCase();

    expect(stateQuery.length).toBeGreaterThan(0);

    await fillOpenCustomSelectSearch(page, stateQuery);

    await expect(filteredOptions.first()).toBeVisible({ timeout: 15_000 });
    expect(await filteredOptions.count()).toBeGreaterThan(0);
    await expect(groupLabels.first()).toContainText(
      new RegExp(stateQuery, "iu"),
    );
  });
});
