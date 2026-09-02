import { defineConfig } from 'vitest/config';
import { fileURLToPath } from 'node:url';

/**
 * Test configuration.
 *
 * `server-only` is aliased to an empty module. That package exists purely to
 * make a build fail if server code is imported into a client bundle; under a
 * node test runner there is no such bundle, and the real package throws on
 * import. Aliasing it keeps the guard in production without blocking tests.
 */
export default defineConfig({
  resolve: {
    alias: {
      '@': fileURLToPath(new URL('./src', import.meta.url)),
      'server-only': fileURLToPath(new URL('./tests/stubs/server-only.ts', import.meta.url)),
    },
  },
  test: {
    environment: 'node',
    include: ['tests/**/*.test.ts'],
  },
});
