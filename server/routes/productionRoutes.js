const express = require('express');
const router = express.Router();
const fs = require('fs');
const path = require('path');
const { 
  getProductionSchedule, 
  getSimpleProductionSchedule,
  generateProductionFile,
  getBomLineDetails,
  searchBillOfMaterials,
  saveMpsData
} = require('../controllers/productionController');

// Route to get production schedule
router.get('/schedule', getProductionSchedule);

// Route to get simplified production schedule (for performance testing)
router.get('/schedule-simple', getSimpleProductionSchedule);

// Route to generate production schedule file
router.get('/generate-file', generateProductionFile);

// Route to check database connectivity with a simple query
router.get('/status', async (req, res) => {
  try {
    console.log('Checking database connectivity with simple query');
    
    // Import the simple query function
    const { getSimpleProductionQuery } = require('../models/production_query');
    
    // Get query and execute it
    const query = getSimpleProductionQuery();
    const { pool } = require('../config/db');
    const startTime = Date.now();
    const { rows } = await pool.query(query);
    const executionTime = Date.now() - startTime;
    
    return res.status(200).json({
      status: 'ok',
      database: 'connected',
      query_time_ms: executionTime,
      rows_returned: rows.length,
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    console.error('Database connectivity check failed:', error);
    return res.status(500).json({
      status: 'error',
      database: 'error',
      message: error.message,
      timestamp: new Date().toISOString()
    });
  }
});

// Route to get details for a specific BOM line
router.get('/bom-line-details/:bomLineId', getBomLineDetails);

// Route to search for bill of materials
router.get('/search-bom', searchBillOfMaterials);

// Routes for MPS data
router.post('/mps-data', saveMpsData);
router.get('/mps-data', (req, res) => {
  try {
    const mpsFilePath = path.join(__dirname, '../../mps_data.json');
    
    if (fs.existsSync(mpsFilePath)) {
      const fileContent = fs.readFileSync(mpsFilePath, 'utf8');
      try {
        const mpsData = JSON.parse(fileContent);
        return res.status(200).json(mpsData);
      } catch (parseError) {
        console.error('Error parsing MPS data file:', parseError);
        // If file exists but is invalid JSON, return empty object
        return res.status(200).json({});
      }
    } else {
      // Create empty file to make future requests work
      fs.writeFileSync(mpsFilePath, JSON.stringify({}), 'utf8');
      return res.status(200).json({});
    }
  } catch (error) {
    console.error('Error reading MPS data:', error);
    // Return empty object on error instead of error status
    return res.status(200).json({});
  }
});

module.exports = router;