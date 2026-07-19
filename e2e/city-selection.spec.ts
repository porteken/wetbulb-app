import { expect, test } from "./fixtures";
import {
  fillOpenCustomSelectSearch,
  getOpenCustomSelectContent,
  getOpenCustomSelectOptions,
  openCustomSelect,
} from "./utils/custom-select";

import type { Locator, Page } from "@playwright/test";

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
  test("should navigate to selected city page and clear the selection", async ({
    page,
  }) => {
    await page.goto("/");

    const citySelect = page.getByTestId("city-selector");
    await expect(citySelect).toBeVisible();

    await openCustomSelect(page, citySelect);
    const firstOption = getOpenCustomSelectOptions(page).first();
    await expect(firstOption).toBeVisible();
    await firstOption.click();
    await expect(page).toHaveURL(/\/\d+(?:\?.*)?$/u);

    const clearButton = citySelect
      .locator("..")
      .getByRole("button", { name: "Clear" });
    await expect(clearButton).toBeVisible();
    await clearButton.click();
    await expect(page).toHaveURL("/");
  });

  test("should filter city options by city, by state, and show an empty state", async ({
    page,
  }) => {
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

    await fillOpenCustomSelectSearch(page, "zzzzzz");
    await expect(
      getOpenCustomSelectContent(page).getByText("No results found."),
    ).toBeVisible({ timeout: 15_000 });
  });
});
