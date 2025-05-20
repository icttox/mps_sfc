const { pool } = require('../config/db');
const { getProductionScheduleQuery, formatProductionSchedule } = require('../models/production_query');
const fs = require('fs');
const path = require('path');

/**
 * Get production schedule and return as JSON
 * @param {Object} req - Express request object with date range parameters
 * @param {Object} res - Express response object
 */
const getProductionSchedule = async (req, res) => {
  try {
    const { startDate, endDate, showNoCommitmentOrders } = req.query;
    console.log(`Received request for production schedule with date range: ${startDate} to ${endDate}, showNoCommitmentOrders: ${showNoCommitmentOrders}`);
    
    // Validate date parameters
    if (!startDate || !endDate) {
      return res.status(400).json({ 
        message: 'Date range parameters (startDate and endDate) are required for filtering'
      });
    }
    
    // Parse showNoCommitmentOrders parameter
    const includeNoCommitmentOrders = showNoCommitmentOrders === 'true';
    
    // Convert date strings to Date objects for validation
    const start = new Date(startDate);
    const end = new Date(endDate);
    
    // Basic validation of date format
    if (isNaN(start.getTime()) || isNaN(end.getTime())) {
      return res.status(400).json({ 
        message: 'Invalid date format. Please use YYYY-MM-DD format for startDate and endDate' 
      });
    }
    
    // Log details about the date filtering
    console.log(`Filtering production data with date range: ${startDate} (${start.toDateString()}) to ${endDate} (${end.toDateString()})`);
    console.log('This filter will include manufacturing orders that match either:');
    console.log('1. Manufacturing orders with production dates (planned start or finish) within this range');
    console.log('2. Manufacturing orders linked to sales orders with commitment dates within this range');
    
    // Get query with date parameters and no commitment orders filter
    const query = getProductionScheduleQuery(startDate, endDate, includeNoCommitmentOrders);
    console.log('Generated production schedule query with date filters and no commitment orders filter');
    
    try {
      // Execute query
      console.log('Executing database query...');
      
      // Set statement timeout to 5 minutes (300000ms)
      await pool.query('SET statement_timeout = 300000');
      
      // Execute the main query with a longer timeout
      const queryConfig = {
        text: query,
        // Optional: can specify queryTimeout in options if needed
      };
      
      console.log('Starting query execution with extended timeout...');
      const { rows } = await pool.query(queryConfig);
      console.log(`Query executed successfully, received ${rows.length} rows`);
      
      if (rows.length === 0) {
        console.log('Query returned zero rows');
        return res.status(404).json({ message: 'No production data found for the specified date range' });
      }
      
      // Format data to match backorder.json format - BOM details are now included in the main query
      console.log('Formatting production schedule data');
      const formattedData = await formatProductionSchedule(rows, includeNoCommitmentOrders);
      console.log('Data formatting completed successfully');
      
      return res.status(200).json(formattedData);
    } catch (dbError) {
      console.error('Database query execution failed:', dbError);
      // Check if it's a connection issue
      if (dbError.code === 'ECONNREFUSED' || dbError.code === '57P03' || dbError.code === '3D000') {
        console.error('Database connection failure detected - check DB credentials and server status');
      }
      throw dbError; // Re-throw to be caught by outer catch
    }
  } catch (error) {
    console.error('Error fetching production schedule:', error);
    return res.status(500).json({ message: 'Internal server error', error: error.message });
  }
};

/**
 * Get components details for a specific BOM line
 * @param {Object} req - Express request object with bomLineId parameter
 * @param {Object} res - Express response object
 */
const getBomLineDetails = async (req, res) => {
  try {
    const { bomLineId } = req.params;
    
    if (!bomLineId) {
      return res.status(400).json({ message: 'BOM line ID is required' });
    }
    
    // Query to get details for a specific BOM line
    const query = `
      SELECT 
        row, width_cut, thickness, name, color, caliber, 
        quantity, long_cut, meters2, kilos
      FROM 
        mrp_bom_line_detail
      WHERE 
        bom_line_id = $1
    `;
    
    const { rows } = await pool.query(query, [bomLineId]);
    
    return res.status(200).json(rows);
  } catch (error) {
    console.error('Error fetching BOM line details:', error);
    return res.status(500).json({ message: 'Internal server error', error: error.message });
  }
};

/**
 * Generate production schedule JSON file
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 */
const generateProductionFile = async (req, res) => {
  try {
    const { startDate, endDate, showNoCommitmentOrders } = req.query;

    if (!startDate || !endDate) {
      return res.status(400).json({
        message: 'Date range parameters (startDate and endDate) are required'
      });
    }

    const includeNoCommitmentOrders = showNoCommitmentOrders === 'true';

    // Get query
    const query = getProductionScheduleQuery(startDate, endDate, includeNoCommitmentOrders);
    
    // Execute query
    const { rows } = await pool.query(query);
    
    if (rows.length === 0) {
      return res.status(404).json({ message: 'No production data found' });
    }
    
    // Format data to match backorder.json format - BOM details are now included in the main query
    const formattedData = await formatProductionSchedule(rows);
    
    // Write to file
    // First, try to write to the path that should be mounted in Docker
    const dockerPath = '/app/production_schedule.json';
    const localPath = path.join(__dirname, '../../production_schedule.json');
    
    let filePath = dockerPath;
    try {
      // Try Docker path first
      fs.writeFileSync(dockerPath, JSON.stringify(formattedData, null, 2));
      console.log(`Successfully wrote production schedule to Docker path: ${dockerPath}`);
    } catch (writeError) {
      console.warn(`Could not write to Docker path (${dockerPath}), falling back to local path`, writeError);
      // Fall back to local path
      fs.writeFileSync(localPath, JSON.stringify(formattedData, null, 2));
      console.log(`Successfully wrote production schedule to local path: ${localPath}`);
      filePath = localPath;
    }
    
    // Also write to the current directory as an additional fallback
    const currentDirPath = './production_schedule.json';
    try {
      fs.writeFileSync(currentDirPath, JSON.stringify(formattedData, null, 2));
      console.log(`Successfully wrote production schedule to current directory: ${currentDirPath}`);
    } catch (localWriteError) {
      console.warn(`Could not write to current directory (${currentDirPath})`, localWriteError);
    }
    
    return res.status(200).json({
      message: 'Production schedule file generated successfully',
      filePath
    });
  } catch (error) {
    console.error('Error generating production file:', error);
    return res.status(500).json({ message: 'Internal server error', error: error.message });
  }
};

