module.exports = {
  testEnvironment: 'node',
  coverageDirectory: 'coverage',
  collectCoverageFrom: [
    'server/**/*.js',
    'public/js/**/*.js',
    '!**/node_modules/**',
    '!**/coverage/**',
    '!**/__tests__/**'
  ],
  testMatch: [
    '**/__tests__/**/*.test.js',
    '**/*.test.js'
  ],
  moduleNameMapper: {
    '^(\\.{1,2}/.*)\\.js$': '$1'  // Handle ES6 .js extensions
  },
  transform: {
    '^.+\\.js$': ['babel-jest', { configFile: './babel.config.js' }]
  },
  projects: [
    {
      displayName: 'server',
      testEnvironment: 'node',
      testMatch: ['<rootDir>/server/**/*.test.js'],
      transform: {
        '^.+\\.js$': ['babel-jest', { configFile: './babel.config.js' }]
      }
    },
    {
      displayName: 'client',
      testEnvironment: 'jsdom',
      testMatch: ['<rootDir>/public/**/*.test.js'],
      transform: {
        '^.+\\.js$': ['babel-jest', { configFile: './babel.config.js' }]
      },
      moduleNameMapper: {
        '^(\\.{1,2}/.*)\\.js$': '$1'
      }
    }
  ]
};
