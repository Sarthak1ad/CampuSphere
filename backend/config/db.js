/**
 * DATABASE CONFIGURATION
 * ----------------------
 * MongoDB Concept: Connection Pooling
 * Mongoose maintains a pool of connections to MongoDB so we don't
 * create/destroy connections on each request — very efficient.
 *
 * We use mongoose.connect() once at startup. Mongoose will:
 *  - Auto-reconnect if the connection drops
 *  - Queue operations until connected
 *  - Share the single connection across all models
 */
const mongoose = require('mongoose');

const connectDB = async () => {
  try {
    // MongoDB Concept: Connection Options
    // - maxPoolSize: max simultaneous connections (default 100)
    // - serverSelectionTimeoutMS: how long to wait to find a server
    // - socketTimeoutMS: how long to wait for a response
    const conn = await mongoose.connect(process.env.MONGO_URI, {
      maxPoolSize: 10,
      serverSelectionTimeoutMS: 5000,
      socketTimeoutMS: 45000,
    });

    console.log(`✅ MongoDB Connected: ${conn.connection.host}`);

    // MongoDB Concept: Event Listeners on Connection
    // We can listen for connection events to handle errors gracefully
    mongoose.connection.on('error', (err) => {
      console.error(`❌ MongoDB connection error: ${err}`);
    });

    mongoose.connection.on('disconnected', () => {
      console.log('⚠️  MongoDB disconnected. Attempting to reconnect...');
    });

  } catch (error) {
    console.error(`❌ MongoDB Connection Failed: ${error.message}`);
    // Exit process with failure — app cannot run without DB
    process.exit(1);
  }
};

module.exports = connectDB;