/**
 * Search for products with bill_of_materials in the JSON
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 */
const searchBillOfMaterials = async (req, res) => {
  try {
    // Read the production schedule file if it exists
    const filePath = path.join(__dirname, '../../production_schedule.json');
    
    if (!fs.existsSync(filePath)) {
      return res.status(404).json({ message: 'Production schedule file not found. Generate it first.' });
    }
    
    const data = JSON.parse(fs.readFileSync(filePath, 'utf8'));
    const searchResults = [];
    
    // Search parameters
    const { component, location, materialId } = req.query;
    
    // Helper function to recursively search through objects
    function findBOM(obj, warehouseName, productKey) {
      if (obj.bill_of_materials && Array.isArray(obj.bill_of_materials)) {
        const components = obj.bill_of_materials;
        
        // Filter components based on search criteria
        const matchingComponents = components.filter(comp => {
          let matches = true;

          if (component) {
            const compName = (comp.product_name || '').toLowerCase();
            const compCode = (comp.product_code || '').toLowerCase();
            if (!compName.includes(component.toLowerCase()) && !compCode.includes(component.toLowerCase())) {
              matches = false;
            }
          }

          if (location) {
            const locName = (comp.location_name || '').toLowerCase();
            if (!locName.includes(location.toLowerCase())) {
              matches = false;
            }
          }

          if (materialId) {
            const id = Number(materialId);
            if (comp.product_id !== id && comp.line_id !== id) {
              matches = false;
            }
          }

          return matches;
        });
        
        if (matchingComponents.length > 0) {
          searchResults.push({
            warehouse: warehouseName,
            product: productKey,
            productInfo: {
              familia: obj.familia,
              grupo: obj.grupo,
              linea: obj.linea,
              tipo: obj.tipo,
              categoria: obj.categoria,
              state: obj.state
            },
            matchingComponents: matchingComponents
          });
        }
      }
    }
    
    // Search through all warehouses and products
    for (const [warehouseName, products] of Object.entries(data)) {
      for (const [productKey, productData] of Object.entries(products)) {
        findBOM(productData, warehouseName, productKey);
      }
    }
    
    // Return results with some statistics
    return res.status(200).json({
      totalMatches: searchResults.length,
      searchCriteria: { component, location, materialId },
      results: searchResults
    });
  } catch (error) {
    console.error('Error searching bill of materials:', error);
    return res.status(500).json({ message: 'Internal server error', error: error.message });
  }
};

/**
 * Save MPS data for planning purposes
 * @param {Object} req - Express request object with mpsData
 * @param {Object} res - Express response object
 */
const saveMpsData = async (req, res) => {
  try {
    const { mpsData } = req.body;
    
    if (!mpsData) {
      return res.status(400).json({ message: 'MPS data is required' });
    }
    
    // For now, simply save to a JSON file
    // In a production environment, this would typically save to a database
    const mpsFilePath = path.join(__dirname, '../../mps_data.json');
    
    // If file exists, read it first to merge with existing data
    let existingData = {};
    try {
      if (fs.existsSync(mpsFilePath)) {
        const fileContent = fs.readFileSync(mpsFilePath, 'utf8');
        existingData = JSON.parse(fileContent);
      }
    } catch (error) {
      console.error('Error reading existing MPS data:', error);
      // Continue with empty object if file doesn't exist or is invalid
    }
    
    // Merge with existing data (deep merge)
    const mergedData = {
      ...existingData,
      ...mpsData,
      lastUpdated: new Date().toISOString()
    };
    
    // Write to file
    fs.writeFileSync(mpsFilePath, JSON.stringify(mergedData, null, 2), 'utf8');
    
    return res.status(200).json({ message: 'MPS data saved successfully' });
  } catch (error) {
    console.error('Error saving MPS data:', error);
    return res.status(500).json({ message: 'Internal server error', error: error.message });
  }
};

/**
 * Get a simplified production schedule for testing database performance
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 */
const getSimpleProductionSchedule = async (req, res) => {
  try {
    console.log('Received request for simple production schedule (performance test)');
    
    // Import the simple query function
    const { getSimpleProductionQuery } = require('../models/production_query');
    
    // Get query
    const query = getSimpleProductionQuery();
    console.log('Generated simple production schedule query');
    
    // Execute query with timeout settings
    console.log('Executing simple database query...');
    const startTime = Date.now();
    
    const { rows } = await pool.query(query);
    
    const executionTime = Date.now() - startTime;
    console.log(`Simple query executed successfully in ${executionTime}ms, received ${rows.length} rows`);
    
    return res.status(200).json({
      execution_time_ms: executionTime,
      count: rows.length,
      data: rows
    });
  } catch (error) {
    console.error('Error fetching simple production schedule:', error);
    return res.status(500).json({ message: 'Internal server error', error: error.message });
  }
};

module.exports = {
  getProductionSchedule,
  getSimpleProductionSchedule,
  generateProductionFile,
  getBomLineDetails,
  searchBillOfMaterials,
  saveMpsData
};