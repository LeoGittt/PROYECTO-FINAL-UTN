import { defineConfig } from 'vitest/config';

export default defineConfig({
  // Resuelve los alias declarados en tsconfig.json (Vite lo soporta de forma nativa).
  resolve: { tsconfigPaths: true },
  test: {
    globals: true,
    root: './',
    include: ['**/*.spec.ts'],
    setupFiles: ['./test/ayudantes/silenciar-logs.ts'],
    // PGlite arranca un PostgreSQL en WebAssembly: la primera prueba de cada archivo tarda más.
    testTimeout: 20_000,
    hookTimeout: 60_000,
  },
});
