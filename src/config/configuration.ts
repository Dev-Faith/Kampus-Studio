/**
 * LESSON: Configuration
 * ---------------------
 * `ConfigModule.forRoot({ load: [configuration] })` turns environment variables into a typed,
 * namespaced object you inject with `ConfigService`. Keeping the mapping in ONE place means the
 * rest of the app never touches `process.env` directly.
 */
export const configuration = () => ({
  env: process.env.NODE_ENV ?? 'development',
  port: parseInt(process.env.PORT ?? '3000', 10),
  database: {
    path: process.env.DATABASE_PATH ?? 'data/playground.sqlite',
  },
  jwt: {
    accessSecret: process.env.JWT_ACCESS_SECRET ?? 'dev-access-secret-change-me',
    refreshSecret: process.env.JWT_REFRESH_SECRET ?? 'dev-refresh-secret-change-me',
    accessTtl: process.env.JWT_ACCESS_TTL ?? '15m',
    refreshTtl: process.env.JWT_REFRESH_TTL ?? '7d',
  },
  throttle: {
    ttl: parseInt(process.env.THROTTLE_TTL ?? '60000', 10),
    limit: parseInt(process.env.THROTTLE_LIMIT ?? '60', 10),
  },
  apiKey: process.env.API_KEY ?? 'playground-key',
  admin: {
    email: process.env.ADMIN_EMAIL ?? 'admin@playground.dev',
    password: process.env.ADMIN_PASSWORD ?? 'Admin123!',
  },
  greeter: process.env.GREETER ?? 'friendly',
  geminiApiKey: process.env.GEMINI_API_KEY ?? '',
});

export type AppConfig = ReturnType<typeof configuration>;

/**
 * Passed to `ConfigModule.forRoot({ validate })`. Runs once at boot: fail FAST on bad config
 * instead of failing mysteriously at request time.
 */
export function validateEnv(env: Record<string, unknown>): Record<string, unknown> {
  if (env.NODE_ENV === 'production') {
    for (const key of ['JWT_ACCESS_SECRET', 'JWT_REFRESH_SECRET', 'API_KEY', 'ADMIN_PASSWORD']) {
      if (!env[key]) {
        throw new Error(`Missing required env var in production: ${key}`);
      }
    }
  }
  const port = Number(env.PORT ?? 3000);
  if (Number.isNaN(port) || port < 0 || port > 65535) {
    throw new Error(`PORT must be a valid port number, got "${String(env.PORT)}"`);
  }
  return env;
}
