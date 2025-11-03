const mongoose = require('mongoose');

const orderSchema = new mongoose.Schema({
  customer: {
    name: {
      type: String,
      required: [true, 'Customer name is required'],
      trim: true
    },
    email: {
      type: String,
      required: [true, 'Customer email is required'],
      trim: true,
      lowercase: true,
      match: [/^\w+([.-]?\w+)*@\w+([.-]?\w+)*(\.\w{2,3})+$/, 'Please enter a valid email']
    },
    phone: {
      type: String,
      required: [true, 'Customer phone is required'],
      trim: true
    },
    address: {
      type: String,
      required: [true, 'Customer address is required'],
      trim: true
    }
  },
  items: [{
    productId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Product',
      required: true
    },
    name: {
      type: String,
      required: true
    },
    price: {
      type: Number,
      required: true,
      min: 0
    },
    quantity: {
      type: Number,
      required: true,
      min: 1
    },
    metal: String,
    weight: Number
  }],
  total: {
    type: Number,
    required: [true, 'Order total is required'],
    min: [0, 'Total must be positive']
  },
  status: {
    type: String,
    enum: ['pending', 'processing', 'completed', 'cancelled'],
    default: 'pending'
  },
  idempotencyKey: {
    type: String,
    unique: true,
    sparse: true
  },
  createdAt: {
    type: Date,
    default: Date.now
  },
  updatedAt: {
    type: Date,
    default: Date.now
  }
});

// Update the updatedAt field before saving
orderSchema.pre('save', function(next) {
  this.updatedAt = Date.now();
  next();
});

// Index for better query performance
orderSchema.index({ status: 1, createdAt: -1 });
orderSchema.index({ 'customer.email': 1 });
orderSchema.index({ idempotencyKey: 1 });

module.exports = mongoose.model('Order', orderSchema);
