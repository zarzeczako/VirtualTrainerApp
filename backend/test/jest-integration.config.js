/**
 * Konfiguracja Jest dla testów integracyjnych (E2E)
 */

module.exports = {
  displayName: 'integration',
  moduleFileExtensions: ['js', 'json', 'ts'],
  rootDir: '..',
  testRegex: '.e2e-spec.ts$',
  testPathIgnorePatterns: ['/node_modules/', '/test/unit/'],
  transform: {
    '^.+\\.(t|j)s$': 'ts-jest',
  },
  collectCoverageFrom: [
    'src/**/*.(t|j)s',
  ],
  coverageDirectory: './coverage/integration',
  testEnvironment: 'node',
  moduleNameMapper: {
    '^src/(.*)$': '<rootDir>/src/$1',
  },
  testTimeout: 30000, // Testy E2E mogą być wolniejsze
  maxWorkers: 1, // Uruchamiaj pliki testowe sekwencyjnie, aby uniknąć kolizji w in-memory Mongo
  forceExit: true,
};
