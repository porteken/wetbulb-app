import { expect, type Locator, type Page } from "@playwright/test";

const CUSTOM_SELECT_CONTENT_SELECTOR = '[data-slot="select-content"]';
const CUSTOM_SELECT_OPTION_TEST_ID = "searchable-select-option";
const CUSTOM_SELECT_TIMEOUT = 10_000;
const CUSTOM_SELECT_OPEN_ATTEMPT_TIMEOUT = 1500;

export function getOpenCustomSelectContent(page: Page): Locator {
  return page.locator(CUSTOM_SELECT_CONTENT_SELECTOR).last();
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

  if (!(await isCustomSelectOpen(page))) {
    await trigger.focus();

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
      await openAttempt();

      if (await waitForCustomSelectToOpen(page)) {
        return;
      }
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
  await openCustomSelect(page, trigger);

  const option = getOpenCustomSelectOptions(page)
    .filter({ hasText: optionText })
    .first();
  await expect(option).toBeVisible({ timeout: CUSTOM_SELECT_TIMEOUT });
  await option.click();
}
