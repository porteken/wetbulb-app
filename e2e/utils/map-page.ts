import { expect, type Locator, type Page } from "@playwright/test";

import { clickClickableMarker } from "./map-marker";

const MAP_LOAD_TIMEOUT = 30_000;
const LOCATION_DETAILS_TIMEOUT = 45_000;
const MODAL_TIMEOUT = 10_000;
const LOCATION_CHARTS =
  '[data-testid="trend-chart"], [data-testid="reference-chart"]';
export const MAP_CONTAINER_SELECTOR =
  '[data-testid="map-container"][data-map-provider="maplibre"]';

export async function gotoAndWaitForMapPage(
  page: Page,
  route: string,
): Promise<void> {
  await page.goto(route);
  await waitForMapPage(page);
}

export async function navigateToLocationDetailsFromMap(
  page: Page,
  route: string,
): Promise<void> {
  await gotoAndWaitForMapPage(page, route);

  const { viewDetailsButton } = await openLocationDetailsModal(page);

  await expect(viewDetailsButton).toBeEnabled({ timeout: MODAL_TIMEOUT });
  await viewDetailsButton.click();
  await waitForLocationDetailsPage(page);
}

export async function openLocationDetailsModal(
  page: Page,
): Promise<{ modal: Locator; viewDetailsButton: Locator }> {
  await clickClickableMarker(page);

  const modal = page.getByRole("dialog");
  const viewDetailsButton = page.getByRole("button", {
    name: "View Full Details",
  });

  await expect(modal).toBeVisible({ timeout: MODAL_TIMEOUT });
  await expect(viewDetailsButton).toBeVisible({ timeout: MODAL_TIMEOUT });

  return { modal, viewDetailsButton };
}

export async function waitForMapPage(page: Page): Promise<void> {
  const loadingMap = page.getByText("Loading map...").first();
  const mapContainer = page.locator(MAP_CONTAINER_SELECTOR);

  await expect(loadingMap.or(mapContainer)).toBeVisible({
    timeout: MAP_LOAD_TIMEOUT,
  });

  if (await loadingMap.isVisible().catch(() => false)) {
    await expect(loadingMap).toBeHidden({
      timeout: MAP_LOAD_TIMEOUT,
    });
  }

  await expect(mapContainer).toBeVisible({
    timeout: MAP_LOAD_TIMEOUT,
  });
}

/**
 * Returns the `select#graph-measure` locator once the DOM has settled to
 * exactly one instance. During App Router page load the trend panel can
 * briefly render twice, so the select momentarily resolves to 2 elements
 * before the duplicate self-heals within milliseconds. Waiting for the count
 * to settle to 1 tolerates that transient state (rather than tripping
 * Playwright's strict-mode violation) while still failing clearly if a
 * duplicate ever became permanent.
 */
export async function getSettledGraphMeasureSelect(
  page: Page,
): Promise<Locator> {
  const graphMeasure = page.locator("select#graph-measure");
  await expect(graphMeasure).toHaveCount(1, {
    timeout: LOCATION_DETAILS_TIMEOUT,
  });
  return graphMeasure;
}

export async function waitForLocationDetailsPage(
  page: Page,
  urlPattern = /\/\d+(?:\?.*)?$/u,
): Promise<void> {
  await expect(page).toHaveURL(urlPattern, {
    timeout: LOCATION_DETAILS_TIMEOUT,
  });

  if (
    await page
      .getByRole("heading", { name: "Database Connection Error" })
      .isVisible()
      .catch(() => false)
  ) {
    await page.reload();
    await expect(page).toHaveURL(urlPattern, {
      timeout: LOCATION_DETAILS_TIMEOUT,
    });
  }

  await expect(
    page.getByRole("heading", { level: 2, name: "Trend Analysis" }),
  ).toBeVisible({
    timeout: LOCATION_DETAILS_TIMEOUT,
  });
  await expect(
    page.getByRole("heading", { level: 2, name: "Reference Data" }),
  ).toBeVisible({
    timeout: LOCATION_DETAILS_TIMEOUT,
  });
  const graphMeasure = await getSettledGraphMeasureSelect(page);
  await expect(graphMeasure).toBeVisible();
  await expect(page.locator("select#reference-year")).toBeVisible({
    timeout: LOCATION_DETAILS_TIMEOUT,
  });
  await expect(page.locator(LOCATION_CHARTS)).toHaveCount(2, {
    timeout: LOCATION_DETAILS_TIMEOUT,
  });
}
