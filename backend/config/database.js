const { MongoClient, ServerApiVersion } = require('mongodb');
const mongoose = require('mongoose');
require('dotenv').config();

const credentials = process.env.MONGO_DB_CERD_PEM || './X509-cert.pem';
const MONGO_URI = process.env.MONGO_URI;
const DB_NAME = process.env.DB_NAME || 'jewelryStore';

// MongoDB Native Client
const client = new MongoClient(MONGO_URI, {
  tlsCertificateKeyFile: credentials,
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
