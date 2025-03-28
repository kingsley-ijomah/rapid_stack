module.exports = {
  preset: 'ts-jest',
  testEnvironment: 'node',
  transform: {
    '^.+\\.tsx?$': ['ts-jest', {
      tsconfig: 'tsconfig.json'
    }],
    '^.+\\.jsx?$': 'babel-jest'
  },
  moduleFileExtensions: ['ts', 'tsx', 'js', 'jsx', 'json', 'node'],
  testMatch: ['**/__tests__/**/*.[jt]s?(x)'],
  transformIgnorePatterns: [
    'node_modules/(?!@angular|@ionic-native|@ionic|@capacitor)'
  ],
  moduleNameMapper: {
    '^src/(.*)$': '<rootDir>/generators/build-frontend/templates/src/$1'
  },
  setupFilesAfterEnv: ['<rootDir>/jest.setup.js'],
  globals: {
    'ts-jest': {
      tsconfig: 'tsconfig.json'
    }
  },
  projects: [
    {
      displayName: 'node',
      testMatch: ['<rootDir>/generators/**/__tests__/**/*.test.js']
    }
  ]
}; 