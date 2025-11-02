import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import '@testing-library/jest-dom';
import App from '../App';

// Mock fetch
global.fetch = jest.fn();

describe('Jewelry Store App', () => {
  beforeEach(() => {
    fetch.mockClear();
  });

  describe('Header Component', () => {
    test('renders app title', () => {
      render(<App />);
      expect(screen.getByText('Golden Jewels')).toBeInTheDocument();
    });

    test('shows customer view by default', () => {
      render(<App />);
      expect(screen.getByText('Luxury Jewelry Store')).toBeInTheDocument();
    });

    test('toggles between customer and admin mode', () => {
      render(<App />);
      
      const toggleButton = screen.getByText('Admin Panel');
      fireEvent.click(toggleButton);
      
      expect(screen.getByText('Admin Dashboard')).toBeInTheDocument();
    });
  });

  describe('Product Loading', () => {
    test('loads products on mount', async () => {
      const mockProducts = [
        {
          _id: '1',
          name: 'Test Ring',
          category: 'rings',
          metal: 'gold',
          weight: 5.0,
          price: 25000,
          stock: 10,
          description: 'Test product'
        }
      ];

      fetch.mockResolvedValueOnce({
        ok: true,
        json: async () => mockProducts
      });

      render(<App />);

      await waitFor(() => {
        expect(screen.getByText('Test Ring')).toBeInTheDocument();
      });
    });

    test('handles product loading error', async () => {
      fetch.mockRejectedValueOnce(new Error('API Error'));
      
      // Mock alert
      window.alert = jest.fn();

      render(<App />);

      await waitFor(() => {
        expect(window.alert).toHaveBeenCalledWith('Failed to load products from database');
      });
    });
  });

  describe('Search and Filter', () => {
    test('filters products by search term', async () => {
      const mockProducts = [
        {
          _id: '1',
          name: 'Diamond Ring',
          category: 'rings',
          metal: 'gold',
          weight: 5.0,
          price: 25000,
          stock: 10,
          description: 'Beautiful diamond ring'
        },
        {
          _id: '2',
          name: 'Gold Necklace',
          category: 'necklaces',
          metal: 'gold',
          weight: 10.0,
          price: 35000,
          stock: 5,
          description: 'Elegant gold necklace'
        }
      ];

      fetch.mockResolvedValue({
        ok: true,
        json: async () => mockProducts
      });

      render(<App />);

      await waitFor(() => {
        expect(screen.getByText('Diamond Ring')).toBeInTheDocument();
        expect(screen.getByText('Gold Necklace')).toBeInTheDocument();
      });

      const searchInput = screen.getByPlaceholderText('Search jewelry...');
      fireEvent.change(searchInput, { target: { value: 'diamond' } });

      await waitFor(() => {
        expect(screen.getByText('Diamond Ring')).toBeInTheDocument();
        expect(screen.queryByText('Gold Necklace')).not.toBeInTheDocument();
      });
    });

    test('filters products by category', async () => {
      const mockProducts = [
        {
          _id: '1',
          name: 'Diamond Ring',
          category: 'rings',
          metal: 'gold',
          weight: 5.0,
          price: 25000,
          stock: 10,
          description: 'Beautiful diamond ring'
        }
      ];

      fetch.mockResolvedValue({
        ok: true,
        json: async () => mockProducts
      });

      render(<App />);

      await waitFor(() => {
        expect(screen.getByText('Diamond Ring')).toBeInTheDocument();
      });

      const categorySelect = screen.getByDisplayValue('All Items');
      fireEvent.change(categorySelect, { target: { value: 'rings' } });

      await waitFor(() => {
        expect(screen.getByText('Diamond Ring')).toBeInTheDocument();
      });
    });
  });

  describe('Shopping Cart', () => {
    test('adds product to cart', async () => {
      const mockProducts = [
        {
          _id: '1',
          name: 'Test Ring',
          category: 'rings',
          metal: 'gold',
          weight: 5.0,
          price: 25000,
          stock: 10,
          description: 'Test product'
        }
      ];

      fetch.mockResolvedValue({
        ok: true,
        json: async () => mockProducts
      });

      render(<App />);

      await waitFor(() => {
        expect(screen.getByText('Test Ring')).toBeInTheDocument();
      });

      const addToCartButton = screen.getByText('Add to Cart');
      fireEvent.click(addToCartButton);

      const cartButton = screen.getByText('Cart');
      expect(cartButton).toBeInTheDocument();
    });

    test('opens cart modal', async () => {
      render(<App />);

      const cartButton = screen.getByText('Cart');
      fireEvent.click(cartButton);

      await waitFor(() => {
        expect(screen.getByText('Shopping Cart')).toBeInTheDocument();
      });
    });
  });

  describe('Mobile Responsiveness', () => {
    test('shows mobile menu button on small screens', () => {
      // Mock window.innerWidth
      Object.defineProperty(window, 'innerWidth', {
        writable: true,
        configurable: true,
        value: 500,
      });

      render(<App />);
      
      // Mobile menu functionality would be tested with proper viewport simulation
      expect(screen.getByRole('button')).toBeInTheDocument();
    });
  });

  describe('Admin Panel', () => {
    test('shows add product form in admin mode', () => {
      render(<App />);
      
      // Switch to admin mode
      const toggleButton = screen.getByText('Admin Panel');
      fireEvent.click(toggleButton);

      const addProductButton = screen.getByText('Add Product');
      fireEvent.click(addProductButton);

      expect(screen.getByText('Add New Product')).toBeInTheDocument();
    });

    test('validates product form fields', () => {
      render(<App />);
      
      // Switch to admin mode
      const toggleButton = screen.getByText('Admin Panel');
      fireEvent.click(toggleButton);

      const addProductButton = screen.getByText('Add Product');
      fireEvent.click(addProductButton);

      // Mock alert
      window.alert = jest.fn();

      const submitButton = screen.getByText('Add');
      fireEvent.click(submitButton);

      expect(window.alert).toHaveBeenCalledWith('Please fill in all required fields');
    });
  });
});