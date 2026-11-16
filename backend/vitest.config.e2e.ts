import { defineConfig } from 'vitest/config';

export default defineConfig({
  resolve: { tsconfigPaths: true },
  test: {
    globals: true,
    root: './',
    include: ['**/*.e2e-spec.ts'],
    setupFiles: ['./test/ayudantes/silenciar-logs.ts'],
    testTimeout: 20_000,
    hookTimeout: 60_000,
  },
});
