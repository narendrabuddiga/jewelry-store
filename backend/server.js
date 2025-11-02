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
app.use(cors());
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
    console.log('🔌 Initializing database connection...');
    
    // Connect to database with caching
    await connectMongoose();
    
    // Wait and verify database is actually connected
    let attempts = 0;
    const maxAttempts = 10;
    
    while (!isConnected() && attempts < maxAttempts) {
      console.log(`⏳ Waiting for database connection... (${attempts + 1}/${maxAttempts})`);
      await new Promise(resolve => setTimeout(resolve, 1000));
      attempts++;
    }
    
    if (!isConnected()) {
      throw new Error('Database connection failed after maximum attempts');
    }
    
    console.log('✅ Database connection verified - ready to start server');
    
    // Start keep-alive mechanism
    keepAlive();
    
    app.listen(PORT, '0.0.0.0', () => {
      console.log(`🚀 Server running on port ${PORT}`);
      console.log(`📊 Health check: http://localhost:${PORT}/health`);
      console.log(`🛍️  API Base URL: http://localhost:${PORT}/api`);
      console.log('✨ Server is ready to accept requests');
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

// Export for testing
startServer();
