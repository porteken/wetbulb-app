import { expect, test, type Locator, type Page } from "@playwright/test";

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

declare global {
  interface Window {
    graphMeasureDuplicateCallback?: (html: string) => void;
  }
}

const graphMeasureDuplicateHtml = new WeakMap<Page, string>();
const exposedGraphMeasureWatcher = new WeakSet<Page>();

// Runs inside the page via page.evaluate() below, not in this Node process —
// document/MutationObserver/window only exist in that browser context, and
// `window` (rather than globalThis) is required for the Window augmentation
// above to type-check.
/* oxlint-disable unicorn/consistent-function-scoping, unicorn/prefer-global-this -- serialized and sent to the browser, not shared with outer Node scope */
function installGraphMeasureDuplicateWatcher(): void {
  const check = (): void => {
    if (document.querySelectorAll("#graph-measure").length > 1) {
      window.graphMeasureDuplicateCallback?.(
        document.documentElement.outerHTML,
      );
    }
  };

  check();
  new MutationObserver(check).observe(document.body, {
    childList: true,
    subtree: true,
  });
}
/* oxlint-enable unicorn/consistent-function-scoping, unicorn/prefer-global-this */

/**
 * `select#graph-measure` intermittently resolves to 2 elements in CI (see
 * flaky-test investigation), but the duplicate self-heals within
 * milliseconds — by the time the surrounding assertion's timeout elapses
 * (whether it passes on a later poll or ultimately fails), the DOM has
 * already returned to normal, so a catch-block snapshot never captures the
 * actual duplicated state. A MutationObserver installed in the page
 * captures `document.documentElement.outerHTML` synchronously, in-browser,
 * the instant a duplicate is observed, so there's no race with the
 * duplicate healing before we can inspect it.
 */
async function watchForDuplicateGraphMeasureSelect(
  page: Page,
): Promise<() => Promise<void>> {
  graphMeasureDuplicateHtml.delete(page);

  if (!exposedGraphMeasureWatcher.has(page)) {
    exposedGraphMeasureWatcher.add(page);
    await page.exposeFunction(
      "graphMeasureDuplicateCallback",
      (html: string) => {
        graphMeasureDuplicateHtml.set(page, html);
      },
    );
  }

  await page.evaluate(installGraphMeasureDuplicateWatcher);

  return async () => {
    const capturedHtml = graphMeasureDuplicateHtml.get(page);
    if (capturedHtml !== undefined) {
      await test
        .info()
        .attach("graph-measure-duplicate-dom", {
          body: capturedHtml,
          contentType: "text/html",
        })
        .catch(() => {});
    }
  };
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
  const stopWatchingGraphMeasure =
    await watchForDuplicateGraphMeasureSelect(page);
  try {
    await expect(page.locator("select#graph-measure")).toBeVisible({
      timeout: LOCATION_DETAILS_TIMEOUT,
    });
  } finally {
    await stopWatchingGraphMeasure();
  }
  await expect(page.locator("select#reference-year")).toBeVisible({
    timeout: LOCATION_DETAILS_TIMEOUT,
  });
  await expect(page.locator(LOCATION_CHARTS)).toHaveCount(2, {
    timeout: LOCATION_DETAILS_TIMEOUT,
  });
}
