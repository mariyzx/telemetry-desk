import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    projects: [
      {
        test: {
          name: 'packages',
          environment: 'node',
          include: ['packages/**/*.test.ts'],
        },
      },
      'apps/dashboard',
      {
        test: {
          name: 'desktop',
          environment: 'node',
          include: ['apps/desktop/**/*.test.ts'],
        },
      },
      {
        test: {
          name: 'collector',
          environment: 'node',
          include: ['apps/collector/**/*.test.ts'],
        },
      },
    ],
  },
});
