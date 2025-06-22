import { defineConfig } from 'vitest/config'

export default defineConfig({
  test: {
    testTimeout: 500000,
    coverage: {
      provider: 'v8',
      reporter: ['text', 'json', 'html'],
      reportsDirectory: './coverage',
      all: true,
      include: ['src/lib/**'],
      exclude: [
        'src/types',
        'src/index.ts',
        '**/*.test.ts'
      ]
    }
  }
})