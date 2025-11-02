const express = require('express');
const cors = require('cors');
require('dotenv').config();

const { connectMongoose, isConnected, closeConnection } = require('./config/database');
const productRoutes = require('./routes/productRoutes');
const orderRoutes = require('./routes/orderRoutes');
const errorHandler = require('./middleware/errorHandler');
const logger = require('./middleware/logger');

const app = express();

// Middleware
app.use(cors());
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true }));
app.use(logger);



// Health check endpoint
app.get('/health', (req, res) => {
  res.json({ status: 'OK', timestamp: new Date().toISOString() });
});

// API Routes
app.use('/api/products', productRoutes);
app.use('/api/orders', orderRoutes);

// Initialize sample data endpoint
app.post('/api/init-data', async (req, res) => {
  try {
    const Product = require('./models/Product');
    
    const count = await Product.countDocuments();
    if (count > 0) {
      return res.json({ message: 'Database already has data' });
    }

    const sampleProducts = [
      {
        name: 'Diamond Solitaire Ring',
        category: 'rings',
        metal: 'platinum',
        weight: 5.5,
        price: 45000,
        stock: 8,
        description: 'Classic solitaire with 1ct diamond',
        image: 'https://images.unsplash.com/photo-1605100804763-247f67b3557e?w=400&h=400&fit=crop'
      },
      {
        name: 'Gold Chain Necklace',
        category: 'necklaces',
        metal: 'gold',
        weight: 15.2,
        price: 38000,
        stock: 12,
        description: '22K gold chain with intricate design',
        image: 'https://images.unsplash.com/photo-1599643478518-a784e5dc4c8f?w=400&h=400&fit=crop'
      },
      {
        name: 'Pearl Earrings',
        category: 'earrings',
        metal: 'silver',
        weight: 3.2,
        price: 12000,
        stock: 15,
        description: 'Elegant pearl drop earrings',
        image: 'https://images.unsplash.com/photo-1535632066927-ab7c9ab60908?w=400&h=400&fit=crop'
      },
      {
        name: 'Gold Bangle Bracelet',
        category: 'bracelets',
        metal: 'gold',
        weight: 25.5,
        price: 52000,
        stock: 6,
        description: 'Traditional gold bangle with intricate patterns',
        image: 'https://images.unsplash.com/photo-1611591437281-460bfbe1220a?w=400&h=400&fit=crop'
      },
      {
        name: 'Diamond Pendant',
        category: 'pendants',
        metal: 'white-gold',
        weight: 4.2,
        price: 28000,
        stock: 10,
        description: 'Elegant diamond pendant in white gold',
        image: 'https://images.unsplash.com/photo-1515562141207-7a88fb7ce338?w=400&h=400&fit=crop'
      }
    ];

    await Product.insertMany(sampleProducts);
    res.json({ message: 'Sample data initialized successfully' });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

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
    
    console.log('📦 Checking sample data...');
    const Product = require('./models/Product');
    const count = await Product.countDocuments();
    if (count === 0) {
      console.log('📦 Inserting sample data...');
      const sampleProducts = [
        {
          name: 'Diamond Ring',
          category: 'rings',
          metal: 'gold',
          weight: 5.5,
          price: 45000,
          stock: 8,
          description: 'Beautiful diamond ring'
        },
        {
          name: 'Gold Necklace',
          category: 'necklaces',
          metal: 'gold',
          weight: 15.2,
          price: 38000,
          stock: 12,
          description: 'Elegant gold necklace'
        }
      ];
      await Product.insertMany(sampleProducts);
      console.log('✅ Sample data inserted');
    } else {
      console.log(`📊 Found ${count} products in database`);
    }
    
    const server = app.listen(PORT, '0.0.0.0', () => {
      console.log(`🚀 Server running on port ${PORT}`);
      console.log(`📊 Health check: http://localhost:${PORT}/health`);
      console.log(`🛍️  API Base URL: http://localhost:${PORT}/api`);
      console.log('✨ Server is ready to accept requests');
    });

    return server;
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
if (require.main === module) {
  startServer();
} else {
  module.exports = app;
}
