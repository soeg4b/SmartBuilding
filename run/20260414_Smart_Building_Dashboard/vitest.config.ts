import { defineConfig } from 'vitest/config';
import path from 'path';

export default defineConfig({
  test: {
    globals: true,
    environment: 'node',
    include: ['tests/**/*.test.ts', 'tests/**/*.spec.ts'],
    exclude: ['tests/e2e/**'],
    setupFiles: ['tests/setup.ts'],
    coverage: {
      provider: 'v8',
      reporter: ['text', 'lcov', 'html'],
      include: ['src/backend/src/**/*.ts'],
      exclude: [
        'src/backend/src/server.ts',
        'src/backend/src/config/mqtt.ts',
        '**/*.d.ts',
      ],
    },
    testTimeout: 10000,
    hookTimeout: 10000,
  },
  resolve: {
    alias: {
      '@backend': path.resolve(__dirname, 'src/backend/src'),
      '@shared': path.resolve(__dirname, 'src/shared/types'),
    },
  },
});
