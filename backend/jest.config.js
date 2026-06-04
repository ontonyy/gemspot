/* Unit tests for GemSpot backend. Pure business-logic coverage over services
   with a mocked PrismaService — no Postgres needed, so `npm test` is green in
   CI without a database. */
module.exports = {
  preset: 'ts-jest',
  testEnvironment: 'node',
  rootDir: '.',
  roots: ['<rootDir>/test'],
  testMatch: ['**/*.spec.ts'],
  moduleFileExtensions: ['ts', 'js', 'json'],
  clearMocks: true,
}
