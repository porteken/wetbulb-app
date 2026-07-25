import { expect, type Locator, type Page } from "@playwright/test";

// Radix keeps a closing popup mounted while it animates out, so a bare
// `[data-slot="select-content"]` can resolve to a stale listbox whose options no
// longer react to clicks. Scope every lookup to the popup Radix still reports as
// open. Note that the trigger cannot be inspected while the popup is up: Radix
// calls `hideOthers`, which `aria-hidden`s everything outside the listbox and
// makes role-based trigger locators stop resolving.
const CUSTOM_SELECT_OPEN_CONTENT_SELECTOR =
  '[data-slot="select-content"][data-state="open"]';
const CUSTOM_SELECT_OPTION_TEST_ID = "searchable-select-option";
const CUSTOM_SELECT_TIMEOUT = 10_000;
const CUSTOM_SELECT_OPEN_ATTEMPT_TIMEOUT = 1500;
const CUSTOM_SELECT_CLOSE_TIMEOUT = 2000;
const CUSTOM_SELECT_SELECT_ATTEMPTS = 3;

export function getOpenCustomSelectContent(page: Page): Locator {
  return page.locator(CUSTOM_SELECT_OPEN_CONTENT_SELECTOR).last();
}

export function getOpenCustomSelectOptions(page: Page): Locator {
  return getOpenCustomSelectContent(page).getByTestId(
    CUSTOM_SELECT_OPTION_TEST_ID,
  );
}

function isCustomSelectOpen(page: Page): Promise<boolean> {
  const content = getOpenCustomSelectContent(page);

  return content.isVisible().catch(() => false);
}

// `hideOthers` keeps the trigger out of the accessibility tree while its popup
// is up, so a role-based trigger locator only resolves again once the popup is
// gone. Escape dismisses just the topmost layer, leaving any surrounding dialog
// open.
async function closeOpenCustomSelect(page: Page): Promise<void> {
  if (!(await isCustomSelectOpen(page))) {
    return;
  }

  try {
    await getOpenCustomSelectContent(page).press("Escape");
    await expect(page.locator(CUSTOM_SELECT_OPEN_CONTENT_SELECTOR)).toHaveCount(
      0,
      { timeout: CUSTOM_SELECT_CLOSE_TIMEOUT },
    );
  } catch {
    // Leave the popup for the next open attempt to deal with; failing here
    // would mask the selection error that triggered the retry.
  }
}

async function waitForCustomSelectToOpen(page: Page): Promise<boolean> {
  try {
    await expect(getOpenCustomSelectContent(page)).toBeVisible({
      timeout: CUSTOM_SELECT_OPEN_ATTEMPT_TIMEOUT,
    });
    await expect(getOpenCustomSelectOptions(page).first()).toBeVisible({
      timeout: CUSTOM_SELECT_OPEN_ATTEMPT_TIMEOUT,
    });

    return true;
  } catch {
    return false;
  }
}

export async function openCustomSelect(
  page: Page,
  trigger: Locator,
): Promise<void> {
  await expect(trigger).toBeVisible({ timeout: CUSTOM_SELECT_TIMEOUT });
  await expect(trigger).toBeEnabled({ timeout: CUSTOM_SELECT_TIMEOUT });
  await trigger.scrollIntoViewIfNeeded();

  const openAttempts: Array<() => Promise<void>> = [
    async () => {
      await trigger.press("ArrowDown");
    },
    async () => {
      await trigger.press("Enter");
    },
    async () => {
      await trigger.click();
    },
  ];

  for (const openAttempt of openAttempts) {
    // Re-check between attempts, not just once up front: an attempt can open the
    // popup a moment after its own wait expires, and pressing the trigger again
    // would dismiss it, leaving the caller racing a popup that toggles shut.
    if (await isCustomSelectOpen(page)) {
      break;
    }

    await trigger.focus();
    await openAttempt();

    if (await waitForCustomSelectToOpen(page)) {
      return;
    }
  }

  await expect(getOpenCustomSelectContent(page)).toBeVisible({
    timeout: CUSTOM_SELECT_TIMEOUT,
  });
  await expect(getOpenCustomSelectOptions(page).first()).toBeVisible({
    timeout: CUSTOM_SELECT_TIMEOUT,
  });
}

export async function fillOpenCustomSelectSearch(
  page: Page,
  query: string,
  searchInputTestId?: string,
): Promise<void> {
  const searchInput = searchInputTestId
    ? page.getByTestId(searchInputTestId)
    : getOpenCustomSelectContent(page).getByRole("textbox");

  await expect(searchInput).toBeVisible({ timeout: CUSTOM_SELECT_TIMEOUT });
  await searchInput.fill(query);
}

export async function selectCustomOption(
  page: Page,
  trigger: Locator,
  optionText: RegExp | string,
): Promise<void> {
  let lastError: unknown;

  // Radix commits a mouse selection on `pointerup`, so a click whose pointer
  // events straddle a re-render (or land while the popup is still settling) can
  // leave the listbox open on the old value without failing the click. Radix
  // always closes the popup when an item is selected, so treat "still open" as a
  // dropped selection and pick the option again.
  for (let attempt = 0; attempt < CUSTOM_SELECT_SELECT_ATTEMPTS; attempt += 1) {
    if (attempt > 0) {
      await closeOpenCustomSelect(page);
    }

    await openCustomSelect(page, trigger);

    const option = getOpenCustomSelectOptions(page)
      .filter({ hasText: optionText })
      .first();
    await expect(option).toBeVisible({ timeout: CUSTOM_SELECT_TIMEOUT });

    if (attempt === 0) {
      await option.click();
    } else {
      // Keyboard selection runs off the item's own keydown handler, so it does
      // not depend on where the pointer events landed.
      await option.focus();
      await option.press("Enter");
    }

    try {
      await expect(
        page.locator(CUSTOM_SELECT_OPEN_CONTENT_SELECTOR),
      ).toHaveCount(0, { timeout: CUSTOM_SELECT_CLOSE_TIMEOUT });

      return;
    } catch (error) {
      lastError = error;
    }
  }

  throw lastError instanceof Error
    ? lastError
    : new Error(`Failed to select custom select option: ${String(optionText)}`);
}
