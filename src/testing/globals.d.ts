export type AnyMockFunction = (...args: any[]) => any;

export type GlobalMockFn = <T extends AnyMockFunction = AnyMockFunction>(
  implementation?: T,
) => T extends AnyMockFunction ? any : never;

declare global {
  var mockFn: GlobalMockFn;
}
