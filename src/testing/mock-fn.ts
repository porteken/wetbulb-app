import { vi } from "vitest";

import type { AnyMockFunction, GlobalMockFn } from "./globals";

export const mockFn: GlobalMockFn = (implementation) =>
  vi.fn<AnyMockFunction>(implementation) as any;
