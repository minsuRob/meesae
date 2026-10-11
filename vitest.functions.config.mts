import { defineConfig } from 'vitest/config';

// Functions 통합 테스트. Auth·Firestore·Functions 에뮬레이터에 실제로 요청한다 (npm run test:functions).
export default defineConfig({
  test: {
    environment: 'node',
    include: ['tests/functions/**/*.test.ts'],
    testTimeout: 60000,
    hookTimeout: 60000,
    fileParallelism: false,
  },
});
