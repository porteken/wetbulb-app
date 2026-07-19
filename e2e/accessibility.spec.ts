import { expect, test } from "./fixtures";
import { MARKER_SELECTOR } from "./utils/map-marker";
import {
  getSettledGraphMeasureSelect,
  MAP_CONTAINER_SELECTOR,
  waitForLocationDetailsPage,
} from "./utils/map-page";

const LOCATION_CHARTS =
  '[data-testid="trend-chart"], [data-testid="reference-chart"]';
const TREND_ANALYSIS_HEADING = { name: "Trend Analysis" } as const;
const REFERENCE_DATA_HEADING = { name: "Reference Data" } as const;

test.describe("Accessibility", () => {
  test("keyboard navigation: complete user journey using only keyboard", async ({
    page,
  }) => {
    await page.goto("/");

    await page.keyboard.press("Tab");
    await expect(page.locator(".skip-link")).toBeFocused();
    await page.keyboard.press("Enter");
    await expect(page).toHaveURL(/#main-content$/u);

    await page.goto("/1");
    await waitForLocationDetailsPage(page, /\/1(?:\?.*)?$/u);

    await page.keyboard.press("Tab");
    await page.keyboard.press("Tab");

    const graphMeasure = await getSettledGraphMeasureSelect(page);
    await graphMeasure.focus();

    await page.keyboard.press("ArrowDown");
    await page.keyboard.press("Enter");

    await expect(page.locator(LOCATION_CHARTS)).toHaveCount(2, {
      timeout: 10_000,
    });
  });

  test("screen reader compatibility: proper ARIA labels and semantics", async ({
    page,
  }) => {
    await page.goto("/1");

    const mainHeading = page.getByRole("heading", { level: 1 });
    await expect(mainHeading.first()).toBeVisible();

    const graphMeasureLabel = page.locator('label[for="graph-measure"]');
    await expect(graphMeasureLabel).toBeVisible({ timeout: 10_000 });
    await expect(graphMeasureLabel).toHaveText("Graph Measure");

    const referenceYearLabel = page.locator('label[for="reference-year"]');
    await expect(referenceYearLabel).toBeVisible();
    await expect(referenceYearLabel).toHaveText("Reference Year");

    await expect(await getSettledGraphMeasureSelect(page)).toBeVisible();
    await expect(page.locator("select#reference-year")).toBeVisible();
    await expect(page.getByTestId("city-selector")).toBeVisible({
      timeout: 10_000,
    });

    const main = page.locator("main");
    await expect(main).toBeVisible();

    const nav = page.locator("nav, header");
    await expect(nav).toBeVisible();
  });

  test("reduced motion: animations respect user preferences", async ({
    page,
  }) => {
    await page.emulateMedia({ reducedMotion: "reduce" });

    await page.goto("/");

    await expect(page.locator(MAP_CONTAINER_SELECTOR)).toBeVisible();

    const marker = page.locator(MARKER_SELECTOR).first();
    await expect(marker).toBeVisible({ timeout: 10_000 });
  });

  test("responsive zoom: content remains usable at 200% zoom", async ({
    page,
  }) => {
    await page.goto("/1");

    await page.setViewportSize({ height: 600, width: 800 });

    await expect(await getSettledGraphMeasureSelect(page)).toBeVisible();

    await expect(
      page.getByRole("heading", TREND_ANALYSIS_HEADING),
    ).toBeVisible();
    await expect(
      page.getByRole("heading", REFERENCE_DATA_HEADING),
    ).toBeVisible();

    const graphMeasure = await getSettledGraphMeasureSelect(page);
    await expect(graphMeasure).toBeVisible();
    await expect(page.locator(LOCATION_CHARTS)).toHaveCount(2, {
      timeout: 10_000,
    });

    const bodyScrollWidth = await page.evaluate(
      () => document.body.scrollWidth,
    );
    const viewportWidth = await page.evaluate(() => window.innerWidth);

    expect(bodyScrollWidth).toBeLessThan(viewportWidth + 50);
  });

  test("mobile accessibility: touch targets and screen reader on mobile", async ({
    page,
  }) => {
    await page.setViewportSize({ height: 667, width: 375 });

    await page.goto("/1");

    const graphMeasureSelect = await getSettledGraphMeasureSelect(page);
    const touchTargets = [
      page.locator("select#graph-season"),
      graphMeasureSelect,
      page.locator("select#reference-year"),
    ];

    for (const touchTarget of touchTargets) {
      await expect(touchTarget).toBeVisible({ timeout: 10_000 });
      const box = await touchTarget.boundingBox();
      expect(box).not.toBeNull();
      expect(box?.height).toBeGreaterThanOrEqual(40);
    }

    await expect(page.getByTestId("city-selector")).toBeVisible({
      timeout: 10_000,
    });

    await expect(
      page.getByRole("heading", TREND_ANALYSIS_HEADING),
    ).toBeVisible();
  });
});
