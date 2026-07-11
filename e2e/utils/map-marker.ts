import { expect, type Locator, type Page } from "@playwright/test";

export const MARKER_SELECTOR = '[data-map-marker="true"]';

const MARKER_CLICK_TIMEOUT = 2000;
const MARKER_VISIBILITY_TIMEOUT = 10_000;

export async function clickClickableMarker(page: Page): Promise<void> {
  const markers = page.locator(MARKER_SELECTOR);
  await expect(markers.first()).toBeVisible({
    timeout: MARKER_VISIBILITY_TIMEOUT,
  });

  const candidateIndices = await getCandidateMarkerIndices(page);

  for (const index of candidateIndices) {
    const marker = markers.nth(index);
    if (await tryActivateMarkerWithPointer(marker)) {
      return;
    }
  }

  for (const index of candidateIndices) {
    const marker = markers.nth(index);
    if (await tryActivateMarkerWithKeyboard(marker)) {
      return;
    }
  }

  throw new Error(
    "Unable to activate a map marker using pointer or keyboard interaction.",
  );
}

async function tryActivateMarkerWithPointer(marker: Locator): Promise<boolean> {
  try {
    await marker.scrollIntoViewIfNeeded();
    await marker.click({ timeout: MARKER_CLICK_TIMEOUT, trial: true });
    await marker.click();
    return true;
  } catch {
    return false;
  }
}

async function tryActivateMarkerWithKeyboard(
  marker: Locator,
): Promise<boolean> {
  try {
    await marker.focus();
    await expect(marker).toBeFocused({ timeout: MARKER_CLICK_TIMEOUT });
    await marker.press("Enter", { timeout: MARKER_CLICK_TIMEOUT });
    return true;
  } catch {
    return false;
  }
}

async function getCandidateMarkerIndices(page: Page): Promise<number[]> {
  const markers = page.locator(MARKER_SELECTOR);
  const markerCount = await markers.count();

  const prioritizedIndices = await markers.evaluateAll((elements) => {
    const viewportHeight = window.innerHeight;
    const viewportWidth = window.innerWidth;

    const candidates = elements
      .map((element, index) => {
        const rectangle = element.getBoundingClientRect();
        const left = Math.max(rectangle.left, 0);
        const right = Math.min(rectangle.right, viewportWidth);
        const top = Math.max(rectangle.top, 0);
        const bottom = Math.min(rectangle.bottom, viewportHeight);
        const visibleWidth = right - left;
        const visibleHeight = bottom - top;

        if (visibleWidth <= 0 || visibleHeight <= 0) {
          return null;
        }

        const centerX = left + visibleWidth / 2;
        const centerY = top + visibleHeight / 2;
        const topElement = document.elementFromPoint(centerX, centerY);

        if (
          !topElement ||
          !(
            topElement === element ||
            topElement.contains(element) ||
            element.contains(topElement)
          )
        ) {
          return null;
        }

        return {
          index,
          visibleArea: visibleWidth * visibleHeight,
        };
      })
      .filter(
        (value): value is { index: number; visibleArea: number } =>
          value !== null,
      )
      .toSorted((a, b) => b.visibleArea - a.visibleArea);

    return candidates.map((candidate) => candidate.index);
  });

  const prioritizedIndexSet = new Set(prioritizedIndices);
  const fallbackIndices = Array.from(
    { length: markerCount },
    (_, index) => index,
  ).filter((index) => !prioritizedIndexSet.has(index));

  return [...prioritizedIndices, ...fallbackIndices];
}
