// uuid ships ESM-only (no CommonJS build), which ts-jest can't parse when
// e2e tests boot the real AppModule -> PropertiesService -> AwsS3Service.
// Redirect to this shim (via moduleNameMapper in test/jest-e2e.json) backed
// by Node's built-in randomUUID, so behavior is still real UUIDs.
const crypto = require('crypto');

module.exports = {
  v4: () => crypto.randomUUID(),
};
