const Order = require('../models/Order');
const Product = require('../models/Product');

// Get all orders
const getAllOrders = async (req, res) => {
  try {
    const { status, sortBy = 'createdAt', order = 'desc' } = req.query;
    
    let query = {};
    if (status) {
      query.status = status;
    }
    
    const sortOrder = order === 'desc' ? -1 : 1;
    const orders = await Order.find(query)
      .populate('items.productId', 'name category metal')
      .sort({ [sortBy]: sortOrder });
    
    res.json(orders);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

// Get single order
const getOrderById = async (req, res) => {
  try {
    const order = await Order.findById(req.params.id)
      .populate('items.productId', 'name category metal image');
    
    if (!order) {
      return res.status(404).json({ error: 'Order not found' });
    }
    
    res.json(order);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

// Create order with idempotency
const createOrder = async (req, res) => {
  try {
    const { items, idempotencyKey } = req.body;
    
    // Check for duplicate order using idempotency key
    if (idempotencyKey) {
      const existingOrder = await Order.findOne({ idempotencyKey });
      if (existingOrder) {
        const populatedOrder = await Order.findById(existingOrder._id)
          .populate('items.productId', 'name category metal');
        return res.status(200).json(populatedOrder);
      }
    }
    
    // Validate stock availability
    for (const item of items) {
      const product = await Product.findById(item.productId);
      if (!product) {
        return res.status(400).json({ error: `Product ${item.name} not found` });
      }
      if (product.stock < item.quantity) {
        return res.status(400).json({ 
          error: `Insufficient stock for ${product.name}. Available: ${product.stock}` 
        });
      }
    }
    
    // Use transaction for atomicity
    const session = await Order.startSession();
    session.startTransaction();
    
    try {
      // Update stock levels
      for (const item of items) {
        const result = await Product.findByIdAndUpdate(
          item.productId,
          { $inc: { stock: -item.quantity } },
          { session, new: true }
        );
        
        if (result.stock < 0) {
          throw new Error(`Insufficient stock for ${item.name}`);
        }
      }
      
      const orderData = {
        ...req.body,
        idempotencyKey: idempotencyKey || undefined
      };
      
      const order = new Order(orderData);
      await order.save({ session });
      
      await session.commitTransaction();
      
      const populatedOrder = await Order.findById(order._id)
        .populate('items.productId', 'name category metal');
      
      res.status(201).json(populatedOrder);
    } catch (error) {
      await session.abortTransaction();
      throw error;
    } finally {
      session.endSession();
    }
  } catch (error) {
    if (error.name === 'ValidationError') {
      return res.status(400).json({ error: error.message });
    }
    res.status(500).json({ error: error.message });
  }
};

// Update order status
const updateOrderStatus = async (req, res) => {
  try {
    const { status } = req.body;
    
    const order = await Order.findByIdAndUpdate(
      req.params.id,
      { status, updatedAt: Date.now() },
      { new: true, runValidators: true }
    ).populate('items.productId', 'name category metal');
    
    if (!order) {
      return res.status(404).json({ error: 'Order not found' });
    }
    
    res.json(order);
  } catch (error) {
    if (error.name === 'ValidationError') {
      return res.status(400).json({ error: error.message });
    }
    res.status(500).json({ error: error.message });
  }
};

// Cancel order and restore stock
const cancelOrder = async (req, res) => {
  try {
    const order = await Order.findById(req.params.id);
    
    if (!order) {
      return res.status(404).json({ error: 'Order not found' });
    }
    
    if (order.status === 'completed') {
      return res.status(400).json({ error: 'Cannot cancel completed order' });
    }
    
    // Restore stock if order is being cancelled
    if (order.status !== 'cancelled') {
      for (const item of order.items) {
        await Product.findByIdAndUpdate(
          item.productId,
          { $inc: { stock: item.quantity } }
        );
      }
    }
    
    order.status = 'cancelled';
    order.updatedAt = Date.now();
    await order.save();
    
    res.json(order);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

// Get order statistics
const getOrderStats = async (req, res) => {
  try {
    const stats = await Order.aggregate([
      {
        $group: {
          _id: '$status',
          count: { $sum: 1 },
          totalRevenue: { $sum: '$total' }
        }
      }
    ]);
    
    const totalOrders = await Order.countDocuments();
    const totalRevenue = await Order.aggregate([
      { $match: { status: { $ne: 'cancelled' } } },
      { $group: { _id: null, total: { $sum: '$total' } } }
    ]);
    
    res.json({
      statusBreakdown: stats,
      totalOrders,
      totalRevenue: totalRevenue[0]?.total || 0
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

module.exports = {
  getAllOrders,
  getOrderById,
  createOrder,
  updateOrderStatus,
  cancelOrder,
  getOrderStats
};
