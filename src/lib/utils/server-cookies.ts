export { isProductionRuntime as isSecureCookieEnvironment } from "@/config/environment";

interface CookieEntry {
  name?: string;
  value: string;
}

interface CookieStoreLike {
  get: (name: string) => CookieEntry | undefined;
  getAll?: (...arguments_: [] | [string]) => readonly CookieEntry[];
}

export const getLatestCookieValue = (
  cookieStore: CookieStoreLike,
  name: string,
): string | undefined => {
  const matchingCookies = cookieStore.getAll?.(name);

  if (matchingCookies && matchingCookies.length > 0) {
    return matchingCookies.at(-1)?.value;
  }

  return cookieStore.get(name)?.value;
};
