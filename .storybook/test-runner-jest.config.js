import { getJestConfig } from '@storybook/test-runner';

const config = getJestConfig();

export default {
  ...config,
  testMatch: config.testMatch.map((pattern) => pattern.replaceAll('\\', '/')),
};
