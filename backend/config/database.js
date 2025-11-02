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
  
  const fallbackCertPath = path.join(process.cwd(), 'X509-cert-7200026180222304758.pem');
  
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
        credentialsPath = fallbackCertPath;
      }
    }
  } else {
    credentialsPath = fallbackCertPath;
    console.log("Using local X509-cert.pem file.");
  }
  
  connectionOptions.tlsCertificateKeyFile = credentialsPath;
} else {
  console.log('Using username/password authentication');
}

// MongoDB Native Client
const client = new MongoClient(MONGO_URI, connectionOptions);

// Mongoose Connection
const connectMongoose = async () => {
  try {
    const mongooseOptions = {
      dbName: DB_NAME,
      serverSelectionTimeoutMS: 30000,
      socketTimeoutMS: 45000
    };
    
    if (AUTH_TYPE === 'PEM') {
      mongooseOptions.tlsCertificateKeyFile = credentialsPath;
    }
    
    await mongoose.connect(MONGO_URI, mongooseOptions);
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
