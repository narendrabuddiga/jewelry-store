const { MongoClient, ServerApiVersion } = require('mongodb');
const mongoose = require('mongoose');
require('dotenv').config();

const MONGO_URI = process.env.MONGO_URI_USR;
const DB_NAME = process.env.DB_NAME || 'jewelryStore';

console.log('Using username/password authentication');

// Global connection cache for serverless environments
let cachedConnection = null;

// MongoDB Native Client
const client = new MongoClient(MONGO_URI, {
  serverApi: ServerApiVersion.v1
});

// Check if database is connected
const isConnected = () => {
  return mongoose.connection.readyState === 1;
};

// Test database connection
const testConnection = async () => {
  try {
    await mongoose.connection.db.admin().ping();
    return true;
  } catch (error) {
    console.error('❌ Database ping failed:', error.message);
    return false;
  }
};

// Setup connection event handlers
const setupConnectionHandlers = () => {
  mongoose.connection.on('connected', () => {
    console.log('✅ Mongoose connected to MongoDB');
  });

  mongoose.connection.on('error', (err) => {
    console.error('❌ Mongoose connection error:', err);
  });

  mongoose.connection.on('disconnected', () => {
    console.log('⚠️ Mongoose disconnected from MongoDB');
    cachedConnection = null;
    // Auto-reconnect after 5 seconds
    setTimeout(() => {
      console.log('🔄 Attempting to reconnect...');
      connectMongoose().catch(err => console.error('Reconnection failed:', err));
    }, 5000);
  });

  mongoose.connection.on('reconnected', () => {
    console.log('✅ Mongoose reconnected to MongoDB');
  });
};

// Cached Mongoose Connection with auto-reconnect
const connectMongoose = async () => {
  // Return cached connection if available
  if (cachedConnection && isConnected()) {
    console.log('🔄 Using cached database connection');
    return cachedConnection;
  }

  // If connection exists but not ready, wait for it
  if (cachedConnection) {
    console.log('⏳ Waiting for existing connection...');
    return cachedConnection;
  }

  console.log('🔗 Creating new database connection...');
  console.log(`📡 Connecting to: ${MONGO_URI.replace(/\/\/.*@/, '//***:***@')}`);
  console.log(`📂 Database: ${DB_NAME}`);

  const mongooseOptions = {
    dbName: DB_NAME,
    serverSelectionTimeoutMS: 5000,
    socketTimeoutMS: 45000,
    bufferCommands: false,
    maxPoolSize: 10,
    minPoolSize: 5,
    maxIdleTimeMS: 30000,
    // Auto-reconnection settings
    autoReconnect: true,
    reconnectTries: Number.MAX_VALUE,
    reconnectInterval: 1000
  };

  try {
    // Setup event handlers first
    setupConnectionHandlers();
    
    // Cache the connection promise
    cachedConnection = mongoose.connect(MONGO_URI, mongooseOptions);
    
    // Wait for connection to complete
    await cachedConnection;
    
    if (isConnected()) {
      console.log('✅ Database connected successfully');
      
      // Test the connection
      const testPassed = await testConnection();
      if (testPassed) {
        console.log('🎯 Database is ready for operations');
        return cachedConnection;
      } else {
        throw new Error('Database connection test failed');
      }
    } else {
      throw new Error('Database connection failed');
    }
    
  } catch (error) {
    console.error('❌ Database connection failed:', error.message);
    cachedConnection = null; // Reset cache on failure
    throw error;
  }
};

// Native MongoDB Connection
const connectMongoDB = async () => {
  try {
    await client.connect();
    console.log('Native MongoDB client connected');
    return client.db(DB_NAME);
  } catch (error) {
    console.error('MongoDB connection error:', error);
    throw error;
  }
};

const closeMongoDB = async () => {
  try {
    await client.close();
    console.log('MongoDB connection closed');
  } catch (error) {
    console.error('Error closing MongoDB connection:', error);
  }
};

// Keep connection alive with periodic ping
const keepAlive = () => {
  setInterval(async () => {
    if (isConnected()) {
      try {
        await mongoose.connection.db.admin().ping();
        console.log('🟢 Database connection alive');
      } catch (error) {
        console.error('🔴 Database ping failed:', error.message);
      }
    } else {
      console.log('🟡 Database disconnected, attempting reconnect...');
      try {
        await connectMongoose();
      } catch (error) {
        console.error('❌ Reconnection failed:', error.message);
      }
    }
  }, 30000); // Check every 30 seconds
};

// Graceful shutdown
const closeConnection = async () => {
  if (cachedConnection) {
    await mongoose.connection.close();
    cachedConnection = null;
    console.log('🔌 Database connection closed');
  }
};

module.exports = {
  connectMongoose,
  connectMongoDB,
  closeMongoDB,
  closeConnection,
  isConnected,
  testConnection,
  keepAlive,
  client
};
