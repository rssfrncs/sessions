export function assertNever(x: never): never {
  throw new Error(`did not match ${x}`);
}
