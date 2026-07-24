import { vi } from "vitest";

export interface FakeQuery {
  execute: () => Promise<unknown>;
  orderBy: (...args: unknown[]) => FakeQuery;
  select: (...args: unknown[]) => FakeQuery;
  where: (...args: unknown[]) => FakeQuery;
}

export const createFakeQuery = (execute: () => Promise<unknown>): FakeQuery => {
  const select = vi.fn<(...args: unknown[]) => FakeQuery>();
  const orderBy = vi.fn<(...args: unknown[]) => FakeQuery>();
  const where = vi.fn<(...args: unknown[]) => FakeQuery>();
  const query: FakeQuery = { execute, orderBy, select, where };
  select.mockReturnValue(query);
  where.mockReturnValue(query);
  orderBy.mockReturnValue(query);
  return query;
};

export const createDbError = (code: string, message: string) =>
  Object.assign(new Error(message), { code });
