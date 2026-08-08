import { expect, test } from "./fixtures";
import {
  MAP_CONTAINER_SELECTOR,
  gotoAndWaitForMapPage,
  openLocationDetailsModal,
  waitForLocationDetailsPage,
} from "./utils/map-page";

test.describe("Home Page", () => {
  test("should display the map and locations", async ({ page }) => {
    await gotoAndWaitForMapPage(page, "/");
    await expect(page.locator(MAP_CONTAINER_SELECTOR)).toBeVisible();
  });

  test("marker modal: graph controls, forecast, and view full details", async ({
    page,
  }) => {
    await gotoAndWaitForMapPage(page, "/");
    const { modal, viewDetailsButton } = await openLocationDetailsModal(page);
    await expect(modal).toBeVisible();

    const trendChart = modal.getByTestId("trend-chart");
    await expect(trendChart).toBeVisible({ timeout: 15_000 });

    const comboboxes = modal.getByRole("combobox");
    await comboboxes.first().click();
    await page.getByRole("option", { name: "Summer", exact: true }).click();
    await expect(comboboxes.first()).toHaveText("Summer");
    await expect(trendChart).toBeVisible({ timeout: 10_000 });

    await comboboxes.nth(1).click();
    await page.getByRole("option", { name: "Max", exact: true }).click();
    await expect(comboboxes.nth(1)).toHaveText("Max");
    await expect(trendChart).toBeVisible({ timeout: 10_000 });

    await modal.getByRole("checkbox", { name: "Show Forecast" }).check();
    await expect(modal.locator("#forecast-years")).toBeVisible();
    await expect(trendChart).toBeVisible({ timeout: 10_000 });

    await expect(viewDetailsButton).toBeEnabled();
    await viewDetailsButton.click();
    await waitForLocationDetailsPage(page);
  });
});
