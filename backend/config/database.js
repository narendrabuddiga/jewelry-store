const { MongoClient, ServerApiVersion } = require('mongodb');
const mongoose = require('mongoose');
import * as fs from 'fs';
import * as os from 'os';
import * as path from 'path';
require('dotenv').config();

const credentials = process.env.MONGO_DB_CERD_PEM || './X509-cert.pem';
const MONGO_URI = process.env.MONGO_URI;
const DB_NAME = process.env.DB_NAME || 'jewelryStore';

// Define the path for the local fallback file
const fallbackCertPath = path.join(process.cwd(), './X509-cert.pem');

// Determine if we are using an environment variable or a local file
let credentialsPath;

if (process.env.MONGO_DB_CERD_PEM) {
  // 1. Create a temporary file path
  // Use os.tmpdir() to ensure you write to a directory the process has permission for (especially in serverless environments)
  const tempFilePath = path.join(os.tmpdir(), `temp-cert-${Date.now()}.pem`);
  
  // 2. Write the environment variable content to the temporary file
  try {
    fs.writeFileSync(tempFilePath, process.env.MONGO_DB_CERD_PEM);
    credentialsPath = tempFilePath;
    console.log("Using PEM credentials from environment variable and temporary file.");
  } catch (error) {
    console.error("Error writing PEM file from environment variable:", error);
    // Fall back to the local file if writing fails
    credentialsPath = fallbackCertPath;
  }

} else {
  // Use the local file path as defined in your original code
  credentialsPath = fallbackCertPath;
  console.log("Using local X509-cert.pem file.");
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
      tlsCertificateKeyFile: credentials,
      dbName: DB_NAME
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
