const express = require('express');
const mongoose = require('mongoose');
const os = require('os');
const router = express.Router();

// Get server status with detailed metrics
const getServerStatus = (req, res) => {
  const connectionStates = {
    0: 'disconnected',
    1: 'connected',
    2: 'connecting',
    3: 'disconnecting'
  };
  
  const memUsage = process.memoryUsage();
  const cpuUsage = process.cpuUsage();
  
  res.json({
    message: 'Server is up and running',
    status: 'OK',
    timestamp: new Date().toISOString(),
    uptime: `${Math.floor(process.uptime())}s`,
    system: {
      platform: os.platform(),
      arch: os.arch(),
      nodeVersion: process.version,
      totalMemory: `${Math.round(os.totalmem() / 1024 / 1024)}MB`,
      freeMemory: `${Math.round(os.freemem() / 1024 / 1024)}MB`,
      cpuCount: os.cpus().length
    },
    process: {
      pid: process.pid,
      memory: {
        rss: `${Math.round(memUsage.rss / 1024 / 1024)}MB`,
        heapUsed: `${Math.round(memUsage.heapUsed / 1024 / 1024)}MB`,
        heapTotal: `${Math.round(memUsage.heapTotal / 1024 / 1024)}MB`,
        external: `${Math.round(memUsage.external / 1024 / 1024)}MB`
      },
      cpu: {
        user: `${Math.round(cpuUsage.user / 1000)}ms`,
        system: `${Math.round(cpuUsage.system / 1000)}ms`
      }
    },
    database: {
      state: connectionStates[mongoose.connection.readyState],
      stateCode: mongoose.connection.readyState,
      name: mongoose.connection.name || 'Not connected',
      host: mongoose.connection.host || 'Not connected'
    },
    api: {
      baseUrl: `/api`,
      endpoints: [
        'GET /api/products',
        'POST /api/products',
        'GET /api/products/:id',
        'PUT /api/products/:id',
        'DELETE /api/products/:id',
        'GET /api/orders',
        'POST /api/orders'
      ]
    }
  });
};

// Health check
const getHealth = (req, res) => {
  res.json({ status: 'OK', timestamp: new Date().toISOString() });
};

// Routes
router.get('/', getServerStatus);
router.get('/health', getHealth);

module.exports = router;
