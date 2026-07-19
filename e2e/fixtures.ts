import { test as base } from "@playwright/test";

import type { ConsoleMessage, Response, WebError } from "@playwright/test";

export { expect } from "@playwright/test";

/**
 * Global allowlist for expected console errors (e.g. framework noise). Must
 * start empty — entries are added deliberately, one at a time, with a
 * comment justifying each as unambiguous non-application noise.
 */
const GLOBAL_ALLOWED_CONSOLE_ERRORS: RegExp[] = [];

type BrowserErrorSource = "console" | "pageerror" | "response" | "weberror";

interface BrowserError {
  location?: string;
  message: string;
  source: BrowserErrorSource;
}

interface BrowserErrorFixtures {
  allowedConsoleErrors: RegExp[];
}

const formatConsoleLocation = (
  location: ReturnType<ConsoleMessage["location"]>,
): string | undefined =>
  location.url
    ? `${location.url}:${location.line}:${location.column}`
    : undefined;

const isSameOrigin = (url: string, baseURL: string | undefined): boolean => {
  if (!baseURL) {
    return false;
  }

  try {
    return new URL(url).origin === new URL(baseURL).origin;
  } catch {
    return false;
  }
};

const formatErrors = (errors: BrowserError[]): string =>
  errors
    .map((error) => {
      const location = error.location ? ` (${error.location})` : "";
      return `  [${error.source}] ${error.message}${location}`;
    })
    .join("\n");

export const test = base.extend<BrowserErrorFixtures>({
  allowedConsoleErrors: [[], { option: true }],

  page: async ({ page, baseURL, allowedConsoleErrors }, use, testInfo) => {
    const errors: BrowserError[] = [];
    const seenExceptionMessages = new Set<string>();

    const isAllowedConsoleError = (
      text: string,
      locationUrl: string,
    ): boolean =>
      GLOBAL_ALLOWED_CONSOLE_ERRORS.some(
        (pattern) => pattern.test(text) || pattern.test(locationUrl),
      ) ||
      allowedConsoleErrors.some(
        (pattern) => pattern.test(text) || pattern.test(locationUrl),
      );

    page.on("pageerror", (error: Error) => {
      if (seenExceptionMessages.has(error.message)) {
        return;
      }

      seenExceptionMessages.add(error.message);
      errors.push({ message: error.message, source: "pageerror" });
    });

    page.on("console", (message: ConsoleMessage) => {
      if (message.type() !== "error") {
        return;
      }

      const text = message.text();
      const location = message.location();
      if (isAllowedConsoleError(text, location.url)) {
        return;
      }

      errors.push({
        location: formatConsoleLocation(location),
        message: text,
        source: "console",
      });
    });

    page.context().on("weberror", (webError: WebError) => {
      const error = webError.error();
      if (seenExceptionMessages.has(error.message)) {
        return;
      }

      seenExceptionMessages.add(error.message);
      errors.push({ message: error.message, source: "weberror" });
    });

    page.on("response", (response: Response) => {
      if (response.status() >= 500 && isSameOrigin(response.url(), baseURL)) {
        errors.push({
          message: `${response.status()} ${response.statusText()} — ${response.url()}`,
          source: "response",
        });
      }
    });

    await use(page);

    if (errors.length > 0) {
      await testInfo.attach("browser-errors", {
        body: JSON.stringify(errors, null, 2),
        contentType: "application/json",
      });
    }

    if (errors.length > 0 && testInfo.status === testInfo.expectedStatus) {
      throw new Error(
        `Detected ${errors.length} unexpected browser error(s):\n${formatErrors(errors)}`,
      );
    }
  },
});
