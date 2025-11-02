const request = require('supertest');
const mongoose = require('mongoose');
const app = require('../server');

describe('Product API Tests', () => {
  let productId;

  beforeAll(async () => {
    // Connect to test database
    await mongoose.connect(process.env.MONGO_URI_TEST || process.env.MONGO_URI);
  });

  afterAll(async () => {
    await mongoose.connection.close();
  });

  describe('GET /api/products', () => {
    test('should get all products', async () => {
      const response = await request(app)
        .get('/api/products')
        .expect(200);

      expect(Array.isArray(response.body)).toBe(true);
    });

    test('should filter products by category', async () => {
      const response = await request(app)
        .get('/api/products?category=rings')
        .expect(200);

      expect(Array.isArray(response.body)).toBe(true);
      if (response.body.length > 0) {
        expect(response.body[0].category).toBe('rings');
      }
    });

    test('should search products by name', async () => {
      const response = await request(app)
        .get('/api/products?search=diamond')
        .expect(200);

      expect(Array.isArray(response.body)).toBe(true);
    });
  });

  describe('POST /api/products', () => {
    test('should create a new product', async () => {
      const newProduct = {
        name: 'Test Ring',
        category: 'rings',
        metal: 'gold',
        weight: 5.0,
        price: 25000,
        stock: 10,
        description: 'Test product'
      };

      const response = await request(app)
        .post('/api/products')
        .send(newProduct)
        .expect(201);

      expect(response.body.name).toBe(newProduct.name);
      expect(response.body._id).toBeDefined();
      productId = response.body._id;
    });

    test('should fail with invalid data', async () => {
      const invalidProduct = {
        name: '',
        category: 'invalid',
        price: -100
      };

      await request(app)
        .post('/api/products')
        .send(invalidProduct)
        .expect(400);
    });
  });

  describe('PUT /api/products/:id', () => {
    test('should update existing product', async () => {
      const updatedData = {
        name: 'Updated Test Ring',
        price: 30000
      };

      const response = await request(app)
        .put(`/api/products/${productId}`)
        .send(updatedData)
        .expect(200);

      expect(response.body.name).toBe(updatedData.name);
      expect(response.body.price).toBe(updatedData.price);
    });

    test('should return 404 for non-existent product', async () => {
      const fakeId = new mongoose.Types.ObjectId();
      
      await request(app)
        .put(`/api/products/${fakeId}`)
        .send({ name: 'Test' })
        .expect(404);
    });
  });

  describe('DELETE /api/products/:id', () => {
    test('should delete existing product', async () => {
      await request(app)
        .delete(`/api/products/${productId}`)
        .expect(200);
    });

    test('should return 404 for non-existent product', async () => {
      await request(app)
        .delete(`/api/products/${productId}`)
        .expect(404);
    });
  });
});