import { expect, test } from "./fixtures";

test.describe("Header Toggles", () => {
  test("theme: follows system dark preference, toggles, and persists across reload", async ({
    page,
  }) => {
    await page.emulateMedia({ colorScheme: "dark" });
    await page.goto("/rankings");

    await expect(page.locator("html")).toHaveClass(/dark/u);

    const themeToggle = page.getByRole("button", {
      name: "Switch to light mode",
    });
    await expect(themeToggle).toBeVisible({ timeout: 10_000 });
    await themeToggle.click();

    await expect(page.locator("html")).not.toHaveClass(/dark/u);
    await expect(
      page.getByRole("button", { name: "Switch to dark mode" }),
    ).toBeVisible();

    await page.reload();
    await expect(page.locator("html")).not.toHaveClass(/dark/u);
  });

  test("unit: toggles °C/°F, converts displayed values, and persists via cookie", async ({
    page,
  }) => {
    await page.goto("/rankings");

    const firstRow = page.locator("table tbody tr").first();
    await expect(firstRow).toBeVisible({ timeout: 10_000 });
    const avgWetbulbCell = firstRow.locator("td").nth(3);
    await expect(avgWetbulbCell).toContainText("°F");
    const fahrenheitText = await avgWetbulbCell.textContent();

    const unitToggle = page.getByRole("button", { name: "Switch to °C" });
    await unitToggle.click();

    await expect(avgWetbulbCell).toContainText("°C");
    await expect(avgWetbulbCell).not.toHaveText(fahrenheitText ?? "");
    await expect(
      page.getByRole("button", { name: "Switch to °F" }),
    ).toBeVisible();

    await expect(async () => {
      const cookies = await page.context().cookies();
      const unitCookie = cookies.find(
        (cookie) => cookie.name === "temperature-unit",
      );
      expect(unitCookie?.value).toBe("C");
    }).toPass({ timeout: 10_000 });

    await page.reload();
    await expect(
      page.locator("table tbody tr").first().locator("td").nth(3),
    ).toContainText("°C");
  });
});
