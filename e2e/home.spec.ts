import { expect, test } from "@playwright/test";

import {
  MAP_CONTAINER_SELECTOR,
  gotoAndWaitForMapPage,
  navigateToLocationDetailsFromMap,
  openLocationDetailsModal,
} from "./utils/map-page";

test.describe("Home Page", () => {
  test("should display the map and locations", async ({ page }) => {
    await gotoAndWaitForMapPage(page, "/");
    await expect(page.locator(MAP_CONTAINER_SELECTOR)).toBeVisible();
  });

  test("should open modal with details when a marker is clicked", async ({
    page,
  }) => {
    await gotoAndWaitForMapPage(page, "/");
    const { modal, viewDetailsButton } = await openLocationDetailsModal(page);
    await expect(modal).toBeVisible();
    await expect(viewDetailsButton).toBeVisible();
  });

  test("should navigate to location details from modal action", async ({
    page,
  }) => {
    await navigateToLocationDetailsFromMap(page, "/");
    await expect(
      page.getByRole("heading", { name: "Trend Analysis" }),
    ).toBeVisible();
  });
});
