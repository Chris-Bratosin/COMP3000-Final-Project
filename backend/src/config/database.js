// MongoDB connection helper.
//
// Persistence is optional: when MONGODB_URI is unset the backend still serves
// every scan endpoint, but ScanRecord.create() is a no-op and the /api/scans
// history endpoint returns 503. The local dev workflow can therefore boot
// without spinning up MongoDB at all. The `hasConnected` guard makes the
// function safely idempotent for callers that retry on startup.

const mongoose = require('mongoose');

let hasConnected = false;

async function connectToDatabase() {
  if (!process.env.MONGODB_URI) {
    console.warn('MONGODB_URI is not set. MongoDB connection skipped.');
    return null;
  }

  if (hasConnected) {
    return mongoose.connection;
  }

  await mongoose.connect(process.env.MONGODB_URI);
  hasConnected = true;

  console.log(`MongoDB connected: ${mongoose.connection.name}`);
  return mongoose.connection;
}

module.exports = { connectToDatabase };
