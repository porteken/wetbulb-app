import { expect, test } from "./fixtures";
import {
  MAP_CONTAINER_SELECTOR,
  gotoAndWaitForMapPage,
  waitForMapPage,
} from "./utils/map-page";

import type { Page } from "@playwright/test";

const NAVIGATION_TIMEOUT = 30_000;

const expectRankingsPage = async (page: Page) => {
  await expect(page).toHaveURL("/rankings", { timeout: NAVIGATION_TIMEOUT });
  await expect(
    page.getByRole("heading", { name: "Cities ranked by Average Wetbulb" }),
  ).toBeVisible();
};

const navigateToRankingsPage = async (page: Page) => {
  await page.getByRole("link", { name: "Navigate to rankings page" }).click();
  await expectRankingsPage(page);
};

const navigateToMapView = async (page: Page) => {
  await page.getByRole("link", { name: "Navigate to map view" }).click();
  await expect(page).toHaveURL("/", { timeout: NAVIGATION_TIMEOUT });
  await waitForMapPage(page);
};

test.describe("Navigation", () => {
  test("should navigate between all main pages", async ({ page }) => {
    await gotoAndWaitForMapPage(page, "/");

    await page.getByRole("link", { name: "Navigate to about page" }).click();
    await expect(page).toHaveURL("/about", { timeout: NAVIGATION_TIMEOUT });
    await expect(page.getByText("Purpose of the Application")).toBeVisible();

    await navigateToRankingsPage(page);

    await navigateToMapView(page);
  });

  test("should navigate away from a location page", async ({ page }) => {
    await page.goto("/1");
    await expect(
      page.getByRole("heading", { name: "Trend Analysis" }),
    ).toBeVisible({ timeout: 10_000 });

    await expect(
      page.getByRole("link", { name: "Navigate to rankings page" }),
    ).toBeVisible({ timeout: 10_000 });

    await navigateToRankingsPage(page);

    await navigateToMapView(page);
    await expect(page.locator(MAP_CONTAINER_SELECTOR)).toBeVisible({
      timeout: NAVIGATION_TIMEOUT,
    });
  });
});
