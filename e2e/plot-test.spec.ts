import { expect, test } from "./fixtures";

const shouldIgnoreConsoleMessage = (message: string): boolean =>
  message.includes("403 (Forbidden)");

const handleConsole = (issues: string[]) => (message: any) => {
  const type = message.type();
  if (
    (type === "error" || type === "warning") &&
    !shouldIgnoreConsoleMessage(message.text())
  ) {
    issues.push(`[${type}] ${message.text()}`);
  }
};

test("mounts, unmounts, and remounts the plot without browser console issues", async ({
  page,
}) => {
  const consoleIssues: string[] = [];
  const pageErrors: string[] = [];

  page.on("console", handleConsole(consoleIssues));
  page.on("pageerror", (error) => {
    pageErrors.push(error.message);
  });

  const toggle = page.locator("#toggle");
  const plot = page.getByTestId("plot-test-chart");

  await page.goto("/plot-test");

  await expect(toggle).toBeVisible();
  await expect(plot).toHaveCount(1);

  await toggle.click();
  await expect(plot).toHaveCount(0);

  await toggle.click();
  await expect(plot).toHaveCount(1);

  expect(consoleIssues).toEqual([]);
  expect(pageErrors).toEqual([]);
});
