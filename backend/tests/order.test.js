const request = require('supertest');
const mongoose = require('mongoose');
const app = require('../server');

describe('Order API Tests', () => {
  let orderId;
  let productId;

  beforeAll(async () => {
    await mongoose.connect(process.env.MONGO_URI_TEST || process.env.MONGO_URI);
    
    // Create a test product for orders
    const product = await request(app)
      .post('/api/products')
      .send({
        name: 'Test Product for Orders',
        category: 'rings',
        metal: 'gold',
        weight: 5.0,
        price: 25000,
        stock: 10,
        description: 'Test product for order tests'
      });
    
    productId = product.body._id;
  });

  afterAll(async () => {
    // Clean up test data
    await request(app).delete(`/api/products/${productId}`);
    await mongoose.connection.close();
  });

  describe('GET /api/orders', () => {
    test('should get all orders', async () => {
      const response = await request(app)
        .get('/api/orders')
        .expect(200);

      expect(Array.isArray(response.body)).toBe(true);
    });

    test('should filter orders by status', async () => {
      const response = await request(app)
        .get('/api/orders?status=pending')
        .expect(200);

      expect(Array.isArray(response.body)).toBe(true);
    });
  });

  describe('POST /api/orders', () => {
    test('should create a new order', async () => {
      const newOrder = {
        customer: {
          name: 'Test Customer',
          email: 'test@example.com',
          phone: '1234567890',
          address: '123 Test Street'
        },
        items: [{
          productId: productId,
          name: 'Test Product for Orders',
          price: 25000,
          quantity: 1,
          metal: 'gold',
          weight: 5.0
        }],
        total: 25000,
        status: 'pending'
      };

      const response = await request(app)
        .post('/api/orders')
        .send(newOrder)
        .expect(201);

      expect(response.body.customer.name).toBe(newOrder.customer.name);
      expect(response.body.total).toBe(newOrder.total);
      expect(response.body._id).toBeDefined();
      orderId = response.body._id;
    });

    test('should fail with invalid customer data', async () => {
      const invalidOrder = {
        customer: {
          name: '',
          email: 'invalid-email'
        },
        items: [],
        total: 0
      };

      await request(app)
        .post('/api/orders')
        .send(invalidOrder)
        .expect(400);
    });

    test('should fail when product stock is insufficient', async () => {
      const orderWithHighQuantity = {
        customer: {
          name: 'Test Customer',
          email: 'test@example.com',
          phone: '1234567890',
          address: '123 Test Street'
        },
        items: [{
          productId: productId,
          name: 'Test Product for Orders',
          price: 25000,
          quantity: 100, // More than available stock
          metal: 'gold',
          weight: 5.0
        }],
        total: 2500000
      };

      await request(app)
        .post('/api/orders')
        .send(orderWithHighQuantity)
        .expect(400);
    });
  });

  describe('PATCH /api/orders/:id/status', () => {
    test('should update order status', async () => {
      const response = await request(app)
        .patch(`/api/orders/${orderId}/status`)
        .send({ status: 'processing' })
        .expect(200);

      expect(response.body.status).toBe('processing');
    });

    test('should fail with invalid status', async () => {
      await request(app)
        .patch(`/api/orders/${orderId}/status`)
        .send({ status: 'invalid-status' })
        .expect(400);
    });

    test('should return 404 for non-existent order', async () => {
      const fakeId = new mongoose.Types.ObjectId();
      
      await request(app)
        .patch(`/api/orders/${fakeId}/status`)
        .send({ status: 'completed' })
        .expect(404);
    });
  });
});