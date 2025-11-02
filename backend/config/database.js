const { MongoClient, ServerApiVersion } = require('mongodb');
const mongoose = require('mongoose');
const fs = require('fs');
const os = require('os');
const path = require('path');
require('dotenv').config();

const AUTH_TYPE = process.env.DB_AUTH_TYPE || 'USERNAME';
const MONGO_URI = AUTH_TYPE === 'PEM' ? process.env.MONGO_URI_PEM : process.env.MONGO_URI_USR;
const DB_NAME = process.env.DB_NAME || 'jewelryStore';

let connectionOptions = { serverApi: ServerApiVersion.v1 };
let credentialsPath;

if (AUTH_TYPE === 'PEM') {
  console.log('Using PEM certificate authentication');
  
  if (process.env.MONGO_DB_CERD_PEM) {
    if (fs.existsSync(process.env.MONGO_DB_CERD_PEM)) {
      credentialsPath = process.env.MONGO_DB_CERD_PEM;
      console.log("Using PEM file path from environment variable.");
    } else {
      const tempFilePath = path.join(os.tmpdir(), `temp-cert-${Date.now()}.pem`);
      const pemContent = process.env.MONGO_DB_CERD_PEM.replace(/\\n/g, '\n');
      
      try {
        fs.writeFileSync(tempFilePath, pemContent);
        credentialsPath = tempFilePath;
        console.log("Using PEM credentials from environment variable content.");
      } catch (error) {
        console.error("Error writing PEM file from environment variable:", error);
        throw error;
      }
    }
  } else {
    throw new Error('PEM certificate not provided in environment variables');
  }
  
  connectionOptions.tlsCertificateKeyFile = credentialsPath;
} else {
  console.log('Using username/password authentication');
}

// MongoDB Native Client
const client = new MongoClient(MONGO_URI, connectionOptions);

// Mongoose Connection with retry
const connectMongoose = async (retries = 3) => {
  const mongooseOptions = {
    dbName: DB_NAME,
    serverSelectionTimeoutMS: 10000,
    socketTimeoutMS: 45000,
    bufferCommands: false,
    maxPoolSize: 10
  };
  
  if (AUTH_TYPE === 'PEM') {
    mongooseOptions.tlsCertificateKeyFile = credentialsPath;
  }
  
  for (let i = 0; i < retries; i++) {
    try {
      console.log(`🔄 Attempting database connection (${i + 1}/${retries})...`);
      
      await mongoose.connect(MONGO_URI, mongooseOptions);
      
      if (mongoose.connection.readyState === 1) {
        console.log('✅ Mongoose connected to MongoDB successfully');
        return true;
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
  client
};
