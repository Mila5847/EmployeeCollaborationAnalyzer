export default {
  testEnvironment: 'node',
  transform: {}, // No Babel, native Node ESM is used
  moduleNameMapper: {
    '^(\\.{1,2}/.*)\\.js$': '$1',
  },
};
