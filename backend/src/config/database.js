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
