const express = require('express');
const cors = require('cors');
require('dotenv').config();

const { connectMongoose, isConnected, closeConnection, keepAlive } = require('./config/database');
const productRoutes = require('./routes/productRoutes');
const orderRoutes = require('./routes/orderRoutes');
const statusRoutes = require('./routes/statusRoutes');
const errorHandler = require('./middleware/errorHandler');
const logger = require('./middleware/logger');

const app = express();

// Middleware
app.use(cors({
  origin: ['http://localhost:3000', 'http://127.0.0.1:3000', /^https?:\/\/.*\.vercel\.app$/],
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization']
}));
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true }));
app.use(logger);

// Status routes
app.use('/', statusRoutes);

// API Routes
app.use('/api/products', productRoutes);
app.use('/api/orders', orderRoutes);

// 404 handler
app.use('*', (req, res) => {
  res.status(404).json({ error: 'Route not found' });
});

// Error handling middleware
app.use(errorHandler);

// Start server
const PORT = process.env.PORT || 5001;

const startServer = async () => {
  try {
    // Connect to database in background
    console.log('🔌 Connecting to database in background...');
    connectMongoose()
      .then(() => {
        console.log('✅ Database connected successfully');
        app.listen(PORT, '0.0.0.0', () => {
          console.log(`🚀 Server running on port ${PORT}`);
          console.log(`📊 Health check: http://localhost:${PORT}/health`);
          console.log(`🛍️  API Base URL: http://localhost:${PORT}/api`);
        });
        keepAlive();
        console.log('✨ Server is fully ready');
      })
      .catch(error => {
        console.error('❌ Database connection failed:', error.message);
      });

  } catch (error) {
    console.error('❌ Failed to start server:', error.message);
    process.exit(1);
  }
};

// Graceful shutdown
process.on('SIGINT', async () => {
  console.log('\n🛑 Shutting down server...');
  await closeConnection();
  process.exit(0);
});

process.on('SIGTERM', async () => {
  console.log('\n🛑 Shutting down server...');
  await closeConnection();
  process.exit(0);
});

startServer();
