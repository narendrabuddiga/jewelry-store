import React, { useState, useEffect } from 'react';
import { Plus, Edit2, Trash2, Search, ShoppingCart, Diamond, User, Home, X, Minus, Menu } from 'lucide-react';
import { v4 as uuidv4 } from 'uuid';

const API_URL = process.env.REACT_APP_API_URL || `http://${window.location.hostname}:5001/api`;

export default function JewelryStoreApp() {
  const [mode, setMode] = useState('customer');
  const [products, setProducts] = useState([]);
  const [filteredProducts, setFilteredProducts] = useState([]);
  const [cart, setCart] = useState([]);
  const [orders, setOrders] = useState([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('all');
  const [showForm, setShowForm] = useState(false);
  const [showCart, setShowCart] = useState(false);
  const [editingId, setEditingId] = useState(null);
  const [loading, setLoading] = useState(false);
  const [customerInfo, setCustomerInfo] = useState({ name: '', email: '', phone: '', address: '' });
  const [showCheckout, setShowCheckout] = useState(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [formData, setFormData] = useState({
    name: '', category: 'rings', metal: 'gold', weight: '', price: '', stock: '', description: '', image: ''
  });

  useEffect(() => {
    loadProducts();
    loadOrders();
  }, []);

  const loadProducts = async () => {
    try {
      setLoading(true);
      const response = await fetch(`${API_URL}/products`);
      const data = await response.json();
      setProducts(data);
      setFilteredProducts(data);
    } catch (error) {
      console.error('Failed to load products:', error);
      alert('Failed to load products from database');
    } finally {
      setLoading(false);
    }
  };

  const loadOrders = async () => {
    try {
      const response = await fetch(`${API_URL}/orders`);
      const data = await response.json();
      setOrders(data);
    } catch (error) {
      console.error('Failed to load orders:', error);
    }
  };

  useEffect(() => {
    let filtered = products;
    if (selectedCategory !== 'all') {
      filtered = filtered.filter(p => p.category === selectedCategory);
    }
    if (searchTerm) {
      filtered = filtered.filter(p => 
        p.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        p.description.toLowerCase().includes(searchTerm.toLowerCase())
      );
    }
    setFilteredProducts(filtered);
  }, [searchTerm, selectedCategory, products]);

  const handleSubmit = async () => {
    if (!formData.name || !formData.weight || !formData.price || !formData.stock) {
      alert('Please fill in all required fields');
      return;
    }
    
    const productData = {
      ...formData,
      weight: parseFloat(formData.weight),
      price: parseFloat(formData.price),
      stock: parseInt(formData.stock)
    };

    try {
      setLoading(true);
      let response;
      
      if (editingId) {
        response = await fetch(`${API_URL}/products/${editingId}`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(productData)
        });
      } else {
        response = await fetch(`${API_URL}/products`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(productData)
        });
      }

      if (!response.ok) throw new Error('Failed to save product');
      
      await loadProducts();
      resetForm();
      alert(editingId ? 'Product updated successfully!' : 'Product added successfully!');
    } catch (error) {
      console.error('Error saving product:', error);
      alert('Failed to save product');
    } finally {
      setLoading(false);
    }
  };

  const handleEdit = (product) => {
    setFormData({
      name: product.name,
      category: product.category,
      metal: product.metal,
      weight: product.weight.toString(),
      price: product.price.toString(),
      stock: product.stock.toString(),
      description: product.description || '',
      image: product.image || ''
    });
    setEditingId(product._id);
    setShowForm(true);
  };

  const handleDelete = async (id) => {
    if (!window.confirm('Are you sure you want to delete this product?')) return;

    try {
      setLoading(true);
      const response = await fetch(`${API_URL}/products/${id}`, {
        method: 'DELETE'
      });

      if (!response.ok) throw new Error('Failed to delete product');
      
      await loadProducts();
      alert('Product deleted successfully!');
    } catch (error) {
      console.error('Error deleting product:', error);
      alert('Failed to delete product');
    } finally {
      setLoading(false);
    }
  };

  const addToCart = (product) => {
    const existingItem = cart.find(item => item._id === product._id);
    if (existingItem) {
      if (existingItem.quantity < product.stock) {
        setCart(cart.map(item => 
          item._id === product._id ? { ...item, quantity: item.quantity + 1 } : item
        ));
      } else {
        alert('Maximum stock reached for this item');
      }
    } else {
      setCart([...cart, { ...product, quantity: 1 }]);
    }
  };

  const updateCartQuantity = (id, quantity) => {
    const product = products.find(p => p._id === id);
    if (quantity > product.stock) {
      alert('Quantity exceeds available stock');
      return;
    }
    if (quantity <= 0) {
      removeFromCart(id);
    } else {
      setCart(cart.map(item => item._id === id ? { ...item, quantity } : item));
    }
  };

  const removeFromCart = (id) => {
    setCart(cart.filter(item => item._id !== id));
  };

  const getTotalPrice = () => {
    return cart.reduce((total, item) => total + (item.price * item.quantity), 0);
  };

  const handleCheckout = async () => {
    if (isSubmitting) return;
    
    if (!customerInfo.name || !customerInfo.email || !customerInfo.phone || !customerInfo.address) {
      alert('Please fill in all customer information');
      return;
    }

    setIsSubmitting(true);
    const idempotencyKey = uuidv4();

    const orderData = {
      customer: customerInfo,
      items: cart.map(item => ({
        productId: item._id,
        name: item.name,
        price: item.price,
        quantity: item.quantity,
        metal: item.metal,
        weight: item.weight
      })),
      total: getTotalPrice(),
      status: 'pending',
      idempotencyKey
    };

    try {
      setLoading(true);
      const response = await fetch(`${API_URL}/orders`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(orderData)
      });

      if (!response.ok) throw new Error('Failed to place order');

      await loadProducts();
      await loadOrders();
      
      setCart([]);
      setShowCart(false);
      setShowCheckout(false);
      setCustomerInfo({ name: '', email: '', phone: '', address: '' });
      alert('Order placed successfully!');
    } catch (error) {
      console.error('Error placing order:', error);
      alert('Failed to place order');
    } finally {
      setLoading(false);
      setIsSubmitting(false);
    }
  };

  const updateOrderStatus = async (orderId, newStatus) => {
    try {
      setLoading(true);
      const response = await fetch(`${API_URL}/orders/${orderId}/status`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: newStatus })
      });

      if (!response.ok) throw new Error('Failed to update order status');
      
      await loadOrders();
    } catch (error) {
      console.error('Error updating order:', error);
      alert('Failed to update order status');
    } finally {
      setLoading(false);
    }
  };

  const resetForm = () => {
    setFormData({ name: '', category: 'rings', metal: 'gold', weight: '', price: '', stock: '', description: '', image: '' });
    setEditingId(null);
    setShowForm(false);
  };

  const categories = [
    { value: 'all', label: 'All Items' },
    { value: 'rings', label: 'Rings' },
    { value: 'necklaces', label: 'Necklaces' },
    { value: 'earrings', label: 'Earrings' },
    { value: 'bracelets', label: 'Bracelets' },
    { value: 'pendants', label: 'Pendants' }
  ];

  const metals = ['gold', 'silver', 'platinum', 'white-gold', 'rose-gold'];

  return (
    <div className="min-h-screen bg-gradient-to-br from-amber-50 via-white to-yellow-50">
      {loading && (
        <div className="fixed inset-0 bg-black bg-opacity-30 flex items-center justify-center z-50">
          <div className="bg-white p-6 rounded-lg shadow-xl">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-amber-600 mx-auto"></div>
            <p className="mt-4 text-gray-700">Loading...</p>
          </div>
        </div>
      )}

      {/* Mobile-Responsive Header */}
      <header className="bg-gradient-to-r from-amber-600 to-yellow-500 text-white shadow-lg">
        <div className="max-w-7xl mx-auto px-4 py-4 sm:py-6">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2 sm:gap-3">
              <Diamond className="w-6 h-6 sm:w-8 sm:h-8" />
              <div>
                <h1 className="text-xl sm:text-3xl font-bold">Golden Jewels</h1>
                <p className="text-xs sm:text-sm text-amber-100 hidden sm:block">
                  {mode === 'admin' ? 'Admin Dashboard' : 'Luxury Jewelry Store'}
                </p>
              </div>
            </div>
            
            {/* Desktop Navigation */}
            <div className="hidden sm:flex items-center gap-3">
              {mode === 'customer' && (
                <button 
                  onClick={() => setShowCart(true)} 
                  className="relative flex items-center gap-2 bg-white text-amber-600 px-4 lg:px-6 py-2 lg:py-3 rounded-lg font-semibold hover:bg-amber-50 transition-colors shadow-md text-sm lg:text-base"
                >
                  <ShoppingCart className="w-4 h-4 lg:w-5 lg:h-5" />
                  <span className="hidden lg:inline">Cart</span>
                  {cart.length > 0 && (
                    <span className="absolute -top-2 -right-2 bg-red-500 text-white text-xs w-5 h-5 lg:w-6 lg:h-6 rounded-full flex items-center justify-center">
                      {cart.length}
                    </span>
                  )}
                </button>
              )}
              <button 
                onClick={() => setMode(mode === 'admin' ? 'customer' : 'admin')} 
                className="flex items-center gap-2 bg-white text-amber-600 px-4 lg:px-6 py-2 lg:py-3 rounded-lg font-semibold hover:bg-amber-50 transition-colors shadow-md text-sm lg:text-base"
              >
                {mode === 'admin' ? <Home className="w-4 h-4 lg:w-5 lg:h-5" /> : <User className="w-4 h-4 lg:w-5 lg:h-5" />}
                <span className="hidden lg:inline">{mode === 'admin' ? 'Customer' : 'Admin'}</span>
              </button>
            </div>

            {/* Mobile Menu Button */}
            <button 
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
              className="sm:hidden p-2 rounded-lg bg-white bg-opacity-20"
            >
              <Menu className="w-6 h-6" />
            </button>
          </div>

          {/* Mobile Menu */}
          {mobileMenuOpen && (
            <div className="sm:hidden mt-4 pb-4 border-t border-amber-400 pt-4">
              <div className="flex flex-col gap-3">
                {mode === 'customer' && (
                  <button 
                    onClick={() => { setShowCart(true); setMobileMenuOpen(false); }} 
                    className="relative flex items-center gap-3 bg-white text-amber-600 px-4 py-3 rounded-lg font-semibold"
                  >
                    <ShoppingCart className="w-5 h-5" />
                    Cart
                    {cart.length > 0 && (
                      <span className="ml-auto bg-red-500 text-white text-xs px-2 py-1 rounded-full">
                        {cart.length}
                      </span>
                    )}
                  </button>
                )}
                <button 
                  onClick={() => { setMode(mode === 'admin' ? 'customer' : 'admin'); setMobileMenuOpen(false); }} 
                  className="flex items-center gap-3 bg-white text-amber-600 px-4 py-3 rounded-lg font-semibold"
                >
                  {mode === 'admin' ? <Home className="w-5 h-5" /> : <User className="w-5 h-5" />}
                  {mode === 'admin' ? 'Customer View' : 'Admin Panel'}
                </button>
              </div>
            </div>
          )}
        </div>
      </header>

      {mode === 'admin' ? (
        <div className="max-w-7xl mx-auto px-4 py-6 sm:py-8">
          <button 
            onClick={() => setShowForm(!showForm)} 
            className="flex items-center gap-2 bg-amber-600 text-white px-4 sm:px-6 py-3 rounded-lg font-semibold hover:bg-amber-700 mb-6 w-full sm:w-auto justify-center sm:justify-start"
          >
            <Plus className="w-5 h-5" />
            {showForm ? 'Cancel' : 'Add Product'}
          </button>

          {showForm && (
            <div className="bg-white rounded-xl shadow-xl p-4 sm:p-6 mb-8">
              <h2 className="text-xl sm:text-2xl font-bold mb-6">{editingId ? 'Edit Product' : 'Add New Product'}</h2>
              <div className="space-y-4">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-semibold mb-2">Product Name</label>
                    <input 
                      type="text" 
                      value={formData.name} 
                      onChange={(e) => setFormData({...formData, name: e.target.value})} 
                      className="w-full px-4 py-3 border rounded-lg text-base" 
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-semibold mb-2">Category</label>
                    <select 
                      value={formData.category} 
                      onChange={(e) => setFormData({...formData, category: e.target.value})} 
                      className="w-full px-4 py-3 border rounded-lg text-base"
                    >
                      {categories.filter(c => c.value !== 'all').map(cat => 
                        <option key={cat.value} value={cat.value}>{cat.label}</option>
                      )}
                    </select>
                  </div>
                  <div>
                    <label className="block text-sm font-semibold mb-2">Metal</label>
                    <select 
                      value={formData.metal} 
                      onChange={(e) => setFormData({...formData, metal: e.target.value})} 
                      className="w-full px-4 py-3 border rounded-lg text-base"
                    >
                      {metals.map(m => <option key={m} value={m}>{m}</option>)}
                    </select>
                  </div>
                  <div>
                    <label className="block text-sm font-semibold mb-2">Weight (g)</label>
                    <input 
                      type="number" 
                      step="0.1" 
                      value={formData.weight} 
                      onChange={(e) => setFormData({...formData, weight: e.target.value})} 
                      className="w-full px-4 py-3 border rounded-lg text-base" 
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-semibold mb-2">Price (₹)</label>
                    <input 
                      type="number" 
                      value={formData.price} 
                      onChange={(e) => setFormData({...formData, price: e.target.value})} 
                      className="w-full px-4 py-3 border rounded-lg text-base" 
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-semibold mb-2">Stock</label>
                    <input 
                      type="number" 
                      value={formData.stock} 
                      onChange={(e) => setFormData({...formData, stock: e.target.value})} 
                      className="w-full px-4 py-3 border rounded-lg text-base" 
                    />
                  </div>
                </div>
                <div>
                  <label className="block text-sm font-semibold mb-2">Image URL</label>
                  <input 
                    type="url" 
                    value={formData.image} 
                    onChange={(e) => setFormData({...formData, image: e.target.value})} 
                    className="w-full px-4 py-3 border rounded-lg text-base" 
                  />
                </div>
                <div>
                  <label className="block text-sm font-semibold mb-2">Description</label>
                  <textarea 
                    value={formData.description} 
                    onChange={(e) => setFormData({...formData, description: e.target.value})} 
                    className="w-full px-4 py-3 border rounded-lg text-base" 
                    rows="3" 
                  />
                </div>
                <div className="flex flex-col sm:flex-row gap-3">
                  <button 
                    onClick={handleSubmit} 
                    className="flex-1 bg-amber-600 text-white px-6 py-3 rounded-lg font-semibold text-base"
                  >
                    {editingId ? 'Update' : 'Add'}
                  </button>
                  <button 
                    onClick={resetForm} 
                    className="flex-1 sm:flex-none px-6 py-3 border rounded-lg text-base"
                  >
                    Cancel
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* Products List - Mobile Optimized */}
          <div className="bg-white rounded-xl shadow-lg p-4 sm:p-6 mb-8">
            <h2 className="text-xl sm:text-2xl font-bold mb-6">Products</h2>
            <div className="space-y-4">
              {products.map(product => (
                <div key={product._id} className="flex flex-col sm:flex-row items-start sm:items-center gap-4 p-4 border rounded-lg">
                  <div className="w-full sm:w-20 h-48 sm:h-20 bg-amber-100 rounded-lg flex items-center justify-center overflow-hidden">
                    {product.image ? 
                      <img src={product.image} alt={product.name} className="w-full h-full object-cover" /> : 
                      <Diamond className="w-16 h-16 sm:w-10 sm:h-10 text-amber-400" />
                    }
                  </div>
                  <div className="flex-1 w-full">
                    <h3 className="font-bold text-lg">{product.name}</h3>
                    <p className="text-sm text-gray-600">{product.category} • {product.metal} • {product.weight}g</p>
                    <div className="flex flex-col sm:flex-row gap-2 sm:gap-4 mt-1">
                      <span className="font-bold text-amber-600">₹{product.price.toLocaleString()}</span>
                      <span className="text-sm text-gray-600">Stock: {product.stock}</span>
                    </div>
                  </div>
                  <div className="flex gap-2 w-full sm:w-auto">
                    <button 
                      onClick={() => handleEdit(product)} 
                      className="flex-1 sm:flex-none p-3 bg-blue-500 text-white rounded-lg"
                    >
                      <Edit2 className="w-4 h-4 mx-auto" />
                    </button>
                    <button 
                      onClick={() => handleDelete(product._id)} 
                      className="flex-1 sm:flex-none p-3 bg-red-500 text-white rounded-lg"
                    >
                      <Trash2 className="w-4 h-4 mx-auto" />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Orders - Mobile Optimized */}
          <div className="bg-white rounded-xl shadow-lg p-4 sm:p-6">
            <h2 className="text-xl sm:text-2xl font-bold mb-6">Orders</h2>
            {orders.length === 0 ? (
              <p className="text-gray-500 text-center py-8">No orders yet</p>
            ) : (
              <div className="space-y-4">
                {orders.map(order => (
                  <div key={order._id} className="border rounded-lg p-4">
                    <div className="flex flex-col sm:flex-row sm:justify-between mb-3 gap-2">
                      <div>
                        <h3 className="font-bold">{order.customer.name}</h3>
                        <p className="text-sm text-gray-600">{order.customer.email}</p>
                        <p className="text-sm text-gray-600">{order.customer.phone}</p>
                        <p className="text-sm text-gray-600 break-words">{order.customer.address}</p>
                      </div>
                      <div className="text-left sm:text-right">
                        <p className="font-bold text-amber-600">₹{order.total.toLocaleString()}</p>
                        <p className="text-sm text-gray-500">{new Date(order.createdAt).toLocaleDateString()}</p>
                      </div>
                    </div>
                    <div className="border-t pt-3 mb-3">
                      {order.items.map((item, idx) => (
                        <div key={idx} className="flex justify-between text-sm mb-1">
                          <span className="break-words pr-2">{item.name} x {item.quantity}</span>
                          <span className="font-semibold">₹{(item.price * item.quantity).toLocaleString()}</span>
                        </div>
                      ))}
                    </div>
                    <select 
                      value={order.status} 
                      onChange={(e) => updateOrderStatus(order._id, e.target.value)} 
                      className={`w-full sm:w-auto px-3 py-2 rounded-lg text-sm font-semibold ${
                        order.status === 'pending' ? 'bg-yellow-100' : 
                        order.status === 'processing' ? 'bg-blue-100' : 
                        order.status === 'completed' ? 'bg-green-100' : 'bg-red-100'
                      }`}
                    >
                      <option value="pending">Pending</option>
                      <option value="processing">Processing</option>
                      <option value="completed">Completed</option>
                      <option value="cancelled">Cancelled</option>
                    </select>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      ) : (
        <div className="max-w-7xl mx-auto px-4 py-6 sm:py-8">
          {/* Search and Filter - Mobile Optimized */}
          <div className="bg-white rounded-xl shadow-lg p-4 sm:p-6 mb-8">
            <div className="flex flex-col sm:grid sm:grid-cols-2 gap-4">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
                <input 
                  type="text" 
                  placeholder="Search jewelry..." 
                  value={searchTerm} 
                  onChange={(e) => setSearchTerm(e.target.value)} 
                  className="w-full pl-10 pr-4 py-3 border rounded-lg text-base" 
                />
              </div>
              <select 
                value={selectedCategory} 
                onChange={(e) => setSelectedCategory(e.target.value)} 
                className="px-4 py-3 border rounded-lg text-base"
              >
                {categories.map(cat => <option key={cat.value} value={cat.value}>{cat.label}</option>)}
              </select>
            </div>
          </div>

          {/* Product Grid - Mobile Responsive */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-6">
            {filteredProducts.map(product => (
              <div key={product._id} className="bg-white rounded-xl shadow-lg overflow-hidden">
                <div className="h-48 sm:h-64 bg-amber-100 flex items-center justify-center">
                  {product.image ? 
                    <img src={product.image} alt={product.name} className="w-full h-full object-cover" /> : 
                    <Diamond className="w-16 h-16 sm:w-24 sm:h-24 text-amber-400" />
                  }
                </div>
                <div className="p-4 sm:p-6">
                  <h3 className="text-lg sm:text-xl font-bold">{product.name}</h3>
                  <p className="text-sm text-amber-600 capitalize mb-2">{product.category}</p>
                  <p className="text-gray-600 text-sm mb-4 line-clamp-2">{product.description}</p>
                  <div className="space-y-2 mb-4">
                    <div className="flex justify-between text-sm">
                      <span>Metal:</span>
                      <span className="font-semibold capitalize">{product.metal}</span>
                    </div>
                    <div className="flex justify-between text-sm">
                      <span>Weight:</span>
                      <span className="font-semibold">{product.weight}g</span>
                    </div>
                    <div className="flex justify-between pt-2 border-t">
                      <span className="text-xl sm:text-2xl font-bold text-amber-600">₹{product.price.toLocaleString()}</span>
                    </div>
                  </div>
                  <button 
                    onClick={() => addToCart(product)} 
                    disabled={product.stock === 0} 
                    className={`w-full flex items-center justify-center gap-2 px-6 py-3 rounded-lg font-semibold text-base ${
                      product.stock === 0 ? 'bg-gray-300 cursor-not-allowed' : 'bg-amber-600 text-white hover:bg-amber-700'
                    }`}
                  >
                    <ShoppingCart className="w-5 h-5" />
                    {product.stock === 0 ? 'Out of Stock' : 'Add to Cart'}
                  </button>
                  <p className="text-center text-sm text-gray-500 mt-2">
                    {product.stock > 0 ? `${product.stock} available` : 'Unavailable'}
                  </p>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Mobile-Optimized Cart Modal */}
      {showCart && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl shadow-2xl w-full max-w-2xl max-h-[90vh] overflow-hidden flex flex-col">
            <div className="p-4 sm:p-6 border-b flex justify-between items-center">
              <h2 className="text-xl sm:text-2xl font-bold">Shopping Cart</h2>
              <button 
                onClick={() => { setShowCart(false); setShowCheckout(false); }} 
                className="p-2 hover:bg-gray-100 rounded-lg"
              >
                <X className="w-6 h-6" />
              </button>
            </div>
            <div className="flex-1 overflow-y-auto p-4 sm:p-6">
              {cart.length === 0 ? (
                <div className="text-center py-12">
                  <ShoppingCart className="w-16 h-16 sm:w-24 sm:h-24 text-gray-300 mx-auto mb-4" />
                  <p className="text-gray-500 text-lg">Your cart is empty</p>
                </div>
              ) : showCheckout ? (
                <div className="space-y-4">
                  <h3 className="text-lg sm:text-xl font-bold mb-4">Customer Information</h3>
                  <div>
                    <label className="block text-sm font-semibold mb-2">Full Name</label>
                    <input 
                      type="text" 
                      value={customerInfo.name} 
                      onChange={(e) => setCustomerInfo({...customerInfo, name: e.target.value})} 
                      className="w-full px-4 py-3 border rounded-lg text-base" 
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-semibold mb-2">Email</label>
                    <input 
                      type="email" 
                      value={customerInfo.email} 
                      onChange={(e) => setCustomerInfo({...customerInfo, email: e.target.value})} 
                      className="w-full px-4 py-3 border rounded-lg text-base" 
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-semibold mb-2">Phone</label>
                    <input 
                      type="tel" 
                      value={customerInfo.phone} 
                      onChange={(e) => setCustomerInfo({...customerInfo, phone: e.target.value})} 
                      className="w-full px-4 py-3 border rounded-lg text-base" 
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-semibold mb-2">Address</label>
                    <textarea 
                      value={customerInfo.address} 
                      onChange={(e) => setCustomerInfo({...customerInfo, address: e.target.value})} 
                      className="w-full px-4 py-3 border rounded-lg text-base" 
                      rows="3" 
                    />
                  </div>
                  <div className="pt-4 border-t">
                    <p className="text-xl sm:text-2xl font-bold text-amber-600">
                      Total: ₹{getTotalPrice().toLocaleString()}
                    </p>
                  </div>
                  <div className="flex flex-col sm:flex-row gap-3">
                    <button 
                      onClick={() => setShowCheckout(false)} 
                      className="flex-1 px-6 py-3 border rounded-lg text-base"
                    >
                      Back to Cart
                    </button>
                    <button 
                      onClick={handleCheckout} 
                      className="flex-1 bg-amber-600 text-white px-6 py-3 rounded-lg font-semibold text-base"
                    >
                      Place Order
                    </button>
                  </div>
                </div>
              ) : (
                <div>
                  {cart.map(item => (
                    <div key={item._id} className="flex flex-col sm:flex-row gap-4 p-4 border rounded-lg mb-4">
                      <div className="w-full sm:w-20 h-32 sm:h-20 bg-amber-100 rounded-lg flex items-center justify-center overflow-hidden">
                        {item.image ? 
                          <img src={item.image} alt={item.name} className="w-full h-full object-cover" /> : 
                          <Diamond className="w-12 h-12 sm:w-10 sm:h-10 text-amber-400" />
                        }
                      </div>
                      <div className="flex-1">
                        <h3 className="font-bold">{item.name}</h3>
                        <p className="text-sm text-gray-600">₹{item.price.toLocaleString()} each</p>
                        <div className="flex items-center gap-2 mt-2">
                          <button 
                            onClick={() => updateCartQuantity(item._id, item.quantity - 1)} 
                            className="p-2 border rounded"
                          >
                            <Minus className="w-4 h-4" />
                          </button>
                          <span className="w-8 text-center">{item.quantity}</span>
                          <button 
                            onClick={() => updateCartQuantity(item._id, item.quantity + 1)} 
                            className="p-2 border rounded"
                          >
                            <Plus className="w-4 h-4" />
                          </button>
                          <button 
                            onClick={() => removeFromCart(item._id)} 
                            className="ml-auto text-red-500 px-3 py-1 text-sm"
                          >
                            Remove
                          </button>
                        </div>
                      </div>
                      <div className="text-left sm:text-right">
                        <p className="font-bold text-amber-600">₹{(item.price * item.quantity).toLocaleString()}</p>
                      </div>
                    </div>
                  ))}
                  <div className="border-t pt-4 mt-4">
                    <div className="flex justify-between mb-4">
                      <span className="text-lg sm:text-xl font-bold">Total:</span>
                      <span className="text-xl sm:text-2xl font-bold text-amber-600">
                        ₹{getTotalPrice().toLocaleString()}
                      </span>
                    </div>
                    <button 
                      onClick={() => setShowCheckout(true)} 
                      className="w-full bg-amber-600 text-white px-6 py-3 rounded-lg font-semibold text-base"
                    >
                      Proceed to Checkout
                    </button>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
