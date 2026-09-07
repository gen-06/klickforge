export function getRequiredEnv(name: string): string {
  const value = process.env[name];
  if (!value || value.trim().length === 0) {
    throw new Error(`Missing required env var: ${name}`);
  }
  return value;
}

export function getRequiredEnumEnv<T extends string>(
  name: string,
  allowed: readonly T[]
): T {
  const value = getRequiredEnv(name);
  if (!allowed.includes(value as T)) {
    throw new Error(
      `Invalid value for env var ${name}: "${value}" (expected one of: ${allowed.join(", ")})`
    );
  }
  return value as T;
}
