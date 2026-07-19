import { expect, test } from "./fixtures";
import { gotoAndWaitForMapPage, waitForMapPage } from "./utils/map-page";

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
});
