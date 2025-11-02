const { MongoClient, ServerApiVersion } = require('mongodb');
const mongoose = require('mongoose');
const fs = require('fs');
const os = require('os');
const path = require('path');
require('dotenv').config();

const MONGO_URI = process.env.MONGO_URI;
const DB_NAME = process.env.DB_NAME || 'jewelryStore';

// Determine if we are using an environment variable or a local file
let credentialsPath;

// Check if it's a file path or certificate content
if (fs.existsSync(process.env.MONGO_DB_CERD_PEM)) {
  // It's a file path
  credentialsPath = process.env.MONGO_DB_CERD_PEM;
  console.log("Using PEM file path from environment variable.");
} else {
  // It's certificate content, create temporary file
  const tempFilePath = path.join(os.tmpdir(), `temp-cert-${Date.now()}.pem`);
  const pemContent = process.env.MONGO_DB_CERD_PEM.replace(/\\n/g, '\n');

  try {
    fs.writeFileSync(tempFilePath, pemContent);
    credentialsPath = tempFilePath;
    console.log("Using PEM credentials from environment variable content.");
  } catch (error) {
    console.error("Error writing PEM file from environment variable:", error);
    credentialsPath = fallbackCertPath;
  }
}


// MongoDB Native Client
const client = new MongoClient(MONGO_URI, {
  tlsCertificateKeyFile: credentialsPath,
  serverApi: ServerApiVersion.v1
});

// Mongoose Connection
const connectMongoose = async () => {
  try {
    await mongoose.connect(MONGO_URI, {
      tlsCertificateKeyFile: credentialsPath,
      dbName: DB_NAME,
      serverSelectionTimeoutMS: 30000,
      socketTimeoutMS: 45000
    });
    console.log('Mongoose connected to MongoDB');
  } catch (error) {
    console.error('Mongoose connection error:', error);
    process.exit(1);
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
