export const isJest = process.env.JEST_WORKER_ID !== undefined;

if (isJest) {
  // Disable console logs during tests to keep the output clean, but allow enabling them with an env variable
  if (process.env.TEST_LOGS === 'true') {
    console.log('Test logs are enabled');
  } else {
    console.log = () => {};
    console.error = () => {};
    console.warn = () => {};
  }
}
