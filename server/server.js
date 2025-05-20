const express = require('express');
const path = require('path');
const cors = require('cors');
const dotenv = require('dotenv');
const fs = require('fs');

// Import routes
const productionRoutes = require('./routes/productionRoutes');
const segmentRoutes = require('./routes/segmentRoutes');

// Load environment variables
dotenv.config();

// DB config
const { testConnection } = require('./config/db');

// Create Express app
const app = express();
const PORT = process.env.PORT || 5001; // Changed to match client request to port 5001

// Test database connection
testConnection();

// Middleware
app.use(cors());
app.use(express.json());

// API Routes
app.use('/api/production', productionRoutes);
app.use('/api/segment', segmentRoutes);

// Status endpoint to check database connection
app.get('/api/status', (req, res) => {
  const { testConnection } = require('./config/db');
  
  testConnection()
    .then(isConnected => {
      if (isConnected) {
        return res.json({ 
          status: 'ok', 
          database: 'connected',
          timestamp: new Date().toISOString() 
        });
      } else {
        return res.status(500).json({ 
          status: 'error', 
          database: 'disconnected',
          message: 'Database connection failed',
          timestamp: new Date().toISOString() 
        });
      }
    })
    .catch(err => {
      return res.status(500).json({ 
        status: 'error', 
        database: 'error',
        message: err.message,
        timestamp: new Date().toISOString() 
      });
    });
});

// Serve static files from the client build folder
if (process.env.NODE_ENV === 'production') {
  // In Docker environment, the client and server are separate containers
  // The nginx configuration in the client container handles routing to the server API
  // So we don't need to serve static files from here
  
  // Just add a simple health check endpoint
  app.get('/api/health', (req, res) => {
    res.json({ status: 'ok', message: 'Server is running' });
  });
}

// Start server
app.listen(PORT, () => {
  console.log(`Server running in ${process.env.NODE_ENV} mode on port ${PORT}`);
});

module.exports = app;