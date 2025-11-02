const { MongoClient, ServerApiVersion } = require('mongodb');
const mongoose = require('mongoose');
require('dotenv').config();

const MONGO_URI = process.env.MONGO_URI_USR;
const DB_NAME = process.env.DB_NAME || 'jewelryStore';

console.log('Using username/password authentication');

// MongoDB Native Client
const client = new MongoClient(MONGO_URI, {
  serverApi: ServerApiVersion.v1
});

// Check if database is connected
const isConnected = () => {
  const state = mongoose.connection.readyState;
  console.log(`📊 Database connection state: ${state} (0=disconnected, 1=connected, 2=connecting, 3=disconnecting)`);
  return state === 1;
};

// Test database connection
const testConnection = async () => {
  try {
    console.log('🔍 Testing database connection...');
    await mongoose.connection.db.admin().ping();
    console.log('✅ Database ping successful');
    return true;
  } catch (error) {
    console.error('❌ Database ping failed:', error.message);
    return false;
  }
};

// Mongoose Connection with retry
const connectMongoose = async (retries = 3) => {
  console.log(`🔗 Connecting to: ${MONGO_URI.replace(/\/\/.*@/, '//***:***@')}`);
  console.log(`📂 Database: ${DB_NAME}`);
  
  const mongooseOptions = {
    dbName: DB_NAME,
    serverSelectionTimeoutMS: 10000,
    socketTimeoutMS: 45000,
    bufferCommands: false,
    maxPoolSize: 10
  };
  
  for (let i = 0; i < retries; i++) {
    try {
      console.log(`🔄 Attempting database connection (${i + 1}/${retries})...`);
      
      await mongoose.connect(MONGO_URI, mongooseOptions);
      
      if (isConnected()) {
        console.log('✅ Mongoose connected to MongoDB successfully');
        
        // Test the connection
        const testPassed = await testConnection();
        if (testPassed) {
          console.log('🎯 Database is ready for operations');
          return true;
        } else {
          throw new Error('Database connection test failed');
        }
      }
      
    } catch (error) {
      console.error(`❌ Connection attempt ${i + 1} failed:`, error.message);
      
      if (i === retries - 1) {
        console.error('🚫 All connection attempts failed. Exiting...');
        process.exit(1);
      }
      
      console.log(`⏳ Retrying in 2 seconds...`);
      await new Promise(resolve => setTimeout(resolve, 2000));
    }
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

module.exports = {
  connectMongoose,
  connectMongoDB,
  closeMongoDB,
  isConnected,
  testConnection,
  client
};
