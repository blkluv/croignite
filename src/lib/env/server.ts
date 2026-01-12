export function requireServerEnv(name: string): string {
  const value = process.env[name];
  if (!value) {
    throw new Error(`Missing required server env var: ${name}`);
  }

  return value;
}

export function getServerEnv(name: string): string | undefined {
  return process.env[name];
}
