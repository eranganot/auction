/** Root Jest config — aggregates per-package projects. */
module.exports = {
  projects: [
    '<rootDir>/packages/shared',
    '<rootDir>/packages/database',
    '<rootDir>/apps/worker',
    '<rootDir>/apps/dashboard',
  ],
};
